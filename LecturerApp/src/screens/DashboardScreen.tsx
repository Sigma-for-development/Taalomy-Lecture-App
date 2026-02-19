import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import LecturerHeader from '../components/LecturerHeader';
import { tokenStorage } from '../../utils/tokenStorage';
import { API_CONFIG } from '../config/api';
import axios from 'axios';

const DashboardScreen: React.FC = () => {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkVerification = async () => {
      try {
        const userDataString = await tokenStorage.getItem('user_data');
        if (userDataString) {
          let userData = JSON.parse(userDataString);

          // Robust check: if verification status is missing, try to fetch it
          if (userData && userData.is_verified === undefined) {
            try {
              const token = await tokenStorage.getItem('access_token');
              if (token) {
                const response = await axios.get(`${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/profile/`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.data && response.data.length > 0) {
                  const profileData = response.data[0];
                  userData = { ...userData, is_verified: profileData.is_verified };
                  await tokenStorage.setItem('user_data', JSON.stringify(userData));
                }
              }
            } catch (e) {
              console.error('Failed to fetch profile in Dashboard:', e);
            }
          }

          if (userData && userData.is_verified) {
            setIsVerified(true);
          }
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkVerification();
  }, []);

  const handleRestrictedAction = () => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm(`${t('verification_required_title')}\n\n${t('verification_required_msg')}`);
      if (confirm) {
        router.push('/lecturer-profile');
      }
    } else {
      Alert.alert(
        t('verification_required_title'),
        t('verification_required_msg'),
        [
          { text: t('cancel'), style: 'cancel' },
          { text: t('go_to_profile'), onPress: () => router.push('/lecturer-profile') }
        ]
      );
    }
  };

  const LockedOverlay = () => (
    <View style={styles.lockedOverlay}>
      <View style={styles.lockIconContainer}>
        <Ionicons name="lock-closed" size={20} color="#fff" />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.backgroundContainer} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <LecturerHeader
          title="Lecturer Dashboard"
          subtitle="Manage your courses and students"
        />

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="library-outline" size={24} color="#3498db" />
            </View>
            <Text style={styles.statNumber}>4</Text>
            <Text style={styles.statLabel}>Active Courses</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="people-outline" size={24} color="#3498db" />
            </View>
            <Text style={styles.statNumber}>127</Text>
            <Text style={styles.statLabel}>Total Students</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="document-text-outline" size={24} color="#3498db" />
            </View>
            <Text style={styles.statNumber}>23</Text>
            <Text style={styles.statLabel}>Pending Grades</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="calendar-outline" size={24} color="#3498db" />
            </View>
            <Text style={styles.statNumber}>8</Text>
            <Text style={styles.statLabel}>Today&apos;s Classes</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={[
                styles.actionCard,
                !isVerified && styles.lockedCard
              ]}
              onPress={!isVerified ? handleRestrictedAction : () => console.log('Create Assignment')}
            >
              <View style={[
                styles.actionIconContainer,
                !isVerified && styles.lockedIconContainer
              ]}>
                <Ionicons
                  name="add-circle-outline"
                  size={28}
                  color={!isVerified ? '#95a5a6' : '#3498db'}
                />
              </View>
              <Text style={[
                styles.actionText,
                !isVerified && styles.lockedText
              ]}>Create Assignment</Text>
              {!isVerified && <LockedOverlay />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCard,
                !isVerified && styles.lockedCard
              ]}
              onPress={!isVerified ? handleRestrictedAction : () => console.log('Mark Attendance')}
            >
              <View style={[
                styles.actionIconContainer,
                !isVerified && styles.lockedIconContainer
              ]}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={28}
                  color={!isVerified ? '#95a5a6' : '#3498db'}
                />
              </View>
              <Text style={[
                styles.actionText,
                !isVerified && styles.lockedText
              ]}>Mark Attendance</Text>
              {!isVerified && <LockedOverlay />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCard,
                !isVerified && styles.lockedCard
              ]}
              onPress={!isVerified ? handleRestrictedAction : () => console.log('View Reports')}
            >
              <View style={[
                styles.actionIconContainer,
                !isVerified && styles.lockedIconContainer
              ]}>
                <Ionicons
                  name="analytics-outline"
                  size={28}
                  color={!isVerified ? '#95a5a6' : '#3498db'}
                />
              </View>
              <Text style={[
                styles.actionText,
                !isVerified && styles.lockedText
              ]}>View Reports</Text>
              {!isVerified && <LockedOverlay />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCard,
                !isVerified && styles.lockedCard
              ]}
              onPress={!isVerified ? handleRestrictedAction : () => router.push('/send-announcement')}
            >
              <View style={[
                styles.actionIconContainer,
                !isVerified && styles.lockedIconContainer
              ]}>
                <Ionicons
                  name="mail-outline"
                  size={28}
                  color={!isVerified ? '#95a5a6' : '#3498db'}
                />
              </View>
              <Text style={[
                styles.actionText,
                !isVerified && styles.lockedText
              ]}>Send Announcement</Text>
              {!isVerified && <LockedOverlay />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityList}>
            <View style={styles.activityItem}>
              <View style={styles.activityIconContainer}>
                <Ionicons name="document-text-outline" size={20} color="#3498db" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>Assignment graded - Math Quiz</Text>
                <Text style={styles.activityTime}>2 hours ago</Text>
              </View>
            </View>

            <View style={styles.activityItem}>
              <View style={styles.activityIconContainer}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#3498db" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>Attendance marked for CS101</Text>
                <Text style={styles.activityTime}>1 day ago</Text>
              </View>
            </View>

            <View style={styles.activityItem}>
              <View style={styles.activityIconContainer}>
                <Ionicons name="add-circle-outline" size={20} color="#3498db" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>New assignment created</Text>
                <Text style={styles.activityTime}>2 days ago</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView >
    </View >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1b1b1b',
  },
  backgroundContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#1b1b1b',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#bdc3c7',
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ecf0f1',
    marginBottom: 15,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionText: {
    fontSize: 14,
    color: '#ecf0f1',
    textAlign: 'center',
    fontWeight: '500',
  },
  activityList: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  activityIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#ecf0f1',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#95a5a6',
  },
  lockedCard: {
    opacity: 0.5,
    backgroundColor: 'rgba(50, 50, 50, 0.3)', // Darker, greyer background
    borderColor: 'rgba(100, 100, 100, 0.2)',
  },
  lockedIconContainer: {
    backgroundColor: 'rgba(80, 80, 80, 0.2)', // Dark grey container
  },
  lockedText: {
    color: '#7f8c8d', // Distinct grey text
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)', // Darker overlay
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  }
});

export default DashboardScreen;
