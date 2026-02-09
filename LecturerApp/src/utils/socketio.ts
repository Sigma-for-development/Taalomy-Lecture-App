import { tokenStorage } from '../../utils/tokenStorage';
const AsyncStorage = tokenStorage;
import { API_CONFIG } from '../config/api';
import { io, Socket } from 'socket.io-client';

export interface ChatMessage {
  message_id: number;
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  profile_picture_url?: string;
  message: string;
  timestamp: string;
  type: 'message';
  recipient_id?: number; // Add recipient_id for direct messages
}

export interface TypingEvent {
  user_id: number;
  username: string;
  first_name: string;
  typing: boolean;
}

export interface UserEvent {
  user_id: number;
  username: string;
  message: string;
}

export interface EntityDeletedEvent {
  entity_type: string;
  entity_id: number;
  message: string;
}

class SocketIOManager {
  private socket: Socket | null = null;
  private messageCallbacks: ((message: ChatMessage) => void)[] = [];
  private typingCallbacks: ((event: TypingEvent) => void)[] = [];
  private userJoinCallbacks: ((event: UserEvent) => void)[] = [];
  private userLeaveCallbacks: ((event: UserEvent) => void)[] = [];
  private connectionCallbacks: ((connected: boolean) => void)[] = [];
  private errorCallbacks: ((error: string) => void)[] = [];
  private entityDeletedCallbacks: ((event: EntityDeletedEvent) => void)[] = [];
  private currentRoomId: string | null = null;

