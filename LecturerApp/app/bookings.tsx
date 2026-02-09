import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  FlatList,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import DatePicker from '../src/components/DatePicker';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { tokenStorage } from '../utils/tokenStorage';
const AsyncStorage = tokenStorage;
import { API_CONFIG } from '../src/config/api';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { useLocalization } from '../src/context/LocalizationContext';
import { useTranslation } from 'react-i18next';
import { useResponsive } from '../src/hooks/useResponsive';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Booking {
  id: number;
  student: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  student_name: string;
  lecturer_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  subject: string;
  notes: string;
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
}

const BookingsScreen = () => {
  const { formatPrice } = useLocalization();
  const { t } = useTranslation();
  const { isDesktop } = useResponsive();
  const isWeb = Platform.OS === 'web';
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'confirmed' | 'completed'>('all');
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedIntake, setSelectedIntake] = useState<number | null>(null);
  const [createNewIntake, setCreateNewIntake] = useState(false);
  const [newIntakeData, setNewIntakeData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    max_students: 10,
  });


  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Alert.alert('Error', 'No access token found');
        return;
      }

      const response = await axios.get(`${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/bookings/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 200) {
        setBookings(response.data);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      Toast.show({
        type: 'error',
        text1: t('bookings_error_load_title'),
        text2: t('bookings_error_load_msg')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadIntakes = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Alert.alert('Error', 'No access token found');
        return;
      }

      const response = await axios.get(`${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/intakes/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 200) {
        setIntakes(response.data);
      }
    } catch (error) {
      console.error('Error loading intakes:', error);
      Toast.show({
        type: 'error',
        text1: t('intakes_error_load_title'),
        text2: t('intakes_error_load_msg')
      });
    }
  };

  const handleBookingAction = async (bookingId: number, action: string) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: t('authentication_error_title'),
          text2: t('authentication_error_msg')
        });
        return;
      }

      if (action === 'confirm') {
        // For confirmation, show intake selection modal
        const booking = bookings.find(b => b.id === bookingId);
        if (booking) {
          setSelectedBooking(booking);
          await loadIntakes();
          setShowIntakeModal(true);
        }
        return;
      }

      const response = await axios.patch(
        `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/bookings/${bookingId}/action/`,
        { action },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.status === 200) {
        Toast.show({
          type: 'success',
          text1: t('booking_updated_title'),
          text2: t(`success_booking_${action}`)
        });
        loadBookings(); // Reload bookings
      }
    } catch (error: any) {
      console.error('Error updating booking:', error);
      Toast.show({
        type: 'error',
        text1: t('update_failed_title'),
        text2: error.response?.data?.error || t('update_failed_msg')
      });
    }
  };

  const handleConfirmWithIntake = async () => {
    if (!selectedBooking) return;

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: t('authentication_error_title'),
          text2: t('authentication_error_msg')
        });
        return;
      }

      const requestData: any = {
        action: 'confirm'
      };

      if (createNewIntake) {
        requestData.create_new_intake = true;
        requestData.new_intake_data = newIntakeData;
      } else if (selectedIntake) {
        requestData.intake_id = selectedIntake;
      }

      const response = await axios.patch(
        `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/bookings/${selectedBooking.id}/action/`,
        requestData,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.status === 200) {
        Toast.show({
          type: 'success',
          text1: t('booking_confirmed_title'),
          text2: t('booking_confirmed_msg')
        });
        setShowIntakeModal(false);
        setSelectedBooking(null);
        setSelectedIntake(null);
        setCreateNewIntake(false);
        setNewIntakeData({
          name: '',
          description: '',
          start_date: '',
          end_date: '',
          max_students: 10,
        });
        loadBookings(); // Reload bookings
      }
    } catch (error: any) {
      console.error('Error confirming booking:', error);
      Toast.show({
        type: 'error',
        text1: t('confirmation_failed_title'),
        text2: error.response?.data?.error || t('confirmation_failed_msg')
      });
    }
  };

  const getFilteredBookings = () => {
    if (activeTab === 'all') return bookings;
    return bookings.filter(booking => booking.status === activeTab);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f39c12';
      case 'confirmed': return '#3498db';
      case 'completed': return '#27ae60';
      case 'cancelled': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getStatusText = (status: string) => {
    return t(`status_${status}`);
  };

  const renderBookingCard = ({ item }: { item: Booking }) => (
    <View style={[styles.bookingCardWrapper, isDesktop && { width: '33.33%', paddingHorizontal: 6 }]}>
      <View style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{item.student_name}</Text>
            <Text style={styles.studentEmail}>{item.student.email}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.bookingDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#95a5a6" />
            <Text style={styles.detailText}>
              {new Date(item.booking_date).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color="#95a5a6" />
            <Text style={styles.detailText}>
              {item.start_time} - {item.end_time} ({item.duration_hours}h)
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="book-outline" size={16} color="#95a5a6" />
            <Text style={styles.detailText}>{item.subject}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color="#95a5a6" />
            <Text style={styles.detailText}>{formatPrice(item.total_amount)}</Text>
          </View>
        </View>

        {item.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>{t('notes_label')}</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}

        {item.status === 'pending' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={() => handleBookingAction(item.id, 'confirm')}
            >
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>{t('action_confirm')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleBookingAction(item.id, 'cancel')}
            >
              <Ionicons name="close" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>{t('action_cancel')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status === 'confirmed' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => handleBookingAction(item.id, 'complete')}
            >
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>{t('action_mark_complete')}</Text>
            </TouchableOpacity>
          </View>
        )}
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

  const filteredBookings = getFilteredBookings();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
        style={styles.backgroundGradient}
      />

      {/* Header */}
      <View style={[styles.header, isWeb && { paddingHorizontal: 24, justifyContent: 'flex-start' }]}>
        {!isWeb && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, isWeb && { marginLeft: 0 }]}>{t('bookings_title')}</Text>
        {!isWeb && <View style={styles.placeholder} />}
      </View>

      {/* Statistics Cards - Desktop Only */}
      {isDesktop && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="calendar" size={24} color="#3498db" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{bookings?.length || 0}</Text>
              <Text style={styles.statLabel}>{t('total_bookings')}</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="time" size={24} color="#f39c12" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{bookings?.filter(b => b.status === 'pending').length || 0}</Text>
              <Text style={styles.statLabel}>{t('pending_requests')}</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="checkmark-circle" size={24} color="#2ecc71" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{bookings?.filter(b => b.status === 'confirmed').length || 0}</Text>
              <Text style={styles.statLabel}>{t('confirmed_bookings')}</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="cash" size={24} color="#9b59b6" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>
                {formatPrice(bookings?.filter(b => b.status === 'confirmed' || b.status === 'completed').reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0)}
              </Text>
              <Text style={styles.statLabel}>{t('total_revenue')}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, isDesktop && { paddingHorizontal: 24, maxWidth: 1400, alignSelf: 'center', width: '100%' }]}>
        {[
          { key: 'all', label: t('tab_all'), count: bookings?.length || 0 },
          { key: 'pending', label: t('tab_pending'), count: bookings?.filter(b => b.status === 'pending').length || 0 },
          { key: 'confirmed', label: t('tab_confirmed'), count: bookings?.filter(b => b.status === 'confirmed').length || 0 },
          { key: 'completed', label: t('tab_completed'), count: bookings?.filter(b => b.status === 'completed').length || 0 },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
            <View style={[styles.tabBadge, activeTab === tab.key && styles.activeTabBadge]}>
              <Text style={[styles.tabBadgeText, activeTab === tab.key && styles.activeTabBadgeText]}>
                {tab.count || 0}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bookings List */}
      <FlatList
        data={filteredBookings}
        renderItem={renderBookingCard}
        keyExtractor={(item) => item.id.toString()}
        key={isDesktop ? 'desktop-3-col' : 'mobile-1-col'}
        numColumns={isDesktop ? 3 : 1}
        contentContainerStyle={[
          styles.listContainer,
          isDesktop && { paddingHorizontal: 18, maxWidth: 1400, alignSelf: 'center', width: '100%' }
        ]}
        columnWrapperStyle={isDesktop ? { marginBottom: 12 } : undefined}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#95a5a6" />
            <Text style={styles.emptyText}>{t('empty_bookings_title')}</Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'all'
                ? t('empty_bookings_all')
                : t('empty_bookings_filtered', { status: t(`tab_${activeTab}`) })
              }
            </Text>
          </View>
        }
      />

      {/* Intake Assignment Modal with KeyboardAvoidingView */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showIntakeModal}
        onRequestClose={() => setShowIntakeModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={['#1a1a1a', '#2d2d2d']}
              style={styles.modalGradient}
            />

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('modal_assign_title')}</Text>
              <TouchableOpacity
                onPress={() => setShowIntakeModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={20} color="#bdc3c7" />
              </TouchableOpacity>
            </View>

            {/* Content Area - Scrollable Wrapper for entire content */}
            <View style={{ flex: 1 }}>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
              >
                {selectedBooking && (
                  <View style={styles.bookingSummaryCard}>
                    <View style={styles.bookingSummaryIcon}>
                      <Ionicons name="person" size={20} color="#4dade8" />
                    </View>
                    <View style={styles.bookingSummaryText}>
                      <Text style={styles.summaryTitle}>{selectedBooking.student_name}</Text>
                      <Text style={styles.summarySubtitle}>{selectedBooking.subject} • {new Date(selectedBooking.booking_date).toLocaleDateString()}</Text>
                    </View>
                  </View>
                )}

                {/* Option Toggle */}
                <View style={styles.toggleContainer}>
                  <TouchableOpacity
                    style={[styles.toggleButton, !createNewIntake && styles.toggleButtonActive]}
                    onPress={() => setCreateNewIntake(false)}
                  >
                    <Text style={[styles.toggleText, !createNewIntake && styles.toggleTextActive]}>
                      {t('option_assign_existing')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleButton, createNewIntake && styles.toggleButtonActive]}
                    onPress={() => setCreateNewIntake(true)}
                  >
                    <Text style={[styles.toggleText, createNewIntake && styles.toggleTextActive]}>
                      {t('option_create_new')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Dynamic Content */}
                <View style={styles.modalBody}>
                  {!createNewIntake ? (
                    <View style={styles.listSection}>
                      <Text style={styles.sectionLabel}>{t('section_select_intake')}</Text>
                      {intakes.length > 0 ? (
                        <View style={styles.intakeList}>
                          {intakes.map((intake) => (
                            <TouchableOpacity
                              key={intake.id}
                              style={[
                                styles.intakeCard,
                                selectedIntake === intake.id && styles.intakeCardSelected
                              ]}
                              onPress={() => setSelectedIntake(intake.id)}
                            >
                              <View style={styles.intakeCardHeader}>
                                <Text style={[
                                  styles.intakeName,
                                  selectedIntake === intake.id && styles.intakeNameSelected
                                ]}>
                                  {intake.name}
                                </Text>
                                {selectedIntake === intake.id && (
                                  <Ionicons name="checkmark-circle" size={20} color="#4dade8" />
                                )}
                              </View>
                              <View style={styles.intakeCardFooter}>
                                <View style={styles.intakeStat}>
                                  <Ionicons name="people-outline" size={14} color="#95a5a6" />
                                  <Text style={styles.intakeStatText}>
                                    {intake.current_students}/{intake.max_students}
                                  </Text>
                                </View>
                                <Text style={styles.intakeDate}>
                                  {new Date(intake.start_date).toLocaleDateString()}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        <View style={styles.emptyState}>
                          <Ionicons name="file-tray-outline" size={32} color="#555" />
                          <Text style={styles.emptyStateText}>{t('no_intakes_available')}</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.formSection}>
                      <Text style={styles.sectionLabel}>{t('section_create_intake')}</Text>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{t('placeholder_intake_name')}</Text>
                        <TextInput
                          style={styles.inputField}
                          placeholder={t('placeholder_intake_name')}
                          placeholderTextColor="#666"
                          value={newIntakeData.name}
                          onChangeText={(text) => setNewIntakeData({ ...newIntakeData, name: text })}
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{t('placeholder_description')}</Text>
                        <TextInput
                          style={[styles.inputField, styles.textArea]}
                          placeholder={t('placeholder_description')}
                          placeholderTextColor="#666"
                          multiline
                          numberOfLines={3}
                          value={newIntakeData.description}
                          onChangeText={(text) => setNewIntakeData({ ...newIntakeData, description: text })}
                        />
                      </View>

                      <View style={styles.rowInputs}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                          <Text style={styles.inputLabel}>{t('label_start_date')}</Text>
                          <DatePicker
                            value={newIntakeData.start_date ? new Date(newIntakeData.start_date) : undefined}
                            onChange={(date) => setNewIntakeData(prev => ({ ...prev, start_date: date.toISOString().split('T')[0] }))}
                            minimumDate={new Date()}
                            placeholder={t('placeholder_start_date')}
                          />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                          <Text style={styles.inputLabel}>{t('label_end_date')}</Text>
                          <DatePicker
                            value={newIntakeData.end_date ? new Date(newIntakeData.end_date) : undefined}
                            onChange={(date) => setNewIntakeData(prev => ({ ...prev, end_date: date.toISOString().split('T')[0] }))}
                            minimumDate={newIntakeData.start_date ? new Date(newIntakeData.start_date) : new Date()}
                            placeholder={t('placeholder_end_date')}
                          />
                        </View>
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{t('placeholder_max_students')}</Text>
                        <TextInput
                          style={styles.inputField}
                          placeholder="10"
                          placeholderTextColor="#666"
                          keyboardType="numeric"
                          value={newIntakeData.max_students.toString()}
                          onChangeText={(text) => setNewIntakeData({ ...newIntakeData, max_students: parseInt(text) || 10 })}
                        />
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.footerButtonCancel}
                onPress={() => setShowIntakeModal(false)}
              >
                <Text style={styles.footerButtonTextCancel}>{t('action_button_cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.footerButtonConfirm,
                  (!createNewIntake && !selectedIntake) && styles.footerButtonDisabled
                ]}
                onPress={handleConfirmWithIntake}
                disabled={!createNewIntake && !selectedIntake}
              >
                <LinearGradient
                  colors={(!createNewIntake && !selectedIntake) ? ['#444', '#555'] : ['#4dade8', '#2980b9']}
                  style={styles.footerGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.footerButtonTextConfirm}>{t('button_confirm_booking')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
    ...(Platform.OS === 'web' ? { height: 80 } : {
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      paddingBottom: 20,
    }),
    paddingHorizontal: 20,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2c',
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%',
  },
  statCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#95a5a6',
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  activeTab: {
    backgroundColor: 'rgba(52, 152, 219, 0.15)',
    borderColor: '#3498db',
  },
  tabText: {
    fontSize: 13,
    color: '#95a5a6',
    fontWeight: '600',
    marginRight: 6,
  },
  activeTabText: {
    color: '#3498db',
  },
  tabBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activeTabBadge: {
    backgroundColor: '#3498db',
  },
  tabBadgeText: {
    fontSize: 10,
    color: '#bdc3c7',
    fontWeight: '700',
  },
  activeTabBadgeText: {
    color: '#fff',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  bookingCardWrapper: {
    width: '100%',
    marginBottom: 12,
  },
  bookingCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 13,
    color: '#95a5a6',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bookingDetails: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#bdc3c7',
    marginLeft: 8,
    flex: 1,
  },
  notesContainer: {
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#f39c12',
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f39c12',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  notesText: {
    fontSize: 13,
    color: '#f39c12',
    fontStyle: 'italic',
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
    borderRadius: 12,
  },
  confirmButton: {
    backgroundColor: '#3498db',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },
  completeButton: {
    backgroundColor: '#27ae60',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#95a5a6',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  // Redesigned Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingVertical: 20,
  },
  modalContainer: {
    width: '94%', // Wider modal
    height: '92%', // Fixed high percentage
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1e1e1e',
    display: 'flex', // flex container
  },
  modalGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    padding: 8, // Larger touch target
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  bookingSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    marginBottom: 0,
    padding: 16,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.3)',
  },
  bookingSummaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bookingSummaryText: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  summarySubtitle: {
    fontSize: 13,
    color: '#aab7b8',
    marginTop: 2,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.3)',
    margin: 20,
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  toggleButtonActive: {
    backgroundColor: '#333',
  },
  toggleText: {
    color: '#7f8c8d',
    fontWeight: '600',
    fontSize: 13,
  },
  toggleTextActive: {
    color: '#fff',
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  listSection: {
    flex: 1,
  },
  formSection: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7f8c8d',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  intakeList: {
    // Removed maxHeight limitation to allow filling the modal
    flex: 1,
  },
  intakeCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  intakeCardSelected: {
    backgroundColor: 'rgba(52, 152, 219, 0.15)',
    borderColor: '#4dade8',
  },
  intakeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  intakeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ecf0f1',
  },
  intakeNameSelected: {
    color: '#4dade8',
    fontWeight: '700',
  },
  intakeCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  intakeStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  intakeStatText: {
    fontSize: 13,
    color: '#95a5a6',
    marginLeft: 4,
  },
  intakeDate: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#333',
  },
  emptyStateText: {
    color: '#666',
    marginTop: 10,
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#bdc3c7',
    marginBottom: 6,
    marginLeft: 4,
  },
  inputField: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  footerButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  footerButtonConfirm: {
    flex: 2,
    borderRadius: 14,
    overflow: 'hidden',
  },
  footerGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonDisabled: {
    opacity: 0.5,
  },
  footerButtonTextCancel: {
    color: '#bdc3c7',
    fontWeight: '600',
    fontSize: 15,
  },
  footerButtonTextConfirm: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default BookingsScreen;
