import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  FlatList,
  Animated,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next'; // Added import
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { tokenStorage } from '../utils/tokenStorage';
const AsyncStorage = tokenStorage;
import { API_CONFIG } from '../src/config/api';
import axios from 'axios';

interface Class {
  id: number;
  name: string;
  description: string;
  current_students: number;
}

interface ClassAttendance {
  id: number;
  class_obj: number;
  class_name: string;
  attendance_code: string;
  is_active: boolean;
  created_at: string;
  expires_at: string;
  time_remaining: number;
}

const ClassAttendanceScreen = () => {
  const { t, i18n } = useTranslation();
  const [classes, setClasses] = useState<Class[]>([]);
  const [activeAttendance, setActiveAttendance] = useState<ClassAttendance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingAttendance, setIsStartingAttendance] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [showExtendButton, setShowExtendButton] = useState<boolean>(false);

  // Use useMemo to initialize Animated values to avoid useInsertionEffect warning
  const { fadeAnim, colorAnim } = useMemo(() => {
    return {
      fadeAnim: new Animated.Value(1),
      colorAnim: new Animated.Value(0), // 0 for normal, 1 for red
    };
  }, []);

  // Create interpolation functions using useMemo to prevent re-creation on every render
  const backgroundColor = useMemo(() => colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(39, 174, 96, 0.1)', 'rgba(231, 76, 60, 0.1)'] // Green to red
  }), [colorAnim]);

  const borderColor = useMemo(() => colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#27ae60', '#e74c3c'] // Green to red
  }), [colorAnim]);

  const timeColor = useMemo(() => colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#f39c12', '#e74c3c'] // Orange to red
  }), [colorAnim]);

  useEffect(() => {
    loadClasses();
  }, []);

  // Countdown timer effect
  useEffect(() => {
    let countdownInterval: any = null;
    setIsExpired(false);
    setShowExtendButton(false);
    colorAnim.setValue(0); // Reset color animation

    if (activeAttendance) {
      // Set initial time remaining
      setTimeRemaining(activeAttendance.time_remaining);

      // Start countdown if time is greater than 0
      if (activeAttendance.time_remaining > 0) {
        countdownInterval = setInterval(() => {
          setTimeRemaining(prevTime => {
            // Show extend button in the last 10 seconds
            if (prevTime <= 10 && prevTime > 0) {
              setShowExtendButton(true);
            } else {
              setShowExtendButton(false);
            }

            if (prevTime <= 1) {
              // Clear interval when time reaches 0
              if (countdownInterval) clearInterval(countdownInterval);
              // Mark as expired
              setIsExpired(true);
              // Start color change animation to red
              Animated.timing(colorAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: false, // Needed for color interpolation
              }).start(() => {
                // Then fade out animation
                Animated.timing(fadeAnim, {
                  toValue: 0,
                  duration: 2000,
                  useNativeDriver: true,
                }).start(() => {
                  // Remove active attendance after fade out
                  setActiveAttendance(null);
                });
              });
              return 0;
            }
            return prevTime - 1;
          });
        }, 1000);
      } else {
        // If time is already 0 or negative, mark as expired immediately
        setIsExpired(true);
        setActiveAttendance(null);
      }
    }

    // Cleanup interval on component unmount or when activeAttendance changes
    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [activeAttendance]);

  const loadClasses = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: 'Authentication Error',
          text2: 'No access token found. Please login again.'
        });
        return;
      }

      const response = await axios.get(`${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/classes/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 200) {
        setClasses(response.data);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      Toast.show({
        type: 'error',
        text1: t('error_loading_classes'),
        text2: t('failed_load_classes')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startAttendance = async (classId: number) => {
    try {
      setIsStartingAttendance(true);
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: 'Authentication Error',
          text2: 'No access token found. Please login again.'
        });
        return;
      }

      const response = await axios.post(
        `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/attendance/`,
        { class_obj: classId },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.status === 201) {
        setActiveAttendance(response.data);
        setTimeRemaining(response.data.time_remaining);
        setIsExpired(false);
        setShowExtendButton(false);
        // Reset animations
        fadeAnim.setValue(1);
        colorAnim.setValue(0);
        Toast.show({
          type: 'success',
          text1: t('attendance_started'),
          text2: t('attendance_code_expires', { code: response.data.attendance_code })
        });
      }
    } catch (error: any) {
      console.error('Error starting attendance:', error);
      Toast.show({
        type: 'error',
        text1: t('start_failed'),
        text2: error.response?.data?.error || t('failed_start_attendance')
      });
    } finally {
      setIsStartingAttendance(false);
    }
  };

  const extendAttendance = async () => {
    if (!activeAttendance) return;

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: 'Authentication Error',
          text2: 'No access token found. Please login again.'
        });
        return;
      }

      const response = await axios.post(
        `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/attendance/${activeAttendance.id}/extend/`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.status === 200) {
        // Update the active attendance with new expiration time
        const updatedAttendance = {
          ...activeAttendance,
          expires_at: response.data.expires_at,
          time_remaining: response.data.time_remaining
        };

        setActiveAttendance(updatedAttendance);
        setTimeRemaining(updatedAttendance.time_remaining);
        setShowExtendButton(false);

        // Reset the color animation since we're extending the time
        colorAnim.setValue(0);

        Toast.show({
          type: 'success',
          text1: t('time_extended'),
          text2: t('time_extended_msg')
        });
      }
    } catch (error: any) {
      console.error('Error extending attendance:', error);
      Toast.show({
        type: 'error',
        text1: t('extension_failed'),
        text2: error.response?.data?.error || t('failed_extend_attendance')
      });
    }
  };

  const cancelAttendance = async () => {
    if (!activeAttendance) return;

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: 'Authentication Error',
          text2: 'No access token found. Please login again.'
        });
        return;
      }

      const response = await axios.post(
        `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/attendance/${activeAttendance.id}/cancel/`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.status === 200) {
        // Update the active attendance to show it's expired
        const updatedAttendance = {
          ...activeAttendance,
          expires_at: response.data.expires_at,
          time_remaining: response.data.time_remaining
        };

        setActiveAttendance(updatedAttendance);
        setTimeRemaining(0);
        setIsExpired(true);
        setShowExtendButton(false);

        // Start color change animation to red
        Animated.timing(colorAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: false,
        }).start(() => {
          // Then fade out animation
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }).start(() => {
            // Remove active attendance after fade out
            setActiveAttendance(null);
          });
        });

        Toast.show({
          type: 'success',
          text1: t('attendance_cancelled'),
          text2: t('attendance_cancelled_msg')
        });
      }
    } catch (error: any) {
      console.error('Error cancelling attendance:', error);
      Toast.show({
        type: 'error',
        text1: t('cancellation_failed'),
        text2: error.response?.data?.error || t('failed_cancel_attendance')
      });
    }
  };

  const viewAttendanceHistory = (classId: number) => {
    router.push(`/attendance-history/${classId}`);
  };

  const renderClassCard = ({ item }: { item: Class }) => (
    <View style={styles.classCard}>
      <View style={styles.classHeader}>
        <View style={styles.classIconContainer}>
          <Ionicons name="library-outline" size={24} color="#3498db" />
        </View>
        <View style={styles.classInfo}>
          <Text style={styles.className}>{item.name}</Text>
          <Text style={styles.classDescription}>{item.description}</Text>
          <Text style={[styles.studentCount, { textAlign: i18n.language === 'ar' ? 'right' : 'left' }]}>{t('students_enrolled_count', { count: item.current_students })}</Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.startButton]}
          onPress={() => startAttendance(item.id)}
          disabled={isStartingAttendance}
        >
          {isStartingAttendance ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="play-circle-outline" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>{t('start_attendance_action')}</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.historyButton]}
          onPress={() => viewAttendanceHistory(item.id)}
        >
          <Ionicons name="time-outline" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>{t('history_action')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <LinearGradient
          colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
          style={styles.backgroundGradient}
        />
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
        style={styles.backgroundGradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('class_attendance')}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Active Attendance Session */}
      {activeAttendance && (
        <Animated.View style={[
          styles.activeSessionCard,
          {
            opacity: fadeAnim,
            backgroundColor: backgroundColor,
            borderColor: borderColor
          }
        ]}>
          <View style={styles.activeSessionHeader}>
            <Ionicons name="radio-button-on" size={20} color="#27ae60" />
            <Text style={styles.activeSessionTitle}>{t('active_attendance_session')}</Text>
          </View>
          <Text style={styles.className}>{activeAttendance.class_name}</Text>
          <View style={[styles.codeContainer, { flexDirection: i18n.language === 'ar' ? 'row-reverse' : 'row' }]}>
            <Text style={styles.codeLabel}>{t('attendance_code')}</Text>
            <Text style={styles.attendanceCode}>{activeAttendance.attendance_code}</Text>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={cancelAttendance}
            >
              <Ionicons name="close-circle" size={24} color="#e74c3c" />
            </TouchableOpacity>
          </View>
          <Animated.Text style={[styles.timeRemaining, { color: timeColor, textAlign: i18n.language === 'ar' ? 'right' : 'left' }]}>
            {isExpired ? t('expired_label') : t('time_remaining_label', { time: Math.max(0, timeRemaining) })}
          </Animated.Text>

          {/* Extend Button - shown in last 10 seconds */}
          {showExtendButton && (
            <TouchableOpacity
              style={styles.extendButton}
              onPress={extendAttendance}
            >
              <Ionicons name="time-outline" size={16} color="#fff" />
              <Text style={styles.extendButtonText}>{t('extend_time_action')}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {/* Classes List */}
      <View style={styles.content}>
        <Text style={[styles.sectionTitle, { textAlign: i18n.language === 'ar' ? 'right' : 'left' }]}>{t('select_class')}</Text>
        <FlatList
          data={classes}
          renderItem={renderClassCard}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="library-outline" size={64} color="#95a5a6" />
              <Text style={styles.emptyText}>{t('no_classes_found')}</Text>
              <Text style={styles.emptySubtext}>
                {t('create_class_first')}
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );
};

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  activeSessionCard: {
    backgroundColor: 'rgba(39, 174, 96, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#27ae60',
  },
  activeSessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  activeSessionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
    marginStart: 8,
  },
  className: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  codeLabel: {
    fontSize: 14,
    color: '#bdc3c7',
    marginEnd: 10,
  },
  attendanceCode: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#27ae60',
    letterSpacing: 2,
  },
  cancelButton: {
    marginStart: 10,
  },
  timeRemaining: {
    fontSize: 14,
    color: '#f39c12',
    fontWeight: '600',
  },
  extendButton: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 15,
  },
  extendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginStart: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  classCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  classIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 15,
  },
  classInfo: {
    flex: 1,
  },
  classDescription: {
    fontSize: 14,
    color: '#bdc3c7',
    marginBottom: 4,
  },
  studentCount: {
    fontSize: 12,
    color: '#95a5a6',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  startButton: {
    backgroundColor: '#27ae60',
  },
  historyButton: {
    backgroundColor: '#3498db',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginStart: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
  },
});

export default ClassAttendanceScreen;