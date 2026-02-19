import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { tokenStorage } from '../../utils/tokenStorage';
import { API_CONFIG } from '../../src/config/api';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
const AsyncStorage = tokenStorage;

interface StudentDetail {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  status: 'present' | 'late' | 'absent';
}

const StudentDetailsScreen = () => {
  const { t } = useTranslation();
  const { studentId, classId, attendanceId } = useLocalSearchParams<{
    studentId: string;
    classId: string;
    attendanceId: string;
  }>();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<'present' | 'late' | 'absent'>('absent');

  useEffect(() => {
    loadStudentDetails();
  }, [studentId]);

  const loadStudentDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Alert.alert(t('error_title'), t('no_token_msg'));
        return;
      }

      // Load student details
      const response = await axios.get(
        `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/classes/${classId}/students/`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.status === 200) {
        // Find the specific student
        const studentData = response.data.find((s: any) => s.id === parseInt(studentId));
        if (studentData) {
          // Check if student has attendance record
          let studentStatus: 'present' | 'late' | 'absent' = 'absent';
          if (attendanceId) {
            const attendanceResponse = await axios.get(
              `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/attendance/${attendanceId}/students/`,
              { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (attendanceResponse.status === 200) {
              const hasAttendance = attendanceResponse.data.some((att: any) => att.student === parseInt(studentId));
              if (hasAttendance) {
                studentStatus = 'present';
              }
            }
          }

          setStudent({
            ...studentData,
            status: studentStatus
          });
          setStatus(studentStatus);
        }
      }
    } catch (error) {
      console.error('Error loading student details:', error);
      Alert.alert(t('error_title'), t('failed_load_students_msg'));
    } finally {
      setIsLoading(false);
    }
  };

  const updateStudentStatus = async (newStatus: 'present' | 'late' | 'absent') => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Alert.alert('Error', 'No access token found');
        return;
      }

      // Make API call to update student status
      const response = await axios.post(
        `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/attendance/${attendanceId}/mark_attendance/`,
        {
          student_id: parseInt(studentId),
          status: newStatus
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        // Update local state after successful API call
        setStatus(newStatus);
        if (student) {
          setStudent({
            ...student,
            status: newStatus
          });
        }

        // Show confirmation
        Alert.alert(t('success_title'), t('student_marked_as', { status: t(newStatus + '_status') }));
      } else {
        throw new Error('Failed to update student status');
      }
    } catch (error: any) {
      console.error('Error updating student status:', error);
      Alert.alert(t('error_title'), error.response?.data?.error || t('failed_update_status'));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return '#27ae60';
      case 'late': return '#f39c12';
      case 'absent': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'present': return t('present_status');
      case 'late': return t('late_status');
      case 'absent': return t('absent_status');
      default: return t('unknown_status');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <View style={styles.backgroundContainer} />
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={styles.backgroundContainer} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace(`/attendance-history/${classId}`)}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('student_details_title')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {student && (
          <View style={styles.studentCard}>
            <View style={styles.studentInfo}>
              <Ionicons name="person-circle-outline" size={64} color="#3498db" />
              <View style={styles.studentDetails}>
                <Text style={styles.studentName}>{student.first_name} {student.last_name}</Text>
                <Text style={styles.studentEmail}>{student.email}</Text>
                <Text style={styles.studentUsername}>@{student.username}</Text>
              </View>
            </View>

            <View style={styles.statusSection}>
              <Text style={styles.sectionTitle}>{t('attendance_status_section')}</Text>
              <View style={styles.statusContainer}>
                <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
                  {getStatusText(status)}
                </Text>
              </View>
            </View>

            <View style={styles.actionsSection}>
              <Text style={styles.sectionTitle}>{t('update_status_section')}</Text>
              <View style={styles.statusButtonsContainer}>
                <TouchableOpacity
                  style={[styles.statusButton, styles.presentButton]}
                  onPress={() => updateStudentStatus('present')}
                >
                  <Text style={styles.statusButtonText}>{t('present_status')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusButton, styles.lateButton]}
                  onPress={() => updateStudentStatus('late')}
                >
                  <Text style={styles.statusButtonText}>{t('late_status')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusButton, styles.absentButton]}
                  onPress={() => updateStudentStatus('absent')}
                >
                  <Text style={styles.statusButtonText}>{t('absent_status')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  backgroundContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#1b1b1b',
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  studentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  studentDetails: {
    marginStart: 15,
  },
  studentName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  studentEmail: {
    fontSize: 16,
    color: '#bdc3c7',
    marginBottom: 3,
  },
  studentUsername: {
    fontSize: 14,
    color: '#95a5a6',
  },
  statusSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  actionsSection: {
    marginBottom: 20,
  },
  statusButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 5,
  },
  presentButton: {
    backgroundColor: 'rgba(39, 174, 96, 0.2)',
    borderColor: '#27ae60',
    borderWidth: 1,
  },
  lateButton: {
    backgroundColor: 'rgba(243, 156, 18, 0.2)',
    borderColor: '#f39c12',
    borderWidth: 1,
  },
  absentButton: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    borderColor: '#e74c3c',
    borderWidth: 1,
  },
  statusButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default StudentDetailsScreen;