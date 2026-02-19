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
import Toast from 'react-native-toast-message';
import { Picker } from '@react-native-picker/picker';
import { router, useLocalSearchParams } from 'expo-router';
import { tokenStorage } from '../../utils/tokenStorage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { API_CONFIG } from '../../src/config/api';
import { socketIOManager } from '../../src/utils/socketio';
import { checkForConflicts, ScheduleItem } from '../../src/utils/scheduler';
import { lecturerAPI } from '../../src/utils/api';
import DatePicker from '../../src/components/DatePicker';
const AsyncStorage = tokenStorage;

const VENUES = [
  'Online (Zoom)',
  'Online (Google Meet)',
  'Online (Teams)',
  'Online (Other)',
  'Conference Room'
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface Class {
  id: number;
  name: string;
  description: string;
  max_students: number;
  current_students: number;
  created_at: string;
  status: string;
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
  group_id?: number;
  join_date?: string;
  payment_amount?: string;
  payment_type?: string;
  payment_method?: string;
  profile_picture_url?: string | null;
}

interface Group {
  id: number;
  name: string;
  description: string;
  max_students: number;
  current_students: number;
}

interface GroupWithStudents extends Group {
  students?: Student[];
}

const ClassDetailsScreen = () => {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams();
  const [classData, setClassData] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<GroupWithStudents[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'groups'>('overview');

  // Venue and scheduling state
  const [venue, setVenue] = useState(VENUES[0]);
  const [isManualVenue, setIsManualVenue] = useState(false);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [updatingSchedule, setUpdatingSchedule] = useState(false);

  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showInviteStudentModal, setShowInviteStudentModal] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [invitingStudent, setInvitingStudent] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [maxGroupStudents, setMaxGroupStudents] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteType, setInviteType] = useState<'class' | 'group'>('class');
  const [inviteGroupId, setInviteGroupId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  const [showAddStudentToGroupModal, setShowAddStudentToGroupModal] = useState(false);
  const [addingStudentToGroup, setAddingStudentToGroup] = useState(false);
  const [selectedStudentIdForGroup, setSelectedStudentIdForGroup] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentDetailsModal, setShowStudentDetailsModal] = useState(false);

  // Deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletionPreview, setDeletionPreview] = useState<any>(null);
  const [confirmationText, setConfirmationText] = useState('');

  // Edit Class State
  const [showEditClassModal, setShowEditClassModal] = useState(false);
  const [updatingClass, setUpdatingClass] = useState(false);
  const [editClassName, setEditClassName] = useState('');
  const [editClassDescription, setEditClassDescription] = useState('');
  const [editMaxStudents, setEditMaxStudents] = useState('');

  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<{ id: number, name: string } | null>(null);
  const [groupDeletionPreview, setGroupDeletionPreview] = useState<any>(null);
  const [groupConfirmationText, setGroupConfirmationText] = useState('');

  const baseurl = API_CONFIG.ACCOUNTS_BASE_URL;

  // Validate that id exists and is not undefined
  const classId = Array.isArray(id) ? id[0] : id;
  const isValidClassId = classId && typeof classId === 'string';

  useEffect(() => {
    // Check if we have a valid class ID before proceeding
    if (!isValidClassId) {
      setLoading(false);
      setLoading(false);
      setError(t('invalid_class_id'));
      return;
      return;
    }

    loadClassDetails();

    // Connect to Socket.IO for real-time updates
    socketIOManager.connect();

    // Handle entity deletion events
    const handleEntityDeleted = (event: any) => {
      console.log('Entity deleted:', event);

      // If the current class was deleted, go back to the previous screen
      if (event.entity_type === 'class' && event.entity_id === parseInt(classId as string)) {
        Toast.show({
          type: 'info',
          text1: t('class_deleted_title'),
          text2: t('class_deleted_msg')
        });
        router.back();
        return;
      }

      // If a group was deleted, reload the data
      if (event.entity_type === 'group') {
        loadClassDetails();
      }
    };

    // Listen for entity deletion events
    socketIOManager.onEntityDeleted(handleEntityDeleted);

    // Cleanup
    return () => {
      socketIOManager.removeEntityDeletedCallback(handleEntityDeleted);
      socketIOManager.disconnect();
    };
  }, [id, isValidClassId]);

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

  const loadClassDetails = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('access_token');

      // Load class details
      const classResponse = await axios.get(`${baseurl}lecturer/classes/${classId}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setClassData(classResponse.data);
      setClassData(classResponse.data);
      const currentVenue = classResponse.data.venue;
      if (currentVenue && !VENUES.includes(currentVenue)) {
        setIsManualVenue(true);
        setVenue(currentVenue);
      } else {
        setIsManualVenue(false);
        setVenue(currentVenue || VENUES[0]);
      }

      // Parse times
      const today = new Date();
      if (classResponse.data.start_time) {
        const [hours, minutes] = classResponse.data.start_time.split(':');
        const st = new Date(today);
        st.setHours(parseInt(hours), parseInt(minutes));
        setStartTime(st);
      }

      if (classResponse.data.end_time) {
        const [hours, minutes] = classResponse.data.end_time.split(':');
        const et = new Date(today);
        et.setHours(parseInt(hours), parseInt(minutes));
        setEndTime(et);
      }

      if (classResponse.data.days_of_week) {
        setSelectedDays(classResponse.data.days_of_week.split(',').map((d: string) => d.trim()));
      } else {
        setSelectedDays([]);
      }

      // Load students
      const studentsResponse = await axios.get(`${baseurl}lecturer/classes/${classId}/students/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setStudents(studentsResponse.data);
      setFilteredStudents(studentsResponse.data);

      // Load groups and their students
      const groupsResponse = await axios.get(`${baseurl}lecturer/classes/${classId}/groups/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Load students for each group
      const groupsWithStudents = await Promise.all(groupsResponse.data.map(async (group: Group) => {
        try {
          const groupStudentsResponse = await axios.get(`${baseurl}lecturer/groups/${group.id}/enrolled-students/`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          return {
            ...group,
            students: groupStudentsResponse.data.filter((student: Student) => student.is_enrolled)
          };
        } catch (error) {
          console.error(`Error loading students for group ${group.id}:`, error);
          return {
            ...group,
            students: []
          };
        }
      }));

      setGroups(groupsWithStudents);

    } catch (error: any) {
      console.error('Error loading class details:', error);
      console.error('Error loading class details:', error);
      setError(error.response?.data?.error || t('failed_load_class_details'));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    loadClassDetails();
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
        parseInt(classId as string),
        'class'
      );

      if (conflict.hasConflict && conflict.conflictingItem) {
        Toast.show({
          type: 'error',
          text1: t('schedule_conflict_title'), // You might need to add this key or use a hardcoded string if keys are missing
          text2: `Conflict with ${conflict.conflictingItem.type}: ${conflict.conflictingItem.name}`
        });
        setUpdatingSchedule(false);
        return;
      }

      await axios.patch(`${baseurl}lecturer/classes/${classId}/`, {
        venue,
        start_time: newStartTime,
        end_time: newEndTime,
        days_of_week: selectedDays.join(', ')
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      Toast.show({
        type: 'success',
        text1: t('schedule_updated_title'),
        text2: t('schedule_updated_msg')
      });
      setShowScheduleModal(false);
      onRefresh();
    } catch (error: any) {
      console.error('Error updating schedule:', error);
      Toast.show({
        type: 'error',
        text1: t('update_failed'),
        text2: error.response?.data?.error || t('schedule_update_failed')
      });
    } finally {
      setUpdatingSchedule(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || !groupDescription.trim() || !maxGroupStudents.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fill in all fields'
      });
      return;
    }

    try {
      setCreatingGroup(true);
      const token = await AsyncStorage.getItem('access_token');

      await axios.post(`${baseurl}lecturer/groups/`, {
        name: groupName.trim(),
        description: groupDescription.trim(),
        max_students: parseInt(maxGroupStudents),
        class_obj: parseInt(classId as string)
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      Toast.show({
        type: 'success',
        text1: t('group_created_title'),
        text2: t('group_created_msg')
      });
      setGroupName('');
      setGroupDescription('');
      setMaxGroupStudents('');
      setShowCreateGroupModal(false);
      onRefresh();
    } catch (error: any) {
      console.error('Error creating group:', error);
      Toast.show({
        type: 'error',
        text1: t('creation_failed'),
        text2: error.response?.data?.error || t('group_creation_failed')
      });
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleAddStudent = async () => {
    if (!selectedStudentId) {
      Toast.show({
        type: 'error',
        text1: t('selection_error'),
        text2: t('select_student_error')
      });
      return;
    }

    try {
      setAddingStudent(true);
      const token = await AsyncStorage.getItem('access_token');

      await axios.post(`${baseurl}lecturer/classes/${classId}/students/`,
        { student_id: selectedStudentId },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      Toast.show({
        type: 'success',
        text1: t('student_added_title'),
        text2: t('student_added_msg')
      });
      setSelectedStudentId(null);
      setShowAddStudentModal(false);
      onRefresh();
    } catch (error: any) {
      console.error('Error adding student:', error);
      Toast.show({
        type: 'error',
        text1: t('action_failed'),
        text2: error.response?.data?.error || t('student_add_failed')
      });
    } finally {
      setAddingStudent(false);
    }
  };

  const handleRemoveStudent = async (studentId: number, studentName: string) => {
    Alert.alert(
      t('remove_student_confirm_title'),
      t('remove_student_confirm_msg', { name: studentName }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('access_token');

              await axios.delete(`${baseurl}lecturer/classes/${classId}/students/${studentId}/remove/`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });

              Toast.show({
                type: 'success',
                text1: t('student_removed_title'),
                text2: t('student_removed_msg')
              });
              onRefresh();
            } catch (error: any) {
              console.error('Error removing student:', error);
              Toast.show({
                type: 'error',
                text1: t('removal_failed'),
                text2: error.response?.data?.error || t('student_removal_failed')
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
        text1: t('validation_error'),
        text2: t('enter_email_error')
      });
      return;
    }

    try {
      setInvitingStudent(true);
      const token = await AsyncStorage.getItem('access_token');

      let endpoint = '';
      let successMessage = '';

      if (inviteType === 'class') {
        endpoint = `${baseurl}lecturer/classes/${classId}/invite/`;
        successMessage = t('class_invitation_sent_msg');
        console.log('Sending class invite data:', { email: inviteEmail });
      } else {
        endpoint = `${baseurl}lecturer/groups/${inviteGroupId}/invite/`;
        successMessage = t('group_invitation_sent_msg');
        console.log('Sending group invite data:', { email: inviteEmail });
      }

      const response = await axios.post(endpoint,
        { email: inviteEmail },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      Toast.show({
        type: 'success',
        text1: t('invitation_sent_title'),
        text2: successMessage
      });
      setInviteEmail('');
      setShowInviteStudentModal(false);
      setInviteType('class');
      setInviteGroupId(null);
    } catch (error: any) {
      console.error('Error inviting student:', error);
      console.error('Error response:', error.response?.data);
      Toast.show({
        type: 'error',
        text1: t('invitation_failed_title'),
        text2: error.response?.data?.error || t('invitation_failed_msg')
      });
    } finally {
      setInvitingStudent(false);
    }
  };

  const handleAddStudentToGroup = async () => {
    if (!selectedStudentIdForGroup || !selectedGroupId) {
      Toast.show({
        type: 'error',
        text1: t('selection_error'),
        text2: t('select_student_group_error')
      });
      return;
    }

    try {
      setAddingStudentToGroup(true);
      const token = await AsyncStorage.getItem('access_token');

      await axios.post(`${baseurl}lecturer/groups/${selectedGroupId}/students/`,
        { student_id: selectedStudentIdForGroup },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      Toast.show({
        type: 'success',
        text1: t('student_added_title'),
        text2: t('student_added_group_msg')
      });
      setSelectedStudentIdForGroup(null);
      setSelectedGroupId(null);
      setShowAddStudentToGroupModal(false);
      onRefresh();
    } catch (error: any) {
      console.error('Error adding student to group:', error);
      Toast.show({
        type: 'error',
        text1: t('action_failed'),
        text2: error.response?.data?.error || t('student_add_group_failed')
      });
    } finally {
      setAddingStudentToGroup(false);
    }
  };

  const openStudentDetails = (student: Student) => {
    setSelectedStudent(student);
    setShowStudentDetailsModal(true);
  };

  const handleRemoveStudentFromGroup = async (groupId: number, studentId: number, studentName: string) => {
    Alert.alert(
      'Remove Student from Group',
      `Are you sure you want to remove ${studentName} from this group?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('access_token');

              await axios.delete(`${baseurl}lecturer/groups/${groupId}/students/${studentId}/remove/`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });

              Toast.show({
                type: 'success',
                text1: t('student_removed_title'),
                text2: t('student_removed_group_msg')
              });
              onRefresh();
            } catch (error: any) {
              console.error('Error removing student from group:', error);
              Toast.show({
                type: 'error',
                text1: t('removal_failed'),
                text2: error.response?.data?.error || t('student_remove_group_failed')
              });
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleDeleteClass = async () => {
    try {
      setDeleting(true);
      const token = await AsyncStorage.getItem('access_token');

      const response = await axios.delete(`${baseurl}lecturer/classes/${classId}/`, {
        headers: { 'Authorization': `Bearer ${token}` },
        data: { confirmation: confirmationText }
      });

      Toast.show({
        type: 'success',
        text1: t('class_deleted_title'),
        text2: t('class_deleted_success_msg')
      });
      setTimeout(() => router.back(), 1000);
    } catch (error: any) {
      console.error('Error deleting class:', error);
      if (error.response?.status === 400 && error.response?.data?.deletion_preview) {
        setDeletionPreview(error.response.data.deletion_preview);
        setShowDeleteModal(true);
      } else {
        Toast.show({
          type: 'error',
          text1: t('deletion_failed'),
          text2: error.response?.data?.error || t('class_deletion_failed')
        });
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateClass = async () => {
    if (!editClassName.trim() || !editClassDescription.trim() || !editMaxStudents.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fill in all fields'
      });
      return;
    }

    try {
      setUpdatingClass(true);
      const token = await AsyncStorage.getItem('access_token');

      await axios.patch(`${baseurl}lecturer/classes/${classId}/`, {
        name: editClassName.trim(),
        description: editClassDescription.trim(),
        max_students: parseInt(editMaxStudents)
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      Toast.show({
        type: 'success',
        text1: t('class_updated_title'),
        text2: t('class_updated_msg')
      });
      setShowEditClassModal(false);
      onRefresh();
    } catch (error: any) {
      console.error('Error updating class:', error);
      Toast.show({
        type: 'error',
        text1: t('update_failed'),
        text2: error.response?.data?.error || t('class_update_failed')
      });
    } finally {
      setUpdatingClass(false);
    }
  };

  const openEditClassModal = () => {
    if (!classData) return;
    setEditClassName(classData.name);
    setEditClassDescription(classData.description);
    setEditMaxStudents(classData.max_students.toString());
    setShowEditClassModal(true);
  };

  const handleMarkCompleted = async () => {
    Alert.alert(
      t('mark_completed_title'),
      t('mark_completed_confirm_msg'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirm'),
          onPress: async () => {
            try {
              setLoading(true);
              const token = await AsyncStorage.getItem('access_token');
              await axios.patch(`${baseurl}lecturer/classes/${classId}/mark_completed/`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              Toast.show({
                type: 'success',
                text1: t('class_completed_title'),
                text2: t('class_completed_msg')
              });
              loadClassDetails();
            } catch (error: any) {
              console.error('Error marking class as completed:', error);
              Toast.show({
                type: 'error',
                text1: t('action_failed'),
                text2: error.response?.data?.error || t('mark_completed_failed')
              });
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDeleteGroup = (groupId: number, groupName: string) => {
    setGroupToDelete({ id: groupId, name: groupName });
    setShowDeleteGroupModal(true);
  };

  const handleConfirmDeleteGroup = async () => {
    if (!groupToDelete) return;

    try {
      setDeletingGroup(true);
      const token = await AsyncStorage.getItem('access_token');

      const response = await axios.delete(`${baseurl}lecturer/groups/${groupToDelete.id}/`, {
        headers: { 'Authorization': `Bearer ${token}` },
        data: { confirmation: groupConfirmationText }
      });

      Toast.show({
        type: 'success',
        text1: t('group_deleted_title'),
        text2: t('group_deleted_msg')
      });
      setShowDeleteGroupModal(false);
      setGroupToDelete(null);
      setGroupConfirmationText('');
      onRefresh();
    } catch (error: any) {
      if (error.response?.status === 400 && error.response?.data?.deletion_preview) {
        // Show deletion preview
        setGroupDeletionPreview(error.response.data.deletion_preview);
      } else {
        console.error('Error deleting group:', error);
        Toast.show({
          type: 'error',
          text1: t('deletion_failed'),
          text2: error.response?.data?.error || t('group_deletion_failed')
        });
      }
    } finally {
      setDeletingGroup(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={{ color: '#fff', marginTop: 16 }}>Loading...</Text>
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
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={openEditClassModal}
            style={{
              backgroundColor: '#3498db',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
            }}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeleteClass}
            style={{
              backgroundColor: '#e74c3c',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
            }}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={loadClassDetails}
          style={{
            marginTop: 20,
            backgroundColor: '#3498db',
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!classData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
        <Text style={{ color: '#fff' }}>Class not found</Text>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
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
            {classData?.name}
          </Text>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={openEditClassModal}
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

        {/* Tab Navigation */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: '#252525',
          borderRadius: 12,
          padding: 4,
          borderWidth: 1,
          borderColor: '#333'
        }}>
          {(['overview', 'students', 'groups'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: activeTab === tab ? 'rgba(52, 152, 219, 0.15)' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: activeTab === tab ? 'rgba(52, 152, 219, 0.3)' : 'transparent'
              }}
            >
              <Text style={{
                color: activeTab === tab ? '#3498db' : '#7f8c8d',
                fontWeight: activeTab === tab ? '700' : '500',
                fontSize: 14,
                textTransform: 'capitalize',
              }}>
                {t(`common.tabs.${tab}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'overview' && (
          <View style={{ padding: 20 }}>
            {/* Class Info Card */}
            <View style={{
              backgroundColor: '#252525',
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: '#333'
            }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 16 }}>
                {t('class_info_header')}
              </Text>

              <View style={{ gap: 16 }}>
                <View>
                  <Text style={{ color: '#7f8c8d', fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('class_desc_label')}</Text>
                  <Text style={{ color: '#ecf0f1', fontSize: 15, lineHeight: 22 }}>{classData.description}</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 20 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#7f8c8d', fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('class_created_label')}</Text>
                    <Text style={{ color: '#fff', fontSize: 15 }}>{formatDate(classData.created_at)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#7f8c8d', fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('class_status_label')}</Text>
                    <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(39, 174, 96, 0.15)', paddingHorizontal: 4, borderRadius: 8 }}>
                      <Text style={{ color: '#27ae60', fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4 }}>
                        {classData.status}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 20 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#7f8c8d', fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('class_students_label')}</Text>
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                      {classData.current_students} <Text style={{ color: '#7f8c8d', fontWeight: '400' }}>/ {classData.max_students}</Text>
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#7f8c8d', fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('class_groups_label')}</Text>
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{groups.length}</Text>
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
                  {t('schedule_venue_header')}
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
                    {classData?.venue ? (
                      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500' }}>{classData.venue}</Text>
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
                    {classData?.start_time && classData?.end_time ? (
                      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500' }}>{classData.start_time} - {classData.end_time}</Text>
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
                    {classData?.days_of_week ? (
                      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500' }}>{classData.days_of_week}</Text>
                    ) : (
                      <Text style={{ color: '#95a5a6', fontStyle: 'italic' }}>{t('no_days_specified')}</Text>
                    )}
                  </View>
                </View>
              </View>
            </View>

            <View style={{ backgroundColor: '#2c2c2c', borderRadius: 15, padding: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 15 }}>
                {t('quick_actions_header')}
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {/* Chat Button */}
                <TouchableOpacity
                  onPress={() => router.push(`/class-chat/${id}`)}
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
                  <Text style={{ color: '#fff', marginTop: 8, fontSize: 13, fontWeight: '600' }}>
                    {t('open_class_chat_action')}
                  </Text>
                </TouchableOpacity>

                {/* Class Videos Button */}
                <TouchableOpacity
                  onPress={() => router.push(`/class-videos/${id}`)}
                  style={{
                    width: '48%',
                    backgroundColor: '#8e44ad',
                    paddingVertical: 16,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="videocam" size={24} color="#fff" />
                  <Text style={{ color: '#fff', marginTop: 8, fontSize: 13, fontWeight: '600' }}>
                    Class Videos
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowCreateGroupModal(true)}
                  style={{
                    width: '48%',
                    backgroundColor: '#3498db',
                    paddingVertical: 16,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="people" size={24} color="#fff" />
                  <Text style={{ color: '#fff', marginTop: 8, fontSize: 13, fontWeight: '600' }}>
                    {t('create_group_action')}
                  </Text>
                </TouchableOpacity>

                {classData.status !== 'completed' && (
                  <TouchableOpacity
                    onPress={handleMarkCompleted}
                    style={{
                      width: '100%',
                      backgroundColor: '#f1c40f',
                      paddingVertical: 16,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 8
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={24} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>
                      {t('mark_class_completed_action')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}
        {activeTab === 'students' && (
          <View style={{ padding: 20 }}>
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
              onPress={() => router.push(`/send-invitation?type=class&targetId=${id}&targetName=${encodeURIComponent(classData?.name || '')}`)}
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

            {/* Quick Actions Grid */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
              <TouchableOpacity
                onPress={() => {
                  setInviteType('class');
                  setInviteGroupId(null);
                  setShowInviteStudentModal(true);
                }}
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(39, 174, 96, 0.15)',
                  paddingVertical: 16,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(39, 174, 96, 0.3)'
                }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#27ae60', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <Ionicons name="mail-outline" size={20} color="#fff" />
                </View>
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>
                  {t('invite_student_email_action')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowAddStudentModal(true)}
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(52, 152, 219, 0.15)',
                  paddingVertical: 16,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(52, 152, 219, 0.3)'
                }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#3498db', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <Ionicons name="person-add-outline" size={20} color="#fff" />
                </View>
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>
                  {t('add_student_intake_action')}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 16 }}>
              {t('students_header')} <Text style={{ color: '#7f8c8d', fontSize: 16, fontWeight: '400' }}>({filteredStudents.filter(s => s.is_enrolled).length})</Text>
            </Text>

            {filteredStudents.filter(s => s.is_enrolled).map((student) => (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => openStudentDetails(student)}
                key={student.id}
                style={{
                  backgroundColor: '#252525',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderWidth: 1,
                  borderColor: '#333'
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  {/* Avatar */}
                  <View style={{ marginEnd: 16 }}>
                    {student.profile_picture_url ? (
                      <Image
                        source={{ uri: student.profile_picture_url }}
                        style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: '#444' }}
                      />
                    ) : (
                      <View style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: '#34495e',
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: '#444'
                      }}>
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>
                          {student.first_name[0]}{student.last_name[0]}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 2 }}>
                      {student.first_name} {student.last_name}
                    </Text>
                    <Text style={{ color: '#95a5a6', fontSize: 13, marginBottom: 4 }}>
                      {student.email}
                    </Text>
                    {student.group_id && (
                      <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(52, 152, 219, 0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ color: '#3498db', fontSize: 11, fontWeight: '600' }}>
                          Group: {groups.find(g => g.id === student.group_id)?.name || 'Unknown'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => router.push(`/direct-message/${student.id}`)}
                    style={{
                      width: 36, height: 36, borderRadius: 18,
                      backgroundColor: 'rgba(52, 152, 219, 0.1)',
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: 'rgba(52, 152, 219, 0.2)'
                    }}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color="#3498db" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleRemoveStudent(student.id, `${student.first_name} ${student.last_name}`)}
                    style={{
                      width: 36, height: 36, borderRadius: 18,
                      backgroundColor: 'rgba(231, 76, 60, 0.1)',
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: 'rgba(231, 76, 60, 0.2)'
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}

            {filteredStudents.filter(s => s.is_enrolled).length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <View style={{
                  width: 80, height: 80, borderRadius: 40,
                  backgroundColor: '#252525',
                  alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: '#333'
                }}>
                  <Ionicons name="people-outline" size={40} color="#7f8c8d" />
                </View>

                <Text style={{ color: '#7f8c8d', marginTop: 10, fontSize: 16 }}>
                  {t('no_students_enrolled')}
                </Text>
              </View>
            )}
          </View>
        )
        }

        {
          activeTab === 'groups' && (
            <View style={{ padding: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 15 }}>
                {t('groups_header')} ({groups.length})
              </Text>

              {groups.map((group) => (
                <View
                  key={group.id}
                  style={{
                    backgroundColor: '#252525',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: '#333',
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <View style={{ flex: 1, marginEnd: 12 }}>
                      <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 4 }}>
                        {group.name}
                      </Text>
                      <Text style={{ color: '#95a5a6', fontSize: 14, lineHeight: 20 }}>
                        {group.description}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteGroup(group.id, group.name)}
                      style={{
                        padding: 8,
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        borderRadius: 8,
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                    <View style={{ backgroundColor: '#rgba(52, 152, 219, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 8 }}>
                      <Text style={{ color: '#3498db', fontSize: 12, fontWeight: '600' }}>
                        {group.current_students}/{group.max_students} Students
                      </Text>
                    </View>
                  </View>

                  {/* Group Actions Grid */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {/* Details */}
                    <TouchableOpacity
                      onPress={() => router.push(`/group-details/${group.id}`)}
                      style={{
                        flex: 1, minWidth: '45%',
                        backgroundColor: '#2c3e50',
                        paddingVertical: 12,
                        borderRadius: 10,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <Ionicons name="information-circle-outline" size={18} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{t('group_details_action')}</Text>
                    </TouchableOpacity>

                    {/* Chat */}
                    <TouchableOpacity
                      onPress={() => router.push(`/group-chat/${group.id}`)}
                      style={{
                        flex: 1, minWidth: '45%',
                        backgroundColor: '#27ae60',
                        paddingVertical: 12,
                        borderRadius: 10,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <Ionicons name="chatbubbles-outline" size={18} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{t('group_chat_action')}</Text>
                    </TouchableOpacity>

                    {/* Invite */}
                    <TouchableOpacity
                      onPress={() => {
                        setInviteType('group');
                        setInviteGroupId(group.id);
                        setInviteEmail('');
                        setShowInviteStudentModal(true);
                      }}
                      style={{
                        flex: 1, minWidth: '45%',
                        backgroundColor: '#f39c12',
                        paddingVertical: 12,
                        borderRadius: 10,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <Ionicons name="mail-outline" size={18} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{t('group_invite_action')}</Text>
                    </TouchableOpacity>

                    {/* Add Student */}
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedGroupId(group.id);
                        setShowAddStudentToGroupModal(true);
                      }}
                      style={{
                        flex: 1, minWidth: '45%',
                        backgroundColor: '#3498db',
                        paddingVertical: 12,
                        borderRadius: 10,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <Ionicons name="person-add-outline" size={18} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{t('group_add_student_action')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {groups.length === 0 && (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <Ionicons name="people" size={48} color="#7f8c8d" />
                  <Text style={{ color: '#7f8c8d', marginTop: 10, fontSize: 16 }}>
                    {t('no_groups_created')}
                  </Text>
                </View>
              )}
            </View>
          )
        }
      </ScrollView >

      {/* Create Group Modal */}
      < Modal
        visible={showCreateGroupModal}
        animationType="slide"
        transparent={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View style={{ backgroundColor: '#2c2c2c', margin: 20, borderRadius: 15, padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' }}>
              {t('create_new_group_title')}
            </Text>

            <TextInput
              style={{
                backgroundColor: '#1a1a1a',
                borderRadius: 10,
                paddingHorizontal: 15,
                paddingVertical: 12,
                color: '#fff',
                fontSize: 16,
                marginBottom: 15,
              }}
              placeholder={t('placeholder_group_name')}
              placeholderTextColor="#7f8c8d"
              value={groupName}
              onChangeText={setGroupName}
              returnKeyType="next"
            />

            <TextInput
              style={{
                backgroundColor: '#1a1a1a',
                borderRadius: 10,
                paddingHorizontal: 15,
                paddingVertical: 12,
                color: '#fff',
                fontSize: 16,
                marginBottom: 15,
              }}
              placeholder={t('placeholder_description')}
              placeholderTextColor="#7f8c8d"
              value={groupDescription}
              onChangeText={setGroupDescription}
              multiline
              numberOfLines={3}
              returnKeyType="next"
            />

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
              placeholder={t('placeholder_max_students')}
              placeholderTextColor="#7f8c8d"
              value={maxGroupStudents}
              onChangeText={setMaxGroupStudents}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={handleCreateGroup}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setShowCreateGroupModal(false)}
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
                onPress={handleCreateGroup}
                disabled={creatingGroup}
                style={{
                  flex: 1,
                  backgroundColor: '#3498db',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  opacity: creatingGroup ? 0.6 : 1,
                }}
              >
                {creatingGroup ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff' }}>{t('submit_create_group')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal >

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
                {t('invite_student_header', { type: inviteType === 'class' ? t('class_type') : t('group_type') })}
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
              {t('add_student_intake_header')}
            </Text>

            <Text style={{ color: '#bdc3c7', marginBottom: 10 }}>
              {t('select_student_intake_label')}
            </Text>

            {/* Student Picker */}
            <View style={{
              backgroundColor: '#1a1a1a',
              borderRadius: 10,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: '#3498db',
            }}>
              <Picker
                selectedValue={selectedStudentId}
                onValueChange={(itemValue) => setSelectedStudentId(itemValue as number)}
                style={{ color: '#fff' }}
                dropdownIconColor="#fff"
              >
                <Picker.Item label={t('select_student_placeholder')} value={null} color="#7f8c8d" />
                {students
                  .filter(student => !student.is_enrolled) // Only show students NOT already in the class
                  .map((student) => (
                    <Picker.Item
                      key={student.id}
                      label={`${student.first_name} ${student.last_name} (${student.email})`}
                      value={student.id}
                      color="#fff"
                    />
                  ))}
              </Picker>
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
              <TouchableOpacity
                onPress={handleAddStudent}
                disabled={addingStudent || !selectedStudentId}
                style={{
                  flex: 1,
                  backgroundColor: '#3498db',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  opacity: (addingStudent || !selectedStudentId) ? 0.6 : 1,
                }}
              >
                {addingStudent ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff' }}>{t('add_student_action')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal >

      {/* Add Student to Group Modal */}
      < Modal
        visible={showAddStudentToGroupModal}
        animationType="slide"
        transparent={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View style={{ backgroundColor: '#2c2c2c', margin: 20, borderRadius: 15, padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' }}>
              {t('add_student_group_header')}
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
              <Picker
                selectedValue={selectedStudentIdForGroup}
                onValueChange={(itemValue) => setSelectedStudentIdForGroup(itemValue as number)}
                style={{ color: '#fff' }}
                dropdownIconColor="#fff"
              >
                <Picker.Item label={t('select_student_placeholder')} value={null} color="#7f8c8d" />
                {students
                  .filter(student => student.is_enrolled) // Only show students already in the class
                  .map((student) => (
                    <Picker.Item
                      key={student.id}
                      label={`${student.first_name} ${student.last_name} (${student.email})`}
                      value={student.id}
                      color="#fff"
                    />
                  ))}
              </Picker>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowAddStudentToGroupModal(false);
                  setSelectedStudentIdForGroup(null);
                  setSelectedGroupId(null);
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
                onPress={handleAddStudentToGroup}
                disabled={addingStudentToGroup || !selectedStudentIdForGroup || !selectedGroupId}
                style={{
                  flex: 1,
                  backgroundColor: '#3498db',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  opacity: (addingStudentToGroup || !selectedStudentIdForGroup || !selectedGroupId) ? 0.6 : 1,
                }}
              >
                {addingStudentToGroup ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff' }}>{t('add_to_group_action')}</Text>
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
              {t('delete_class_header')}
            </Text>

            {deletionPreview ? (
              <>
                <Text style={{ color: '#fff', marginBottom: 10 }}>
                  {t('class_details.delete_confirm_intro')}
                </Text>

                <View style={{ backgroundColor: '#3a3a3a', borderRadius: 8, padding: 10, marginBottom: 15 }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 5 }}>
                    {t('class_label')}
                  </Text>
                  <Text style={{ color: '#bdc3c7', marginBottom: 10 }}>
                    {deletionPreview.class?.name}
                  </Text>

                  {deletionPreview.groups && deletionPreview.groups.length > 0 && (
                    <>
                      <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 5 }}>
                        {t('groups_count_label', { count: deletionPreview.groups.length })}
                      </Text>
                      {deletionPreview.groups.map((group: any) => (
                        <Text key={group.id} style={{ color: '#bdc3c7', marginBottom: 3 }}>
                          • {group.name}
                        </Text>
                      ))}
                    </>
                  )}
                </View>

                <Text style={{ color: '#fff', marginBottom: 10 }}>
                  To confirm deletion, please type the following text:
                </Text>
                <Text style={{ color: '#e74c3c', fontWeight: 'bold', marginBottom: 10, textAlign: 'center' }}>
                  {t('class_details.delete_confirm_text')}
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
                {t('delete_class_confirmation')}
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
                onPress={handleDeleteClass}
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

      {/* Delete Group Confirmation Modal */}
      < Modal
        visible={showDeleteGroupModal}
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

            {groupDeletionPreview ? (
              <>
                <Text style={{ color: '#fff', marginBottom: 10 }}>
                  This action will permanently delete the following:
                </Text>

                <View style={{ backgroundColor: '#3a3a3a', borderRadius: 8, padding: 10, marginBottom: 15 }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 5 }}>
                    {t('group_label')}
                  </Text>
                  <Text style={{ color: '#bdc3c7' }}>
                    {groupToDelete?.name}
                  </Text>
                </View>

                <Text style={{ color: '#fff', marginBottom: 10 }}>
                  To confirm deletion, please type the following text:
                </Text>
                <Text style={{ color: '#e74c3c', fontWeight: 'bold', marginBottom: 10, textAlign: 'center' }}>
                  I understand that this deletion can not be reversed
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
                  value={groupConfirmationText}
                  onChangeText={setGroupConfirmationText}
                  multiline
                  numberOfLines={3}
                />
              </>
            ) : (
              <Text style={{ color: '#fff', marginBottom: 20, textAlign: 'center' }}>
                {t('delete_group_confirmation', { name: groupToDelete?.name })}
              </Text>
            )}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowDeleteGroupModal(false);
                  setGroupToDelete(null);
                  setGroupDeletionPreview(null);
                  setGroupConfirmationText('');
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
                onPress={handleConfirmDeleteGroup}
                disabled={deletingGroup}
                style={{
                  flex: 1,
                  backgroundColor: '#e74c3c',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  opacity: deletingGroup ? 0.6 : 1,
                }}
              >
                {deletingGroup ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff' }}>{t('delete_action')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal >

      {/* Edit Class Modal */}
      < Modal
        visible={showEditClassModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditClassModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View style={{ backgroundColor: '#2c2c2c', margin: 20, borderRadius: 15, padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' }}>
              {t('edit_class_header')}
            </Text>

            <TextInput
              style={{
                backgroundColor: '#1a1a1a',
                borderRadius: 10,
                paddingHorizontal: 15,
                paddingVertical: 12,
                color: '#fff',
                fontSize: 16,
                marginBottom: 15,
              }}
              placeholder={t('placeholder_class_name')}
              placeholderTextColor="#7f8c8d"
              value={editClassName}
              onChangeText={setEditClassName}
            />

            <TextInput
              style={{
                backgroundColor: '#1a1a1a',
                borderRadius: 10,
                paddingHorizontal: 15,
                paddingVertical: 12,
                color: '#fff',
                fontSize: 16,
                marginBottom: 15,
              }}
              placeholder={t('placeholder_description')}
              placeholderTextColor="#7f8c8d"
              value={editClassDescription}
              onChangeText={setEditClassDescription}
              multiline
              numberOfLines={3}
            />

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
              placeholder={t('placeholder_max_students')}
              placeholderTextColor="#7f8c8d"
              value={editMaxStudents}
              onChangeText={setEditMaxStudents}
              keyboardType="numeric"
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setShowEditClassModal(false)}
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
                onPress={handleUpdateClass}
                disabled={updatingClass}
                style={{
                  flex: 1,
                  backgroundColor: '#3498db',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  opacity: updatingClass ? 0.6 : 1,
                }}
              >
                {updatingClass ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff' }}>{t('update_action')}</Text>
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
                  placeholder={t('class_details.placeholder_venue')}
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
    </View >
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
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  overviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  overviewLabel: {
    fontSize: 16,
    color: '#bdc3c7',
  },
  overviewValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
  },
  tabText: {
    fontSize: 16,
    color: '#95a5a6',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3498db',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    letterSpacing: 0, // Reset letter spacing
  },
  searchIcon: {
    marginEnd: 10,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  studentInfo: {
    flex: 1,
    marginStart: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  studentEmail: {
    fontSize: 14,
    color: '#bdc3c7',
  },
  groupItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  groupStats: {
    fontSize: 14,
    color: '#95a5a6',
  },
  groupDescription: {
    fontSize: 14,
    color: '#bdc3c7',
    marginBottom: 10,
    lineHeight: 20,
  },
  groupStudents: {
    marginTop: 10,
  },
  groupStudentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  groupStudentName: {
    fontSize: 14,
    color: '#ecf0f1',
    marginStart: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#bdc3c7',
    marginBottom: 8,
  },
  textInput: {
    fontSize: 16,
    color: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden', // This will clip the picker to the container
  },
  picker: {
    color: '#fff',
    height: 50,
    width: '100%', // Ensure full width
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginEnd: 10,
  },
  confirmButton: {
    backgroundColor: '#3498db',
    marginStart: 10,
  },
  confirmButtonDanger: {
    backgroundColor: '#e74c3c',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#fff',
  },
  confirmButtonText: {
    color: '#fff',
  },
  emptyText: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  deleteButton: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  deleteButtonText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '600',
  },
  warningContainer: {
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  warningText: {
    color: '#f39c12',
    fontSize: 14,
    textAlign: 'center',
  },
  confirmationInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    marginBottom: 15,
  },
  groupStudentActions: {
    flexDirection: 'row',
    marginStart: 'auto',
  },
  removeStudentButton: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginStart: 8,
  },
  removeStudentButtonText: {
    color: '#e74c3c',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ClassDetailsScreen;
