import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from '../src/utils/notifications';
import { LocalizationProvider } from '../src/context/LocalizationContext';
import { tokenStorage } from '../utils/tokenStorage';
import initI18n from '../src/i18n';
import * as SplashScreen from 'expo-splash-screen';
import { WebLayout } from '../src/components/WebLayout';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#2ecc71',
        backgroundColor: '#1E1E1E',
        borderLeftWidth: 5,
        height: 70,
        width: '90%',
        borderRadius: 10,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF'
      }}
      text2Style={{
        fontSize: 14,
        color: '#BDC3C7'
      }}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: '#e74c3c',
        backgroundColor: '#1E1E1E',
        borderLeftWidth: 5,
        height: 70,
        width: '90%',
        borderRadius: 10,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF'
      }}
      text2Style={{
        fontSize: 14,
        color: '#BDC3C7'
      }}
    />
  )
};

export default function Layout() {
  const router = useRouter();
  const segments = useSegments();

  const [isI18nInitialized, setIsI18nInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      // Initialize i18n
      await initI18n();
      setIsI18nInitialized(true);

      // Register for push notifications
      registerForPushNotificationsAsync();
    };

    initialize();
  }, []);

  useEffect(() => {
    if (isI18nInitialized) {
      SplashScreen.hideAsync();
    }
  }, [isI18nInitialized]);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      // console.log('Notification received:', notification);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;

      if (data?.type === 'chat_message') {
        if (data.chat_type === 'direct') {
          router.push(`/direct-message/${data.sender_id}`);
        } else if (data.chat_type === 'class') {
          router.push(`/class-chat/${data.chat_id}`);
        } else if (data.chat_type === 'group') {
          router.push(`/group-chat/${data.chat_id}`);
        }
      }
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);

  // Global Auth Guard
  useEffect(() => {
    const checkAuthChange = async () => {
      const inAuthGroup = (segments[0] as string) === '(auth)' || (segments[0] as string) === 'auth' || (segments[0] as string) === 'login' || (segments[0] as string) === 'register' || (segments[0] as string) === 'index' || (segments[0] as string) === 'terms-of-service';
      const token = await tokenStorage.getItem('access_token');

      if (!inAuthGroup && !token && segments.length > 0) {
        const recheckToken = await tokenStorage.getItem('access_token');
        if (!recheckToken) {
          router.replace('/login');
        }
      }
    };

    checkAuthChange();
  }, [segments]);

  if (!isI18nInitialized) {
    return null; // Or a splash screen
  }

  return (
    <LocalizationProvider>
      <StatusBar style="light" />
      <WebLayout>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0a0a0a' },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="auth/forgot-password" />
          <Stack.Screen name="auth/reset-password" />
          <Stack.Screen name="auth/otp" />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="profile-edit" />
          <Stack.Screen name="lecturer-profile" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="notification-settings" />
          <Stack.Screen name="privacy-settings" options={{ headerShown: false }} />
          <Stack.Screen name="verification-request" options={{ headerShown: false }} />
          <Stack.Screen name="intakes" />
          <Stack.Screen name="intake-details/[id]" />
          <Stack.Screen name="intake-details/quizzes" />
          <Stack.Screen name="intake-details/quiz-submissions/[id]" />
          <Stack.Screen name="attendance" />
          <Stack.Screen name="class-attendance" />
          <Stack.Screen name="group-attendance" />
          <Stack.Screen name="class-details/[id]" />
          <Stack.Screen name="group-details/[id]" />
          <Stack.Screen name="class-chat/[id]" />
          <Stack.Screen name="group-chat/[id]" />
          <Stack.Screen name="direct-message/[id]" />
          <Stack.Screen name="messages" />
          <Stack.Screen name="bookings" />
          <Stack.Screen name="send-announcement" />
          <Stack.Screen name="wallet" />
          <Stack.Screen name="attendance-history/[classId]" />
          <Stack.Screen name="group-attendance-history/[groupId]" />
        </Stack>
      </WebLayout>
      <Toast config={toastConfig} topOffset={60} />
    </LocalizationProvider>
  );
}