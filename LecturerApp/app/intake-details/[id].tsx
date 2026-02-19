import React, { useState, useEffect } from 'react';
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
  TouchableWithoutFeedback,
  Image
} from 'react-native';
import Toast from 'react-native-toast-message';
import { router, useLocalSearchParams } from 'expo-router';
import { tokenStorage } from '../../utils/tokenStorage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import { API_CONFIG } from '../../src/config/api';
import { socketIOManager } from '../../src/utils/socketio';
import DatePicker from '../../src/components/DatePicker';
import { useLocalization } from '../../src/context/LocalizationContext';
import { useTranslation } from 'react-i18next';
const AsyncStorage = tokenStorage;

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

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  is_enrolled: boolean;
  join_date?: string;
  payment_amount?: string;
  payment_type?: string;
  payment_method?: string;
  profile_picture_url?: string | null;
}

interface Class {
  id: number;
  name: string;
  description: string;
  max_students: number;
  current_students: number;
  created_at: string;
}

const IntakeDetailsScreen = () => {
  const { t } = useTranslation();
  const { formatPrice } = useLocalization();
  const { id } = useLocalSearchParams();
  const [intake, setIntake] = useState<Intake | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'classes'>('overview');

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [creatingClass, setCreatingClass] = useState(false);

  // Student Details Modal
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentDetailsModal, setShowStudentDetailsModal] = useState(false);

  // Deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletionPreview, setDeletionPreview] = useState<any>(null);
  const [confirmationText, setConfirmationText] = useState('');

  // Edit Intake State
  const [showEditIntakeModal, setShowEditIntakeModal] = useState(false);
  const [updatingIntake, setUpdatingIntake] = useState(false);
  const [editIntakeName, setEditIntakeName] = useState('');
  const [editIntakeDescription, setEditIntakeDescription] = useState('');
  const [editStartDate, setEditStartDate] = useState<Date | undefined>(undefined);
  const [editEndDate, setEditEndDate] = useState<Date | undefined>(undefined);
  const [editMaxStudents, setEditMaxStudents] = useState('');

  // Form states
  const [inviteEmail, setInviteEmail] = useState('');
  const [className, setClassName] = useState('');
  const [classDescription, setClassDescription] = useState('');
  const [maxClassStudents, setMaxClassStudents] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Validate that id exists and is not undefined
  const intakeId = Array.isArray(id) ? id[0] : id;
  const isValidIntakeId = intakeId && typeof intakeId === 'string';

  useEffect(() => {
    // Check if we have a valid intake ID before proceeding
    if (!isValidIntakeId) {
      setLoading(false);
      return;
    }

    loadIntakeDetails();

    // Connect to Socket.IO for real-time updates
    socketIOManager.connect();

    // Handle entity deletion events
    const handleEntityDeleted = (event: any) => {
      console.log('Entity deleted:', event);

      // If the current intake was deleted, go back to the previous screen
      if (event.entity_type === 'intake' && event.entity_id === parseInt(intakeId as string)) {
        Toast.show({
          type: 'info',
          text1: t('intake_details.intake_deleted'),
          text2: t('intake_details.intake_deleted_msg')
        });
        router.back();
        return;
      }

      // If a class was deleted, reload the data
      if (event.entity_type === 'class') {
        loadIntakeDetails();
      }
    };

    // Listen for entity deletion events
    socketIOManager.onEntityDeleted(handleEntityDeleted);

    // Cleanup
    return () => {
      socketIOManager.removeEntityDeletedCallback(handleEntityDeleted);
      socketIOManager.disconnect();
    };
  }, [id, isValidIntakeId]);

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

  const loadIntakeDetails = async () => {
    try {
      setLoading(true);

      // Load intake details
      const intakeResponse = await api.get(`lecturer/intakes/${intakeId}/`);
      setIntake(intakeResponse.data);

      // Load students
      const studentsResponse = await api.get(`lecturer/intakes/${intakeId}/students/`);
      setStudents(studentsResponse.data);
      setFilteredStudents(studentsResponse.data);

      // Load classes
      const classesResponse = await api.get(`lecturer/intakes/${intakeId}/classes/`);
      setClasses(classesResponse.data);
    } catch (error) {
      console.error('Error loading intake details:', error);
      console.error('Error loading intake details:', error);
      Toast.show({
        type: 'error',
        text1: t('intake_details.error_loading_data'),
        text2: t('intake_details.error_loading_msg')
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadIntakeDetails();
    setRefreshing(false);
  };

  const handleInviteStudent = async () => {
    if (!inviteEmail.trim()) {
      Toast.show({
        type: 'error',
        text1: t('intake_details.validation_error'),
        text2: t('intake_details.enter_email')
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      Toast.show({
        type: 'error',
        text1: t('intake_details.validation_error'),
        text2: t('intake_details.enter_valid_email')
      });
      return;
    }

    try {
      setInviting(true);

      const inviteData = {
        email: inviteEmail.trim()
      };

      console.log('Sending invite data:', inviteData); // Debug log

      await api.post(`lecturer/intakes/${intakeId}/invite/`, inviteData);

      Toast.show({
        type: 'success',
        text1: t('intake_details.invitation_sent'),
        text2: t('intake_details.invitation_sent_msg')
      });
      setInviteEmail('');
      setShowInviteModal(false);
      onRefresh();
    } catch (error: any) {
      console.error('Error inviting student:', error);
      console.error('Error response:', error.response?.data); // Debug log
      Toast.show({
        type: 'error',
        text1: t('intake_details.invitation_failed'),
        text2: error.response?.data?.error || error.response?.data?.detail || 'Failed to send invitation'
      });
    } finally {
      setInviting(false);
    }
  };

  const handleCreateClass = async () => {
    if (!className.trim() || !classDescription.trim() || !maxClassStudents.trim()) {
      Toast.show({
        type: 'error',
        text1: t('intake_details.validation_error'),
        text2: t('intake_details.fill_all_fields')
      });
      return;
    }

    const maxStudents = parseInt(maxClassStudents);
    if (isNaN(maxStudents) || maxStudents <= 0) {
      Toast.show({
        type: 'error',
        text1: t('intake_details.validation_error'),
        text2: t('intake_details.valid_max_students')
      });
      return;
    }

    try {
      setCreatingClass(true);

      const classData = {
        name: className.trim(),
        description: classDescription.trim(),
        max_students: maxStudents
      };

      console.log('Sending class data:', classData); // Debug log

      await api.post(`lecturer/intakes/${intakeId}/classes/`, classData);

      Toast.show({
        type: 'success',
        text1: t('intake_details.class_created'),
        text2: t('intake_details.class_created_msg')
      });
      setClassName('');
      setClassDescription('');
      setMaxClassStudents('');
      setShowCreateClassModal(false);
      onRefresh();
    } catch (error: any) {
      console.error('Error creating class:', error);
      console.error('Error response:', error.response?.data); // Debug log
      Toast.show({
        type: 'error',
        text1: t('intake_details.creation_failed'),
        text2: error.response?.data?.error || error.response?.data?.detail || 'Failed to create class'
      });
    } finally {
      setCreatingClass(false);
    }
  };

  const handleRemoveStudent = async (studentId: number, studentName: string) => {
    Alert.alert(
      t('intake_details.remove_student'),
      t('intake_details.remove_student_confirm', { name: studentName }),
      [
        { text: t('intake_details.cancel'), style: 'cancel' },
        {
          text: t('intake_details.remove_student'),
          style: 'destructive',
          onPress: async () => {
            try {

              await api.delete(`lecturer/intakes/${intakeId}/students/${studentId}/remove/`);

              Toast.show({
                type: 'success',
                text1: t('intake_details.student_removed'),
                text2: t('intake_details.student_removed_msg')
              });
              onRefresh();
            } catch (error: any) {
              console.error('Error removing student:', error);
              Toast.show({
                type: 'error',
                text1: t('intake_details.removal_failed'),
                text2: error.response?.data?.error || t('intake_details.failed_remove_student')
              });
            }
          }
        }
      ]
    );
  };

  const handleDeleteIntake = async () => {
    try {
      setDeleting(true);

      await api.delete(`lecturer/intakes/${intakeId}/`, {
        data: { confirmation: confirmationText }
      });

      Toast.show({
        type: 'success',
        text1: t('intake_details.intake_deleted'),
        text2: t('intake_details.intake_deleted_msg')
      });
      setTimeout(() => router.back(), 1000);
    } catch (error: any) {
      console.error('Error deleting intake:', error);
      if (error.response?.status === 400 && error.response?.data?.deletion_preview) {
        setDeletionPreview(error.response.data.deletion_preview);
        setShowDeleteModal(true);
      } else {
        Toast.show({
          type: 'error',
          text1: t('intake_details.deletion_failed'),
          text2: error.response?.data?.error || t('intake_details.failed_delete_intake')
        });
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateIntake = async () => {
    if (!editIntakeName.trim() || !editIntakeDescription.trim() || !editStartDate || !editEndDate || !editMaxStudents.trim()) {
      Toast.show({
        type: 'error',
        text1: t('intake_details.validation_error'),
        text2: t('intake_details.fill_all_fields')
      });
      return;
    }

    try {
      setUpdatingIntake(true);
      const formattedStartDate = `${editStartDate.getFullYear()}-${(editStartDate.getMonth() + 1).toString().padStart(2, '0')}-${editStartDate.getDate().toString().padStart(2, '0')}`;
      const formattedEndDate = `${editEndDate.getFullYear()}-${(editEndDate.getMonth() + 1).toString().padStart(2, '0')}-${editEndDate.getDate().toString().padStart(2, '0')}`;

      await api.patch(`lecturer/intakes/${intakeId}/`, {
        name: editIntakeName.trim(),
        description: editIntakeDescription.trim(),
        start_date: formattedStartDate,
        end_date: formattedEndDate,
        max_students: parseInt(editMaxStudents)
      });

      Toast.show({
        type: 'success',
        text1: t('intake_details.intake_updated'),
        text2: t('intake_details.intake_updated_msg')
      });
      setShowEditIntakeModal(false);
      onRefresh();
    } catch (error: any) {
      console.error('Error updating intake:', error);
      Toast.show({
        type: 'error',
        text1: t('intake_details.update_failed'),
        text2: error.response?.data?.error || t('intake_details.failed_update_intake')
      });
    } finally {
      setUpdatingIntake(false);
    }
  };

  const openEditIntakeModal = () => {
    if (!intake) return;
    setEditIntakeName(intake.name);
    setEditIntakeDescription(intake.description);
    setEditStartDate(new Date(intake.start_date));
    setEditEndDate(new Date(intake.end_date));
    setEditMaxStudents(intake.max_students.toString());
    setShowEditIntakeModal(true);
  };

  const handleMarkCompleted = async () => {
    Alert.alert(
      t('intake_details.mark_completed'),
      t('intake_details.mark_completed_confirm'),
      [
        { text: t('intake_details.cancel'), style: 'cancel' },
        {
          text: t('intake_details.mark_completed'),
          onPress: async () => {
            try {
              setLoading(true);
              await api.patch(`lecturer/intakes/${intakeId}/mark_completed/`, {});
              Toast.show({
                type: 'success',
                text1: t('intake_details.intake_completed'),
                text2: t('intake_details.intake_completed_msg')
              });
              loadIntakeDetails();
            } catch (error: any) {
              console.error('Error marking intake as completed:', error);
              Toast.show({
                type: 'error',
                text1: t('intake_details.action_failed'),
                text2: error.response?.data?.error || t('intake_details.failed_mark_completed')
              });
              setLoading(false);
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

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount?: string) => {
    if (!amount) return 'N/A';
    return formatPrice(parseFloat(amount));
  };

  const getPaymentBadgeColor = (type?: string) => {
    switch (type) {
      case 'hourly': return '#3498db';
      case 'term': return '#9b59b6';
      case 'class': return '#2ecc71';
      case 'demo': return '#f1c40f';
      default: return '#7f8c8d';
    }
  };

  const openStudentDetails = (student: Student) => {
    setSelectedStudent(student);
    setShowStudentDetailsModal(true);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={{ color: '#fff', marginTop: 16 }}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!intake) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
        <Text style={{ color: '#fff' }}>Intake not found</Text>
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
          paddingBottom: 20,
          paddingHorizontal: 20,
          backgroundColor: '#1a1a1a',
          borderBottomWidth: 1,
          borderBottomColor: '#2c2c2c'
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#252525',
              alignItems: 'center',
              justifyContent: 'center',
              marginEnd: 15,
              borderWidth: 1,
              borderColor: '#333'
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#fff', flex: 1 }} numberOfLines={1}>
            {intake?.name}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={openEditIntakeModal}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(52, 152, 219, 0.3)'
              }}
            >
              <Ionicons name="create-outline" size={20} color="#3498db" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDeleteIntake}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(231, 76, 60, 0.3)'
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
          {(['overview', 'students', 'classes'] as const).map((tab) => (
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3498db" />
        }
      >
        {activeTab === 'overview' && (
          <View style={{ padding: 20 }}>
            <View style={{
              backgroundColor: '#252525',
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: '#333'
            }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 16 }}>
                {t('intake_details.intake_info')}
              </Text>

              <View style={{ gap: 16 }}>
                <View>
                  <Text style={{ color: '#7f8c8d', fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('intake_details.description_label')}</Text>
                  <Text style={{ color: '#ecf0f1', fontSize: 15, lineHeight: 22 }}>{intake.description}</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 20 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#7f8c8d', fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('intake_details.start_date_label')}</Text>
                    <Text style={{ color: '#fff', fontSize: 15 }}>{formatDate(intake.start_date)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#7f8c8d', fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('intake_details.end_date_label')}</Text>
                    <Text style={{ color: '#fff', fontSize: 15 }}>{formatDate(intake.end_date)}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 20 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#7f8c8d', fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('intake_details.students_count_label')}</Text>
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                      {intake.current_students} <Text style={{ color: '#7f8c8d', fontWeight: '400' }}>/ {intake.max_students}</Text>
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#7f8c8d', fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('intake_details.status_label')}</Text>
                    <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(39, 174, 96, 0.15)', paddingHorizontal: 4, borderRadius: 8 }}>
                      <Text style={{ color: '#27ae60', fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4 }}>
                        {intake.status}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View style={{
              backgroundColor: '#252525',
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: '#333'
            }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 16 }}>
                {t('intake_details.quick_actions')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setShowInviteModal(true)}
                  style={{
                    width: '48%',
                    backgroundColor: '#27ae60',
                    paddingVertical: 16,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="person-add" size={24} color="#fff" />
                  <Text style={{ color: '#fff', marginTop: 8, fontSize: 13, fontWeight: '600' }}>{t('intake_details.invite_student')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowCreateClassModal(true)}
                  style={{
                    width: '48%',
                    backgroundColor: '#3498db',
                    paddingVertical: 16,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="school" size={24} color="#fff" />
                  <Text style={{ color: '#fff', marginTop: 8, fontSize: 13, fontWeight: '600' }}>{t('intake_details.create_class_action')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push(`/intake-details/quizzes?id=${intakeId}`)}
                  style={{
                    width: '48%',
                    backgroundColor: '#9b59b6',
                    paddingVertical: 16,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="document-text" size={24} color="#fff" />
                  <Text style={{ color: '#fff', marginTop: 8, fontSize: 13, fontWeight: '600' }}>{t('intake_details.quizzes_action')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push(`/intake-videos/${intakeId}`)}
                  style={{
                    width: '48%',
                    backgroundColor: '#e67e22',
                    paddingVertical: 16,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="videocam" size={24} color="#fff" />
                  <Text style={{ color: '#fff', marginTop: 8, fontSize: 13, fontWeight: '600' }}>Intake Videos</Text>
                </TouchableOpacity>

                {intake.status !== 'completed' && (
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
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{t('intake_details.mark_completed')}</Text>
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
              <View style={{
                backgroundColor: '#252525',
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 15,
                borderWidth: 1,
                borderColor: '#333'
              }}>
                <Ionicons name="search" size={20} color="#7f8c8d" style={{ marginRight: 10 }} />
                <TextInput
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    color: '#fff',
                    fontSize: 16,
                  }}
                  placeholder={t('intake_details.search_students_placeholder')}
                  placeholderTextColor="#7f8c8d"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="done"
                  onSubmitEditing={() => { }}
                />
              </View>
            </View>

            {/* Send Paid Invitation Button */}
            <TouchableOpacity
              onPress={() => router.push(`/send-invitation?type=intake&targetId=${intakeId}&targetName=${encodeURIComponent(intake?.name || '')}`)}
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
              {t('intake_details.students_header', { count: filteredStudents.filter(s => s.is_enrolled).length })}
            </Text>

            {filteredStudents.filter(s => s.is_enrolled).map((student) => (
              <TouchableOpacity
                key={student.id}
                onPress={() => openStudentDetails(student)}
                activeOpacity={0.7}
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
                {/* Avatar */}
                <View style={{ marginEnd: 15, justifyContent: 'center', alignItems: 'center' }}>
                  {student.profile_picture_url ? (
                    <Image
                      source={{ uri: student.profile_picture_url }}
                      style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#333' }}
                    />
                  ) : (
                    <View style={{
                      width: 50,
                      height: 50,
                      borderRadius: 25,
                      backgroundColor: 'rgba(52, 152, 219, 0.15)',
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: 'rgba(52, 152, 219, 0.3)'
                    }}>
                      <Text style={{ color: '#3498db', fontSize: 18, fontWeight: '700' }}>
                        {student.first_name[0]}{student.last_name[0]}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 2 }}>
                    {student.first_name} {student.last_name}
                  </Text>
                  <Text style={{ color: '#bdc3c7', fontSize: 14 }}>
                    {student.email}
                  </Text>

                  {/* Payment Badge Preview */}
                  {student.payment_type && (
                    <View style={{
                      backgroundColor: getPaymentBadgeColor(student.payment_type),
                      alignSelf: 'flex-start',
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 4,
                      marginTop: 6
                    }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }}>
                        {student.payment_type}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => router.push(`/direct-message/${student.id}`)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: 'rgba(52, 152, 219, 0.1)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: 'rgba(52, 152, 219, 0.3)'
                    }}
                  >
                    <Ionicons name="chatbubble-ellipses" size={18} color="#3498db" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleRemoveStudent(student.id, `${student.first_name} ${student.last_name}`)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: 'rgba(231, 76, 60, 0.1)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: 'rgba(231, 76, 60, 0.3)'
                    }}
                  >
                    <Ionicons name="trash" size={18} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}

            {filteredStudents.filter(s => s.is_enrolled).length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40, opacity: 0.5 }}>
                <Ionicons name="people" size={48} color="#7f8c8d" />
                <Text style={{ color: '#7f8c8d', marginTop: 10, fontSize: 16 }}>
                  {t('intake_details.no_students')}
                </Text>
              </View>
            )}
          </View>
        )}
        {activeTab === 'classes' && (
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 16 }}>
              {t('intake_details.classes_header', { count: classes.length })}
            </Text>

            {classes.map((classItem) => (
              <TouchableOpacity
                key={classItem.id}
                onPress={() => router.push(`/class-details/${classItem.id}`)}
                style={{
                  backgroundColor: '#252525',
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: '#333'
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', flex: 1 }}>
                    {classItem.name}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#7f8c8d" />
                </View>

                <Text style={{ color: '#bdc3c7', fontSize: 14, marginBottom: 12, lineHeight: 20 }}>
                  {classItem.description}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="people-outline" size={16} color="#3498db" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#3498db', fontSize: 14, fontWeight: '600' }}>
                    {classItem.current_students} / {classItem.max_students} Students
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {classes.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40, opacity: 0.5 }}>
                <Ionicons name="school" size={48} color="#7f8c8d" />
                <Text style={{ color: '#7f8c8d', marginTop: 10, fontSize: 16 }}>
                  {t('intake_details.no_classes')}
                </Text>
              </View>
            )}
          </View>
        )
        }
      </ScrollView>

      {/* Student Details Modal */}
      <Modal
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
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff' }}>{t('intake_details.student_details_title')}</Text>
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

                    <View style={{ borderTopWidth: 1, borderTopColor: '#34495e', paddingTop: 15 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                        <Text style={{ color: '#bdc3c7', fontWeight: '600' }}>{t('intake_details.joined_on')}</Text>
                        <Text style={{ color: '#fff' }}>{formatDateTime(selectedStudent.join_date)}</Text>
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                        <Text style={{ color: '#bdc3c7', fontWeight: '600' }}>{t('intake_details.payment_type')}</Text>
                        <View style={{
                          backgroundColor: getPaymentBadgeColor(selectedStudent.payment_type),
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 4
                        }}>
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' }}>
                            {selectedStudent.payment_type || 'N/A'}
                          </Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                        <Text style={{ color: '#bdc3c7', fontWeight: '600' }}>{t('intake_details.amount_paid')}</Text>
                        <Text style={{ color: '#2ecc71', fontWeight: 'bold' }}>{formatCurrency(selectedStudent.payment_amount)}</Text>
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                        <Text style={{ color: '#bdc3c7', fontWeight: '600' }}>{t('intake_details.payment_method')}</Text>
                        <Text style={{ color: '#fff' }}>{selectedStudent.payment_method || 'N/A'}</Text>
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
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{t('intake_details.close')}</Text>
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

                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{t('intake_details.message_student')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Invite Student Modal */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        transparent={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View style={{ backgroundColor: '#2c2c2c', margin: 20, borderRadius: 15, padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' }}>
              {t('intake_details.invite_student')}
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
              placeholder={t('intake_details.enter_email_placeholder')}
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
                onPress={() => setShowInviteModal(false)}
                style={{
                  flex: 1,
                  backgroundColor: '#7f8c8d',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff' }}>{t('intake_details.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleInviteStudent}
                disabled={inviting}
                style={{
                  flex: 1,
                  backgroundColor: '#27ae60',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  opacity: inviting ? 0.6 : 1,
                }}
              >
                {inviting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff' }}>{t('intake_details.send_invitation')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Class Modal */}
      <Modal
        visible={showCreateClassModal}
        animationType="slide"
        transparent={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View style={{ backgroundColor: '#2c2c2c', margin: 20, borderRadius: 15, padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' }}>
              {t('intake_details.create_new_class')}
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
              placeholder={t('intake_details.class_name_placeholder')}
              placeholderTextColor="#7f8c8d"
              value={className}
              onChangeText={setClassName}
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
              placeholder={t('intake_details.description_placeholder')}
              placeholderTextColor="#7f8c8d"
              value={classDescription}
              onChangeText={setClassDescription}
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
              placeholder={t('intake_details.max_students_placeholder')}
              placeholderTextColor="#7f8c8d"
              value={maxClassStudents}
              onChangeText={setMaxClassStudents}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={handleCreateClass}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setShowCreateClassModal(false)}
                style={{
                  flex: 1,
                  backgroundColor: '#7f8c8d',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff' }}>{t('intake_details.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateClass}
                disabled={creatingClass}
                style={{
                  flex: 1,
                  backgroundColor: '#3498db',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  opacity: creatingClass ? 0.6 : 1,
                }}
              >
                {creatingClass ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff' }}>{t('intake_details.create_class_action')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
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
              {t('intake_details.delete_intake')}
            </Text>

            {deletionPreview ? (
              <>
                <Text style={{ color: '#fff', marginBottom: 10 }}>
                  {t('intake_details.delete_preview_header')}
                </Text>

                <View style={{ backgroundColor: '#3a3a3a', borderRadius: 8, padding: 10, marginBottom: 15 }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 5 }}>
                    {t('intake_details.delete_preview_intake')}
                  </Text>
                  <Text style={{ color: '#bdc3c7', marginBottom: 10 }}>
                    {deletionPreview.intake?.name}
                  </Text>

                  {deletionPreview.classes && deletionPreview.classes.length > 0 && (
                    <>
                      <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 5 }}>
                        {t('intake_details.delete_preview_classes', { count: deletionPreview.classes.length })}
                      </Text>
                      {deletionPreview.classes.map((cls: any) => (
                        <Text key={cls.id} style={{ color: '#bdc3c7', marginBottom: 3 }}>
                          • {cls.name}
                        </Text>
                      ))}
                    </>
                  )}

                  {deletionPreview.groups && deletionPreview.groups.length > 0 && (
                    <>
                      <Text style={{ color: '#fff', fontWeight: 'bold', marginTop: 10, marginBottom: 5 }}>
                        {t('intake_details.delete_preview_groups', { count: deletionPreview.groups.length })}
                      </Text>
                      {deletionPreview.groups.map((group: any) => (
                        <Text key={group.id} style={{ color: '#bdc3c7', marginBottom: 3 }}>
                          • {group.name} {t('intake_details.in_class', { className: group.class_name })}
                        </Text>
                      ))}
                    </>
                  )}
                </View>

                <Text style={{ color: '#fff', marginBottom: 10 }}>
                  {t('intake_details.type_confirmation_header')}
                </Text>
                <Text style={{ color: '#e74c3c', fontWeight: 'bold', marginBottom: 10, textAlign: 'center' }}>
                  {t('intake_details.confirmation_text')}
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
                  placeholder={t('intake_details.type_confirmation_placeholder')}
                  placeholderTextColor="#7f8c8d"
                  value={confirmationText}
                  onChangeText={setConfirmationText}
                  multiline
                  numberOfLines={3}
                />
              </>
            ) : (
              <Text style={{ color: '#fff', marginBottom: 20, textAlign: 'center' }}>
                {t('intake_details.delete_confirm_msg')}
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
                <Text style={{ color: '#fff' }}>{t('intake_details.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteIntake}
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
                  <Text style={{ color: '#fff' }}>{t('intake_details.delete_button')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Intake Modal */}
      <Modal
        visible={showEditIntakeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditIntakeModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View style={{ backgroundColor: '#2c2c2c', margin: 20, borderRadius: 15, padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' }}>
              {t('intake_details.edit_intake')}
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
              placeholder={t('intake_details.intake_name_placeholder')}
              placeholderTextColor="#7f8c8d"
              value={editIntakeName}
              onChangeText={setEditIntakeName}
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
              placeholder={t('intake_details.description_placeholder')}
              placeholderTextColor="#7f8c8d"
              value={editIntakeDescription}
              onChangeText={setEditIntakeDescription}
              multiline
              numberOfLines={3}
            />

            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: '#bdc3c7', fontSize: 14, marginBottom: 8, fontWeight: '600' }}>{t('intake_details.start_date_label')}</Text>
              <DatePicker
                value={editStartDate}
                onChange={setEditStartDate}
                placeholder={t('intake_details.select_start_date')}
              />
            </View>

            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: '#bdc3c7', fontSize: 14, marginBottom: 8, fontWeight: '600' }}>{t('intake_details.end_date_label')}</Text>
              <DatePicker
                value={editEndDate}
                onChange={setEditEndDate}
                minimumDate={editStartDate}
                placeholder={t('intake_details.select_end_date')}
              />
            </View>

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
              placeholder={t('intake_details.max_students_placeholder')}
              placeholderTextColor="#7f8c8d"
              value={editMaxStudents}
              onChangeText={setEditMaxStudents}
              keyboardType="numeric"
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setShowEditIntakeModal(false)}
                style={{
                  flex: 1,
                  backgroundColor: '#7f8c8d',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff' }}>{t('intake_details.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUpdateIntake}
                disabled={updatingIntake}
                style={{
                  flex: 1,
                  backgroundColor: '#3498db',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  opacity: updatingIntake ? 0.6 : 1,
                }}
              >
                {updatingIntake ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff' }}>{t('intake_details.update_button')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

export default IntakeDetailsScreen;
