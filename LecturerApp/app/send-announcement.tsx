import React, { useState, useEffect } from 'react';
import Toast from 'react-native-toast-message';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet
} from 'react-native';
import { router } from 'expo-router';
import { tokenStorage } from '../utils/tokenStorage';
const AsyncStorage = tokenStorage;
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_CONFIG } from '../src/config/api';
import { lecturerAPI } from '../src/utils/api';
import { socketIOManager } from '../src/utils/socketio';
import { useTranslation } from 'react-i18next';

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
  intake: number;
  max_students: number;
  current_students: number;
  created_at: string;
}

interface Group {
  id: number;
  name: string;
  description: string;
  class_obj: number;
  max_students: number;
  current_students: number;
  created_at: string;
}

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  is_enrolled: boolean;
}

const SendAnnouncementScreen = () => {
  const { t } = useTranslation();
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedIntake, setSelectedIntake] = useState<Intake | null>(null);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'intake' | 'class' | 'group'>('intake');

  useEffect(() => {
    loadEntities();
  }, []);

  const loadEntities = async () => {
    try {
      setLoading(true);

      // Load intakes
      const intakesResponse = await lecturerAPI.getIntakes();
      setIntakes(intakesResponse.data);

      // Load classes
      const classesResponse = await lecturerAPI.getClasses();
      setClasses(classesResponse.data);

      // Load groups
      const groupsResponse = await lecturerAPI.getGroups();
      setGroups(groupsResponse.data);
    } catch (error) {
      console.error('Error loading entities:', error);
      Toast.show({
        type: 'error',
        text1: t('error_loading_data_title'),
        text2: t('error_loading_data_msg')
      });
    } finally {
      setLoading(false);
    }
  };

  const getStudents = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        throw new Error(t('error_no_token'));
      }

      let students = [];
      let entityName = '';

      if (activeTab === 'intake' && selectedIntake) {
        const response = await lecturerAPI.getIntakeStudents(selectedIntake.id.toString());
        students = response.data.filter((student: Student) => student.is_enrolled);
        entityName = selectedIntake.name;
      } else if (activeTab === 'class' && selectedClass) {
        const response = await lecturerAPI.getClassStudents(selectedClass.id.toString());
        students = response.data.filter((student: Student) => student.is_enrolled);
        entityName = selectedClass.name;
      } else if (activeTab === 'group' && selectedGroup) {
        const response = await lecturerAPI.getGroupStudents(selectedGroup.id.toString());
        students = response.data.filter((student: Student) => student.is_enrolled);
        entityName = selectedGroup.name;
      } else {
        throw new Error(t('error_select_entity'));
      }

      if (students.length === 0) {
        throw new Error(t('error_no_students_in_entity', { name: entityName }));
      }

      return students;
    } catch (error) {
      console.error('Error fetching students:', error);
      throw error;
    }
  };

  const sendAnnouncement = async () => {
    if (!message.trim()) {
      Toast.show({
        type: 'error',
        text1: t('validation_error_title'),
        text2: t('validation_enter_message')
      });
      return;
    }

    try {
      setSending(true);

      // Get students based on selected entity
      const students = await getStudents();

      // Send message to each student
      let successCount = 0;
      let errorCount = 0;

      for (const student of students) {
        try {
          // Get or create a direct message room for this user pair
          const roomResponse = await axios.get(
            `${API_CONFIG.CHAT_BASE_URL}direct-messages/${student.id}/`,
            {
              headers: {
                'Authorization': `Bearer ${await AsyncStorage.getItem('access_token')}`
              }
            }
          );

          const roomId = roomResponse.data.id;

          // Send the message using axios directly with the correct endpoint
          await axios.post(
            `${API_CONFIG.CHAT_BASE_URL}rooms/${roomId}/messages/`,
            { content: message, message_type: 'announcement' },
            {
              headers: {
                'Authorization': `Bearer ${await AsyncStorage.getItem('access_token')}`,
                'Content-Type': 'application/json'
              }
            }
          );

          successCount++;
        } catch (error) {
          console.error(`Error sending message to ${student.first_name}:`, error);
          errorCount++;
        }
      }

      if (errorCount === 0) {
        Toast.show({
          type: 'success',
          text1: t('success_announcement_sent_title'),
          text2: t('success_announcement_sent_msg', { count: successCount })
        });
        setMessage('');
        setTimeout(() => router.back(), 2000);
      } else if (successCount > 0) {
        Toast.show({
          type: 'info',
          text1: t('partial_success_title'),
          text2: t('partial_success_msg', { success: successCount, failed: errorCount })
        });
      } else {
        Toast.show({
          type: 'error',
          text1: t('error_sending_failed_title'),
          text2: t('error_sending_failed_msg')
        });
      }
    } catch (error: any) {
      console.error('Error sending announcement:', error);
      Toast.show({
        type: 'error',
        text1: t('error_title'),
        text2: error.response?.data?.error || error.message || t('error_sending_failed_msg')
      });
    } finally {
      setSending(false);
    }
  };

  const getEntityName = () => {
    if (activeTab === 'intake' && selectedIntake) {
      return selectedIntake.name;
    } else if (activeTab === 'class' && selectedClass) {
      return selectedClass.name;
    } else if (activeTab === 'group' && selectedGroup) {
      return selectedGroup.name;
    }
    return '';
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={{ color: '#ecf0f1', marginTop: 10 }}>{t('loading_messages')}</Text>
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={{
            paddingTop: Platform.OS === 'ios' ? 60 : 40,
            paddingHorizontal: 24,
            paddingBottom: 20,
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 20,
            }}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginEnd: 16,
                }}
              >
                <Ionicons name="arrow-back" size={24} color="#3498db" />
              </TouchableOpacity>
              <Text style={{
                fontSize: 24,
                fontWeight: 'bold',
                color: '#ecf0f1',
              }}>
                {t('announcement_header_title')}
              </Text>
            </View>

            <Text style={{
              fontSize: 16,
              color: '#bdc3c7',
              lineHeight: 24,
            }}>
              {t('announcement_header_subtitle')}
            </Text>
          </View>

          {/* Tab Selector */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            marginHorizontal: 24,
            borderRadius: 12,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'intake' && styles.activeTab
              ]}
              onPress={() => setActiveTab('intake')}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'intake' && styles.activeTabText
              ]}>
                {t('tab_intake')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'class' && styles.activeTab
              ]}
              onPress={() => setActiveTab('class')}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'class' && styles.activeTabText
              ]}>
                {t('tab_class')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'group' && styles.activeTab
              ]}
              onPress={() => setActiveTab('group')}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'group' && styles.activeTabText
              ]}>
                {t('tab_group')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Entity Selection */}
          <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: '#ecf0f1',
              marginBottom: 12,
            }}>
              {t(`select_${activeTab}`)}
            </Text>

            {activeTab === 'intake' && (
              <View style={styles.entityContainer}>
                {intakes.map((intake) => (
                  <TouchableOpacity
                    key={intake.id}
                    style={[
                      styles.entityItem,
                      selectedIntake?.id === intake.id && styles.selectedEntity
                    ]}
                    onPress={() => setSelectedIntake(intake)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.entityName}>{intake.name}</Text>
                      <Text style={styles.entityStats}>
                        {t('students_count_format', { current: intake.current_students, max: intake.max_students })}
                      </Text>
                    </View>
                    <Ionicons
                      name={selectedIntake?.id === intake.id ? "radio-button-on" : "radio-button-off"}
                      size={24}
                      color={selectedIntake?.id === intake.id ? "#3498db" : "#95a5a6"}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {activeTab === 'class' && (
              <View style={styles.entityContainer}>
                {classes.map((classItem) => (
                  <TouchableOpacity
                    key={classItem.id}
                    style={[
                      styles.entityItem,
                      selectedClass?.id === classItem.id && styles.selectedEntity
                    ]}
                    onPress={() => setSelectedClass(classItem)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.entityName}>{classItem.name}</Text>
                      <Text style={styles.entityStats}>
                        {t('students_count_format', { current: classItem.current_students, max: classItem.max_students })}
                      </Text>
                    </View>
                    <Ionicons
                      name={selectedClass?.id === classItem.id ? "radio-button-on" : "radio-button-off"}
                      size={24}
                      color={selectedClass?.id === classItem.id ? "#3498db" : "#95a5a6"}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {activeTab === 'group' && (
              <View style={styles.entityContainer}>
                {groups.map((group) => (
                  <TouchableOpacity
                    key={group.id}
                    style={[
                      styles.entityItem,
                      selectedGroup?.id === group.id && styles.selectedEntity
                    ]}
                    onPress={() => setSelectedGroup(group)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.entityName}>{group.name}</Text>
                      <Text style={styles.entityStats}>
                        {t('students_count_format', { current: group.current_students, max: group.max_students })}
                      </Text>
                    </View>
                    <Ionicons
                      name={selectedGroup?.id === group.id ? "radio-button-on" : "radio-button-off"}
                      size={24}
                      color={selectedGroup?.id === group.id ? "#3498db" : "#95a5a6"}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Message Input */}
          <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: '#ecf0f1',
              marginBottom: 12,
            }}>
              {t('your_message_label')}
            </Text>

            <View style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.1)',
              padding: 16,
            }}>
              <TextInput
                style={{
                  color: '#ecf0f1',
                  fontSize: 16,
                  minHeight: 120,
                  textAlignVertical: 'top',
                }}
                placeholder="Type your announcement here..."
                placeholderTextColor="#95a5a6"
                value={message}
                onChangeText={setMessage}
                multiline
                editable={!sending}
              />
            </View>

            {getEntityName() ? (
              <Text style={{
                color: '#bdc3c7',
                fontSize: 14,
                marginTop: 8,
                fontStyle: 'italic',
              }}>
                {t('announcement_target_hint', { name: getEntityName() })}
              </Text>
            ) : (
              <Text style={{
                color: '#e74c3c',
                fontSize: 14,
                marginTop: 8,
                fontStyle: 'italic',
              }}>
                {t('announcement_select_hint', { type: t(`tab_${activeTab}`) })}
              </Text>
            )}
          </View>

          {/* Send Button */}
          <View style={{ paddingHorizontal: 24 }}>
            <TouchableOpacity
              style={{
                backgroundColor: '#3498db',
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                opacity: sending || !message.trim() || !getEntityName() ? 0.6 : 1,
              }}
              onPress={sendAnnouncement}
              disabled={sending || !message.trim() || !getEntityName()}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{
                  color: '#fff',
                  fontSize: 18,
                  fontWeight: 'bold',
                }}>
                  {t('send_announcement_button')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    borderRadius: 12,
  },
  tabText: {
    color: '#95a5a6',
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#3498db',
  },
  entityContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 8,
  },
  entityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedEntity: {
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.3)',
  },
  entityName: {
    color: '#ecf0f1',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  entityStats: {
    color: '#95a5a6',
    fontSize: 14,
  },
});

export default SendAnnouncementScreen;