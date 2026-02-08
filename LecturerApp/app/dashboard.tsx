import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  RefreshControl,
  Dimensions,
  Platform,
  Animated,
  PanResponder
} from 'react-native';
import Toast from 'react-native-toast-message';
import { router, useFocusEffect } from 'expo-router';
import { tokenStorage } from '../utils/tokenStorage';
const AsyncStorage = tokenStorage;
import { useResponsive } from '../src/hooks/useResponsive';
import { useTranslation } from 'react-i18next'; // Added import
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ProfilePicture from '../src/components/ProfilePicture';
import IntakeSelectionModal from '../src/components/IntakeSelectionModal';
import { appEventEmitter } from '../src/utils/eventEmitter';
import { lecturerAPI } from '../src/utils/api';

// Width will be handled by the hook inside the component

interface UserData {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  date_of_birth: string;
  address: string;
  user_type: string;
  profile_picture_url?: string;
}

// Add these new interfaces for recent activity data
interface RecentActivity {
  id: number;
  type: 'attendance' | 'booking' | 'review' | 'class' | 'intake';
  title: string;
  description: string;
  time: string;
  icon: 'checkmark-circle-outline' | 'calendar-outline' | 'star-outline' | 'library-outline' | 'book-outline';
  iconColor: string;
}

interface ClassAttendance {
  id: number;
  class_name: string;
  attendance_code: string;
  is_active: boolean;
  created_at: string;
  expires_at: string;
}

interface Booking {
  id: number;
  student_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  subject: string;
  created_at: string;
  total_amount: number;
}

