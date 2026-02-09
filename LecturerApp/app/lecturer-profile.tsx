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
  TextInput,
  Switch,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { tokenStorage } from '../utils/tokenStorage';
const AsyncStorage = tokenStorage;
import { API_CONFIG } from '../src/config/api';
import Toast from 'react-native-toast-message';
import axios from 'axios';
import { useLocalization } from '../src/context/LocalizationContext';
import { useTranslation } from 'react-i18next'; // Added import
import { SeoHead } from '../src/components/SeoHead';

interface LecturerProfile {
  id?: number;
  lecturer_profile_picture?: string;
  bio: string;
  experience_years: number;
  education: string;
  speciality: string;
  hourly_rate: number | string;
  class_rate: number | string;
  term_rate: number | string;
  show_hourly_rate: boolean;
  show_class_rate: boolean;
  show_term_rate: boolean;
  working_hours: string;
  languages: string;
  certifications: string;
  achievements: string;
  teaching_style: string;
  subjects_taught: string;
  availability_status: 'available' | 'busy' | 'unavailable';
  is_verified: boolean;
  rating: number | string;
  total_reviews: number;
  portfolio_website?: string;
  is_demo_offered: boolean;
  demo_price: number | string;
  linkedin_url?: string;
  twitter_url?: string;
  youtube_url?: string;
}

interface Review {
  id: number;
  student_name: string;
  rating: number;
  comment: string;
  created_at: string;
  intake_name?: string;
  class_name?: string;
}

