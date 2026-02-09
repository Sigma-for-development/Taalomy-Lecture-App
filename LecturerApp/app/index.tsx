import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ActivityIndicator, Image, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Redirect, useRouter } from "expo-router";
import { tokenStorage } from '../utils/tokenStorage';
const AsyncStorage = tokenStorage;
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_CONFIG } from '../src/config/api';
import { SeoHead } from '../src/components/SeoHead';
import { useResponsive } from '../src/hooks/useResponsive';

export default function Index() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const isWeb = Platform.OS === 'web';
  const [isLoading, setIsLoading] = useState(!isWeb);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const validateToken = async (accessToken: string) => {
    try {
      // Try to make a request to a protected endpoint to validate the token
      const response = await axios.get(`${API_CONFIG.ACCOUNTS_BASE_URL}userID/`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: 5000 // 5 second timeout to prevent hanging
      });
      return response.status === 200;
    } catch (error) {
      console.log('Token validation failed:', error);
      return false;
    }
  };

  const checkLoginStatus = async () => {
    try {
      // Check if access token exists
      const accessToken = await AsyncStorage.getItem('access_token');
      const userData = await AsyncStorage.getItem('user_data');

      if (accessToken && userData) {
        // Validate the token
        const isTokenValid = await validateToken(accessToken);

        if (isTokenValid) {
          // Check if user is a lecturer
          const user = JSON.parse(userData);
          if (user.user_type === 'lecturer') {
            const hasSeenOnboarding = await AsyncStorage.getItem('has_seen_onboarding');
            console.log('Lecturer auto-login successful', { hasSeenOnboarding });

            if (hasSeenOnboarding === 'true') {
              setIsLoggedIn(true);
            } else {
              setIsLoggedIn(true); // Treat as logged in regardless
            }
          } else {
            console.log('User is not a lecturer, clearing storage');
            await AsyncStorage.removeItem('access_token');
            await AsyncStorage.removeItem('refresh_token');
            await AsyncStorage.removeItem('user_data');
            setIsLoggedIn(false);
          }
        } else {
          // Token is invalid, clear storage and redirect to login
          console.log('Token expired, clearing storage');
          await AsyncStorage.removeItem('access_token');
          await AsyncStorage.removeItem('refresh_token');
          await AsyncStorage.removeItem('user_data');
          setIsLoggedIn(false);
        }
      } else {
        // No tokens found, redirect to login
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('Error checking login status:', error);
      // On error, clear storage and redirect to login
      try {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('refresh_token');
        await AsyncStorage.removeItem('user_data');
      } catch (clearError) {
        console.error('Error clearing storage:', clearError);
      }
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isWeb && isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
        <LinearGradient
          colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }}
        />
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            width: 150,
            height: 150,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}>
            <Image
              source={require('../assets/taalomy-white-txt.png')}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          </View>
          <Text style={{
            fontSize: 24,
            fontWeight: 'bold',
            color: '#ecf0f1',
            marginBottom: 20
          }}>
            {t('app_name')}
          </Text>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={{
            fontSize: 16,
            color: '#bdc3c7',
            marginTop: 20
          }}>
            {t('loading')}
          </Text>
        </View>
      </View>
    );
  }

  if (isLoggedIn) {
    return <Redirect href="/dashboard" />;
  }

  if (!isWeb) {
    return <Redirect href="/login" />;
  }

  const featureCards = [
    {
      title: 'Attendance and rosters',
      description: 'Track class and group attendance with history views, quick check-ins, and clear records.',
      icon: 'checkmark-done-outline',
    },
    {
      title: 'Class and group management',
      description: 'Manage intakes, classes, groups, and student details from one place.',
      icon: 'people-outline',
    },
    {
      title: 'Messaging and announcements',
      description: 'Send announcements, direct messages, and class chat updates without switching tools.',
      icon: 'chatbubbles-outline',
    },
    {
      title: 'Scheduling and bookings',
      description: 'Coordinate sessions, timetables, and bookings with a streamlined workflow.',
      icon: 'calendar-outline',
    },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0a0a0a' }} contentContainerStyle={{ paddingBottom: 80 }}>
      <SeoHead
        title="Lecturer Platform"
        description="Taalomy Lecturer is the platform for lecturers to manage classes, attendance, student communication, grading, and schedules in one app."
        path="/"
      />
      <LinearGradient
        colors={['#0a0a0a', '#111827', '#0b1020']}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 640 }}
      />

      <View style={{ paddingHorizontal: isDesktop ? 80 : 24, paddingTop: 60 }}>
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', alignItems: isDesktop ? 'center' : 'flex-start', gap: 32 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#9ca3af', fontSize: 14, letterSpacing: 1.2, textTransform: 'uppercase' }}>
              Lecturer app for class management
            </Text>
            <Text style={{ color: '#f9fafb', fontSize: isDesktop ? 44 : 32, fontWeight: '700', marginTop: 12 }}>
              Taalomy Lecturer helps you run classes, attendance, and student communication from one place.
            </Text>
            <Text style={{ color: '#d1d5db', fontSize: 18, marginTop: 16, lineHeight: 26 }}>
              Manage intakes, track attendance, schedule sessions, and message students in a single lecturer dashboard. Built for faster workflows and clearer records.
            </Text>
            <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12, marginTop: 28 }}>
              <TouchableOpacity
                onPress={() => router.push('/login')}
                style={{
                  backgroundColor: '#2563eb',
                  paddingVertical: 14,
                  paddingHorizontal: 22,
                  borderRadius: 10,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>Lecturer Login</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/register')}
                style={{
                  backgroundColor: 'transparent',
                  paddingVertical: 14,
                  paddingHorizontal: 22,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#374151',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#e5e7eb', fontSize: 16, fontWeight: '600' }}>Create Lecturer Account</Text>
              </TouchableOpacity>
            </View>
            <View style={{ marginTop: 24 }}>
              <Text style={{ color: '#9ca3af', fontSize: 14 }}>
                Domain: lecturer.taalomy.com
              </Text>
            </View>
          </View>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ width: isDesktop ? 360 : 260, height: isDesktop ? 360 : 260, borderRadius: 28, overflow: 'hidden' }}>
              <LinearGradient
                colors={['#1f2937', '#0f172a', '#111827']}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              >
                <Image
                  source={require('../assets/taalomy-white-txt.png')}
                  style={{ width: '70%', height: '70%' }}
                  resizeMode="contain"
                />
              </LinearGradient>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 60 }}>
          <Text style={{ color: '#f3f4f6', fontSize: 24, fontWeight: '700', marginBottom: 16 }}>
            Everything lecturers need to run classes smoothly
          </Text>
          <View style={{ flexDirection: isDesktop ? 'row' : 'column', flexWrap: 'wrap', gap: 16 }}>
            {featureCards.map((feature) => (
              <View
                key={feature.title}
                style={{
                  flexBasis: isDesktop ? '48%' : '100%',
                  backgroundColor: '#111827',
                  borderRadius: 16,
                  padding: 18,
                  borderWidth: 1,
                  borderColor: '#1f2937',
                }}
              >
                <Ionicons name={feature.icon as any} size={22} color="#60a5fa" />
                <Text style={{ color: '#f9fafb', fontSize: 18, fontWeight: '600', marginTop: 12 }}>
                  {feature.title}
                </Text>
                <Text style={{ color: '#9ca3af', fontSize: 15, lineHeight: 22, marginTop: 8 }}>
                  {feature.description}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ marginTop: 60, backgroundColor: '#0f172a', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#1f2937' }}>
          <Text style={{ color: '#e2e8f0', fontSize: 22, fontWeight: '700' }}>
            Built for lecturer workflows
          </Text>
          <Text style={{ color: '#cbd5f5', fontSize: 16, lineHeight: 24, marginTop: 12 }}>
            Taalomy Lecturer supports attendance tracking, class chat, grading support, student profiles, and booking tools. Use it on the web or mobile to stay aligned with your course schedule.
          </Text>
          <View style={{ marginTop: 20, flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#93c5fd', fontSize: 14, fontWeight: '600', marginBottom: 6 }}>
                Core use cases
              </Text>
              <Text style={{ color: '#e2e8f0', fontSize: 15, lineHeight: 22 }}>
                Attendance history, group sessions, class messaging, announcements, and student progress.
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#93c5fd', fontSize: 14, fontWeight: '600', marginBottom: 6 }}>
                Secure access
              </Text>
              <Text style={{ color: '#e2e8f0', fontSize: 15, lineHeight: 22 }}>
                Lecturer-only access with secure authentication and role checks.
              </Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 60, alignItems: 'center' }}>
          <Text style={{ color: '#f9fafb', fontSize: 26, fontWeight: '700', textAlign: 'center' }}>
            Ready to run your classes on Taalomy?
          </Text>
          <Text style={{ color: '#9ca3af', fontSize: 16, textAlign: 'center', marginTop: 12 }}>
            Sign in or create a lecturer account to get started.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/login')}
            style={{
              backgroundColor: '#3b82f6',
              paddingVertical: 14,
              paddingHorizontal: 26,
              borderRadius: 12,
              alignItems: 'center',
              marginTop: 20,
            }}
          >
            <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>Go to Lecturer Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
