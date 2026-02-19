import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { tokenStorage } from '../../utils/tokenStorage';
import { API_CONFIG } from '../../src/config/api';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
const AsyncStorage = tokenStorage;

interface GroupAttendance {
  id: number;
  group_name: string;
  attendance_code: string;
  is_active: boolean;
  created_at: string;
  expires_at: string;
  time_remaining: number;
}

interface StudentAttendance {
  id: number;
  student: number; // Student ID
  student_name: string;
  attended_at: string;
  status?: string; // present, late, absent
  email?: string;
}

interface StudentDetail {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  is_enrolled: boolean;
  status: 'present' | 'late' | 'absent';
}

const GroupAttendanceHistoryScreen = () => {
  const { t } = useTranslation();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const [attendances, setAttendances] = useState<GroupAttendance[]>([]);
  const [selectedAttendance, setSelectedAttendance] = useState<GroupAttendance | null>(null);

  // Lists
  const [studentAttendances, setStudentAttendances] = useState<StudentAttendance[]>([]);
  const [allStudents, setAllStudents] = useState<StudentDetail[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [showStudentList, setShowStudentList] = useState(false); // Toggle state

  useEffect(() => {
    loadAttendanceHistory();
  }, [groupId]);

  const loadAttendanceHistory = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const response = await axios.get(
        `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/groups/${groupId}/attendance/`,
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

      // 1. Get attendance records
      const response = await axios.get(
        `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/group-attendance/${attendanceId}/students/`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      // 2. Get all enrolled students for enrichment (names might be missing in attendance list if not populated)
      const enrolledResponse = await axios.get(
        `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/groups/${groupId}/enrolled-students/`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const enrolledMap = new Map<number, StudentDetail>(enrolledResponse.data.map((s: StudentDetail) => [s.id, s]));

      if (response.status === 200) {
        // Enriched Data
        const enriched = response.data.map((att: any) => {
          // handle backend naming differences (student_id vs id)
          const studId = att.student_id || att.student || att.id;
          const studentDetails = enrolledMap.get(studId);
          return {
            ...att,
            student: studId, // normalization
            student_name: studentDetails ? `${studentDetails.first_name} ${studentDetails.last_name}` : att.student_name,
            email: studentDetails?.email,
            status: att.status || 'present'
          };
        });
        setStudentAttendances(enriched);
      }
    } catch (error) {
      console.error('Error loading student attendances:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('failed_load_attendances')
      });
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const loadAllStudents = async () => {
    if (!selectedAttendance) return;
    try {
      setIsLoadingStudents(true);
      const token = await AsyncStorage.getItem('access_token');

      // 1. Get Enrolled Students
      const enrolledResponse = await axios.get(
        `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/groups/${groupId}/enrolled-students/`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      // 2. Get Present Students to map status
      const attendanceResponse = await axios.get(
        `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/group-attendance/${selectedAttendance.id}/students/`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const attendanceMap = new Map();
      attendanceResponse.data.forEach((att: any) => {
        const sid = att.student_id || att.student || att.id;
        attendanceMap.set(sid, att.status || 'present');
      });

      const merged = enrolledResponse.data.map((s: any) => ({
        ...s,
        status: attendanceMap.has(s.id) ? attendanceMap.get(s.id) : 'absent'
      }));

      setAllStudents(merged);

    } catch (error) {
      console.error('Error loading all students:', error);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const viewStudentAttendances = (attendance: GroupAttendance) => {
    setSelectedAttendance(attendance);
    setShowStudentList(false);
    loadStudentAttendances(attendance.id);
  };

  const updateStudentStatus = async (studentId: number, status: 'present' | 'late' | 'absent') => {
    try {
      const token = await AsyncStorage.getItem('access_token');

      if (status === 'absent') {
        // Use unmark endpoint to delete attendance record
        await axios.post(
          `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/group-attendance/${selectedAttendance?.id}/unmark/`,
          { student_id: studentId },
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
      } else {
        // Use mark endpoint for present/late
        await axios.post(
          `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/group-attendance/${selectedAttendance?.id}/mark/`,
          { student_id: studentId },
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
      }


      Toast.show({
        type: 'success',
        text1: t('status_updated'),
        text2: t('student_marked_as', { status: t(status + '_status') })
      });

      // Refresh lists
      if (showStudentList) {
        loadAllStudents();
      } else {
        if (selectedAttendance) loadStudentAttendances(selectedAttendance.id);
      }

    } catch (error) {
      console.error('Error updating status:', error);
      Toast.show({
        type: 'error',
        text1: t('update_failed'),
        text2: t('failed_update_status')
      });
    }
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
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

  const renderAttendanceItem = ({ item }: { item: GroupAttendance }) => (
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

  const renderStudentRow = (item: any) => (
    <View style={styles.studentCard}>
      <View style={styles.studentInfo}>
        <Ionicons name="person-circle-outline" size={24} color="#3498db" />
        <View>
          <Text style={styles.studentName}>{item.student_name || `${item.first_name} ${item.last_name}`}</Text>
          <Text style={styles.studentEmail}>{item.email}</Text>
        </View>
      </View>

      <View style={styles.attendanceStatusContainer}>
        <Text style={[styles.attendanceStatus, { color: getStatusColor(item.status) }]}>
          {getStatusText(item.status)}
        </Text>
      </View>
      <Text style={styles.attendedAt}>{t('attended_label')} {formatDate(item.attended_at)}</Text>

      {/* Manual Marking Buttons */}
      <View style={styles.statusButtonsContainer}>
        <TouchableOpacity
          style={[styles.statusButton, styles.presentButton]}
          onPress={() => updateStudentStatus(item.student || item.id, 'present')}
        >
          <Text style={styles.statusButtonText}>{t('present')}</Text>
        </TouchableOpacity>
        {/* Note: Late/Absent might not be fully supported by backend for groups yet, but adding UI for consistency */}
        <TouchableOpacity
          style={[styles.statusButton, styles.absentButton]}
          onPress={() => updateStudentStatus(item.student || item.id, 'absent')}
        >
          <Text style={styles.statusButtonText}>{t('absent')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (selectedAttendance) {
              setSelectedAttendance(null);
            } else {
              router.back();
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {selectedAttendance ? `${t('session_prefix')}${selectedAttendance.attendance_code}` : t('group_attendance_history_title')}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {!selectedAttendance ? (
          <FlatList
            data={attendances}
            renderItem={renderAttendanceItem}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={<Text style={styles.sectionTitle}>{t('past_sessions_title')}</Text>}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="time-outline" size={64} color="#95a5a6" />
                <Text style={styles.emptyText}>{t('no_sessions_found')}</Text>
              </View>
            }
          />
        ) : (
          <>
            <View style={styles.toggleButtonsContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, !showStudentList && styles.activeToggleButton]}
                onPress={() => { setShowStudentList(false); loadStudentAttendances(selectedAttendance.id); }}
              >
                <Text style={[styles.toggleButtonText, !showStudentList && styles.activeToggleButtonText]}>
                  {t('attendance_records_tab')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, showStudentList && styles.activeToggleButton]}
                onPress={() => { setShowStudentList(true); loadAllStudents(); }}
              >
                <Text style={[styles.toggleButtonText, showStudentList && styles.activeToggleButtonText]}>
                  {t('all_students_tab')}
                </Text>
              </TouchableOpacity>
            </View>

            {isLoadingStudents ? (
              <ActivityIndicator size="large" color="#3498db" style={styles.loadingStudents} />
            ) : (
              <FlatList
                data={showStudentList ? allStudents : studentAttendances}
                renderItem={({ item }: { item: any }) => renderStudentRow(item)} // Explicitly cast item or use any to resolve overload issue
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={64} color="#95a5a6" />
                    <Text style={styles.emptyText}>{t('no_students_found')}</Text>
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
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  backgroundContainer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#1b1b1b' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  placeholder: { width: 40 },
  content: { flex: 1, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 15 },

  attendanceCard: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 15, padding: 20, marginBottom: 15 },
  attendanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  codeContainer: { flexDirection: 'row', alignItems: 'center' },
  codeLabel: { fontSize: 14, color: '#bdc3c7', marginEnd: 8 },
  attendanceCode: { fontSize: 18, fontWeight: 'bold', color: '#27ae60' },
  expiredAttendanceCode: { color: '#e74c3c' },
  statusContainer: { flexDirection: 'row', alignItems: 'center' },
  activeStatus: { flexDirection: 'row', alignItems: 'center' },
  activeStatusText: { fontSize: 12, color: '#27ae60', marginStart: 4 },
  inactiveStatus: { flexDirection: 'row', alignItems: 'center' },
  inactiveStatusText: { fontSize: 12, color: '#e74c3c', marginStart: 4 },
  attendanceDetails: { marginBottom: 15 },
  dateText: { fontSize: 12, color: '#95a5a6', marginBottom: 2 },
  viewButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)' },
  viewButtonText: { fontSize: 14, color: '#3498db', marginEnd: 4 },

  // Student List Styles
  studentCard: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 15, padding: 15, marginBottom: 10 },
  studentInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  studentName: { fontSize: 16, fontWeight: '600', color: '#fff', marginStart: 10 },
  studentEmail: { fontSize: 12, color: '#bdc3c7', marginStart: 10, marginTop: 2 },
  attendedAt: { fontSize: 12, color: '#95a5a6', marginStart: 34, marginBottom: 10 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, color: '#fff', marginTop: 20, marginBottom: 8 },

  // Toggle
  toggleButtonsContainer: { flexDirection: 'row', marginBottom: 20, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 10, padding: 5 },
  toggleButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeToggleButton: { backgroundColor: '#3498db' },
  toggleButtonText: { color: '#bdc3c7', fontWeight: '600' },
  activeToggleButtonText: { color: '#fff' },
  loadingStudents: { marginTop: 50 },

  attendanceStatusContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginStart: 34 },
  attendanceStatus: { fontSize: 14, fontWeight: '600' },

  statusButtonsContainer: { flexDirection: 'row', gap: 10, marginTop: 5, marginStart: 34 },
  statusButton: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, alignItems: 'center', minWidth: 80 },
  presentButton: { backgroundColor: 'rgba(39, 174, 96, 0.2)' },
  absentButton: { backgroundColor: 'rgba(231, 76, 60, 0.2)' },
  statusButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});

export default GroupAttendanceHistoryScreen;