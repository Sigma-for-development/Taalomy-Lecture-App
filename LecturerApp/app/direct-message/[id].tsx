import React, { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View, Text, StyleSheet, StatusBar, ActivityIndicator, Alert, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, Image, AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_CONFIG } from '../../src/config/api';
import { socketIOManager, ChatMessage, TypingEvent, UserEvent } from '../../src/utils/socketio';
import { tokenStorage } from '../../utils/tokenStorage';
const AsyncStorage = tokenStorage;
import api from '../../src/config/api';
import { useTranslation } from 'react-i18next';

const baseurl = API_CONFIG.CHAT_BASE_URL;

export default function DirectMessageScreen() {
  const { t } = useTranslation();
  // id here is the studentId for Direct Messages
  const { id } = useLocalSearchParams();
  const [chatRoom, setChatRoom] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  // const [typingUsers, setTypingUsers] = useState<TypingEvent[]>([]); // Removed
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();

  // Validate that id exists and is not undefined
  const studentId = Array.isArray(id) ? id[0] : id;
  const isValidStudentId = studentId && typeof studentId === 'string';

  useEffect(() => {
    // Check if we have a valid student ID before proceeding
    if (!isValidStudentId) {
      setError(t('invalid_student_id'));
      setLoading(false);
      return;
    }

    loadChatRoom();

    return () => {
      console.log('Unmounting DirectMessageScreen - cleaning up socket');
      socketIOManager.leaveRoom();
      socketIOManager.disconnect();
    };
  }, [isValidStudentId]);

  // Add AppState listener to handle background/foreground - Lecturer App
  useEffect(() => {
    const handleAppStateChange = (nextAppState: any) => {
      if (nextAppState === 'active') {
        console.log('App came to foreground, checking socket connection');
        socketIOManager.connect().then(() => {
          if (chatRoom?.id) {
            socketIOManager.joinRoom(chatRoom.id.toString());
          }
        });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [chatRoom]);

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
        const isOwnMessage =
          chatRoom?.current_user_id && message.user_id === chatRoom.current_user_id;

        return [...prev, message];
      });
      // Auto-scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    };

    // handleTyping removed

    const handleUserJoin = (event: UserEvent) => {
      console.log(`${event.username} joined the chat`);
    };

    const handleUserLeave = (event: UserEvent) => {
      console.log(`${event.username} left the chat`);
    };

    const handleConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
    };

    const handleError = (errorMessage: string) => {
      console.log('Socket error:', errorMessage);
    };

    socketIOManager.onMessage(handleMessage);
    // socketIOManager.onTyping(handleTyping); // Removed
    socketIOManager.onUserJoin(handleUserJoin);
    socketIOManager.onUserLeave(handleUserLeave);
    socketIOManager.onConnectionChange(handleConnectionChange);
    socketIOManager.onError(handleError);

    return () => {
      socketIOManager.removeMessageCallback(handleMessage);
      // socketIOManager.removeTypingCallback(handleTyping); // Removed
      socketIOManager.removeUserJoinCallback(handleUserJoin);
      socketIOManager.removeUserLeaveCallback(handleUserLeave);
      socketIOManager.removeConnectionCallback(handleConnectionChange);
      socketIOManager.removeErrorCallback(handleError);
    };
  }, [chatRoom]);

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

      // Check for valid ID again
      if (!studentId) {
        setError(t('invalid_student_id'));
        setLoading(false);
        return;
      }

      // 1. Fetch Student Details
      try {
        // Try public profile first
        const studentResponse = await api.get(`users/public/${studentId}/`);
        setStudent(studentResponse.data);
      } catch (err) {
        console.log('Failed to load student public profile details', err);
        // Fallback: Check if we have student info in the chatRoom object later
      }

      // 2. Get the Direct Message Room ID
      const response = await api.get(`direct-messages/${studentId}/`, {
        baseURL: baseurl,
        timeout: 10000
      });

      setChatRoom(response.data);

      // If student fetch failed, try to set from chatRoom
      if (!student && response.data) {
        // Direct Message rooms often contain the other party info
        // Assuming the structure might have it, or we try to use the name/image from room
        // But for now, let's also try to fetch via authenticated user endpoint if public failed
        // Note: The public endpoint failure is the most likely cause.
      }

      const roomId = response.data.id;

      // 3. Load existing messages
      const messagesResponse = await api.get(`rooms/${roomId}/messages/`, {
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

      // 4. Connect to Socket.IO and Join Room
      await socketIOManager.connect();
      await socketIOManager.joinRoom(roomId.toString());

      // Mark as read
      if (response.data.unread_count > 0 && messagesResponse.data.length > 0) {
        const latestMessage = messagesResponse.data[messagesResponse.data.length - 1];
        if (socketIOManager['socket']) {
          socketIOManager['socket'].emit('mark_read', { message_id: latestMessage.id });
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

    } catch (error: any) {
      console.error('Error loading chat room:', error);
      if (error.response?.status === 404) {
        Alert.alert('Chat Unavailable', 'This user or chat no longer exists.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        setLoading(false);
        return;
      }
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

  // Typing indicator removed as requested


  const retryLoad = () => {
    loadChatRoom();
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    // For own messages, we need to make sure we have the profile picture data
    const isOwnMessage =
      chatRoom?.current_user_id && item.user_id === chatRoom.current_user_id;

    // Use keys for avatar fallbacks
    let profilePictureUrl = item.profile_picture_url;
    let firstName = item.first_name;
    let lastName = item.last_name;

    // Helper to check for localhost URLs (often sent by backend socket consumer mocking request with localhost)
    const isLocalhost = (url?: string) => url && (url.includes('localhost') || url.includes('127.0.0.1'));

    // Use student details for other person if missing OR if URL is suspicious (localhost)
    if (!isOwnMessage) {
      if (student) {
        if (!profilePictureUrl || isLocalhost(profilePictureUrl)) {
          if (student.profile_picture_url) profilePictureUrl = student.profile_picture_url;
        }
        if (!firstName) firstName = student.first_name;
        if (!lastName) lastName = student.last_name;
      }

      // Aggressive Fallback: If after all checks we still don't have a valid name, 
      // OR if the username indicates it's an admin, force Taalomy Support.
      const hasName = (firstName && firstName.trim()) || (lastName && lastName.trim());
      const isAdmin = item.username?.toLowerCase() === 'admin' || (student && student.username?.toLowerCase() === 'admin');

      if (!hasName || isAdmin) {
        firstName = "Taalomy";
        lastName = "Support";
        // Force avatar to null so we pick up the favicon in the render block
        profilePictureUrl = undefined;
      }
    }

    return (
      <View style={[styles.messageContainer, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
        {!isOwnMessage && (
          <View style={styles.messageHeaderWithAvatar}>
            <Image
              source={
                (firstName === "Taalomy" && lastName === "Support")
                  ? require('../../assets/taalomy-dark-back.png')
                  : profilePictureUrl
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

  const renderTypingIndicator = () => null;

  // Show error screen if we don't have a valid ID
  if (!isValidStudentId) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
          style={styles.backgroundGradient}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('invalid_student_id')}</Text>
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
            {((student?.first_name || student?.last_name) && (student.first_name || student.last_name).trim())
              ? `${student.first_name || ''} ${student.last_name || ''}`
              : 'Taalomy Support'}
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
        extraData={student} // Ensure list updates when student profile loads
        keyExtractor={(item) => (item.message_id ? item.message_id.toString() : Math.random().toString())}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={renderTypingIndicator}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#7f8c8d" />
            <Text style={styles.emptyText}>{t('dm_empty_title')}</Text>
            <Text style={styles.emptySubtext}>{t('dm_empty_subtext')}</Text>
          </View>
        }
      />

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={newMessage}
              onChangeText={setNewMessage}
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