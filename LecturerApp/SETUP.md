# Lecturer App Setup Guide

## 🚀 Quick Start

The Lecturer App is now fully configured with React Native Expo SDK 53 and ready to run!

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (optional, but recommended)
- iOS Simulator (for iOS testing) or Android Emulator (for Android testing)

### Installation & Running

1. **Navigate to the Lecturer App directory:**
   ```bash
   cd "Lecturer App"
   ```

2. **Install dependencies (if not already done):**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Choose your platform:**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Press `w` for Web browser
   - Scan QR code with Expo Go app on your phone

## 🔧 Configuration

### Backend Connection

The app is configured to connect to the Django backend at:
```
http://192.168.100.12:8000/accounts/
```

### Authentication

The app supports two authentication methods:
1. **Email/Password Login** - Standard login with institutional email
2. **Google Workspace Login** - OAuth integration with Google

### User Type Validation

The app specifically validates that users are of type `lecturer` and will deny access to students.

## 📱 Features Implemented

### ✅ Authentication System
- **Login Screen**: Professional dark theme with email/password and Google OAuth
- **Registration Screen**: Complete lecturer registration with validation
- **Auto-login**: Token validation and automatic login for existing sessions
- **Logout**: Secure logout with token cleanup

### ✅ Dashboard
- **Welcome Screen**: Personalized greeting with lecturer name
- **Quick Stats**: Active courses, total students, pending grades, today's classes
- **Quick Actions**: Create assignment, mark attendance, view reports, send announcements
- **Recent Activity**: Track recent actions and updates
- **Professional Design**: Consistent dark theme with professional icons

### ✅ Navigation
- **Expo Router**: File-based routing system
- **Authentication Flow**: Automatic redirection based on login status
- **Protected Routes**: Dashboard only accessible to authenticated lecturers

## 🎨 Design System

### Color Scheme
- **Primary**: `#3498db` (Blue)
- **Background**: `#0a0a0a` (Dark)
- **Text**: `#ecf0f1` (Light)
- **Secondary Text**: `#bdc3c7` (Gray)
- **Accent Colors**: 
  - Green: `#2ecc71` (Success)
  - Yellow: `#f1c40f` (Warning)
  - Purple: `#9b59b6` (Info)

### Icons
- **Ionicons**: Professional icon set throughout the app
- **Consistent Sizing**: 16px, 20px, 24px, 32px, 40px
- **Color Coding**: Each feature has its own color theme

## 🔒 Security Features

### Token Management
- **JWT Tokens**: Access and refresh token handling
- **Auto-refresh**: Automatic token refresh on expiration
- **Secure Storage**: AsyncStorage for token persistence
- **Token Validation**: Backend validation on app startup

### User Validation
- **Lecturer-Only Access**: Students are denied access with clear message
- **Input Validation**: Email, username, password validation
- **Error Handling**: Comprehensive error messages and alerts

## 🧪 Testing the App

### 1. Test Registration
1. Open the app
2. Navigate to registration screen
3. Fill in lecturer details:
   - Username: `lecturer_test`
   - Email: `lecturer@university.edu`
   - Password: `TestPass123`
   - Other required fields
4. Submit and verify successful registration

### 2. Test Login
1. Use the credentials from registration
2. Verify successful login and dashboard access
3. Test logout functionality

### 3. Test Google OAuth
1. Click "Continue with Google Workspace"
2. Complete Google authentication
3. Verify lecturer account creation/login

### 4. Test Student Access Denial
1. Try to login with a student account
2. Verify access is denied with appropriate message

## 📁 Project Structure

```
Lecturer App/
├── app/                    # Expo Router screens
│   ├── _layout.tsx        # Main layout configuration
│   ├── index.tsx          # Authentication routing
│   ├── login.tsx          # Login screen
│   ├── register.tsx       # Registration screen
│   └── dashboard.tsx      # Main dashboard
├── assets/                # Images and static files
├── package.json           # Dependencies and scripts
├── app.json              # Expo configuration
├── tsconfig.json         # TypeScript configuration
└── README.md             # Project documentation
```

## 🔧 Development

### Adding New Features
1. Create new screens in the `app/` directory
2. Update navigation in `_layout.tsx` if needed
3. Add API endpoints in the login/register files
4. Test thoroughly before deployment

### Styling Guidelines
- Use the established color scheme
- Maintain consistent spacing (8px, 16px, 24px, 32px)
- Use professional icons from Ionicons
- Follow the dark theme design pattern

## 🚨 Troubleshooting

### Common Issues

1. **Backend Connection Failed**
   - Verify backend is running on port 8000
   - Check IP address in login/register files
   - Ensure network connectivity

2. **Authentication Errors**
   - Verify user type is 'lecturer' in backend
   - Check token expiration
   - Clear AsyncStorage if needed

3. **Build Errors**
   - Run `npm install` to ensure all dependencies
   - Clear Expo cache: `expo start -c`
   - Check TypeScript errors

4. **Simulator Issues**
   - Restart iOS Simulator/Android Emulator
   - Check Expo CLI version compatibility
   - Try web version as alternative

## 📞 Support

For issues or questions:
1. Check the console logs for detailed error messages
2. Verify backend API endpoints are working
3. Test with different user accounts
4. Check network connectivity and firewall settings

## 🎯 Next Steps

The Lecturer App is now ready for:
1. **Testing**: Run through all authentication flows
2. **Feature Development**: Add course management, student management, etc.
3. **Backend Integration**: Extend Django backend with lecturer-specific endpoints
4. **Deployment**: Prepare for production deployment

---

**Status**: ✅ **Ready for Testing and Development**
