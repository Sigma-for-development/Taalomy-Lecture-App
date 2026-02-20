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
import api, { API_CONFIG } from '../../src/config/api';
import { Ionicons } from '@expo/vector-icons';
import { socketIOManager, ChatMessage, UserEvent } from '../../src/utils/socketio';
import { useTranslation } from 'react-i18next';

const baseurl = API_CONFIG.CHAT_BASE_URL;
const { width } = Dimensions.get('window');

export default function ClassChatScreen() {
  const { id } = useLocalSearchParams();
  const { t } = useTranslation();
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

      // Ensure id is a string (already validated above)
      const roomId = Array.isArray(id) ? id[0] : id;

      if (!roomId) {
        setError(t('invalid_chat_room_id'));
        setLoading(false);
        return;
      }

      // Load chat room details
      const response = await api.get(`chat/classes/${roomId}/chat/`, {
        baseURL: baseurl,
        timeout: 10000
      });

      setChatRoom(response.data);

      // Load existing messages
      const messagesResponse = await api.get(`chat/rooms/${response.data.id}/messages/`, {
        baseURL: baseurl,
        timeout: 10000
      });

      // Convert messages to the expected format
      const formattedMessages = messagesResponse.data.map((msg: any) => ({
        message_id: msg.id,
        user_id: msg.sender?.id,
        username: msg.sender?.username,
        first_name: msg.sender?.first_name,
        last_name: msg.sender?.last_name,
        profile_picture_url: msg.sender?.profile_picture_url,
        message: msg.content,
        timestamp: msg.created_at,
        type: 'message'
      }));

      setMessages(formattedMessages);

      // Connect to Socket.IO
      await socketIOManager.connect();
      await socketIOManager.joinRoom(response.data.id.toString());

    } catch (error: any) {
      console.error('Error loading chat room:', error);
      if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
        setError(t('error_network_failed'));
      } else {
        setError(error.response?.data?.error || t('error_load_chat_room'));
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
    const isOwnMessage = item.user_id === chatRoom?.current_user_id;

    return (
      <View style={[styles.messageContainer, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
        {!isOwnMessage && (
          <View style={styles.messageHeaderWithAvatar}>
            <Image
              source={
                item.profile_picture_url
                  ? { uri: item.profile_picture_url }
                  : require('../../src/assets/images/default-avatar.png')
              }
              style={styles.avatar as any}
            />
            <View style={styles.messageHeaderInfo}>
              <Text style={styles.messageSender}>{item.first_name} {item.last_name}</Text>
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
          <Text style={styles.loadingText}>{t('loading_chat')}</Text>
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
            <Text style={styles.retryButtonText}>{t('retry')}</Text>
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
            {chatRoom?.name || t('class_chat_title')}
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
    backgroundColor: '#f2f2f7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#8e8e93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#c6c6c8',
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
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8e8e93',
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
    maxWidth: width * 0.8,
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  messageTime: {
    fontSize: 11,
    color: '#8e8e93',
    marginStart: 8,
  },
  ownMessageTime: {
    alignSelf: 'flex-end',
    marginStart: 0,
  },
  messageHeaderWithAvatar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginEnd: 8,
  },
  messageHeaderInfo: {
    flex: 1,
  },
  messageSender: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8e8e93',
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
  },
  ownBubble: {
    backgroundColor: '#007AFF',
    borderBottomEndRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#fff',
    borderBottomStartRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#000',
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#c6c6c8',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#c6c6c8',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 100,
    marginEnd: 8,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#c6c6c8',
  },
});