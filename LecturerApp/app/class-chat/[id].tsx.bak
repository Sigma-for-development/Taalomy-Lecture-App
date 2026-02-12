import React, { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View, Text, StyleSheet, StatusBar, ActivityIndicator, Alert, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, Image, TouchableWithoutFeedback, Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_CONFIG } from '../../src/config/api';
import { socketIOManager, ChatMessage, TypingEvent, UserEvent } from '../../src/utils/socketio';
import { tokenStorage } from '../../utils/tokenStorage';
const AsyncStorage = tokenStorage;
import axios from 'axios';
import { useTranslation } from 'react-i18next';

// NOTE: ReviewModal removed as Lecturers don't review classes

const baseurl = API_CONFIG.CHAT_BASE_URL;

export default function ClassChatScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const [chatRoom, setChatRoom] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingEvent[]>([]);
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
  }, [isValidRoomId]); // Use isValidRoomId instead of id

  useEffect(() => {
    // Socket.IO event listeners
    const handleMessage = (message: ChatMessage) => {
      setMessages(prev => {
        // Check if message already exists to prevent duplicates
        const messageExists = prev.some(m => m.message_id === message.message_id);
        if (messageExists) {
          return prev;
        }

        // For own messages, ensure we have the profile picture data
        const isOwnMessage = message.user_id === chatRoom?.current_user_id;
        if (isOwnMessage && !message.profile_picture_url && chatRoom?.current_user) {
          message.profile_picture_url = chatRoom.current_user.profile_picture_url;
          message.first_name = chatRoom.current_user.first_name;
          message.last_name = chatRoom.current_user.last_name;
        }

        return [...prev, message];
      });
      // Auto-scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    };

    const handleTyping = (event: TypingEvent) => {
      setTypingUsers(prev => {
        const filtered = prev.filter(u => u.user_id !== event.user_id);
        if (event.typing) {
          return [...filtered, event];
        }
        return filtered;
      });
    };

    const handleUserJoin = (event: UserEvent) => {
      // Could show a notification or update UI
      console.log(`${event.username} joined the chat`);
    };

    const handleUserLeave = (event: UserEvent) => {
      // Could show a notification or update UI
      console.log(`${event.username} left the chat`);
    };

    const handleConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
    };

    const handleError = (errorMessage: string) => {
      setError(errorMessage);
    };

    socketIOManager.onMessage(handleMessage);
    socketIOManager.onTyping(handleTyping);
    socketIOManager.onUserJoin(handleUserJoin);
    socketIOManager.onUserLeave(handleUserLeave);
    socketIOManager.onConnectionChange(handleConnectionChange);
    socketIOManager.onError(handleError);

    return () => {
      socketIOManager.removeMessageCallback(handleMessage);
      socketIOManager.removeTypingCallback(handleTyping);
      socketIOManager.removeUserJoinCallback(handleUserJoin);
      socketIOManager.removeUserLeaveCallback(handleUserLeave);
      socketIOManager.removeConnectionCallback(handleConnectionChange);
      socketIOManager.removeErrorCallback(handleError);
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
      const response = await axios.get(`${baseurl}classes/${roomId}/chat/`, {
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
    // Send typing indicator
    socketIOManager.sendTyping(text.length > 0);
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

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;

    return (
      <View style={styles.typingContainer}>
        <Text style={styles.typingText}>
          {typingUsers.map(u => u.first_name).join(', ')} {t(typingUsers.length === 1 ? 'typing_single' : 'typing_plural')}
        </Text>
        <View style={styles.typingDots}>
          <View style={[styles.dot, styles.dot1]} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
        </View>
      </View>
    );
  };

  // Show error screen if we don't have a valid room ID
  if (!isValidRoomId) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
          style={styles.backgroundGradient}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('invalid_chat_room_id')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>{t('go_back_button')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
          style={styles.backgroundGradient}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>{t('loading_messages')}</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
          style={styles.backgroundGradient}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retryLoad}>
            <Text style={styles.retryButtonText}>{t('retry_button')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
        style={styles.backgroundGradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {chatRoom?.name || t('class_chat_title')}
          </Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, isConnected ? styles.connected : styles.disconnected]} />
            <Text style={styles.headerSubtitle}>
              {isConnected ? t('status_online') : t('status_connecting')}
            </Text>
          </View>
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
        ListFooterComponent={renderTypingIndicator}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#7f8c8d" />
            <Text style={styles.emptyText}>{t('welcome_to_chat', { name: chatRoom?.name })}</Text>
            <Text style={styles.emptySubtext}>{t('start_discussing')}</Text>
          </View>
        }
      />

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={newMessage}
              onChangeText={handleTyping}
              placeholder={t('type_message_placeholder')}
              placeholderTextColor="#7f8c8d"
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
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    padding: 8,
    marginEnd: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginEnd: 6,
  },
  connected: {
    backgroundColor: '#2ecc71',
  },
  disconnected: {
    backgroundColor: '#e74c3c',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#bdc3c7',
  },
  headerSpacer: {
    width: 32,
    alignItems: 'flex-end',
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '85%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
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
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
  },
  messageHeaderInfo: {
    marginStart: 8,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    color: '#bdc3c7',
  },
  messageTime: {
    fontSize: 10,
    color: '#7f8c8d',
    marginStart: 8,
  },
  ownMessageTime: {
    textAlign: 'right',
    marginTop: 2,
    marginEnd: 2,
  },
  messageBubble: {
    borderRadius: 20,
    padding: 12,
  },
  ownBubble: {
    backgroundColor: '#3498db',
    borderBottomEndRadius: 4,
  },
  otherBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomStartRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#ecf0f1',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginStart: 16,
  },
  typingText: {
    fontSize: 12,
    color: '#bdc3c7',
    marginEnd: 8,
    fontStyle: 'italic',
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#bdc3c7',
    marginHorizontal: 1,
  },
  dot1: {
  },
  dot2: {
    opacity: 0.6,
  },
  dot3: {
    opacity: 0.3,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 34,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingTop: 12,
    marginEnd: 10,
    fontSize: 16,
    color: '#fff',
    maxHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  sendButton: {
    backgroundColor: '#3498db',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(52, 152, 219, 0.3)',
    shadowOpacity: 0.1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bdc3c7',
    marginTop: 8,
  },
});
