import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { tokenStorage } from '../../utils/tokenStorage';
const AsyncStorage = tokenStorage;
import { API_CONFIG } from '../../src/config/api';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

interface ClassAttendance {
  id: number;
  class_name: string;
  attendance_code: string;
  is_active: boolean;
  created_at: string;
  expires_at: string;
  time_remaining: number;
}

interface StudentAttendance {
  id: number;
  student: number;
  student_name: string;
  attended_at: string;
  status: 'present' | 'late' | 'absent';
  email?: string;
}

interface StudentDetail {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_enrolled: boolean;
  status: 'present' | 'late' | 'absent';
  // Optional properties to match StudentAttendance for FlatList
  student?: number;
  student_name?: string;
  attended_at?: string;
}

const AttendanceHistoryScreen = () => {
  const { t } = useTranslation();
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const [attendances, setAttendances] = useState<ClassAttendance[]>([]);
  const [selectedAttendance, setSelectedAttendance] = useState<ClassAttendance | null>(null);
  const [studentAttendances, setStudentAttendances] = useState<StudentAttendance[]>([]);
  const [allStudents, setAllStudents] = useState<StudentDetail[]>([]); // All students in the class
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [showStudentList, setShowStudentList] = useState(false); // Toggle between attendance list and student list

  useEffect(() => {
    loadAttendanceHistory();
  }, [classId]);

  const loadAttendanceHistory = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: t('auth_error'),
          text2: t('no_token_msg')
        });
        return;
      }

      const response = await axios.get(
        `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/classes/${classId}/attendance/`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.status === 200) {
        setAttendances(response.data);
      }
    } catch (error) {
      console.error('Error loading attendance history:', error);
      Toast.show({
        type: 'error',
        text1: t('error_loading_history'),
        text2: t('failed_load_history')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadStudentAttendances = async (attendanceId: number) => {
    try {
      setIsLoadingStudents(true);
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: t('auth_error'),
          text2: t('no_token_msg')
        });
        return;
      }

      // Load student attendance data
      const response = await axios.get(
        `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/attendance/${attendanceId}/students/`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      // Load all students in the class to get their details
      const studentsResponse = await axios.get(
        `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/classes/${classId}/students/`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.status === 200 && studentsResponse.status === 200) {
        // Create a map of student details for quick lookup
        const studentDetailsMap = studentsResponse.data.reduce((acc: any, student: any) => {
          acc[student.id] = student;
          return acc;
        }, {});

        // Map attendance data with student details
        const attendanceWithDetails = response.data.map((attendance: any) => ({
          ...attendance,
          student_name: `${studentDetailsMap[attendance.student]?.first_name || ''} ${studentDetailsMap[attendance.student]?.last_name || ''}`,
          email: studentDetailsMap[attendance.student]?.email || '',
          status: attendance.status || 'present' // Use backend status or default to present
        }));

        setStudentAttendances(attendanceWithDetails);
      }
    } catch (error) {
      console.error('Error loading student attendances:', error);
      Toast.show({
        type: 'error',
        text1: t('error_loading_data'),
        text2: t('failed_load_attendances')
      });
    } finally {
      setIsLoadingStudents(false);
    }
  };

  // Load all students in the class with their attendance status
  const loadAllStudents = async () => {
    try {
      setIsLoadingStudents(true);
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: t('auth_error'),
          text2: t('no_token_msg')
        });
        return;
      }

      // Load all students in the class
      const studentsResponse = await axios.get(
        `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/classes/${classId}/students/`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      // If we're viewing a specific attendance session, load attendance data too
      let attendanceStatusMap: Record<number, string> = {};
      if (selectedAttendance) {
        const attendanceResponse = await axios.get(
          `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/attendance/${selectedAttendance.id}/students/`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (attendanceResponse.status === 200 && attendanceResponse.data) {
          attendanceResponse.data.forEach((att: any) => {
            attendanceStatusMap[att.student] = att.status || 'present';
          });
        }
      }

      if (studentsResponse.status === 200) {
        // Filter only enrolled students
        const enrolledStudents = studentsResponse.data.filter((student: any) => student.is_enrolled);

        // Format students with appropriate status
        const studentsWithStatus = enrolledStudents.map((student: any) => ({
          ...student,
          status: attendanceStatusMap[student.id] ? attendanceStatusMap[student.id] : 'absent',
        }));
        setAllStudents(studentsWithStatus);
      }
    } catch (error) {
      console.error('Error loading students:', error);
      Toast.show({
        type: 'error',
        text1: t('error_loading_students_title'),
        text2: t('failed_load_students_msg')
      });
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const viewStudentAttendances = (attendance: ClassAttendance) => {
    setSelectedAttendance(attendance);
    setShowStudentList(false); // Show attendance records by default
    loadStudentAttendances(attendance.id);
  };

  const viewAllStudents = () => {
    setShowStudentList(true);
    loadAllStudents();
  };

  const updateStudentStatus = async (studentId: number, status: 'present' | 'late' | 'absent') => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: t('auth_error'),
          text2: t('no_token_msg')
        });
        return;
      }

      // Make API call to update student status
      const response = await axios.post(
        `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/attendance/${selectedAttendance?.id}/mark_attendance/`,
        {
          student_id: studentId,
          status: status
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
        if (showStudentList) {
          // Update all students list
          setAllStudents(prev => prev.map(student =>
            student.id === studentId ? { ...student, status } : student
          ));
        } else {
          // Update student attendances list
          setStudentAttendances(prev => prev.map(attendance =>
            attendance.student === studentId ? { ...attendance, status } : attendance
          ));
        }

        // Show confirmation
        Toast.show({
          type: 'success',
          text1: t('status_updated'),
          text2: t('student_marked_as', { status: t(status + '_status') })
        });
      } else {
        throw new Error('Failed to update student status');
      }
    } catch (error: any) {
      console.error('Error updating student status:', error);
      Toast.show({
        type: 'error',
        text1: t('update_failed'),
        text2: error.response?.data?.error || t('failed_update_status')
      });
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    // Use 'en-US' locale to ensure standard Gregorian calendar
    return date.toLocaleDateString('en-US') + ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
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

  const renderAttendanceItem = ({ item }: { item: ClassAttendance }) => (
    <TouchableOpacity
      style={styles.attendanceCard}
      onPress={() => viewStudentAttendances(item)}
    >
      <View style={styles.attendanceHeader}>
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>{t('code_label')}</Text>
          <Text style={[
            styles.attendanceCode,
            !item.is_active && styles.expiredAttendanceCode
          ]}>
            {item.attendance_code}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          {item.is_active ? (
            <View style={styles.activeStatus}>
              <Ionicons name="radio-button-on" size={12} color="#27ae60" />
              <Text style={styles.activeStatusText}>{t('active_status')}</Text>
            </View>
          ) : (
            <View style={styles.inactiveStatus}>
              <Ionicons name="radio-button-off" size={12} color="#e74c3c" />
              <Text style={styles.inactiveStatusText}>{t('expired_status')}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.attendanceDetails}>
        <Text style={styles.dateText}>{t('started_label')} {formatDate(item.created_at)}</Text>
        <Text style={styles.dateText}>{t('expired_label')} {formatDate(item.expires_at)}</Text>
      </View>

      <View style={styles.viewButton}>
        <Text style={styles.viewButtonText}>{t('view_students_btn')}</Text>
        <Ionicons name="chevron-forward" size={16} color="#3498db" />
      </View>
    </TouchableOpacity>
  );

  const renderStudentAttendanceItem = ({ item }: { item: StudentAttendance }) => (
    <TouchableOpacity
      style={styles.studentCard}
      onPress={() => router.replace({
        pathname: `/attendance-history/student-details`,
        params: {
          studentId: item.student.toString(),
          classId: classId,
          attendanceId: selectedAttendance?.id.toString() || ''
        }
      })}
    >
      <View style={styles.studentInfo}>
        <Ionicons name="person-circle-outline" size={24} color="#3498db" />
        <View>
          <Text style={styles.studentName}>{item.student_name}</Text>
          <Text style={styles.studentEmail}>{item.email}</Text>
        </View>
      </View>
      <View style={styles.attendanceStatusContainer}>
        <Text style={[styles.attendanceStatus, { color: getStatusColor(item.status) }]}>
          {getStatusText(item.status)}
        </Text>
      </View>
      <Text style={styles.attendedAt}>{t('attended_label')} {formatDate(item.attended_at)}</Text>

      {/* Status buttons for manual marking */}
      <View style={styles.statusButtonsContainer}>
        <TouchableOpacity
          style={[styles.statusButton, styles.presentButton]}
          onPress={(e) => {
            e.stopPropagation();
            updateStudentStatus(item.student, 'present');
          }}
        >
          <Text style={styles.statusButtonText}>{t('present_status')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statusButton, styles.lateButton]}
          onPress={(e) => {
            e.stopPropagation();
            updateStudentStatus(item.student, 'late');
          }}
        >
          <Text style={styles.statusButtonText}>{t('late_status')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statusButton, styles.absentButton]}
          onPress={(e) => {
            e.stopPropagation();
            updateStudentStatus(item.student, 'absent');
          }}
        >
          <Text style={styles.statusButtonText}>{t('absent_status')}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderAllStudentItem = ({ item }: { item: StudentDetail }) => (
    <TouchableOpacity
      style={styles.studentCard}
      onPress={() => router.replace({
        pathname: `/attendance-history/student-details`,
        params: {
          studentId: item.id.toString(),
          classId: classId,
          attendanceId: selectedAttendance?.id.toString() || ''
        }
      })}
    >
      <View style={styles.studentInfo}>
        <Ionicons name="person-circle-outline" size={24} color="#3498db" />
        <View>
          <Text style={styles.studentName}>{item.first_name} {item.last_name}</Text>
          <Text style={styles.studentEmail}>{item.email}</Text>
        </View>
      </View>
      <View style={styles.attendanceStatusContainer}>
        <Text style={[styles.attendanceStatus, { color: getStatusColor(item.status) }]}>
          {getStatusText(item.status)}
        </Text>
      </View>

      {/* Status buttons for manual marking */}
      <View style={styles.statusButtonsContainer}>
        <TouchableOpacity
          style={[styles.statusButton, styles.presentButton]}
          onPress={(e) => {
            e.stopPropagation();
            updateStudentStatus(item.id, 'present');
          }}
        >
          <Text style={styles.statusButtonText}>{t('present_status')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statusButton, styles.lateButton]}
          onPress={(e) => {
            e.stopPropagation();
            updateStudentStatus(item.id, 'late');
          }}
        >
          <Text style={styles.statusButtonText}>{t('late_status')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statusButton, styles.absentButton]}
          onPress={(e) => {
            e.stopPropagation();
            updateStudentStatus(item.id, 'absent');
          }}
        >
          <Text style={styles.statusButtonText}>{t('absent_status')}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
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
          onPress={() => {
            if (selectedAttendance) {
              setSelectedAttendance(null);
              setShowStudentList(false);
            } else {
              router.back();
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {selectedAttendance ? `${t('session_prefix')}${selectedAttendance.attendance_code}` : t('attendance_history_title')}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {!selectedAttendance ? (
          <>
            <Text style={styles.sectionTitle}>{t('past_sessions_title')}</Text>
            <FlatList
              data={attendances}
              renderItem={renderAttendanceItem}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="time-outline" size={64} color="#95a5a6" />
                  <Text style={styles.emptyText}>{t('no_sessions_found')}</Text>
                  <Text style={styles.emptySubtext}>
                    {t('start_session_prompt')}
                  </Text>
                </View>
              }
            />
          </>
        ) : (
          <>
            <View style={styles.selectedSessionHeader}>
              <Text style={[
                styles.selectedSessionTitle,
                selectedAttendance && !selectedAttendance.is_active && styles.expiredAttendanceCode
              ]}>
                {t('session_prefix')}{selectedAttendance?.attendance_code}
              </Text>
            </View>

            {/* Toggle buttons */}
            <View style={styles.toggleButtonsContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, !showStudentList && styles.activeToggleButton]}
                onPress={() => setShowStudentList(false)}
              >
                <Text style={[styles.toggleButtonText, !showStudentList && styles.activeToggleButtonText]}>
                  {t('attendance_records_tab')} ({studentAttendances.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, showStudentList && styles.activeToggleButton]}
                onPress={viewAllStudents}
              >
                <Text style={[styles.toggleButtonText, showStudentList && styles.activeToggleButtonText]}>
                  {t('all_students_tab')} ({allStudents.length})
                </Text>
              </TouchableOpacity>
            </View>

            {isLoadingStudents ? (
              <ActivityIndicator size="large" color="#3498db" style={styles.loadingStudents} />
            ) : showStudentList ? (
              <FlatList
                data={allStudents}
                renderItem={renderAllStudentItem}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={64} color="#95a5a6" />
                    <Text style={styles.emptyText}>{t('no_students_found')}</Text>
                    <Text style={styles.emptySubtext}>{t('no_students_enrolled_msg')}</Text>
                  </View>
                }
              />
            ) : (
              <FlatList
                data={studentAttendances}
                renderItem={renderStudentAttendanceItem}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={64} color="#95a5a6" />
                    <Text style={styles.emptyText}>{t('no_students_attended')}</Text>
                    <Text style={styles.emptySubtext}>{t('no_students_submitted_msg')}</Text>
                  </View>
                }
              />
            )}
          </>
        )}
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
  attendanceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 14,
    color: '#bdc3c7',
    marginEnd: 8,
  },
  attendanceCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  expiredAttendanceCode: {
    color: '#e74c3c', // Red color for expired codes
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeStatusText: {
    fontSize: 12,
    color: '#27ae60',
    marginStart: 4,
  },
  inactiveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inactiveStatusText: {
    fontSize: 12,
    color: '#e74c3c', // Red color for expired status text
    marginStart: 4,
  },
  attendanceDetails: {
    marginBottom: 15,
  },
  dateText: {
    fontSize: 12,
    color: '#95a5a6',
    marginBottom: 2,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  viewButtonText: {
    fontSize: 14,
    color: '#3498db',
    marginEnd: 4,
  },
  selectedSessionHeader: {
    marginBottom: 20,
  },
  selectedSessionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingStudents: {
    marginTop: 50,
  },
  studentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginStart: 10,
  },
  studentEmail: {
    fontSize: 12,
    color: '#bdc3c7',
    marginStart: 10,
    marginTop: 2,
  },
  attendedAt: {
    fontSize: 12,
    color: '#95a5a6',
    marginStart: 34,
    marginBottom: 10,
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
  toggleButtonsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 5,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeToggleButton: {
    backgroundColor: '#3498db',
  },
  toggleButtonText: {
    color: '#bdc3c7',
    fontWeight: '600',
  },
  activeToggleButtonText: {
    color: '#fff',
  },
  attendanceStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginStart: 34,
  },
  attendanceStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    marginHorizontal: 2,
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
    fontSize: 12,
    fontWeight: '600',
  },
});

export default AttendanceHistoryScreen;