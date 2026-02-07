# Lecturer App

## Overview

The Lecturer App is a specialized application designed for university lecturers and faculty members. It provides tools and features specifically tailored for academic staff to manage their courses, students, and teaching responsibilities.

## Purpose

This application serves as a dedicated platform for lecturers to:
- Manage course materials and assignments
- Track student attendance and performance
- Grade assignments and provide feedback
- Schedule office hours and consultations
- Access academic resources and tools
- Communicate with students and colleagues

## Project Structure

```
Lecturer App/
├── src/
│   ├── components/     # Reusable UI components
│   ├── screens/        # Main application screens
│   ├── utils/          # Utility functions and helpers
│   └── assets/         # Images, icons, and other assets
└── README.md          # Project documentation
```

## Features (Planned)

### 🎓 **Course Management**
- Course creation and configuration
- Syllabus management
- Assignment creation and tracking
- Grade book and assessment tools

### 👥 **Student Management**
- Student roster and profiles
- Attendance tracking
- Performance analytics
- Communication tools

### 📊 **Analytics & Reporting**
- Student performance reports
- Course analytics
- Attendance statistics
- Grade distribution analysis

### 📅 **Scheduling & Planning**
- Class schedule management
- Office hours scheduling
- Meeting coordination
- Academic calendar integration

### 💬 **Communication**
- Announcement system
- Student messaging
- Discussion forums
- Email integration

### 💬 **Chat System**

The app includes a real-time chat system for class and group communication.

#### Current Implementation
- **WebSocket-based**: Uses Django Channels for real-time communication
- **Fallback Polling**: HTTP polling when WebSocket connection fails
- **Room-based**: Separate chat rooms for classes and groups
- **Typing Indicators**: Shows when other users are typing
- **Message History**: Loads previous messages when joining a chat

#### New Socket.IO Implementation (Recommended)
A more robust Socket.IO-based chat system has been implemented with the following improvements:
- **Automatic Reconnection**: Built-in reconnection logic with exponential backoff
- **Better Error Handling**: Comprehensive error event handling
- **Cross-platform Compatibility**: Works seamlessly across different devices and networks
- **Heartbeat Mechanism**: Automatic keep-alive pings to maintain connection
- **Room-based Messaging**: Native support for room-based communication

To use the new Socket.IO chat system, navigate to:
- Class Chat: `/class-chat/socketio-[id]`
- Group Chat: `/group-chat/socketio-[id]`

See [CHAT_SYSTEM_UPGRADE.md](../CHAT_SYSTEM_UPGRADE.md) for detailed documentation.

## Technology Stack

- **Frontend**: React Native / Expo
- **Backend**: Django REST Framework
- **Database**: PostgreSQL
- **Authentication**: JWT tokens
- **Icons**: Expo Vector Icons (Ionicons)

## Development Status

🟡 **Planning Phase** - Initial structure created

## Next Steps

1. **Setup Development Environment**
   - Initialize React Native/Expo project
   - Configure development tools
   - Set up code linting and formatting

2. **Design System**
   - Create professional UI components
   - Implement consistent design language
   - Design lecturer-specific workflows

3. **Core Features**
   - Authentication system
   - Course management interface
   - Student management tools
   - Grading and assessment features

4. **Integration**
   - Connect with existing backend API
   - Implement data synchronization
   - Ensure compatibility with student app

5. **Chat System**
   - Test and refine Socket.IO implementation
   - Implement advanced features (file sharing, reactions, etc.)
   - Optimize for performance and reliability

## Relationship to Main App

The Lecturer App is designed to work alongside the main AcadeX application:
- **Shared Backend**: Uses the same Django backend API
- **Consistent Design**: Maintains professional appearance
- **Data Integration**: Shares course and user data
- **Complementary Features**: Focuses on lecturer-specific needs

## Getting Started

*Development setup instructions will be added as the project progresses.*

---

**Note**: This is a new project in the planning phase. Development will begin based on specific requirements and priorities.