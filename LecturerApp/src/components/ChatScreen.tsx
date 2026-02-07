import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { tokenStorage } from '../../utils/tokenStorage';
const AsyncStorage = tokenStorage;
import axios from 'axios';
import { websocketManager, ChatMessage, TypingEvent } from '../utils/websocket';
import { API_CONFIG } from '../config/api';

const baseurl = API_CONFIG.CHAT_BASE_URL;

interface ChatScreenProps {
  roomId: string;
  roomName: string;
  roomType: 'class' | 'group';
}

interface Message {
  id: string;
  text: string;
  sender: {
    id: number;
    name: string;
  };
  timestamp: string;
  isOwn: boolean;
}

export default function ChatScreen({ roomId, roomName, roomType }: ChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const router = useRouter();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadCurrentUser();
    loadMessages();
    connectWebSocket();

    return () => {
      websocketManager.disconnect();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [roomId]);

  const loadCurrentUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      const response = await axios.get(`${baseurl}chat/rooms/${roomId}/messages/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const formattedMessages: Message[] = response.data.map((msg: any) => ({
        id: msg.id.toString(),
        text: msg.content,
        timestamp: msg.created_at,
        sender: {
          id: msg.sender.id,
          name: `${msg.sender.first_name} ${msg.sender.last_name}`,
        },
        isOwn: currentUser && msg.sender.id === currentUser.id,
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      // Don't show alert for now to prevent crashes
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    try {
      websocketManager.connect(roomId);

      websocketManager.onConnectionChange((isConnected) => {
        setConnected(isConnected);
      });

      websocketManager.onMessage((chatMessage: ChatMessage) => {
        if (chatMessage.type === 'message') {
          const newMessage: Message = {
            id: chatMessage.id,
            text: chatMessage.message,
            timestamp: chatMessage.timestamp,
            sender: {
              id: chatMessage.user_id,
              name: `${chatMessage.first_name} ${chatMessage.last_name}`,
            },
            isOwn: currentUser && chatMessage.user_id === currentUser.id,
          };

          setMessages(prev => [...prev, newMessage]);
          scrollToBottom();
        }
      });

      websocketManager.onTyping((typingEvent: TypingEvent) => {
        if (typingEvent.typing) {
          setTypingUsers(prev => {
            if (!prev.includes(typingEvent.first_name)) {
              return [...prev, typingEvent.first_name];
            }
            return prev;
          });
        } else {
          setTypingUsers(prev =>
            prev.filter(name => name !== typingEvent.first_name)
          );
        }
      });
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      websocketManager.sendMessage(newMessage.trim());
      setNewMessage('');

      // Stop typing indicator
      websocketManager.sendTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading messages...</Text>
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

        <View style={styles.headerInfo}>
          <Text style={styles.roomName}>{roomName}</Text>
          <Text style={styles.roomType}>{roomType.charAt(0).toUpperCase() + roomType.slice(1)} Chat</Text>
        </View>

        <View style={styles.headerActions}>
          <View style={[styles.connectionStatus, { backgroundColor: connected ? '#4CAF50' : '#F44336' }]} />
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageContainer,
                message.isOwn ? styles.ownMessage : styles.otherMessage
              ]}
            >
              {!message.isOwn && (
                <Text style={styles.senderName}>{message.sender.name}</Text>
              )}
              <View style={[
                styles.messageBubble,
                message.isOwn ? styles.ownBubble : styles.otherBubble
              ]}>
                <Text style={[
                  styles.messageText,
                  message.isOwn ? styles.ownMessageText : styles.otherMessageText
                ]}>
                  {message.text}
                </Text>
                <Text style={[
                  styles.messageTime,
                  message.isOwn ? styles.ownMessageTime : styles.otherMessageTime
                ]}>
                  {formatTime(message.timestamp)}
                </Text>
              </View>
            </View>
          ))}

          {typingUsers.length > 0 && (
            <View style={styles.typingContainer}>
              <Text style={styles.typingText}>
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            multiline
            maxLength={1000}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
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
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backButton: {
    marginEnd: 12,
  },
  headerInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  roomType: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    marginStart: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  ownBubble: {
    backgroundColor: '#007AFF',
    borderBottomEndRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#e0e0e0',
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
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#666',
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f8f8',
  },
  typingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginEnd: 8,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
});