interface Review {
  id: number;
  student_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface Intake {
  id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  max_students: number;
  current_students: number;
  status: string;
}

interface Class {
  id: number;
  name: string;
  description: string;
  max_students: number;
  current_students: number;
  created_at: string;
  venue?: string;
  start_time?: string;
  end_time?: string;
  days_of_week?: string;
}

interface ScheduleItem {
  id: number;
  type: 'class' | 'group';
  name: string;
  venue?: string;
  start_time?: string;
  end_time?: string;
  days_of_week?: string;
}

const Dashboard = () => {
  const { t } = useTranslation();
  const { isDesktop, isWeb, width, containerStyle } = useResponsive();
  const [showWelcome, setShowWelcome] = useState(true);
  const [showQuizIntakeModal, setShowQuizIntakeModal] = useState(false);
  const pan = useRef(new Animated.ValueXY()).current;

  useEffect(() => {
    checkWelcomeStatus();
  }, []);

  const checkWelcomeStatus = async () => {
    try {
      const dismissed = await AsyncStorage.getItem('welcome_dismissed');
      if (dismissed === 'true') {
        setShowWelcome(false);
      }
    } catch (error) {
      console.error('Error checking welcome status:', error);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event(
        [
          null,
          { dx: pan.x }
        ],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 120) {
          // Swipe threshold met
          Animated.timing(pan, {
            toValue: { x: gestureState.dx > 0 ? width : -width, y: 0 },
            duration: 200,
            useNativeDriver: false
          }).start(() => {
            setShowWelcome(false);
            AsyncStorage.setItem('welcome_dismissed', 'true');
          });
        } else {
          // Reset
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false
          }).start();
        }
      }
    })
  ).current;

  const [userData, setUserData] = useState<UserData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  interface DashboardStats {
    intakes: number;
    students: number;
    pendingGrades: number;
    todayClasses: number;
    pendingBookings: number;
  }
  const [stats, setStats] = useState<DashboardStats>({
    intakes: 0,
    students: 0,
    pendingGrades: 0,
    todayClasses: 0,
    pendingBookings: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  // Add state for recent activities
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  // Add state for unread messages count
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loadingUnreadMessages, setLoadingUnreadMessages] = useState(true);
  const [todaySchedule, setTodaySchedule] = useState<ScheduleItem[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  useEffect(() => {
    loadUserData();
    loadDashboardStats();
    loadTodaySchedule();
    loadPendingBookings();
    loadUnreadMessages();
  }, []);

  // Add focus effect to refresh when user returns to this screen
  useFocusEffect(
    useCallback(() => {
      // Add a small delay to ensure the server has processed the mark_read event
      const timer = setTimeout(() => {
        loadUnreadMessages();
      }, 1000);

      return () => clearTimeout(timer);
    }, [])
  );

  // Listen for profile updates across the app
  useEffect(() => {
    const handleProfileUpdate = (updatedUserData: any) => {
      console.log('Received profile update event:', updatedUserData);
      setUserData(updatedUserData);
    };

    // Add event listener
    appEventEmitter.on('userProfileUpdated', handleProfileUpdate);

    // Cleanup
    return () => {
      appEventEmitter.off('userProfileUpdated', handleProfileUpdate);
    };
  }, []);

  const loadUserData = async () => {
    try {
      const userDataString = await AsyncStorage.getItem('user_data');
      if (userDataString) {
        const user = JSON.parse(userDataString);

        // Ensure profile_picture_url is properly set
        if (user.profile_picture && !user.profile_picture_url) {
          user.profile_picture_url = user.profile_picture;
        } else if (!user.profile_picture && !user.profile_picture_url) {
          user.profile_picture_url = null;
        }

        setUserData(user);

        // Fetch the latest user data from server
        try {
          const response = await lecturerAPI.getUserProfile();
          const updatedUser = response.data;

          // Ensure profile_picture_url is properly set
          if (updatedUser.profile_picture && !updatedUser.profile_picture_url) {
            updatedUser.profile_picture_url = updatedUser.profile_picture;
          } else if (!updatedUser.profile_picture && !updatedUser.profile_picture_url) {
            updatedUser.profile_picture_url = null;
          }

          setUserData(updatedUser as UserData);
          await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
        } catch (fetchError) {
          console.error('Error fetching latest user data:', fetchError);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadDashboardStats = async () => {
    try {
      setLoadingStats(true);
      setLoadingActivities(true);

      const response = await lecturerAPI.getDashboardStats();

      if (response.data.stats) {
        setStats(response.data.stats);
      } else {
        setStats(response.data);
      }

      if (response.data.recentActivities) {
        setRecentActivities(response.data.recentActivities);
      }

    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      Toast.show({
        type: 'error',
        text1: t('dashboard_loading_failed'),
        text2: t('dashboard_loading_failed_msg')
      });
    } finally {
      setLoadingStats(false);
      setLoadingActivities(false);
    }
  };

  // loadRecentActivities function removed as it is now consolidated into loadDashboardStats

  // Add helper function to format time ago
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return t('just_now');
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return t('minutes_ago', { count: minutes });
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return t('hours_ago', { count: hours });
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return t('days_ago', { count: days });
    }
  };

  // Add function to load unread messages count
  const loadUnreadMessages = async () => {
    try {
      setLoadingUnreadMessages(true);
      const response = await lecturerAPI.getUnreadCount();
      setUnreadMessages(response.data.count);
    } catch (error) {
      console.error('Error loading unread messages:', error);
      setUnreadMessages(0);
    } finally {
      setLoadingUnreadMessages(false);
    }
  };

  const loadTodaySchedule = async () => {
    try {
      setLoadingSchedule(true);
      const [classesRes, groupsRes] = await Promise.all([
        lecturerAPI.getClasses(),
        lecturerAPI.getGroups()
      ]);

      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = days[new Date().getDay()];

      const classes: ScheduleItem[] = classesRes.data
        .filter((c: any) => c.days_of_week?.split(',').map((d: string) => d.trim().toLowerCase()).includes(today.toLowerCase()))
        .map((c: any) => ({ ...c, type: 'class' }));

      const groups: ScheduleItem[] = groupsRes.data
        .filter((g: any) => g.days_of_week?.split(',').map((d: string) => d.trim().toLowerCase()).includes(today.toLowerCase()))
        .map((g: any) => ({ ...g, type: 'group' }));

      const combined = [...classes, ...groups].sort((a, b) => {
        if (!a.start_time) return 1;
        if (!b.start_time) return -1;
        return a.start_time.localeCompare(b.start_time);
      });

      setTodaySchedule(combined);
    } catch (error) {
      console.error('Error loading today schedule:', error);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const loadPendingBookings = async () => {
    try {
      setLoadingBookings(true);
      const response = await lecturerAPI.getBookings();
      if (response.status === 200) {
        const pending = response.data
          .filter((b: Booking) => b.status === 'pending')
          .sort((a: Booking, b: Booking) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime())
          .slice(0, 3);
        setPendingBookings(pending);
      }
    } catch (error) {
      console.error('Error loading pending bookings:', error);
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleDashboardBookingAction = async (bookingId: number, action: string) => {
    try {
      const response = await lecturerAPI.bookingAction(bookingId, { action });
      if (response.status === 200) {
        Toast.show({
          type: 'success',
          text1: t('success'),
          text2: t(`booking_${action}_success`, { defaultValue: `Booking ${action}ed successfully` })
        });
        loadPendingBookings();
        loadDashboardStats(); // Refresh stats too
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('update_failed')
      });
    }
  };

  const formatTimeSnippet = (timeString: string) => {
    if (!timeString) return '';
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return timeString;
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    await loadDashboardStats();
    await loadTodaySchedule();
    await loadUnreadMessages(); // Refresh unread messages
    setRefreshing(false);
    setRefreshing(false);
    Toast.show({
      type: 'success',
      text1: t('refreshed'),
      text2: t('dashboard_updated')
    });
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmMsg = t('logout_confirm_msg') || "Are you sure you want to log out?";
      if (window.confirm(confirmMsg)) {
        try {
          // Use consistent storage clearing
          await AsyncStorage.removeItem('access_token');
          await AsyncStorage.removeItem('refresh_token');
          await AsyncStorage.removeItem('user_data');
          router.replace('/');
        } catch (error) {
          console.error('Error during logout:', error);
        }
      }
    } else {
      Alert.alert(
        t('logout_confirm_title'),
        t('logout_confirm_msg'),
        [
          {
            text: t('cancel'),
            style: 'cancel',
          },
          {
            text: t('logout'),
            style: 'destructive',
            onPress: async () => {
              try {
                await AsyncStorage.removeItem('access_token');
                await AsyncStorage.removeItem('refresh_token');
                await AsyncStorage.removeItem('user_data');
                router.replace('/');
              } catch (error) {
                console.error('Error during logout:', error);
              }
            },
          },
        ]
      );
    }
  };

  const handleNavigation = (screen: string) => {
    if (screen === 'Send Announcement') {
      router.push('/send-announcement');
    } else {
      // For now, show a placeholder toast
      Toast.show({
        type: 'info',
        text1: t('coming_soon'),
        text2: t('feature_coming_soon', { feature: screen })
      });
    }
  };

  if (!userData) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#ecf0f1' }}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Professional Dark Background */}
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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          { paddingBottom: 40 },
          containerStyle as any
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3498db"
            colors={['#3498db']}
          />
        }
      >
        <View style={{
          flexDirection: isDesktop ? 'row' : 'column',
          gap: isDesktop ? 32 : 0,
          paddingHorizontal: isDesktop ? 24 : 0,
        }}>
          {/* Main Content Area */}
          <View style={{ flex: isDesktop ? 2 : 1 }}>
            {/* Header */}
            <View style={{
              paddingTop: Platform.OS === 'ios' ? 60 : 40,
              paddingHorizontal: 24,
              paddingBottom: 20,
            }}>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 28,
                    fontWeight: 'bold',
                    color: '#ecf0f1',
                    marginBottom: 4,
                  }}>
                    {t('welcome_back_simple')}
                  </Text>
                  <Text style={{
                    fontSize: 20,
                    color: '#3498db',
                    fontWeight: '600',
                  }}>
                    {t('doctor_prefix')} {userData.first_name} {userData.last_name}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => router.push('/settings')}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="settings-outline" size={24} color="#ecf0f1" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push('/profile-edit')}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="person-outline" size={24} color="#3498db" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleLogout}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="log-out-outline" size={24} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Lecturer Status Card */}
              {showWelcome && (
                <Animated.View
                  style={{
                    transform: [{ translateX: pan.x }],
                  }}
                  {...panResponder.panHandlers}
                >
                  <View style={{
                    backgroundColor: 'rgba(52, 152, 219, 0.2)',
                    borderRadius: 16,
                    padding: 20,
                    borderWidth: 1,
                    borderColor: '#3498db',
                    marginBottom: 24,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: 'rgba(52, 152, 219, 0.3)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginEnd: 12,
                      }}>
                        <Ionicons name="school-outline" size={20} color="#3498db" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: 16,
                          fontWeight: '600',
                          color: '#ecf0f1',
                        }}>
                          {t('lecturer_portal_title')}
                        </Text>
                        <Text style={{
                          fontSize: 12,
                          color: '#bdc3c7',
                        }}>
                          {t('academic_system')}
                        </Text>
                      </View>
                    </View>
                    <Text style={{
                      fontSize: 14,
                      color: '#bdc3c7',
                      lineHeight: 20,
                    }}>
                      {t('lecturer_portal_desc')}
                    </Text>
                  </View>
                </Animated.View>
              )}
            </View>

            {/* Timetable Button */}
            <TouchableOpacity
              onPress={() => router.push('/timetable')}
              style={{
                marginHorizontal: 24,
                marginBottom: 20,
                borderRadius: 16,
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={['#2980b9', '#3498db']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  padding: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: '#fff',
                    marginBottom: 4,
                  }}>
                    {t('my_timetable')}
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: 'rgba(255, 255, 255, 0.8)',
                  }}>
                    {t('view_schedule')}
                  </Text>
                </View>
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Ionicons name="calendar-outline" size={24} color="#fff" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Quick Stats */}
            <View style={{ paddingHorizontal: 24, marginBottom: 30 }}>
              <Text style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: '#ecf0f1',
                marginBottom: 16,
              }}>
                {t('quick_overview')}
              </Text>
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: isDesktop ? 16 : 0,
                justifyContent: isDesktop ? 'flex-start' : 'space-between',
              }}>
                <TouchableOpacity
                  onPress={() => router.push('/intakes')}
                  style={{
                    flex: isDesktop ? 1 : 0,
                    minWidth: isDesktop ? 280 : (width - 60) / 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 16,
                    padding: 24,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                  }}>
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: 'rgba(52, 152, 219, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}>
                    <Ionicons name="library-outline" size={20} color="#3498db" />
                  </View>
                  <Text style={{
                    fontSize: 24,
                    fontWeight: 'bold',
                    color: '#3498db',
                    marginBottom: 4,
                  }}>
                    {loadingStats ? '...' : stats.intakes}
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: '#bdc3c7',
                  }}>
                    {t('active_intakes')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/demo-sessions')}
                  style={{
                    flex: isDesktop ? 1 : 0,
                    minWidth: isDesktop ? 280 : (width - 60) / 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 16,
                    padding: 24,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: '#2ecc71', // Green border for Demos
                  }}>
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: 'rgba(46, 204, 113, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}>
                    <Ionicons name="flask-outline" size={20} color="#2ecc71" />
                  </View>
                  <Text style={{
                    fontSize: 24,
                    fontWeight: 'bold',
                    color: '#2ecc71',
                    marginBottom: 4,
                  }}>
                    {t('demos')}
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: '#bdc3c7',
                  }}>
                    {t('trial_sessions')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/students')}
                  style={{
                    flex: isDesktop ? 1 : 0,
                    minWidth: isDesktop ? 280 : (width - 60) / 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 16,
                    padding: 24,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                  }}>
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: 'rgba(46, 204, 113, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}>
                    <Ionicons name="people-outline" size={20} color="#2ecc71" />
                  </View>
                  <Text style={{
                    fontSize: 24,
                    fontWeight: 'bold',
                    color: '#2ecc71',
                    marginBottom: 4,
                  }}>
                    {loadingStats ? '...' : stats.students}
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: '#bdc3c7',
                  }}>
                    {t('total_students')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/grading')}
                  style={{
                    flex: isDesktop ? 1 : 0,
                    minWidth: isDesktop ? 280 : (width - 60) / 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 16,
                    padding: 24,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                  }}>
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: 'rgba(241, 196, 15, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}>
                    <Ionicons name="document-text-outline" size={20} color="#f1c40f" />
                  </View>
                  <Text style={{
                    fontSize: 24,
                    fontWeight: 'bold',
                    color: '#f1c40f',
                    marginBottom: 4,
                  }}>
                    {loadingStats ? '...' : stats.pendingGrades}
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: '#bdc3c7',
                  }}>
                    {t('pending_grades')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/timetable')}
                  style={{
                    flex: isDesktop ? 1 : 0,
                    minWidth: isDesktop ? 280 : (width - 60) / 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 16,
                    padding: 24,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                  }}>
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: 'rgba(155, 89, 182, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}>
                    <Ionicons name="calendar-outline" size={20} color="#9b59b6" />
                  </View>
                  <Text style={{
                    fontSize: 24,
                    fontWeight: 'bold',
                    color: '#9b59b6',
                    marginBottom: 4,
                  }}>
                    {loadingStats ? '...' : stats.todayClasses}
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: '#bdc3c7',
                  }}>
                    {t('classes_today')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={{ paddingHorizontal: 24, marginBottom: 30 }}>
              <Text style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: '#ecf0f1',
                marginBottom: 16,
              }}>
                {t('quick_actions')}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: isDesktop ? 16 : 0,
                  justifyContent: isDesktop ? 'flex-start' : 'space-between',
                }}
              >
                <TouchableOpacity
                  style={{
                    flex: isDesktop ? 1 : 0,
                    minWidth: isDesktop ? 220 : (width - 60) / 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    alignItems: 'center',
                  }}
                  onPress={() => router.push('/intakes')}
                >
                  <View style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: 'rgba(52, 152, 219, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}>
                    <Ionicons name="school-outline" size={24} color="#3498db" />
                  </View>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#ecf0f1',
                    textAlign: 'center',
                  }}>
                    {t('manage_intakes')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: isDesktop ? 1 : 0,
                    minWidth: isDesktop ? 220 : (width - 60) / 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    alignItems: 'center',
                  }}
                  onPress={() => router.push('/upload-video/new')}
                >
                  <View style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: 'rgba(211, 84, 0, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}>
                    <Ionicons name="videocam-outline" size={24} color="#d35400" />
                  </View>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#ecf0f1',
                    textAlign: 'center',
                  }}>
                    Upload Video
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: isDesktop ? 1 : 0,
                    minWidth: isDesktop ? 220 : (width - 60) / 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    alignItems: 'center',
                  }}
                  onPress={() => setShowQuizIntakeModal(true)}
                >
                  <View style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: 'rgba(231, 76, 60, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}>
                    <Ionicons name="clipboard-outline" size={24} color="#e74c3c" />
                  </View>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#ecf0f1',
                    textAlign: 'center',
                  }}>
                    {t('create_start_quiz')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: isDesktop ? 1 : 0,
                    minWidth: isDesktop ? 220 : (width - 60) / 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    alignItems: 'center',
                  }}
                  onPress={() => handleNavigation('Send Announcement')}
                >
                  <View style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: 'rgba(155, 89, 182, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}>
                    <Ionicons name="mail-outline" size={24} color="#9b59b6" />
                  </View>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#ecf0f1',
                    textAlign: 'center',
                  }}>
                    {t('send_announcement')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: isDesktop ? 1 : 0,
                    minWidth: isDesktop ? 220 : (width - 60) / 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    alignItems: 'center',
                  }}
                  onPress={() => router.push('/lecturer-profile')}
                >
                  <View style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: 'rgba(39, 174, 96, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}>
                    <Ionicons name="briefcase-outline" size={24} color="#27ae60" />
                  </View>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#ecf0f1',
                    textAlign: 'center',
                  }}>
                    {t('professional_profile')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: isDesktop ? 1 : 0,
                    minWidth: isDesktop ? 220 : (width - 60) / 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    alignItems: 'center',
                  }}
                  onPress={() => router.push('/bookings')}
                >
                  <View style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: 'rgba(243, 156, 18, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}>
                    <Ionicons name="calendar-outline" size={24} color="#f39c12" />
                  </View>
                  {stats.pendingBookings > 0 && (
                    <View style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      backgroundColor: '#e74c3c',
                      borderRadius: 10,
                      minWidth: 20,
                      height: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 4,
                    }}>
                      <Text style={{
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 'bold',
                      }}>
                        {stats.pendingBookings}
                      </Text>
                    </View>
                  )}
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#ecf0f1',
                    textAlign: 'center',
                  }}>
                    {t('manage_bookings')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: isDesktop ? 1 : 0,
                    minWidth: isDesktop ? 220 : (width - 60) / 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    alignItems: 'center',
                  }}
                  onPress={() => router.push('/attendance')}
                >
                  <View style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: 'rgba(231, 76, 60, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}>
                    <Ionicons name="checkmark-circle-outline" size={24} color="#e74c3c" />
                  </View>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#ecf0f1',
                    textAlign: 'center',
                  }}>
                    {t('attendance')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: isDesktop ? 1 : 0,
                    minWidth: isDesktop ? 220 : (width - 60) / 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    alignItems: 'center',
                  }}
                  onPress={() => router.push('/wallet')}
                >
                  <View style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: 'rgba(41, 128, 185, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}>
                    <Ionicons name="wallet-outline" size={24} color="#2980b9" />
                  </View>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#ecf0f1',
                    textAlign: 'center',
                  }}>
                    {t('wallet')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: isDesktop ? 1 : 0,
                    minWidth: isDesktop ? 220 : (width - 60) / 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    alignItems: 'center',
                  }}
                  onPress={() => router.push('/messages')}
                >
                  <View style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: 'rgba(0, 122, 255, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}>
                    <Ionicons name="chatbubble-ellipses-outline" size={24} color="#007AFF" />
                    {unreadMessages > 0 && (
                      <View style={{
                        position: 'absolute',
                        top: -5,
                        right: -5,
                        backgroundColor: '#e74c3c',
                        borderRadius: 10,
                        minWidth: 20,
                        height: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 5,
                      }}>
                        <Text style={{
                          color: '#fff',
                          fontSize: 12,
                          fontWeight: 'bold',
                        }}>
                          {unreadMessages > 99 ? '99+' : unreadMessages}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#ecf0f1',
                    textAlign: 'center',
                  }}>
                    {t('messages')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: isDesktop ? 1 : 0,
                    minWidth: isDesktop ? 220 : (width - 60) / 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    alignItems: 'center',
                  }}
                  onPress={() => router.push('/lecturer-hub')}
                >
                  <View style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: 'rgba(155, 89, 182, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}>
                    <Ionicons name="people-outline" size={24} color="#9b59b6" />
                  </View>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#ecf0f1',
                    textAlign: 'center',
                  }}>
                    {t('lecturer_hub.title')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={{ flex: isDesktop ? 1 : 1, paddingTop: isDesktop ? 60 : 0 }}>
            {/* Today's Schedule Snippet */}
            <View style={{ paddingHorizontal: 24, marginBottom: 30 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 4, height: 24, backgroundColor: '#3498db', borderRadius: 2, marginRight: 12 }} />
                  <Text style={{
                    fontSize: 22,
                    fontWeight: '800',
                    color: '#ffffff',
                    letterSpacing: 0.5,
                  }}>
                    {t('today_schedule')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push('/timetable')}
                  style={{
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                  }}
                >
                  <Text style={{ color: '#3498db', fontSize: 13, fontWeight: '700' }}>{t('view_all')}</Text>
                </TouchableOpacity>
              </View>

              <View style={{ gap: 12 }}>
                {loadingSchedule ? (
                  <View style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 20,
                    padding: 40,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.05)',
                  }}>
                    <Text style={{ color: '#bdc3c7' }}>{t('loading')}</Text>
                  </View>
                ) : todaySchedule.length > 0 ? (
                  todaySchedule.map((item) => (
                    <TouchableOpacity
                      key={`${item.type}-${item.id}`}
                      onPress={() => router.push(item.type === 'class' ? `/class-details/${item.id}` : `/group-details/${item.id}`)}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        borderRadius: 20,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.08)',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.2,
                        shadowRadius: 8,
                      }}
                    >
                      <LinearGradient
                        colors={item.type === 'class' ? ['#3498db', '#2980b9'] : ['#9b59b6', '#8e44ad']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: 15,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 16,
                        }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '900', color: '#ffffff' }}>
                          {item.start_time ? formatTimeSnippet(item.start_time).split(' ')[0] : 'TBA'}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#ffffff', fontWeight: '700', opacity: 0.9 }}>
                          {item.start_time ? formatTimeSnippet(item.start_time).split(' ')[1] : ''}
                        </Text>
                      </LinearGradient>

                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                          <View style={{
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 6,
                            backgroundColor: item.type === 'class' ? 'rgba(52, 152, 219, 0.15)' : 'rgba(155, 89, 182, 0.15)',
                            marginRight: 8,
                          }}>
                            <Text style={{
                              fontSize: 10,
                              fontWeight: '800',
                              color: item.type === 'class' ? '#3498db' : '#9b59b6',
                              textTransform: 'uppercase'
                            }}>
                              {t(item.type)}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 17, color: '#ffffff', fontWeight: '700', marginBottom: 6 }} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="location-sharp" size={14} color="#95a5a6" style={{ marginRight: 6 }} />
                          <Text style={{ fontSize: 13, color: '#95a5a6', fontWeight: '500' }} numberOfLines={1}>
                            {item.venue || t('no_venue')}
                          </Text>
                        </View>
                      </View>

                      <View style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Ionicons name="chevron-forward" size={20} color="#ffffff" />
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 20,
                    padding: 40,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.05)',
                  }}>
                    <LinearGradient
                      colors={['rgba(149, 165, 166, 0.1)', 'rgba(149, 165, 166, 0.05)']}
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 30,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 16,
                      }}
                    >
                      <Ionicons name="calendar-outline" size={30} color="#95a5a6" />
                    </LinearGradient>
                    <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700', marginBottom: 4 }}>
                      {t('no_classes_today')}
                    </Text>
                    <Text style={{ color: '#95a5a6', fontSize: 14, textAlign: 'center' }}>
                      {t('schedule_appear_msg')}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Pending Bookings Snippet */}
            <View style={{ paddingHorizontal: 24, marginBottom: 30 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 4, height: 24, backgroundColor: '#f39c12', borderRadius: 2, marginRight: 12 }} />
                  <Text style={{
                    fontSize: 22,
                    fontWeight: '800',
                    color: '#ffffff',
                    letterSpacing: 0.5,
                  }}>
                    {t('pending_bookings')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push('/bookings')}
                  style={{
                    backgroundColor: 'rgba(243, 156, 18, 0.1)',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                  }}
                >
                  <Text style={{ color: '#f39c12', fontSize: 13, fontWeight: '700' }}>{t('view_all')}</Text>
                </TouchableOpacity>
              </View>

              <View style={{ gap: 12 }}>
                {loadingBookings ? (
                  <View style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 20,
                    padding: 40,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.05)',
                  }}>
                    <Text style={{ color: '#bdc3c7' }}>{t('loading')}</Text>
                  </View>
                ) : pendingBookings.length > 0 ? (
                  pendingBookings.map((booking) => (
                    <View
                      key={`booking-${booking.id}`}
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        borderRadius: 20,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, color: '#ffffff', fontWeight: '700', marginBottom: 2 }}>
                            {booking.student_name}
                          </Text>
                          <Text style={{ fontSize: 13, color: '#95a5a6' }}>
                            {booking.subject}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 14, color: '#f39c12', fontWeight: '700' }}>
                            {new Date(booking.booking_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#7f8c8d' }}>
                            {booking.start_time.split(':').slice(0, 2).join(':')}
                          </Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity
                          onPress={() => handleDashboardBookingAction(booking.id, 'confirm')}
                          style={{
                            flex: 1,
                            height: 36,
                            borderRadius: 10,
                            backgroundColor: 'rgba(46, 204, 113, 0.15)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: 'rgba(46, 204, 113, 0.2)',
                          }}
                        >
                          <Text style={{ color: '#2ecc71', fontSize: 13, fontWeight: '700' }}>{t('confirm') || 'Confirm'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDashboardBookingAction(booking.id, 'cancel')}
                          style={{
                            flex: 1,
                            height: 36,
                            borderRadius: 10,
                            backgroundColor: 'rgba(231, 76, 60, 0.1)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: 'rgba(231, 76, 60, 0.2)',
                          }}
                        >
                          <Text style={{ color: '#e74c3c', fontSize: 13, fontWeight: '700' }}>{t('decline') || 'Decline'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 20,
                    padding: 40,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.05)',
                  }}>
                    <Ionicons name="calendar-outline" size={32} color="rgba(255,255,255,0.1)" />
                    <Text style={{ color: '#95a5a6', marginTop: 12, fontWeight: '600' }}>{t('no_pending_bookings')}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Recent Activity */}
            <View style={{ paddingHorizontal: 24, marginBottom: 30 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ width: 4, height: 24, backgroundColor: '#e67e22', borderRadius: 2, marginRight: 12 }} />
                <Text style={{
                  fontSize: 22,
                  fontWeight: '800',
                  color: '#ffffff',
                  letterSpacing: 0.5,
                }}>
                  {t('recent_activity')}
                </Text>
              </View>

              <View style={{ gap: 12 }}>
                {loadingActivities ? (
                  <View style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 20,
                    padding: 40,
                    alignItems: 'center',
                  }}>
                    <Text style={{ color: '#bdc3c7' }}>{t('loading_activities')}</Text>
                  </View>
                ) : recentActivities.length > 0 ? (
                  recentActivities.map((activity) => (
                    <View
                      key={`${activity.type}-${activity.id}`}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: 18,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      <View style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: `rgba(${hexToRgb(activity.iconColor)}, 0.15)`,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 14,
                      }}>
                        <Ionicons name={activity.icon} size={22} color={activity.iconColor} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: 15,
                          color: '#ffffff',
                          fontWeight: '600',
                          marginBottom: 4,
                        }}>
                          {activity.title}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={{
                            fontSize: 13,
                            color: '#bdc3c7',
                            flex: 1,
                            marginRight: 8,
                          }} numberOfLines={1}>
                            {activity.description}
                          </Text>
                          <Text style={{
                            fontSize: 11,
                            color: '#7f8c8d',
                            fontWeight: '500',
                          }}>
                            {activity.time}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 20,
                    padding: 40,
                    alignItems: 'center',
                  }}>
                    <Ionicons name="journal-outline" size={40} color="rgba(255,255,255,0.1)" />
                    <Text style={{ color: '#95a5a6', marginTop: 12, fontWeight: '600' }}>{t('no_recent_activities')}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Footer moved inside sidebar area or at the bottom depending on desktop/mobile */}
            {/* Footer hidden on Web */}
            {!isWeb && (
              <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20 }}>
                <Text style={{
                  fontSize: 11,
                  color: '#7f8c8d',
                  marginBottom: 2,
                }}>
                  {t('copyright_text')}
                </Text>
                <Text style={{
                  fontSize: 9,
                  color: '#7f8c8d',
                  fontWeight: '300',
                }}>
                  {t('footer_slogan')}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <IntakeSelectionModal
        visible={showQuizIntakeModal}
        onClose={() => setShowQuizIntakeModal(false)}
        onSelect={(intakeId) => {
          setShowQuizIntakeModal(false);
          router.push(`/intake-details/quizzes?id=${intakeId}`);
        }}
      />
    </View>
  );
};

// Add the helper function at the end of the file, before the export
const hexToRgb = (hex: string): string => {
  // Remove # if present
  hex = hex.replace('#', '');

  // Parse r, g, b values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `${r}, ${g}, ${b}`;
};

export default Dashboard;