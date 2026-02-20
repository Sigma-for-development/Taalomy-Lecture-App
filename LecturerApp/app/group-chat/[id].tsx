import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { tokenStorage } from '../../utils/tokenStorage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { API_CONFIG } from '../../src/config/api';
import { socketIOManager, ChatMessage, UserEvent } from '../../src/utils/socketio';
import { useTranslation } from 'react-i18next';
const AsyncStorage = tokenStorage;

const baseurl = API_CONFIG.CHAT_BASE_URL;
const { width } = Dimensions.get('window');

export default function GroupChatScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const [chatRoom, setChatRoom] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();

  // Validate that id exists and is not undefined
  const roomId = Array.isArray(id) ? id[0] : id;
  const isValidRoomId = roomId && typeof roomId === 'string';

  useEffect(() => {
    // Check if we have a valid room ID before proceeding
    if (!isValidRoomId) {
      setError(t('invalid_chat_room_id'));
      setLoading(false);
      return;
    }

    loadChatRoom();
    return () => {
      socketIOManager.disconnect();
    };
  }, [id, isValidRoomId]);

  useEffect(() => {
    // Socket.IO event listeners
    const handleMessage = (message: ChatMessage) => {
      setMessages(prev => {
        // Check if message already exists to prevent duplicates
        const messageExists = prev.some(m => m.message_id === message.message_id);
        if (messageExists) {
          return prev;
        }
        return [...prev, message];
      });
      // Auto-scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    };

    socketIOManager.onMessage(handleMessage);

    return () => {
      socketIOManager.removeMessageCallback(handleMessage);
    };
  }, []);

  const loadChatRoom = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem('access_token');

      if (!token) {
        setError(t('error_no_token'));
        setLoading(false);
        return;
      }

      // Ensure id is a string (already validated above)
      const roomId = Array.isArray(id) ? id[0] : id;

      // Additional validation to ensure roomId is valid
      if (!roomId || roomId === 'undefined') {
        setError(t('invalid_chat_room_id'));
        setLoading(false);
        return;
      }

      // Load chat room details
      const response = await axios.get(`${baseurl}groups/${roomId}/chat/`, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 10000
      });

      setChatRoom(response.data);

      // Load existing messages
      const messagesResponse = await axios.get(`${baseurl}rooms/${response.data.id}/messages/`, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 10000
      });

      // Convert messages to the expected format
      const formattedMessages = messagesResponse.data.map((msg: any) => ({
        message_id: msg.id,
        user_id: msg.sender?.id,
        username: msg.sender?.username,
        first_name: msg.sender?.first_name,
        last_name: msg.sender?.last_name,
        profile_picture_url: msg.sender?.profile_picture_url, // Add profile picture URL
        message: msg.content,
        timestamp: msg.created_at,
        type: 'message'
      }));

      setMessages(formattedMessages);

      // Connect to Socket.IO
      await socketIOManager.connect();
      await socketIOManager.joinRoom(response.data.id.toString());

      // Mark all messages as read when entering the chat room
      if (response.data.unread_count > 0) {
        // Emit mark_read event for the latest message to update last_read_at timestamp
        if (messagesResponse.data.length > 0) {
          const latestMessage = messagesResponse.data[messagesResponse.data.length - 1];
          // Use the socketIOManager's socket directly to emit the event
          if (socketIOManager['socket']) {
            socketIOManager['socket'].emit('mark_read', { message_id: latestMessage.id });

            // Add a small delay to ensure the server processes the mark_read event
            // before we potentially refresh the chat room list
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

    } catch (error: any) {
      console.error('Error loading chat room:', error);
      if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
        setError(t('error_network_failed'));
      } else {
        setError(error.response?.data?.error || t('error_load_failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !chatRoom) return;

    setSending(true);
    try {
      // Send message via Socket.IO
      socketIOManager.sendMessage(newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert(t('error_title'), t('error_send_message'));
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (text: string) => {
    setNewMessage(text);
  };

  const retryLoad = () => {
    loadChatRoom();
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    // For own messages, we need to make sure we have the profile picture data
    const isOwnMessage = item.user_id === chatRoom?.current_user_id;

    // If it's our own message but we don't have profile picture data, try to get it from chatRoom
    let profilePictureUrl = item.profile_picture_url;
    let firstName = item.first_name;
    let lastName = item.last_name;

    if (isOwnMessage && !profilePictureUrl && chatRoom?.current_user) {
      profilePictureUrl = chatRoom.current_user.profile_picture_url;
      firstName = chatRoom.current_user.first_name;
      lastName = chatRoom.current_user.last_name;
    }

    return (
      <View style={[styles.messageContainer, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
        {!isOwnMessage && (
          <View style={styles.messageHeaderWithAvatar}>
            <Image
              source={
                profilePictureUrl
                  ? { uri: profilePictureUrl }
                  : require('../../src/assets/images/default-avatar.png')
              }
              style={styles.avatar as any}
            />
            <View style={styles.messageHeaderInfo}>
              <Text style={styles.messageSender}>{firstName} {lastName}</Text>
              <Text style={styles.messageTime}>
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        )}

        <View style={[styles.messageBubble, isOwnMessage ? styles.ownBubble : styles.otherBubble]}>
          <Text style={[styles.messageText, isOwnMessage ? styles.ownMessageText : styles.otherMessageText]}>
            {item.message}
          </Text>
        </View>

        {isOwnMessage && (
          <Text style={[styles.messageTime, styles.ownMessageTime]}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </View>
    );
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>{t('loading_messages')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retryLoad}>
            <Text style={styles.retryButtonText}>{t('retry_button')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {chatRoom?.name || t('group_chat_title')}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isConnected ? t('status_online') : t('status_connecting')}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => (item.message_id ? item.message_id.toString() : Math.random().toString())}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={handleTyping}
            placeholder={t('type_message_placeholder')}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c3e50',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2c3e50',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#bdc3c7',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#2c3e50',
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 4,
    marginEnd: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ecf0f1',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#bdc3c7',
    marginTop: 2,
  },
  headerSpacer: {
    width: 32,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  messageSender: {
    fontSize: 13,
    fontWeight: '600',
    color: '#bdc3c7',
  },
  messageTime: {
    fontSize: 11,
    color: '#95a5a6',
    marginStart: 8,
  },
  ownMessageTime: {
    textAlign: 'right',
  },
  messageHeaderWithAvatar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageHeaderInfo: {
    marginStart: 8,
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
  },
  ownBubble: {
    backgroundColor: '#3498db',
    borderBottomEndRadius: 4,
  },
  otherBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomStartRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#ecf0f1',
  },
  inputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 100,
    marginEnd: 8,
    color: '#ecf0f1',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  sendButton: {
    backgroundColor: '#3498db',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#7f8c8d',
  },
});