const LecturerProfileScreen = () => {
  const { currencySymbol } = useLocalization();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<LecturerProfile>({
    bio: '',
    experience_years: 0,
    education: '',
    speciality: '',
    hourly_rate: 0,
    class_rate: 0,
    term_rate: 0,
    show_hourly_rate: true,
    show_class_rate: false,
    show_term_rate: false,
    working_hours: '',
    languages: '',
    certifications: '',
    achievements: '',
    teaching_style: '',
    subjects_taught: '',
    availability_status: 'available',
    is_verified: false,
    rating: 0,
    total_reviews: 0,
    portfolio_website: '',
    linkedin_url: '',
    twitter_url: '',
    youtube_url: '',
    is_demo_offered: false,
    demo_price: 0,
  });
  const [reviews, setReviews] = useState<Review[]>([]);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: t('error'),
          text2: t('error_no_token')
        });
        return;
      }

      const response = await axios.get(`${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/profile/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data && response.data.length > 0) {
        const profileData = response.data[0];
        // Ensure all fields have default values to prevent undefined errors
        setProfile({
          ...profile,
          ...profileData,
          rating: profileData.rating !== undefined ? profileData.rating : 0,
          total_reviews: profileData.total_reviews || 0,
          experience_years: profileData.experience_years || 0,
          hourly_rate: profileData.hourly_rate || 0,
        });
        setIsAvailable(profileData.availability_status === 'available');

        // Fetch reviews
        if (profileData.lecturer && profileData.lecturer.id) {
          try {
            const reviewsResponse = await axios.get(
              `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/${profileData.lecturer.id}/reviews/`,
              { headers: { 'Authorization': `Bearer ${token}` } }
            );
            setReviews(reviewsResponse.data);
          } catch (reviewError) {
            console.error('Error loading reviews:', reviewError);
          }
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      // Profile doesn't exist yet, that's okay
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setIsSaving(true);
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: t('error'),
          text2: t('error_no_token')
        });
        return;
      }

      const profileData = {
        ...profile,
        availability_status: isAvailable ? 'available' : 'unavailable',
      };

      let response;
      if (profile.id) {
        // Update existing profile
        response = await axios.put(
          `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/profile/${profile.id}/`,
          profileData,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
      } else {
        // Create new profile
        response = await axios.post(
          `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/profile/`,
          profileData,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
      }

      if (response.status === 200 || response.status === 201) {
        // Ensure all fields have default values
        const updatedProfile = {
          ...profile,
          ...response.data,
          rating: response.data.rating !== undefined ? response.data.rating : 0,
          total_reviews: response.data.total_reviews || 0,
          experience_years: response.data.experience_years || 0,
          hourly_rate: response.data.hourly_rate || 0,
        };
        setProfile(updatedProfile);
        setProfile(updatedProfile);
        Toast.show({
          type: 'success',
          text1: t('save_success'),
          text2: t('profile_saved_success')
        });

        // Navigate back to previous page after successful save
        setTimeout(() => {
          router.back();
        }, 1000); // Give user time to see the success message
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: error.response?.data?.detail || t('failed_save_profile')
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof LecturerProfile, value: any) => {
    // For numeric fields, ensure we're storing a proper number
    if (field === 'rating' || field === 'hourly_rate' || field === 'class_rate' || field === 'term_rate' || field === 'demo_price' || field === 'experience_years' || field === 'total_reviews') {
      const numericValue = typeof value === 'string' ? parseFloat(value) : value;
      setProfile(prev => ({ ...prev, [field]: isNaN(numericValue) ? 0 : numericValue }));
    } else {
      setProfile(prev => ({ ...prev, [field]: value }));
    }
  };

  const renderField = (label: string, field: keyof LecturerProfile, placeholder: string, multiline: boolean = false, numeric: boolean = false, toggleKey?: keyof LecturerProfile) => (
    <View style={styles.fieldContainer}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 14, color: '#bdc3c7' }}>{label}</Text>
        {toggleKey && (
          <Switch
            value={!!profile[toggleKey]}
            onValueChange={(val) => updateField(toggleKey, val)}
            trackColor={{ false: '#767577', true: '#3498db' }}
            thumbColor={profile[toggleKey] ? '#fff' : '#f4f3f4'}
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          />
        )}
      </View>
      <TextInput
        style={[styles.textInput, multiline && styles.multilineInput]}
        value={String(profile[field] || '')}
        onChangeText={(text) => updateField(field, numeric ? (text === '' ? 0 : parseFloat(text) || 0) : text)}
        placeholder={placeholder}
        placeholderTextColor="#95a5a6"
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        keyboardType={numeric ? 'numeric' : 'default'}
      />
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

  return (
    <View style={styles.container}>
      <SeoHead
        title={profile.id ? `${t('professional_profile_title')}` : 'Lecturer Profile'}
        description={profile.bio || t('profile_saved_success')}
        path="/lecturer-profile"
        keywords={`${profile.speciality || 'lecturer'}, ${profile.subjects_taught || 'teaching'}, Taalomy profile`}
      />
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
        style={styles.backgroundGradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('professional_profile_title')}</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveProfile}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>{t('save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Picture */}
        <View style={styles.profileImageContainer}>
          {profile.lecturer_profile_picture ? (
            <Image
              source={{
                uri: profile.lecturer_profile_picture?.startsWith('http')
                  ? profile.lecturer_profile_picture
                  : `${API_CONFIG.ROOT_URL}${profile.lecturer_profile_picture?.startsWith('/') ? '' : '/'}${profile.lecturer_profile_picture}`
              }}
              style={styles.profileImage}
            />
          ) : (
            <View style={[styles.profileImage, styles.placeholderImage]}>
              <Ionicons name="person" size={60} color="#bdc3c7" />
            </View>
          )}
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('basic_info')}</Text>

          {renderField(t('bio_label'), 'bio', t('bio_placeholder'), true)}
          {renderField(t('speciality_label'), 'speciality', t('speciality_placeholder'), false)}
          {renderField(t('experience_years_label'), 'experience_years', '0', false, true)}
          {renderField(t('education_label'), 'education', t('education_placeholder'), true)}
        </View>

        {/* Teaching Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('teaching_details')}</Text>

          {renderField(t('subjects_taught_label'), 'subjects_taught', t('subjects_taught_placeholder'), false)}
          {renderField(t('teaching_style_label'), 'teaching_style', t('teaching_style_placeholder'), true)}
          {renderField(t('languages_label'), 'languages', t('languages_placeholder'), false)}
        </View>

        {/* Professional Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('professional_info')}</Text>

          {renderField(t('certifications_label'), 'certifications', t('certifications_placeholder'), true)}
          {renderField(t('achievements_label'), 'achievements', t('achievements_placeholder'), true)}
          {renderField(t('working_hours_label'), 'working_hours', t('working_hours_placeholder'), false)}
        </View>

        {/* Social & Portfolio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('social_portfolio')}</Text>

          {renderField(t('portfolio_website_label'), 'portfolio_website', t('portfolio_placeholder'), false)}
          {renderField(t('linkedin_url_label'), 'linkedin_url', t('linkedin_placeholder'), false)}
          {renderField(t('twitter_url_label'), 'twitter_url', t('twitter_placeholder'), false)}
          {renderField(t('youtube_url_label'), 'youtube_url', t('youtube_placeholder'), false)}
        </View>

        {/* Pricing & Availability */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('pricing_availability')}</Text>

          {renderField(t('hourly_rate_label', { symbol: currencySymbol }), 'hourly_rate', '0', false, true, 'show_hourly_rate')}
          {renderField(t('class_price_label', { symbol: currencySymbol }), 'class_rate', '0', false, true, 'show_class_rate')}
          {renderField(t('term_price_label', { symbol: currencySymbol }), 'term_rate', '0', false, true, 'show_term_rate')}
          {renderField(t('demo_price_label', { symbol: currencySymbol }), 'demo_price', '0', false, true, 'is_demo_offered')}

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>{t('available_for_bookings')}</Text>
            <Switch
              value={isAvailable}
              onValueChange={setIsAvailable}
              trackColor={{ false: '#767577', true: '#3498db' }}
              thumbColor={isAvailable ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Profile Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile_status')}</Text>

          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>{t('verification_status')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.statusBadge, profile.is_verified ? styles.verifiedBadge : styles.unverifiedBadge, { marginEnd: 10 }]}>
                  <Text style={styles.statusText}>
                    {profile.is_verified ? t('verified') : t('pending')}
                  </Text>
                </View>
                {!profile.is_verified && (
                  <TouchableOpacity
                    style={styles.verifyButton}
                    onPress={() => router.push('/verification-request')}
                  >
                    <Text style={styles.verifyButtonText}>{t('get_verified')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>{t('rating')}</Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color="#f39c12" />
                <Text style={styles.ratingText}>
                  {typeof profile.rating === 'number'
                    ? profile.rating.toFixed(1)
                    : (parseFloat(profile.rating) || 0).toFixed(1)}
                </Text>
                <Text style={styles.reviewsText}>{t('reviews_count', { count: profile.total_reviews || 0 })}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Reviews Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('reviews_section')}</Text>
          {renderReviews()}
        </View>
      </ScrollView>
    </View>
  );

  function renderReviews() {
    if (reviews.length === 0) {
      return (
        <View style={styles.noReviewsContainer}>
          <Text style={styles.noReviewsText}>{t('no_reviews')}</Text>
        </View>
      );
    }

    // Group reviews by intake
    const groupedReviews: { [key: string]: Review[] } = {};
    reviews.forEach(review => {
      const key = review.intake_name || t('other_reviews');
      if (!groupedReviews[key]) {
        groupedReviews[key] = [];
      }
      groupedReviews[key].push(review);
    });

    return Object.entries(groupedReviews).map(([intakeName, intakeReviews]) => {
      const isExpanded = expandedSections[intakeName];
      const displayedReviews = isExpanded ? intakeReviews : intakeReviews.slice(0, 3);
      const showButton = intakeReviews.length > 3;

      return (
        <View key={intakeName} style={styles.intakeGroup}>
          <Text style={styles.intakeTitle}>{intakeName}</Text>
          {displayedReviews.map(review => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.studentName}>{review.student_name}</Text>
                <View style={styles.reviewRating}>
                  <Ionicons name="star" size={14} color="#f39c12" />
                  <Text style={styles.reviewRatingText}>{review.rating}</Text>
                </View>
              </View>
              <Text style={styles.reviewComment}>{review.comment}</Text>
              <Text style={styles.reviewDate}>
                {new Date(review.created_at).toLocaleDateString()}
              </Text>
            </View>
          ))}
          {showButton && (
            <TouchableOpacity
              onPress={() => setExpandedSections(prev => ({ ...prev, [intakeName]: !prev[intakeName] }))}
              style={styles.viewMoreButton}
            >
              <Text style={styles.viewMoreText}>
                {isExpanded ? t('view_less') : t('view_more', { count: intakeReviews.length - 3 })}
              </Text>
              <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color="#3498db" />
            </TouchableOpacity>
          )}
        </View>
      );
    });
  }
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
  saveButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  profileImageContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#3498db',
  },
  placeholderImage: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
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
    height: 100,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  switchLabel: {
    fontSize: 16,
    color: '#fff',
  },
  statusContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 15,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statusLabel: {
    fontSize: 16,
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  verifiedBadge: {
    backgroundColor: '#27ae60',
  },
  unverifiedBadge: {
    backgroundColor: '#e74c3c',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginStart: 5,
  },
  reviewsText: {
    color: '#95a5a6',
    fontSize: 14,
    marginStart: 5,
  },
  noReviewsContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
  },
  noReviewsText: {
    color: '#95a5a6',
    fontSize: 16,
  },
  intakeGroup: {
    marginBottom: 20,
  },
  intakeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 10,
    marginTop: 10,
  },
  reviewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  studentName: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reviewRatingText: {
    color: '#f39c12',
    fontWeight: 'bold',
    marginStart: 4,
    fontSize: 12,
  },
  reviewComment: {
    color: '#bdc3c7',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewDate: {
    color: '#7f8c8d',
    fontSize: 12,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 5,
  },
  viewMoreText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '600',
    marginEnd: 5,
  },
  verifyButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default LecturerProfileScreen;
