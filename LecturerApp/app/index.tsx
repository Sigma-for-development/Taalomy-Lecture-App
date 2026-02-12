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
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  interpolate
} from 'react-native-reanimated';


export default function Index() {
  const { t, i18n } = useTranslation();
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

  // Background Animation Shared Values
  const drift1X = useSharedValue(0);
  const drift1Y = useSharedValue(0);
  const drift2X = useSharedValue(0);
  const drift2Y = useSharedValue(0);

  useEffect(() => {
    // Main Glow Drift
    drift1X.value = withRepeat(
      withTiming(40, { duration: 25000 }),
      -1,
      true
    );
    drift1Y.value = withRepeat(
      withTiming(-60, { duration: 30000 }),
      -1,
      true
    );

    // Secondary Glow Drift
    drift2X.value = withRepeat(
      withDelay(2000, withTiming(-50, { duration: 22000 })),
      -1,
      true
    );
    drift2Y.value = withRepeat(
      withDelay(1000, withTiming(80, { duration: 28000 })),
      -1,
      true
    );
  }, []);

  const animatedGlow1 = useAnimatedStyle(() => ({
    transform: [
      { translateX: drift1X.value },
      { translateY: drift1Y.value },
    ],
  }));

  const animatedGlow2 = useAnimatedStyle(() => ({
    transform: [
      { translateX: drift2X.value },
      { translateY: drift2Y.value },
    ],
  }));

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


  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0a0a0f' }} contentContainerStyle={{ paddingBottom: 80 }}>
      <SeoHead
        title="Professional Class Management"
        description="Streamline your teaching with Taalomy Lecturer. Manage attendance, student communication, schedules, and more in one powerful dashboard."
        path="/"
        keywords="lecturer dashboard, class management software, attendance tracker web, teacher tools, Taalomy"
      />

      {/* Dynamic Visual Background - Unified Coverage */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0a0a0f', overflow: 'hidden' }}>
        {/* Vibrant Radial Glow - Centered Circle */}
        <Animated.View style={[{
          position: 'absolute',
          width: 1400,
          height: 1400,
          top: -700,
          left: '50%',
          marginLeft: -700,
          borderRadius: 700,
        }, animatedGlow1]}>
          <LinearGradient
            colors={['rgba(52, 152, 219, 0.18)', 'transparent']}
            style={{ flex: 1, borderRadius: 700 }}
          />
        </Animated.View>

        {/* Secondary Glow - Accent Circle */}
        <Animated.View style={[{
          position: 'absolute',
          width: 800,
          height: 800,
          top: 200,
          right: -300,
          borderRadius: 400,
        }, animatedGlow2]}>
          <LinearGradient
            colors={['rgba(52, 152, 219, 0.08)', 'transparent']}
            style={{ flex: 1, borderRadius: 400 }}
          />
        </Animated.View>


      </View>

      {/* Centered Hero Section */}
      <View style={{ paddingHorizontal: 24, paddingTop: isDesktop ? 120 : 60, alignItems: 'center' }}>
        <Animated.View
          entering={FadeInUp.springify().damping(12).stiffness(120)}
          style={{ alignItems: 'center', maxWidth: 900 }}
        >
          {/* Prominent Logo Integration - Significantly Enlarged */}
          <View style={{ marginBottom: 48, alignItems: 'center' }}>
            <Image
              source={require('../assets/taalomy-white-txt.png')}
              style={{ width: isDesktop ? 420 : 260, height: isDesktop ? 120 : 80 }}
              resizeMode="contain"
            />
          </View>

          <View style={{
            backgroundColor: 'rgba(52, 152, 219, 0.18)',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 30,
            marginBottom: 32,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.2)',
          }}>
            <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 }}>
              Available for Web & Mobile
            </Text>
          </View>

          <Text style={{
            color: '#ffffff',
            fontSize: isDesktop ? 84 : 48,
            fontWeight: '800',
            textAlign: 'center',
            lineHeight: isDesktop ? 92 : 54,
            letterSpacing: isDesktop ? -3 : -1.5,
          }}>
            Teach with{'\n'}
            <Text style={{
              color: '#3498db',
              textShadowColor: 'rgba(52, 152, 219, 0.3)',
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 20
            }}>unmatched precision.</Text>
          </Text>

          <Text style={{
            color: '#bdc3c7',
            fontSize: isDesktop ? 22 : 18,
            marginTop: 32,
            lineHeight: isDesktop ? 34 : 28,
            textAlign: 'center',
            maxWidth: 700,
            fontWeight: '400'
          }}>
            A minimalist, high-performance platform for modern educators.{'\n'}
            Manage attendance, messaging, and scheduling with a single click.
          </Text>

          <View style={{
            flexDirection: isDesktop ? 'row' : 'column',
            gap: 20,
            marginTop: 56,
            width: isDesktop ? 'auto' : '100%',
          }}>
            <TouchableOpacity
              onPress={() => router.push('/login')}
              activeOpacity={0.8}
              style={{
                backgroundColor: '#ffffff',
                paddingVertical: 18,
                paddingHorizontal: 40,
                borderRadius: 40,
                alignItems: 'center',
                shadowColor: '#3498db',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
              }}
            >
              <Text style={{ color: '#000000', fontSize: 17, fontWeight: '700' }}>Get Started Free</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/register')}
              activeOpacity={0.7}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                paddingVertical: 18,
                paddingHorizontal: 40,
                borderRadius: 40,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 17, fontWeight: '600' }}>Create Account</Text>
            </TouchableOpacity>
          </View>

          {/* Trusted Badge */}
          <View style={{ marginTop: 48, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {[1, 2, 3].map(i => (
                <View key={i} style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#111111',
                  borderWidth: 2,
                  borderColor: '#000000',
                  marginLeft: i > 1 ? -12 : 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  <Ionicons name="person" size={18} color="#475569" />
                </View>
              ))}
            </View>
            <Text style={{ color: '#64748b', fontSize: 15, fontWeight: '500' }}>
              Trusted by Educators
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* Bento Grid Feature Section - Center Locked */}
      <View style={{
        paddingHorizontal: 24,
        marginTop: isDesktop ? 160 : 80,
        maxWidth: 1200,
        width: '100%',
        alignSelf: 'center'
      }}>
        <Animated.View
          entering={FadeInUp.springify()}
          style={{ marginBottom: 64, alignItems: 'center' }}
        >
          <Text style={{
            color: '#ffffff',
            fontSize: isDesktop ? 48 : 32,
            fontWeight: '800',
            textAlign: 'center',
            letterSpacing: -1
          }}>
            Every detail, simplified.
          </Text>
          <View style={{ height: 4, width: 60, backgroundColor: '#e67e22', marginTop: 16, borderRadius: 2 }} />
        </Animated.View>

        <View style={{
          flexDirection: isDesktop ? 'row' : 'column',
          gap: 24,
          alignItems: 'stretch'
        }}>
          {/* Bento Card 1: Attendance (Large) */}
          <Animated.View
            entering={FadeInUp.delay(200).springify()}
            style={{
              flex: isDesktop ? 2 : undefined,
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 32,
              padding: isDesktop ? 48 : 32,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.08)',
              minHeight: 340,
              justifyContent: 'center',
              overflow: 'hidden'
            }}
          >
            {/* Logo Watermark Integration */}
            <View style={{
              position: 'absolute',
              right: -40,
              bottom: -20,
              opacity: 0.05,
              transform: [{ rotate: '-15deg' }]
            }}>
              <Image
                source={require('../assets/taalomy-white-txt.png')}
                style={{ width: 400, height: 400 }}
                resizeMode="contain"
              />
            </View>
            <Ionicons name="checkmark-done-outline" size={32} color="#3498db" style={{ marginBottom: 20 }} />
            <Text style={{ color: '#ffffff', fontSize: 32, fontWeight: '700' }}>Attendance Redefined</Text>
            <Text style={{ color: '#bdc3c7', fontSize: 18, marginTop: 16, lineHeight: 28, maxWidth: 400 }}>
              Quick check-ins, automated history, and detailed rosters. Speed through administrative tasks and focus on your students.
            </Text>
          </Animated.View>

          {/* Vertical Stack for Smaller Cards - For Perfect Alignment */}
          <View style={{
            flex: 1,
            gap: 24,
            flexDirection: 'column',
          }}>
            {/* Bento Card 2: Messaging (Small) */}
            <Animated.View
              entering={FadeInUp.delay(300).springify()}
              style={{
                flex: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 32,
                padding: 32,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.08)',
              }}
            >
              <Ionicons name="chatbubbles-outline" size={28} color="#3498db" style={{ marginBottom: 16 }} />
              <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: '700' }}>Direct Connect</Text>
              <Text style={{ color: '#95a5a6', fontSize: 15, marginTop: 8, lineHeight: 22 }}>
                Announcements and direct messaging that actually get read.
              </Text>
            </Animated.View>

            {/* Bento Card 3: Management (Small) */}
            <Animated.View
              entering={FadeInUp.delay(400).springify()}
              style={{
                flex: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 32,
                padding: 32,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.08)',
              }}
            >
              <Ionicons name="people-outline" size={28} color="#3498db" style={{ marginBottom: 16 }} />
              <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: '700' }}>Group Control</Text>
              <Text style={{ color: '#95a5a6', fontSize: 15, marginTop: 8, lineHeight: 22 }}>
                Organize intakes and student details with professional clarity.
              </Text>
            </Animated.View>
          </View>
        </View>

        {/* Bento Card 4: Scheduling (Large Row Below) */}
        <Animated.View
          entering={FadeInUp.delay(500).springify()}
          style={{
            marginTop: 24,
            width: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 32,
            padding: isDesktop ? 48 : 32,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.08)',
            minHeight: 220,
            flexDirection: isDesktop ? 'row' : 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24
          }}
        >
          <View style={{ flex: 1.5 }}>
            <Ionicons name="calendar-outline" size={32} color="#3498db" style={{ marginBottom: 20 }} />
            <Text style={{ color: '#ffffff', fontSize: 32, fontWeight: '700' }}>Master Schedule</Text>
            <Text style={{ color: '#bdc3c7', fontSize: 17, marginTop: 12, lineHeight: 26, maxWidth: 500 }}>
              Visualize your academic path. Coordinate sessions and bookings without cross-platform friction.
            </Text>
          </View>
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(52, 152, 219, 0.08)',
            height: '100%',
            minHeight: 140,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: 'rgba(52, 152, 219, 0.15)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            width: isDesktop ? 'auto' : '100%'
          }}>
            <Ionicons name="time-outline" size={56} color="#3498db" />
            <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '700', marginTop: 16 }}>Optimized Bookings</Text>
          </View>
        </Animated.View>
      </View>

      <Animated.View
        entering={FadeInUp.delay(1000)}
        style={{
          marginTop: 80,
          backgroundColor: 'rgba(52, 152, 219, 0.08)',
          borderRadius: 32,
          padding: isDesktop ? 48 : 24,
          borderWidth: 1,
          borderColor: 'rgba(52, 152, 219, 0.2)',
          maxWidth: 1200,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <Text style={{ color: '#f9fafb', fontSize: 26, fontWeight: '800' }}>
          Built for professional workflows
        </Text>
        <Text style={{ color: '#bdc3c7', fontSize: 16, lineHeight: 26, marginTop: 16, maxWidth: 800 }}>
          Taalomy Lecturer isn't just a dashboard—it's a productivity engine. From automated attendance to seamless group communication, we've optimized every interaction to save you time and reduce administrative friction.
        </Text>
        <View style={{ marginTop: 40, flexDirection: isDesktop ? 'row' : 'column', gap: 32 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Ionicons name="analytics" size={20} color="#3498db" />
              <Text style={{ color: '#f3f4f6', fontSize: 18, fontWeight: '700' }}>Smart Insights</Text>
            </View>
            <Text style={{ color: '#95a5a6', fontSize: 15, lineHeight: 24 }}>
              Track student progress and attendance trends with real-time analytics. Make data-driven decisions that improve classroom outcomes.
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Ionicons name="lock-closed" size={20} color="#3498db" />
              <Text style={{ color: '#f3f4f6', fontSize: 18, fontWeight: '700' }}>Privacy First</Text>
            </View>
            <Text style={{ color: '#95a5a6', fontSize: 15, lineHeight: 24 }}>
              Your data is yours. We use institutional-grade encryption to ensure student records and personal communications stay private and secure.
            </Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(1200)}
        style={{ marginTop: 100, marginBottom: 100, alignItems: 'center', maxWidth: 900, alignSelf: 'center', width: '90%' }}
      >
        <View style={{
          backgroundColor: '#3498db',
          width: 80,
          height: 80,
          borderRadius: 40,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
          shadowColor: '#3498db',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.4,
          shadowRadius: 20,
        }}>
          <Ionicons name="rocket" size={40} color="#ffffff" />
        </View>
        <Text style={{ color: '#f9fafb', fontSize: isDesktop ? 40 : 28, fontWeight: '800', textAlign: 'center', maxWidth: 700 }}>
          Ready to elevate your teaching{'\n'}
          experience?
        </Text>
        <Text style={{ color: '#bdc3c7', fontSize: 18, textAlign: 'center', marginTop: 16, maxWidth: 500 }}>
          Join the community of modern educators using Taalomy to run their sessions.
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/login')}
          activeOpacity={0.8}
          style={{
            backgroundColor: '#3498db',
            paddingVertical: 18,
            paddingHorizontal: 40,
            borderRadius: 16,
            alignItems: 'center',
            marginTop: 40,
            shadowColor: '#3498db',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '700' }}>Get Started Now</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Footer */}
      <View style={{ paddingVertical: 40, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.05)', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Image
            source={require('../assets/taalomy-white-txt.png')}
            style={{ width: 140, height: 40 }}
            resizeMode="contain"
          />
        </View>
        <Text style={{ color: '#6b7280', fontSize: 14 }}>
          © 2026 Taalomy Lecturer. All rights reserved.
        </Text>
        <View style={{ flexDirection: 'row', gap: 24, marginTop: 16 }}>
          <Text style={{ color: '#9ca3af', fontSize: 14 }}>Privacy</Text>
          <Text style={{ color: '#9ca3af', fontSize: 14 }}>Terms</Text>
          <Text style={{ color: '#9ca3af', fontSize: 14 }}>Support</Text>
        </View>
      </View>
    </ScrollView>
  );
}
