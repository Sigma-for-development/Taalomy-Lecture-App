# 🚀 Real-Time Chat System Documentation

## Overview

The Lecturer App now includes a comprehensive real-time chat system that provides WhatsApp-like functionality for both class and group communications. The system features real-time messaging, typing indicators, read receipts, and secure access control.

## ✨ Features

### 🔥 Real-Time Messaging
- **Instant message delivery** using WebSocket connections
- **Typing indicators** showing when users are typing
- **Read receipts** to track message status
- **System messages** for user join/leave notifications
- **Message reactions** (like, love, laugh, etc.)

### 🛡️ Security & Access Control
- **JWT authentication** for all chat access
- **Role-based permissions** (lecturers and enrolled students only)
- **Secure WebSocket connections** with token validation
- **Message encryption** in transit

### 📱 WhatsApp-Style UI
- **Modern chat interface** with bubble messages
- **User avatars** and names
- **Message timestamps** and status indicators
- **Responsive design** for all screen sizes
- **Dark theme** consistent with the app

### 🎯 Chat Types
- **Class Chats**: All students and lecturer in a class
- **Group Chats**: Students and lecturer in specific groups

## 🏗️ Architecture

### Backend (Django + Channels)

#### Models
```python
# ChatRoom - Represents a chat room for a class or group
- id, name, chat_type (class/group)
- class_obj, group_obj (foreign keys)
- created_at, updated_at

# Message - Individual chat messages
- chat_room, sender, content
- message_type (text, image, file, system)
- is_edited, created_at, updated_at

# ChatParticipant - Tracks users in chat rooms
- user, chat_room, joined_at
- is_active, last_read_at

# MessageReaction - Message reactions
- message, user, reaction_type
- created_at
```

#### WebSocket Consumers
- **ChatConsumer**: Handles real-time messaging
- **Authentication**: JWT token validation
- **Access Control**: Verifies user permissions
- **Message Broadcasting**: Sends messages to all participants

#### API Endpoints
```
GET    /chat/classes/{id}/chat/     - Get class chat room
GET    /chat/groups/{id}/chat/      - Get group chat room
GET    /chat/rooms/{id}/messages/   - Get chat messages
POST   /chat/rooms/{id}/messages/   - Send message
PUT    /chat/rooms/{id}/messages/{id}/ - Edit message
DELETE /chat/rooms/{id}/messages/{id}/ - Delete message
POST   /chat/rooms/{id}/messages/{id}/reactions/ - Add reaction
```

### Frontend (React Native)

#### Components
- **ChatScreen**: Main chat interface using react-native-gifted-chat
- **WebSocketManager**: Handles WebSocket connections and reconnection
- **ClassChatScreen**: Wrapper for class chat rooms
- **GroupChatScreen**: Wrapper for group chat rooms

#### Features
- **Real-time updates** via WebSocket
- **Typing indicators** with debouncing
- **Message persistence** with API fallback
- **Offline support** with message queuing
- **Auto-reconnection** on connection loss

## 🚀 Getting Started

### Backend Setup

1. **Install Dependencies**
```bash
pip install channels channels-redis daphne
```

2. **Database Migrations**
```bash
python manage.py makemigrations chat
python manage.py migrate
```

3. **Start Server**
```bash
python manage.py runserver 0.0.0.0:8000
```

### Frontend Setup

1. **Install Dependencies**
```bash
npm install react-native-gifted-chat @react-native-async-storage/async-storage
```

2. **Start Development Server**
```bash
npm start
```

## 📱 Usage Guide

### For Lecturers

1. **Access Class Chat**
   - Navigate to a class details page
   - Click "Open Class Chat" in Quick Actions
   - Start messaging with all enrolled students

2. **Access Group Chat**
   - Navigate to a class details page
   - Go to the "Groups" tab
   - Click "Group Chat" on any group
   - Message with group members only

### For Students

1. **Join Class Chat**
   - Access is automatic when enrolled in a class
   - All messages are visible to class participants

2. **Join Group Chat**
   - Access is automatic when assigned to a group
   - Messages are private to group members

## 🔧 Configuration

### WebSocket Settings
```python
# settings.py
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',  # Development
        # 'BACKEND': 'channels_redis.core.RedisChannelLayer',  # Production
    },
}
```

### Frontend Configuration
```typescript
// websocket.ts
const protocol = __DEV__ ? 'ws' : 'wss';
const host = __DEV__ ? '192.168.100.12:8000' : 'your-production-domain.com';
```

## 🔒 Security Features

### Authentication
- JWT token validation on WebSocket connection
- Automatic token refresh handling
- Secure token storage in AsyncStorage

### Authorization
- User must be enrolled in class/group to access chat
- Lecturers have access to all their classes/groups
- Students only see chats they're enrolled in

### Data Protection
- Messages are stored securely in database
- WebSocket connections use secure protocols
- Input validation and sanitization

## 🎨 UI/UX Features

### Message Bubbles
- **Left bubbles**: Other users (gray background)
- **Right bubbles**: Current user (blue background)
- **System messages**: Centered with different styling

### Typing Indicators
- Shows "X is typing..." when users are typing
- Automatically disappears after 3 seconds
- Debounced to prevent spam

### Connection Status
- Green dot: Connected
- Red dot: Disconnected
- Auto-reconnection with exponential backoff

## 📊 Performance

### Optimization
- **Message pagination** for large chat histories
- **Lazy loading** of older messages
- **Efficient WebSocket** message handling
- **Memory management** for long-running chats

### Scalability
- **Redis backend** for production scaling
- **Horizontal scaling** support
- **Load balancing** ready

## 🐛 Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check server is running
   - Verify network connectivity
   - Check JWT token validity

2. **Messages Not Sending**
   - Verify user permissions
   - Check chat room access
   - Ensure WebSocket is connected

3. **Typing Indicators Not Working**
   - Check WebSocket connection
   - Verify message format
   - Check debouncing settings

### Debug Mode
```typescript
// Enable debug logging
console.log('WebSocket connected');
console.log('Message received:', data);
console.log('Typing event:', event);
```

## 🔮 Future Enhancements

### Planned Features
- **File sharing** (images, documents)
- **Voice messages** and audio calls
- **Message search** functionality
- **Chat notifications** and push alerts
- **Message threading** and replies
- **Chat moderation** tools for lecturers

### Technical Improvements
- **Message encryption** at rest
- **Advanced caching** strategies
- **Performance monitoring** and analytics
- **Multi-language** support

## 📞 Support

For technical support or feature requests:
- Check the troubleshooting section
- Review the API documentation
- Test with the provided examples

---

**Built with ❤️ for the Lecturer App**