  async connect() {
    try {

      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        console.log('No access token found, skipping Socket.IO connection');
        return;
      }

      // Check if already connected with valid token
      if (this.socket && this.socket.connected) {
        const currentToken = this.socket.io.opts.query?.['token'];
        if (currentToken === token) {
          console.log('Already connected with valid token, skipping new connection');
          this.connectionCallbacks.forEach(callback => callback(true));
          return;
        }
      }

      // Disconnect existing connection if any
      if (this.socket) {
        console.log('Disconnecting existing socket (token changed or disconnected)');
        this.socket.disconnect();
      }

      // Create Socket.IO connection with token as query parameter
      // Remove /chat/ suffix as Socket.IO adds its own path
      const socketUrl = API_CONFIG.CHAT_BASE_URL.replace('/chat/', '');
      console.log('Connecting to Socket.IO:', socketUrl);

      this.socket = io(socketUrl, {
        transports: ['websocket'],
        query: {
          token: token
        },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      this.socket.on('connect', () => {
        console.log('Socket.IO connected successfully, socket ID:', this.socket?.id);
        this.connectionCallbacks.forEach(callback => callback(true));
        // User-specific room is automatically joined by the backend upon connection
        // No need to explicitly join it here
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket.IO disconnected, reason:', reason);
        this.connectionCallbacks.forEach(callback => callback(false));
      });

      this.socket.on('connect_error', (error) => {
        this.connectionCallbacks.forEach(callback => callback(false));
        this.errorCallbacks.forEach(callback => callback('Connection failed'));
      });

      this.socket.on('error', (data) => {
        this.errorCallbacks.forEach(callback => callback(data.message || 'Unknown error'));
      });

      // Chat events
      this.socket.on('new_message', (data: any) => {
        // Map id to message_id if needed
        const message: ChatMessage = {
          message_id: data.message_id || data.id,
          user_id: data.user_id || data.sender?.id,
          username: data.username || data.sender?.username,
          first_name: data.first_name || data.sender?.first_name,
          last_name: data.last_name || data.sender?.last_name,
          profile_picture_url: data.profile_picture_url || data.sender?.profile_picture_url,
          message: data.message || data.content || '', // Handle both message and content fields
          timestamp: data.timestamp || data.created_at,
          type: data.type || 'message',
          recipient_id: data.recipient_id // Include recipient_id for direct messages
        };

        this.messageCallbacks.forEach(callback => callback(message));
      });

      this.socket.on('user_typing', (data: TypingEvent) => {
        this.typingCallbacks.forEach(callback => callback(data));
      });

      this.socket.on('user_joined', (data: UserEvent) => {
        this.userJoinCallbacks.forEach(callback => callback(data));
      });

      this.socket.on('user_left', (data: UserEvent) => {
        this.userLeaveCallbacks.forEach(callback => callback(data));
      });

      this.socket.on('room_joined', (data) => {
        // Room joined successfully
      });

      this.socket.on('room_left', (data) => {
        // Room left successfully
      });

      // Entity deletion events
      this.socket.on('entity_deleted', (data: EntityDeletedEvent) => {
        this.entityDeletedCallbacks.forEach(callback => callback(data));
      });

      // Invitation events
      this.socket.on('invitations_joined', (data) => {
        // Invitations room joined successfully
      });

      this.socket.on('invitations_left', (data) => {
        // Invitations room left successfully
      });

      // Message acknowledgment
      this.socket.on('message_sent', (data) => {
      });

    } catch (error) {
      console.error('Error connecting to Socket.IO:', error);
      this.connectionCallbacks.forEach(callback => callback(false));
      this.errorCallbacks.forEach(callback => callback('Failed to connect'));
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentRoomId = null;
  }

  async joinRoom(roomId: string) {
    console.log('joinRoom called with roomId:', roomId);
    if (!this.socket || !this.socket.connected) {
      console.log('Socket not connected, connecting first...');
      await this.connect();
    }

    if (this.socket) {
      console.log('Emitting join_room event');
      this.currentRoomId = roomId;
      this.socket.emit('join_room', { room_id: roomId });
    }
  }

  leaveRoom() {
    console.log('leaveRoom called, currentRoomId:', this.currentRoomId);
    if (this.socket && this.currentRoomId) {
      console.log('Emitting leave_room event');
      this.socket.emit('leave_room', { room_id: this.currentRoomId });
      this.currentRoomId = null;
    }
  }

  async sendMessage(message: string, metadata?: any) {
    // Add validation to prevent sending empty messages
    if (!message || !message.trim()) {
      console.warn('Attempted to send empty message');
      // Emit error event for empty messages
      this.errorCallbacks.forEach(callback => callback('Cannot send empty message'));
      return;
    }

    if (this.socket && this.currentRoomId && this.socket.connected) {
      const messageData: any = {
        room_id: this.currentRoomId,  // This was missing!
        message: message.trim()
      };

      // Add any additional metadata
      if (metadata) {
        Object.assign(messageData, metadata);
      }

      console.log('Sending message with data:', messageData);
      this.socket.emit('send_message', messageData);

      // Clear typing indicator when sending a message
      // this.sendTyping(false); // Removed

      // Track if we've already handled the response to prevent duplicate handling
      let handled = false;

      // Add a listener for message acknowledgment
      const handleAck = (response: any) => {
        // If already handled, do nothing
        if (handled) return;
        handled = true;

        console.log('Message sent acknowledgment:', response);
        this.socket?.off('message_sent', handleAck);
        this.socket?.off('error', handleError);

        // Check if there was an error
        if (response && response.status === 'error') {
          console.error('Message sending failed:', response.message);
          this.errorCallbacks.forEach(callback => callback(response.message || 'Failed to send message'));
        }
      };

      // Add a listener for errors
      const handleError = (error: any) => {
        // If already handled, do nothing
        if (handled) return;
        handled = true;

        console.log('Message sending error:', error);
        this.socket?.off('message_sent', handleAck);
        this.socket?.off('error', handleError);
        this.errorCallbacks.forEach(callback => callback(error.message || 'Failed to send message'));
      };

      this.socket.once('message_sent', handleAck);
      this.socket.once('error', handleError);

      // Set a timeout for acknowledgment
      setTimeout(() => {
        // If already handled, do nothing
        if (handled) return;
        handled = true;

        this.socket?.off('message_sent', handleAck);
        this.socket?.off('error', handleError);
        console.warn('Message acknowledgment timeout');
        this.errorCallbacks.forEach(callback => callback('Message sending timeout - please check your connection'));
      }, 10000); // 10 second timeout
    } else {
      console.warn('Socket.IO not connected or room not joined, cannot send message');
      console.log('Socket status:', this.socket?.connected, 'Room ID:', this.currentRoomId);
      this.errorCallbacks.forEach(callback => callback('Not connected to chat server'));
    }
  }

  async sendTyping(typing: boolean) {
    if (this.socket && this.currentRoomId && this.socket.connected) {
      console.log('Sending typing indicator:', typing, 'for room:', this.currentRoomId);
      this.socket.emit('typing', {
        room_id: this.currentRoomId,
        typing: typing
      });
    }
  }

  // Event listener methods
  onMessage(callback: (message: ChatMessage) => void) {
    this.messageCallbacks.push(callback);
  }

  onTyping(callback: (event: TypingEvent) => void) {
    this.typingCallbacks.push(callback);
  }

  onUserJoin(callback: (event: UserEvent) => void) {
    this.userJoinCallbacks.push(callback);
  }

  onUserLeave(callback: (event: UserEvent) => void) {
    this.userLeaveCallbacks.push(callback);
  }

  onConnectionChange(callback: (connected: boolean) => void) {
    this.connectionCallbacks.push(callback);
  }

  onError(callback: (error: string) => void) {
    this.errorCallbacks.push(callback);
  }

  onEntityDeleted(callback: (event: EntityDeletedEvent) => void) {
    this.entityDeletedCallbacks.push(callback);
  }

  // Remove event listeners
  removeMessageCallback(callback: (message: ChatMessage) => void) {
    const index = this.messageCallbacks.indexOf(callback);
    if (index > -1) {
      this.messageCallbacks.splice(index, 1);
    }
  }

  removeTypingCallback(callback: (event: TypingEvent) => void) {
    const index = this.typingCallbacks.indexOf(callback);
    if (index > -1) {
      this.typingCallbacks.splice(index, 1);
    }
  }

  removeUserJoinCallback(callback: (event: UserEvent) => void) {
    const index = this.userJoinCallbacks.indexOf(callback);
    if (index > -1) {
      this.userJoinCallbacks.splice(index, 1);
    }
  }

  removeUserLeaveCallback(callback: (event: UserEvent) => void) {
    const index = this.userLeaveCallbacks.indexOf(callback);
    if (index > -1) {
      this.userLeaveCallbacks.splice(index, 1);
    }
  }

  removeConnectionCallback(callback: (connected: boolean) => void) {
    const index = this.connectionCallbacks.indexOf(callback);
    if (index > -1) {
      this.connectionCallbacks.splice(index, 1);
    }
  }

  removeErrorCallback(callback: (error: string) => void) {
    const index = this.errorCallbacks.indexOf(callback);
    if (index > -1) {
      this.errorCallbacks.splice(index, 1);
    }
  }

  removeEntityDeletedCallback(callback: (event: EntityDeletedEvent) => void) {
    const index = this.entityDeletedCallbacks.indexOf(callback);
    if (index > -1) {
      this.entityDeletedCallbacks.splice(index, 1);
    }
  }

  joinInvitations() {
    if (!this.socket) {
      return;
    }

    if (!this.socket.connected) {
      return;
    }

    this.socket.emit('join_invitations', {});
  }

  leaveInvitations() {
    if (!this.socket) {
      return;
    }

    if (!this.socket.connected) {
      return;
    }

    this.socket.emit('leave_invitations', {});
  }

  // Generic event listener method
  on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Generic event removal method
  off(event: string) {
    if (this.socket) {
      this.socket.off(event);
    }
  }

  async joinDirectMessageRoom(userId1: number, userId2: number) {
    console.log('joinDirectMessageRoom called with:', userId1, userId2);
    if (!this.socket || !this.socket.connected) {
      console.log('Socket not connected, attempting to connect...');
      await this.connect();

      // Wait for connection to establish
      if (this.socket) {
        await new Promise<void>((resolve) => {
          const checkConnection = () => {
            if (this.socket?.connected) {
              resolve();
            } else {
              setTimeout(checkConnection, 100);
            }
          };
          checkConnection();
        });
      }
    }

    if (this.socket && this.socket.connected) {
      // Create a unique room ID for direct messages between two users
      const roomId = `dm_${Math.min(userId1, userId2)}_${Math.max(userId1, userId2)}`;
      console.log('Joining room with ID:', roomId);
      this.currentRoomId = roomId;
      this.socket.emit('join_room', { room_id: roomId });

      // NOTE: User-specific room (user_${userId}) is automatically joined by the backend
      // upon connection, so we don't need to explicitly join it here

      return roomId;
    }
    console.log('Failed to join direct message room - socket not connected');
    return null;
  }

  private async getCurrentUser(): Promise<any> {
    try {
      const userDataString = await AsyncStorage.getItem('user_data');
      if (userDataString) {
        return JSON.parse(userDataString);
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}

export const socketIOManager = new SocketIOManager();