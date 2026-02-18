import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next'; // Added import
import { router } from 'expo-router';
import { tokenStorage } from '../utils/tokenStorage';
const AsyncStorage = tokenStorage;
import { Ionicons } from '@expo/vector-icons';
import { lecturerAPI } from '../src/utils/api';
import { socketIOManager } from '../src/utils/socketio';
import DatePicker from '../src/components/DatePicker';
import { useResponsive } from '../src/hooks/useResponsive';

interface Intake {
  id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  max_students: number;
  current_students: number;
  status: 'active' | 'inactive' | 'completed';
  is_demo?: boolean;
}

import { HoverCard } from '../src/components/HoverCard';
import { HoverIcon } from '../src/components/HoverIcon';

const IntakesScreen = () => {
  const { t, i18n } = useTranslation();
  const { isDesktop } = useResponsive();
  const isWeb = Platform.OS === 'web';
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [filteredIntakes, setFilteredIntakes] = useState<Intake[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [intakeName, setIntakeName] = useState('');
  const [intakeDescription, setIntakeDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [maxStudents, setMaxStudents] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadIntakes();

    // Connect to Socket.IO for real-time updates
    socketIOManager.connect();

    // Handle entity deletion events
    const handleEntityDeleted = (event: any) => {
      console.log('Entity deleted:', event);

      // If an intake was deleted, reload the data
      if (event.entity_type === 'intake') {
        loadIntakes();
      }
    };

    // Listen for entity deletion events
    socketIOManager.onEntityDeleted(handleEntityDeleted);

    // Cleanup
    return () => {
      socketIOManager.removeEntityDeletedCallback(handleEntityDeleted);
      socketIOManager.disconnect();
    };
  }, []);

  useEffect(() => {
    // Realtime search filtering
    if (searchQuery.trim() === '') {
      setFilteredIntakes(intakes);
    } else {
      const filtered = intakes.filter(intake =>
        intake.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        intake.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        intake.status.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredIntakes(filtered);
    }
  }, [searchQuery, intakes]);

  const loadIntakes = async () => {
    try {
      setLoading(true);
      // No need to get token manually, interceptor handles it
      const response = await lecturerAPI.getIntakes();
      // Filter out demo sessions to show only main intakes
      const mainIntakes = response.data.filter((intake: any) => !intake.is_demo);
      setIntakes(mainIntakes);
      setFilteredIntakes(mainIntakes);
    } catch (error) {
      console.error('Error loading intakes:', error);
      Toast.show({
        type: 'error',
        text1: t('error_loading_data'),
        text2: t('failed_load_intakes')
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadIntakes();
    setRefreshing(false);
  };

  const handleCreateIntake = async () => {
    if (!intakeName.trim() || !intakeDescription.trim() || !startDate || !endDate || !maxStudents.trim()) {
      Toast.show({
        type: 'error',
        text1: t('validation_error'),
        text2: t('fill_all_fields')
      });
      return;
    }

    try {
      setCreating(true);
      const formattedStartDate = `${startDate.getFullYear()}-${(startDate.getMonth() + 1).toString().padStart(2, '0')}-${startDate.getDate().toString().padStart(2, '0')}`;
      const formattedEndDate = `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}`;

      await lecturerAPI.createIntake({
        name: intakeName.trim(),
        description: intakeDescription.trim(),
        start_date: formattedStartDate,
        end_date: formattedEndDate,
        max_students: parseInt(maxStudents)
      });

      Toast.show({
        type: 'success',
        text1: t('success'),
        text2: t('intake_created_success')
      });
      setShowCreateModal(false);
      setIntakeName('');
      setIntakeDescription('');
      setStartDate(undefined);
      setEndDate(undefined);
      setMaxStudents('');
      onRefresh();
    } catch (error: any) {
      console.error('Error creating intake:', error);
      Toast.show({
        type: 'error',
        text1: t('creation_failed'),
        text2: error.response?.data?.error || t('failed_create_intake')
      });
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#27ae60';
      case 'inactive':
        return '#e74c3c';
      case 'completed':
        return '#f39c12';
      default:
        return '#95a5a6';
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={{ color: '#fff', marginTop: 16 }}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          ...(isWeb ? { height: 80 } : {
            paddingTop: Platform.OS === 'ios' ? 60 : 40,
            paddingBottom: 20,
          }),
          paddingHorizontal: isDesktop ? 24 : 20,
          backgroundColor: '#1a1a1a',
          borderBottomWidth: 1,
          borderBottomColor: '#2c2c2c',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {!isWeb && (
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
              <Ionicons name={i18n.language === 'ar' ? "chevron-forward" : "chevron-back"} size={22} color="#fff" />
            </TouchableOpacity>
          )}
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#fff' }}>
            {t('intakes')}
          </Text>
        </View>
        <HoverIcon
          name="add"
          size={24}
          color="#fff"
          onPress={() => setShowCreateModal(true)}
          style={{
            backgroundColor: '#3498db',
            shadowColor: "#3498db",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 4.65,
            elevation: 8,
          }}
          hoverBackgroundColor="#2980b9"
        />
      </View>

      {/* Search Bar */}
      <View style={{
        paddingHorizontal: isDesktop ? 24 : 20,
        paddingVertical: 16,
        backgroundColor: '#1a1a1a',
        ...(isDesktop && { maxWidth: 1400, alignSelf: 'center', width: '100%' })
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#252525',
          borderRadius: 12,
          paddingHorizontal: 15,
          borderWidth: 1,
          borderColor: '#333'
        }}>
          <Ionicons name="search" size={20} color="#7f8c8d" />
          <TextInput
            style={{
              flex: 1,
              paddingVertical: 12,
              paddingHorizontal: 10,
              color: '#fff',
              fontSize: 16,
            }}
            placeholder={t('search_intakes_placeholder')}
            placeholderTextColor="#7f8c8d"
            textAlign={i18n.language === 'ar' ? 'right' : 'left'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="done"
            onSubmitEditing={() => { }}
          />
        </View>
      </View>

      {/* Statistics Cards - Desktop Only */}
      {isDesktop && (
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          paddingHorizontal: 24,
          paddingVertical: 16,
          gap: 12,
          maxWidth: 1400,
          alignSelf: 'center',
          width: '100%'
        }}>
          <HoverCard
            style={{
              flex: 1,
              minWidth: 200,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 12,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.08)',
            }}
            hoverBorderColor="#3498db"
            disabled={true} // Stats cards are not clickable, just visual hover
          >
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}>
              <Ionicons name="school" size={24} color="#3498db" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 2 }}>
                {intakes.length}
              </Text>
              <Text style={{ fontSize: 12, color: '#95a5a6', fontWeight: '500' }}>
                {t('total_intakes')}
              </Text>
            </View>
          </HoverCard>

          <HoverCard
            style={{
              flex: 1,
              minWidth: 200,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 12,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.08)',
            }}
            hoverBorderColor="#2ecc71"
            disabled={true}
          >
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}>
              <Ionicons name="checkmark-circle" size={24} color="#2ecc71" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 2 }}>
                {intakes.filter(i => i.status === 'active').length}
              </Text>
              <Text style={{ fontSize: 12, color: '#95a5a6', fontWeight: '500' }}>
                {t('active_intakes')}
              </Text>
            </View>
          </HoverCard>

          <HoverCard
            style={{
              flex: 1,
              minWidth: 200,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 12,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.08)',
            }}
            hoverBorderColor="#9b59b6"
            disabled={true}
          >
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}>
              <Ionicons name="people" size={24} color="#9b59b6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 2 }}>
                {intakes.reduce((sum, i) => sum + i.current_students, 0)}
              </Text>
              <Text style={{ fontSize: 12, color: '#95a5a6', fontWeight: '500' }}>
                {t('total_students')}
              </Text>
            </View>
          </HoverCard>

          <HoverCard
            style={{
              flex: 1,
              minWidth: 200,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 12,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.08)',
            }}
            hoverBorderColor="#f39c12"
            disabled={true}
          >
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}>
              <Ionicons name="trophy" size={24} color="#f39c12" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 2 }}>
                {intakes.filter(i => i.status === 'completed').length}
              </Text>
              <Text style={{ fontSize: 12, color: '#95a5a6', fontWeight: '500' }}>
                {t('completed_intakes')}
              </Text>
            </View>
          </HoverCard>
        </View>
      )}

      <FlatList
        data={filteredIntakes}
        key={isDesktop ? 'desktop-3-col' : 'mobile-1-col'}
        numColumns={isDesktop ? 3 : 1}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3498db" />
        }
        contentContainerStyle={{
          paddingHorizontal: isDesktop ? 18 : 20,
          paddingBottom: 40,
          ...(isDesktop && { maxWidth: 1400, alignSelf: 'center', width: '100%' })
        }}
        columnWrapperStyle={isDesktop ? { marginBottom: 12 } : undefined}
        ListHeaderComponent={
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>
              {t('your_intakes', { count: filteredIntakes.length })}
            </Text>
            {loading && <ActivityIndicator size="small" color="#3498db" />}
          </View>
        }
        renderItem={({ item: intake }) => (
          <View style={{ width: isDesktop ? '33.33%' : '100%', paddingHorizontal: isDesktop ? 6 : 0, marginBottom: isDesktop ? 0 : 15 }}>
            <HoverCard
              onPress={() => router.push(`/intake-details/${intake.id}`)}
              style={{
                backgroundColor: '#252525',
                borderRadius: 16,
                padding: 20,
                borderWidth: 1,
                borderColor: '#333',
                height: isDesktop ? '100%' : undefined
              }}
              hoverBorderColor={
                intake.status === 'active' ? '#27ae60' :
                  intake.status === 'completed' ? '#f1c40f' :
                    '#e74c3c'
              }
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', flex: 1, marginRight: 10 }}>
                  {intake.name}
                </Text>
                <View style={{
                  backgroundColor: intake.status === 'active' ? 'rgba(39, 174, 96, 0.15)' :
                    intake.status === 'completed' ? 'rgba(241, 196, 15, 0.15)' :
                      'rgba(231, 76, 60, 0.15)',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: intake.status === 'active' ? 'rgba(39, 174, 96, 0.3)' :
                    intake.status === 'completed' ? 'rgba(241, 196, 15, 0.3)' :
                      'rgba(231, 76, 60, 0.3)',
                }}>
                  <Text style={{
                    color: intake.status === 'active' ? '#27ae60' :
                      intake.status === 'completed' ? '#f1c40f' :
                        '#e74c3c',
                    fontSize: 12,
                    fontWeight: '700',
                    textTransform: 'capitalize'
                  }}>
                    {t(intake.status)}
                  </Text>
                </View>
              </View>

              <Text style={{ color: '#bdc3c7', fontSize: 14, marginBottom: 16, lineHeight: 20 }}>
                {intake.description}
              </Text>

              <View style={{
                flexDirection: 'row',
                backgroundColor: '#1a1a1a',
                borderRadius: 10,
                padding: 12,
                marginBottom: 16,
                justifyContent: 'space-between'
              }}>
                <View>
                  <Text style={{ color: '#7f8c8d', fontSize: 11, textTransform: 'uppercase', marginBottom: 2 }}>{t('start_label')}</Text>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{formatDate(intake.start_date)}</Text>
                </View>
                <View style={{ width: 1, backgroundColor: '#333' }} />
                <View>
                  <Text style={{ color: '#7f8c8d', fontSize: 11, textTransform: 'uppercase', marginBottom: 2 }}>{t('end_label')}</Text>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{formatDate(intake.end_date)}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="people" size={16} color="#3498db" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#3498db', fontSize: 14, fontWeight: '600' }}>
                    {intake.current_students}/{intake.max_students} {t('students')}
                  </Text>
                </View>
                <View style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#333',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Ionicons name={i18n.language === 'ar' ? "chevron-back" : "chevron-forward"} size={16} color="#fff" />
                </View>
              </View>
            </HoverCard>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 60, opacity: 0.5 }}>
            <Ionicons name="school-outline" size={64} color="#7f8c8d" />
            <Text style={{ color: '#7f8c8d', marginTop: 15, fontSize: 16, textAlign: 'center' }}>
              {searchQuery ? t('no_intakes_found') : t('no_intakes_created')}
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                onPress={() => setShowCreateModal(true)}
                style={{
                  backgroundColor: '#3498db',
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 25,
                  marginTop: 20,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{t('create_first_intake')}</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Create Intake Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View style={{ backgroundColor: '#2c2c2c', margin: 20, borderRadius: 15, padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' }}>
              {t('create_new_intake')}
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
              placeholder={t('intake_name_placeholder')}
              placeholderTextColor="#7f8c8d"
              value={intakeName}
              onChangeText={setIntakeName}
              returnKeyType="next"
              textAlign={i18n.language === 'ar' ? 'right' : 'left'}
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
              placeholder={t('description_placeholder')}
              placeholderTextColor="#7f8c8d"
              value={intakeDescription}
              onChangeText={setIntakeDescription}
              multiline
              numberOfLines={3}
              returnKeyType="next"
              textAlign={i18n.language === 'ar' ? 'right' : 'left'}
            />

            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: '#bdc3c7', fontSize: 14, marginBottom: 8, fontWeight: '600', textAlign: 'left' }}>{t('start_date')}</Text>
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                minimumDate={new Date()}
                placeholder={t('select_start_date')}

              />
            </View>

            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: '#bdc3c7', fontSize: 14, marginBottom: 8, fontWeight: '600', textAlign: 'left' }}>{t('end_date')}</Text>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                minimumDate={startDate}
                placeholder={t('select_end_date')}
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
              placeholder={t('max_students_placeholder')}
              placeholderTextColor="#7f8c8d"
              value={maxStudents}
              onChangeText={setMaxStudents}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={handleCreateIntake}
              textAlign={i18n.language === 'ar' ? 'right' : 'left'}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
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
                onPress={handleCreateIntake}
                disabled={creating}
                style={{
                  flex: 1,
                  backgroundColor: '#3498db',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  opacity: creating ? 0.6 : 1,
                }}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff' }}>{t('create_intake_action')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

export default IntakesScreen;
