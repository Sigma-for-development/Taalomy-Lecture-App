import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
  TouchableWithoutFeedback,
  Switch
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Toast from 'react-native-toast-message';
import { router, useLocalSearchParams } from 'expo-router';
import { tokenStorage } from '../../utils/tokenStorage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_CONFIG } from '../../src/config/api';
import { socketIOManager } from '../../src/utils/socketio';
import { useTranslation } from 'react-i18next';
import { checkForConflicts, ScheduleItem } from '../../src/utils/scheduler';
import { lecturerAPI } from '../../src/utils/api';
import DatePicker from '../../src/components/DatePicker';
const AsyncStorage = tokenStorage;

const VENUES = [
  'Lecture Hall A',
  'Lecture Hall B',
  'Lecture Hall C',
  'Computer Lab 1',
  'Computer Lab 2',
  'Science Lab',
  'Online (Zoom)',
  'Online (Google Meet)',
  'Conference Room'
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface Group {
  id: number;
  name: string;
  description: string;
  class_obj: number;
  class_name: string;
  max_students: number;
  current_students: number;
  created_at: string;
  venue?: string;
  start_time?: string;
  end_time?: string;
  days_of_week?: string;
}

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  is_enrolled: boolean;
  profile_picture_url?: string | null;
}

const GroupDetailsScreen = () => {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams();
  const [groupData, setGroupData] = useState<Group | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Venue and scheduling state
  // Venue and scheduling state
  const [venue, setVenue] = useState(VENUES[0]);
  const [isManualVenue, setIsManualVenue] = useState(false);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [updatingSchedule, setUpdatingSchedule] = useState(false);

  const [showInviteStudentModal, setShowInviteStudentModal] = useState(false);
  const [invitingStudent, setInvitingStudent] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentDetailsModal, setShowStudentDetailsModal] = useState(false);

  // Deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletionPreview, setDeletionPreview] = useState<any>(null);
  const [confirmationText, setConfirmationText] = useState('');

  // Edit Group State
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [updatingGroup, setUpdatingGroup] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');

  const baseurl = API_CONFIG.ACCOUNTS_BASE_URL;

  // Validate that id exists and is not undefined
  const groupId = Array.isArray(id) ? id[0] : id;
  const isValidGroupId = groupId && typeof groupId === 'string';

  useEffect(() => {
    // Check if we have a valid group ID before proceeding
    if (!isValidGroupId) {
      setLoading(false);
      setError(t('invalid_group_id'));
      return;
    }

    loadGroupDetails();

    // Connect to Socket.IO for real-time updates
    socketIOManager.connect();

    // Handle entity deletion events
    const handleEntityDeleted = (event: any) => {
      console.log('Entity deleted:', event);

      // If the current group was deleted, go back to the previous screen
      if (event.entity_type === 'group' && event.entity_id === parseInt(groupId as string)) {
        Toast.show({
          type: 'info',
          text1: t('group_deleted_toast_title'),
          text2: t('group_deleted_toast_body')
        });
        router.back();
        return;
      }
    };

    // Listen for entity deletion events
    socketIOManager.onEntityDeleted(handleEntityDeleted);

    // Cleanup
    return () => {
      socketIOManager.removeEntityDeletedCallback(handleEntityDeleted);
      socketIOManager.disconnect();
    };
  }, [id, isValidGroupId]);

  useEffect(() => {
    // Realtime search filtering
    if (searchQuery.trim() === '') {
      setFilteredStudents(students);
    } else {
      const filtered = students.filter(student =>
        student.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredStudents(filtered);
    }
  }, [searchQuery, students]);

  const loadGroupDetails = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('access_token');

      // Load group details
      const groupResponse = await axios.get(`${baseurl}lecturer/groups/${groupId}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setGroupData(groupResponse.data);
      setGroupData(groupResponse.data);
      const currentVenue = groupResponse.data.venue;
      if (currentVenue && !VENUES.includes(currentVenue)) {
        setIsManualVenue(true);
        setVenue(currentVenue);
      } else {
        setIsManualVenue(false);
        setVenue(currentVenue || VENUES[0]);
      }

      // Parse times
      const today = new Date();
      if (groupResponse.data.start_time) {
        const [hours, minutes] = groupResponse.data.start_time.split(':');
        const st = new Date(today);
        st.setHours(parseInt(hours), parseInt(minutes));
        setStartTime(st);
      }

      if (groupResponse.data.end_time) {
        const [hours, minutes] = groupResponse.data.end_time.split(':');
        const et = new Date(today);
        et.setHours(parseInt(hours), parseInt(minutes));
        setEndTime(et);
      }

      if (groupResponse.data.days_of_week) {
        setSelectedDays(groupResponse.data.days_of_week.split(',').map((d: string) => d.trim()));
      } else {
        setSelectedDays([]);
      }

      // Load students
      const studentsResponse = await axios.get(`${baseurl}lecturer/groups/${groupId}/enrolled-students/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const enrolledStudents = studentsResponse.data.filter((student: Student) => student.is_enrolled);
      setStudents(enrolledStudents);
      setFilteredStudents(enrolledStudents);

    } catch (error: any) {
      console.error('Error loading group details:', error);
      setError(error.response?.data?.error || 'Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    loadGroupDetails();
  }, [id]);

  const handleUpdateSchedule = async () => {
    try {
      setUpdatingSchedule(true);
      const token = await AsyncStorage.getItem('access_token');

      const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      };

      const newStartTime = formatTime(startTime);
      const newEndTime = formatTime(endTime);

      // Check for conflicts
      const [classesRes, groupsRes] = await Promise.all([
        lecturerAPI.getClasses(),
        lecturerAPI.getGroups()
      ]);

      const allItems: ScheduleItem[] = [
        ...classesRes.data.map((c: any) => ({ ...c, type: 'class' })),
        ...groupsRes.data.map((g: any) => ({ ...g, type: 'group' }))
      ];

      const conflict = checkForConflicts(
        {
          days_of_week: selectedDays,
          start_time: newStartTime,
          end_time: newEndTime
        },
        allItems,
        parseInt(groupId as string),
        'group'
      );

      if (conflict.hasConflict && conflict.conflictingItem) {
        Toast.show({
          type: 'error',
          text1: t('schedule_conflict_title'),
          text2: `Conflict with ${conflict.conflictingItem.type}: ${conflict.conflictingItem.name}`
        });
        setUpdatingSchedule(false);
        return;
      }

      await axios.patch(`${baseurl}lecturer/groups/${groupId}/`, {
        venue,
        start_time: newStartTime,
        end_time: newEndTime,
        days_of_week: selectedDays.join(', ')
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      Toast.show({
        type: 'success',
        text1: t('schedule_updated_toast_title'),
        text2: t('schedule_updated_toast_body')
      });
      setShowScheduleModal(false);
      onRefresh();
    } catch (error: any) {
      console.error('Error updating schedule:', error);
      Toast.show({
        type: 'error',
        text1: t('error_title'),
        text2: error.response?.data?.error || t('error_generic')
      });
    } finally {
      setUpdatingSchedule(false);
    }
  };

  const handleAddStudent = async () => {
    if (!selectedStudentId) {
      Toast.show({
        type: 'error',
        text1: t('selection_error_title'),
        text2: t('selection_error_msg')
      });
      return;
    }

    try {
      setAddingStudent(true);
      const token = await AsyncStorage.getItem('access_token');

      await axios.post(`${baseurl}lecturer/groups/${groupId}/students/`,
        { student_id: selectedStudentId },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      Toast.show({
        type: 'success',
        text1: t('student_added_toast_title'),
        text2: t('student_added_toast_body')
      });
      setSelectedStudentId(null);
      setShowAddStudentModal(false);
      onRefresh();
    } catch (error: any) {
      console.error('Error adding student:', error);
      Toast.show({
        type: 'error',
        text1: t('action_failed_title'),
        text2: error.response?.data?.error || t('error_generic')
      });
    } finally {
      setAddingStudent(false);
    }
  };

  const openStudentDetails = (student: Student) => {
    setSelectedStudent(student);
    setShowStudentDetailsModal(true);
  };

  const handleRemoveStudent = async (studentId: number, studentName: string) => {
    Alert.alert(
      t('remove_student_alert_title'),
      t('remove_student_alert_message', { name: studentName }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('remove_action'),
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('access_token');

              await axios.delete(`${baseurl}lecturer/groups/${groupId}/students/${studentId}/remove/`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });

              Toast.show({
                type: 'success',
                text1: t('student_removed_toast_title'),
                text2: t('student_removed_toast_body')
              });
              onRefresh();
            } catch (error: any) {
              console.error('Error removing student:', error);
              Toast.show({
                type: 'error',
                text1: t('removal_failed_title'),
                text2: error.response?.data?.error || t('error_generic')
              });
            }
          }
        }
      ]
    );
  };

  const handleInviteStudent = async () => {
    if (!inviteEmail.trim()) {
      Toast.show({
        type: 'error',
        text1: t('validation_error_title'),
        text2: t('validation_error_email_msg')
      });
      return;
    }

    try {
      setInvitingStudent(true);
      const token = await AsyncStorage.getItem('access_token');

      const response = await axios.post(`${baseurl}lecturer/groups/${groupId}/invite/`,
        { email: inviteEmail },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      Toast.show({
        type: 'success',
        text1: t('invitation_sent_toast_title'),
        text2: t('invitation_sent_toast_body')
      });
      setInviteEmail('');
      setShowInviteStudentModal(false);
    } catch (error: any) {
      console.error('Error inviting student:', error);
      console.error('Error response:', error.response?.data);
      Toast.show({
        type: 'error',
        text1: t('invitation_failed_title'),
        text2: error.response?.data?.error || t('error_generic')
      });
    } finally {
      setInvitingStudent(false);
    }
  };

  const handleDeleteGroup = async () => {
    try {
      setDeleting(true);
      const token = await AsyncStorage.getItem('access_token');

      await axios.delete(`${baseurl}lecturer/groups/${groupId}/`, {
        headers: { 'Authorization': `Bearer ${token}` },
        data: { confirmation: confirmationText }
      });

      Toast.show({
        type: 'success',
        text1: t('group_deleted_toast_title'),
        text2: t('group_deleted_toast_body')
      });
      setTimeout(() => router.back(), 1000);
    } catch (error: any) {
      console.error('Error deleting group:', error);
      if (error.response?.status === 400 && error.response?.data?.deletion_preview) {
        setDeletionPreview(error.response.data.deletion_preview);
        setShowDeleteModal(true);
      } else {
        Toast.show({
          type: 'error',
          text1: t('deletion_failed_title'),
          text2: error.response?.data?.error || t('error_generic')
        });
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateGroup = async () => {
    if (!editGroupName.trim()) {
      Toast.show({
        type: 'error',
        text1: t('validation_error_title'),
        text2: t('validation_error_group_name_msg')
      });
      return;
    }

    try {
      setUpdatingGroup(true);
      const token = await AsyncStorage.getItem('access_token');

      await axios.patch(`${baseurl}lecturer/groups/${groupId}/`, {
        name: editGroupName.trim()
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      Toast.show({
        type: 'success',
        text1: t('group_updated_toast_title'),
        text2: t('group_updated_toast_body')
      });
      setShowEditGroupModal(false);
      onRefresh();
    } catch (error: any) {
      console.error('Error updating group:', error);
      Toast.show({
        type: 'error',
        text1: t('update_failed_title'),
        text2: error.response?.data?.error || t('error_generic')
      });
    } finally {
      setUpdatingGroup(false);
    }
  };

  const openEditGroupModal = () => {
    if (!groupData) return; // Changed from 'group' to 'groupData' to match existing state variable
    setEditGroupName(groupData.name);
    setShowEditGroupModal(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={{ color: '#fff', marginTop: 16 }}>{t('loading_text')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a', padding: 20 }}>
        <Ionicons name="alert-circle" size={48} color="#e74c3c" />
        <Text style={{ color: '#fff', marginTop: 16, fontSize: 18, textAlign: 'center' }}>
          {error}
        </Text>
        <TouchableOpacity
          onPress={loadGroupDetails}
          style={{
            marginTop: 20,
            backgroundColor: '#3498db',
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('retry_button')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!groupData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
        <Text style={{ color: '#fff' }}>{t('group_not_found')}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View
        style={{
          paddingTop: 60,
          paddingBottom: 24,
          paddingHorizontal: 24,
          backgroundColor: '#1a1a1a',
          borderBottomWidth: 1,
          borderBottomColor: '#2c2c2c',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: '#252525',
              alignItems: 'center', justifyContent: 'center',
              marginRight: 16,
              borderWidth: 1,
              borderColor: '#333'
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', flex: 1 }} numberOfLines={1}>
            {groupData?.name}
          </Text>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={openEditGroupModal}
              style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: '#252525',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#333'
              }}
            >
              <Ionicons name="create-outline" size={20} color="#3498db" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowDeleteModal(true)}
              style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(231, 76, 60, 0.2)'
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#e74c3c" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={{ padding: 20 }}>
          {/* Group Info Card */}
          <View style={{
            backgroundColor: '#252525',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: '#333'
          }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 12 }}>
              {t('group_info_header')}
            </Text>

            <View style={{ gap: 12 }}>
              <View>
                <Text style={{ color: '#7f8c8d', fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('description_label')}</Text>
                <Text style={{ color: '#ecf0f1', fontSize: 15, lineHeight: 22 }}>{groupData.description}</Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 20 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#7f8c8d', fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('class_label')}</Text>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500' }}>{groupData.class_name}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#7f8c8d', fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('created_at_label')}</Text>
                  <Text style={{ color: '#fff', fontSize: 15 }}>{formatDate(groupData.created_at)}</Text>
                </View>
              </View>

              <View>
                <Text style={{ color: '#7f8c8d', fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('students_header')}</Text>
                <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(52, 152, 219, 0.15)', paddingHorizontal: 4, borderRadius: 8 }}>
                  <Text style={{ color: '#3498db', fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4 }}>
                    {groupData.current_students} / {groupData.max_students}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Schedule Information Card */}
          <View style={{
            backgroundColor: '#252525',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: '#333'
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>
                {t('edit_schedule_venue_header')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowScheduleModal(true)}
                style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: 'rgba(52, 152, 219, 0.15)',
                  alignItems: 'center', justifyContent: 'center'
                }}
              >
                <Ionicons name="pencil" size={18} color="#3498db" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 16 }}>
              {/* Venue */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 40, alignItems: 'center' }}>
                  <Ionicons name="location" size={24} color="#e74c3c" />
                </View>
                <View>
                  <Text style={{ color: '#7f8c8d', fontSize: 12, marginBottom: 2 }}>{t('venue_label')}</Text>
                  {groupData?.venue ? (
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500' }}>{groupData.venue}</Text>
                  ) : (
                    <Text style={{ color: '#95a5a6', fontStyle: 'italic' }}>{t('no_venue_specified')}</Text>
                  )}
                </View>
              </View>

              {/* Time */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 40, alignItems: 'center' }}>
                  <Ionicons name="time" size={24} color="#f39c12" />
                </View>
                <View>
                  <Text style={{ color: '#7f8c8d', fontSize: 12, marginBottom: 2 }}>{t('time_label')}</Text>
                  {groupData?.start_time && groupData?.end_time ? (
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500' }}>{groupData.start_time} - {groupData.end_time}</Text>
                  ) : (
                    <Text style={{ color: '#95a5a6', fontStyle: 'italic' }}>{t('no_time_specified')}</Text>
                  )}
                </View>
              </View>

              {/* Days */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 40, alignItems: 'center' }}>
                  <Ionicons name="calendar" size={24} color="#27ae60" />
                </View>
                <View>
                  <Text style={{ color: '#7f8c8d', fontSize: 12, marginBottom: 2 }}>{t('days_label')}</Text>
                  {groupData?.days_of_week ? (
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500' }}>{groupData.days_of_week}</Text>
                  ) : (
                    <Text style={{ color: '#95a5a6', fontStyle: 'italic' }}>{t('no_days_specified')}</Text>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Quick Actions Grid */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 12 }}>
              {t('quick_actions_header')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {/* Chat Button */}
              <TouchableOpacity
                onPress={() => router.push(`/group-chat/${id}`)}
                style={{
                  width: '48%',
                  backgroundColor: '#27ae60',
                  paddingVertical: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="chatbubbles" size={24} color="#fff" />
                <Text style={{ color: '#fff', marginTop: 8, fontSize: 13, fontWeight: '600' }}>{t('open_group_chat_action')}</Text>
              </TouchableOpacity>

              {/* Invite Student Button */}
              <TouchableOpacity
                onPress={() => setShowInviteStudentModal(true)}
                style={{
                  width: '48%',
                  backgroundColor: '#f39c12',
                  paddingVertical: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="mail" size={24} color="#fff" />
                <Text style={{ color: '#fff', marginTop: 8, fontSize: 13, fontWeight: '600' }}>{t('invite_student_email_action')}</Text>
              </TouchableOpacity>

              {/* Add Student from Class Button */}
              <TouchableOpacity
                onPress={() => setShowAddStudentModal(true)}
                style={{
                  width: '100%',
                  backgroundColor: '#3498db',
                  paddingVertical: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                <Ionicons name="person-add" size={24} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{t('add_student_class_action')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <View style={{ marginBottom: 20 }}>
            <TextInput
              style={{
                backgroundColor: '#252525',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                color: '#fff',
                fontSize: 16,
                borderWidth: 1,
                borderColor: '#333'
              }}
              placeholder={t('search_students_placeholder')}
              placeholderTextColor="#7f8c8d"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="done"
              onSubmitEditing={() => { }}
            />
          </View>

          {/* Send Paid Invitation Button */}
          <TouchableOpacity
            onPress={() => router.push(`/send-invitation?type=group&targetId=${id}&targetName=${encodeURIComponent(groupData?.name || '')}`)}
            style={{
              backgroundColor: '#27ae60',
              paddingVertical: 14,
              paddingHorizontal: 20,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              gap: 8
            }}
          >
            <Ionicons name="send" size={20} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
              {t('send_invitation')}
            </Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 16 }}>
            {t('students_header')} ({filteredStudents.length})
          </Text>

          {filteredStudents.map((student, index) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => openStudentDetails(student)}
              key={student.id}
              style={{
                backgroundColor: '#252525',
                borderRadius: 12,
                padding: 16,
                marginBottom: 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderWidth: 1,
                borderColor: '#333'
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                {/* Avatar */}
                <View style={{ marginEnd: 15, justifyContent: 'center', alignItems: 'center' }}>
                  {student.profile_picture_url ? (
                    <Image
                      source={{ uri: student.profile_picture_url }}
                      style={{ width: 44, height: 44, borderRadius: 22 }}
                    />
                  ) : (
                    <View style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: '#34495e',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                        {student.first_name[0]}{student.last_name[0]}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 2 }}>
                    {student.first_name} {student.last_name}
                  </Text>
                  <Text style={{ color: '#95a5a6', fontSize: 13 }}>
                    {student.email}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => router.push(`/direct-message/${student.id}`)}
                  style={{
                    backgroundColor: '#2c3e50',
                    padding: 8,
                    borderRadius: 8,
                  }}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color="#3498db" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleRemoveStudent(student.id, `${student.first_name} ${student.last_name}`)}
                  style={{
                    backgroundColor: 'rgba(231, 76, 60, 0.15)',
                    padding: 8,
                    borderRadius: 8,
                  }}
                >
                  <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                </TouchableOpacity>
              </View>

            </TouchableOpacity>
          ))}

          {filteredStudents.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Ionicons name="people" size={48} color="#34495e" />
              <Text style={{ color: '#7f8c8d', marginTop: 12, fontSize: 16 }}>
                {t('no_students_enrolled_yet')}
              </Text>
            </View>
          )}
        </View>
      </ScrollView >

      {/* Invite Student Modal */}
      < Modal
        visible={showInviteStudentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInviteStudentModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}>
            <View style={{
              backgroundColor: '#2c2c2c',
              borderRadius: 15,
              padding: 20,
              width: '100%',
              maxWidth: 400,
            }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' }}>
                {t('invite_student_group_header')}
              </Text>

              <TextInput
                style={{
                  backgroundColor: '#1a1a1a',
                  borderRadius: 10,
                  paddingHorizontal: 15,
                  paddingVertical: 12,
                  color: '#fff',
                  fontSize: 16,
                  marginBottom: 20,
                }}
                placeholder={t('placeholder_student_email')}
                placeholderTextColor="#7f8c8d"
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleInviteStudent}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setShowInviteStudentModal(false)}
                  style={{
                    flex: 1,
                    backgroundColor: '#7f8c8d',
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff' }}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleInviteStudent}
                  disabled={invitingStudent}
                  style={{
                    flex: 1,
                    backgroundColor: '#27ae60',
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                    opacity: invitingStudent ? 0.6 : 1,
                  }}
                >
                  {invitingStudent ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff' }}>{t('send_invitation_action')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal >

      {/* Add Student Modal */}
      < Modal
        visible={showAddStudentModal}
        animationType="slide"
        transparent={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View style={{ backgroundColor: '#2c2c2c', margin: 20, borderRadius: 15, padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' }}>
              {t('add_student_class_action')}
            </Text>

            <Text style={{ color: '#bdc3c7', marginBottom: 10 }}>
              {t('select_student_class_label')}
            </Text>

            {/* Student Picker */}
            <View style={{
              backgroundColor: '#1a1a1a',
              borderRadius: 10,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: '#3498db',
            }}>
              <TextInput
                style={{
                  backgroundColor: '#1a1a1a',
                  borderRadius: 10,
                  paddingHorizontal: 15,
                  paddingVertical: 12,
                  color: '#fff',
                  fontSize: 16,
                  marginBottom: 20,
                }}
                placeholder={t('search_students_placeholder')}
                placeholderTextColor="#7f8c8d"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="done"
                onSubmitEditing={() => { }}
              />

              <ScrollView style={{ maxHeight: 200 }}>
                {students
                  .filter(student =>
                    student.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    student.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    student.email.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((student) => (
                    <TouchableOpacity
                      key={student.id}
                      onPress={() => {
                        setSelectedStudentId(student.id);
                        handleAddStudent();
                      }}
                      style={{
                        padding: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: '#3a3a3a',
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 16 }}>
                        {student.first_name} {student.last_name}
                      </Text>
                      <Text style={{ color: '#bdc3c7', fontSize: 14 }}>
                        {student.email}
                      </Text>
                    </TouchableOpacity>
                  ))}

                {students.filter(student =>
                  student.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  student.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  student.email.toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 && searchQuery !== '' && (
                    <Text style={{ color: '#7f8c8d', padding: 12, textAlign: 'center' }}>
                      {t('no_matching_students')}
                    </Text>
                  )}
              </ScrollView>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowAddStudentModal(false);
                  setSelectedStudentId(null);
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#7f8c8d',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff' }}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal >

      {/* Delete Confirmation Modal */}
      < Modal
        visible={showDeleteModal}
        animationType="slide"
        transparent={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View style={{ backgroundColor: '#2c2c2c', margin: 20, borderRadius: 15, padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 15, textAlign: 'center' }}>
              {t('delete_group_header')}
            </Text>

            {deletionPreview ? (
              <>
                <Text style={{ color: '#fff', marginBottom: 10 }}>
                  {t('delete_warning_intro')}
                </Text>

                <View style={{ backgroundColor: '#3a3a3a', borderRadius: 8, padding: 10, marginBottom: 15 }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 5 }}>
                    {t('group_label')}
                  </Text>
                  <Text style={{ color: '#bdc3c7' }}>
                    {groupData?.name}
                  </Text>
                </View>

                <Text style={{ color: '#fff', marginBottom: 10 }}>
                  {t('delete_confirmation_instruction')}
                </Text>
                <Text style={{ color: '#e74c3c', fontWeight: 'bold', marginBottom: 10, textAlign: 'center' }}>
                  {t('delete_confirmation_text')}
                </Text>

                <TextInput
                  style={{
                    backgroundColor: '#1a1a1a',
                    borderRadius: 10,
                    paddingHorizontal: 15,
                    paddingVertical: 12,
                    color: '#fff',
                    fontSize: 16,
                    marginBottom: 20,
                  }}
                  placeholder={t('placeholder_confirmation_text')}
                  placeholderTextColor="#7f8c8d"
                  value={confirmationText}
                  onChangeText={setConfirmationText}
                  multiline
                  numberOfLines={3}
                />
              </>
            ) : (
              <Text style={{ color: '#fff', marginBottom: 20, textAlign: 'center' }}>
                {t('delete_group_confirmation_msg')}
              </Text>
            )}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeletionPreview(null);
                  setConfirmationText('');
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#7f8c8d',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff' }}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteGroup}
                disabled={deleting}
                style={{
                  flex: 1,
                  backgroundColor: '#e74c3c',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff' }}>{t('delete_action')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal >

      {/* Schedule Modal */}
      < Modal
        visible={showScheduleModal}
        animationType="slide"
        transparent={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View style={{ backgroundColor: '#2c2c2c', margin: 20, borderRadius: 15, padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' }}>
              {t('edit_schedule_venue_header')}
            </Text>

            {/* Venue Selector */}
            <View style={{ marginBottom: 15 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ color: '#bdc3c7', fontSize: 14 }}>{t('class_details.placeholder_venue')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: '#7f8c8d', fontSize: 12 }}>{t('manual_input') || 'Manual Input'}</Text>
                  <Switch
                    trackColor={{ false: "#767577", true: "#3498db" }}
                    thumbColor={isManualVenue ? "#fff" : "#f4f3f4"}
                    onValueChange={(val) => {
                      setIsManualVenue(val);
                      if (!val && !VENUES.includes(venue)) {
                        setVenue(VENUES[0]);
                      }
                    }}
                    value={isManualVenue}
                  />
                </View>
              </View>

              {isManualVenue ? (
                <TextInput
                  style={{
                    backgroundColor: '#1a1a1a',
                    borderRadius: 10,
                    paddingHorizontal: 15,
                    paddingVertical: 12,
                    color: '#fff',
                    fontSize: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                  }}
                  placeholder={t('placeholder_venue')}
                  placeholderTextColor="#7f8c8d"
                  value={venue}
                  onChangeText={setVenue}
                  returnKeyType="next"
                />
              ) : (
                <View style={{
                  backgroundColor: '#1a1a1a',
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  overflow: 'hidden'
                }}>
                  <Picker
                    selectedValue={venue}
                    onValueChange={(itemValue) => setVenue(itemValue)}
                    style={{ color: '#fff', height: Platform.OS === 'ios' ? 150 : 50 }}
                    dropdownIconColor="#fff"
                  >
                    {VENUES.map((v) => (
                      <Picker.Item key={v} label={v} value={v} color={Platform.OS === 'ios' ? '#fff' : '#000'} />
                    ))}
                  </Picker>
                </View>
              )}
            </View>

            {/* Start Time */}
            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: '#bdc3c7', marginBottom: 8, fontSize: 14 }}>{t('class_details.placeholder_start_time')}</Text>
              <DatePicker
                value={startTime}
                mode="time"
                onChange={setStartTime}
                placeholder={t('class_details.placeholder_start_time')}
              />
            </View>

            {/* End Time */}
            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: '#bdc3c7', marginBottom: 8, fontSize: 14 }}>{t('class_details.placeholder_end_time')}</Text>
              <DatePicker
                value={endTime}
                mode="time"
                onChange={setEndTime}
                placeholder={t('class_details.placeholder_end_time')}
              />
            </View>

            {/* Days Selection */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: '#bdc3c7', marginBottom: 8, fontSize: 14 }}>{t('class_details.placeholder_days')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {DAYS.map((day) => {
                  const isSelected = selectedDays.includes(day);
                  return (
                    <TouchableOpacity
                      key={day}
                      onPress={() => {
                        if (isSelected) {
                          setSelectedDays(selectedDays.filter(d => d !== day));
                        } else {
                          setSelectedDays([...selectedDays, day]);
                        }
                      }}
                      style={{
                        backgroundColor: isSelected ? '#3498db' : '#1a1a1a',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: isSelected ? '#3498db' : 'rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <Text style={{
                        color: isSelected ? '#fff' : '#bdc3c7',
                        fontSize: 12,
                        fontWeight: isSelected ? '600' : '400'
                      }}>
                        {day.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setShowScheduleModal(false)}
                style={{
                  flex: 1,
                  backgroundColor: '#7f8c8d',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff' }}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUpdateSchedule}
                disabled={updatingSchedule}
                style={{
                  flex: 1,
                  backgroundColor: '#3498db',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  opacity: updatingSchedule ? 0.6 : 1,
                }}
              >
                {updatingSchedule ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff' }}>{t('update_action')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal >

      {/* Edit Group Modal */}
      < Modal
        visible={showEditGroupModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditGroupModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View style={{ backgroundColor: '#2c2c2c', margin: 20, borderRadius: 15, padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' }}>
              {t('edit_group_header')}
            </Text>

            <TextInput
              style={{
                backgroundColor: '#1a1a1a',
                borderRadius: 10,
                paddingHorizontal: 15,
                paddingVertical: 12,
                color: '#fff',
                fontSize: 16,
                marginBottom: 20,
              }}
              placeholder={t('placeholder_group_name')}
              placeholderTextColor="#7f8c8d"
              value={editGroupName}
              onChangeText={setEditGroupName}
              onSubmitEditing={handleUpdateGroup}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setShowEditGroupModal(false)}
                style={{
                  flex: 1,
                  backgroundColor: '#7f8c8d',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff' }}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUpdateGroup}
                disabled={updatingGroup}
                style={{
                  flex: 1,
                  backgroundColor: '#3498db',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  opacity: updatingGroup ? 0.6 : 1,
                }}
              >
                {updatingGroup ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff' }}>{t('update_action')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal >

      {/* Student Details Modal */}
      < Modal
        visible={showStudentDetailsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStudentDetailsModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowStudentDetailsModal(false)}>
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20
          }}>
            <TouchableWithoutFeedback>
              <View style={{
                backgroundColor: '#2c2c2c',
                borderRadius: 20,
                padding: 25,
                width: '100%',
                maxWidth: 350,
                shadowColor: "#000",
                shadowOffset: {
                  width: 0,
                  height: 2,
                },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff' }}>{t('student_details_header')}</Text>
                </View>

                {selectedStudent && (
                  <View>
                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                      <View style={{
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        backgroundColor: '#3498db',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: 10,
                        overflow: 'hidden'
                      }}>
                        {selectedStudent.profile_picture_url ? (
                          <Image
                            source={{ uri: selectedStudent.profile_picture_url }}
                            style={{ width: 80, height: 80 }}
                          />
                        ) : (
                          <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#fff' }}>
                            {selectedStudent.first_name[0]}{selectedStudent.last_name[0]}
                          </Text>
                        )}
                      </View>
                      <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#fff' }}>
                        {selectedStudent.first_name} {selectedStudent.last_name}
                      </Text>
                      <Text style={{ fontSize: 16, color: '#bdc3c7' }}>
                        {selectedStudent.email}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => setShowStudentDetailsModal(false)}
                      style={{
                        backgroundColor: '#3498db',
                        paddingVertical: 12,
                        borderRadius: 10,
                        alignItems: 'center',
                        marginTop: 20
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{t('close_action')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        setShowStudentDetailsModal(false);
                        router.push(`/direct-message/${selectedStudent.id}`);
                      }}
                      style={{
                        backgroundColor: '#27ae60',
                        paddingVertical: 12,
                        borderRadius: 10,
                        alignItems: 'center',
                        marginTop: 10
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{t('message_student_action')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal >
    </View >
  );
};

export default GroupDetailsScreen;