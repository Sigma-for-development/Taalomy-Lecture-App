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
  Platform,
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
import { useResponsive } from '../src/hooks/useResponsive';
import { HoverCard } from '../src/components/HoverCard';
import { Skeleton } from '../src/components/Skeleton';

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
  lecturer?: {
    first_name?: string;
    last_name?: string;
  }
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
  const { t, i18n } = useTranslation();
  const { isDesktop } = useResponsive();
  const isWeb = Platform.OS === 'web';
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
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: error.response?.data?.error || t('failed_save_profile')
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
        <Text style={{ fontSize: 13, color: '#bdc3c7', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
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
        placeholderTextColor="#555"
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        keyboardType={numeric ? 'numeric' : 'default'}
      />
    </View>
  );

  // Skeleton Loading Component
  const ProfileSkeleton = () => (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Hero Skeleton */}
      <View style={styles.heroContainer}>
        <View style={styles.heroContent}>
          {/* Left Col Skeleton */}
          <View style={styles.heroLeftCol}>
            <Skeleton width={100} height={100} borderRadius={50} style={{ marginRight: 20 }} />
            <View>
              <Skeleton width={200} height={28} style={{ marginBottom: 10 }} />
              <Skeleton width={100} height={20} />
            </View>
          </View>

          {/* Right Col Skeleton (Stats) - Desktop Only */}
          {isDesktop && (
            <View style={styles.heroRightCol}>
              <View style={[styles.heroStatsGroup, { backgroundColor: 'transparent', borderWidth: 0 }]}>
                <Skeleton width={80} height={40} style={{ marginHorizontal: 10 }} />
                <Skeleton width={80} height={40} style={{ marginHorizontal: 10 }} />
                <Skeleton width={80} height={40} style={{ marginHorizontal: 10 }} />
              </View>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={isDesktop ? styles.desktopContainer : { paddingBottom: 40 }}>
        <View style={isDesktop ? styles.desktopGrid : {}}>
          {/* Main Column Skeleton */}
          <View style={isDesktop ? styles.desktopMainCol : { paddingHorizontal: 20 }}>
            {/* Basic Info Skeleton */}
            <View style={[styles.section, isDesktop && styles.card, { height: 300 }]}>
              <Skeleton width={150} height={24} style={{ marginBottom: 20 }} />
              <Skeleton width="100%" height={100} style={{ marginBottom: 15 }} />
              <Skeleton width="100%" height={50} style={{ marginBottom: 15 }} />
              <Skeleton width="100%" height={50} />
            </View>

            {/* Teaching Info Skeleton */}
            <View style={[styles.section, isDesktop && styles.card, { height: 250, marginTop: 20 }]}>
              <Skeleton width={150} height={24} style={{ marginBottom: 20 }} />
              <Skeleton width="100%" height={50} style={{ marginBottom: 15 }} />
              <Skeleton width="100%" height={100} />
            </View>
          </View>

          {/* Sidebar Column Skeleton */}
          <View style={isDesktop ? styles.desktopSidebarCol : { paddingHorizontal: 20, marginTop: 20 }}>
            {/* Pricing Skeleton */}
            <View style={[styles.section, isDesktop && styles.card, { height: 400 }]}>
              <Skeleton width={150} height={24} style={{ marginBottom: 20 }} />
              <Skeleton width="100%" height={50} style={{ marginBottom: 15 }} />
              <Skeleton width="100%" height={50} style={{ marginBottom: 15 }} />
              <Skeleton width="100%" height={50} style={{ marginBottom: 15 }} />
              <Skeleton width="100%" height={50} />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  // Hero Section
  const HeroSection = () => (
    <View style={styles.heroContainer}>
      <LinearGradient
        colors={['#1b1b1b', '#1b1b1b']} // Match sidebar color
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.heroGradient}
      />
      <View style={styles.heroContent}>
        {/* Left Column Aligned with Main Content (65%) */}
        <View style={styles.heroLeftCol}>
          <View style={styles.heroAvatarContainer}>
            {profile.lecturer_profile_picture ? (
              <Image
                source={{
                  uri: profile.lecturer_profile_picture?.startsWith('http')
                    ? profile.lecturer_profile_picture
                    : `${API_CONFIG.ROOT_URL}${profile.lecturer_profile_picture?.startsWith('/') ? '' : '/'}${profile.lecturer_profile_picture}`
                }}
                style={styles.heroAvatar}
              />
            ) : (
              <View style={[styles.heroAvatar, styles.placeholderImage]}>
                <Ionicons name="person" size={35} color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>
              {profile.lecturer?.first_name ? `${profile.lecturer.first_name} ${profile.lecturer.last_name || ''}` : 'Lecturer Name'}
            </Text>
            <View style={[styles.heroStatusBadge, profile.is_verified && styles.verifiedBadge]}>
              <Ionicons name={profile.is_verified ? "checkmark-circle" : "time"} size={14} color="#fff" />
              <Text style={styles.heroStatusText}>{profile.is_verified ? t('verified') : t('pending')}</Text>
            </View>
          </View>
        </View>

        {/* Right Column Aligned with Sidebar (35%) */}
        <View style={styles.heroRightCol}>
          {/* Stats Group */}
          <View style={styles.heroStatsGroup}>
            <View style={styles.heroStatsItem}>
              <Text style={styles.heroStatValue}>{typeof profile.rating === 'number' ? profile.rating.toFixed(1) : parseFloat(profile.rating).toFixed(1)}</Text>
              <Text style={styles.heroStatLabel}>{t('rating')}</Text>
            </View>
            <View style={styles.heroStatsDivider} />
            <View style={styles.heroStatsItem}>
              <Text style={styles.heroStatValue}>{profile.total_reviews}</Text>
              <Text style={styles.heroStatLabel}>{t('reviews_section').split(' ')[0]}</Text> {/* "Reviews" */}
            </View>
            <View style={styles.heroStatsDivider} />
            <View style={styles.heroStatsItem}>
              <Text style={styles.heroStatValue}>{profile.experience_years}+</Text>
              <Text style={styles.heroStatLabel}>{t('experience_years_label').split(' ')[0]}</Text> {/* "Experience" */}
            </View>
          </View>

          <HoverCard
            style={styles.heroSaveButton}
            onPress={saveProfile}
            disabled={isSaving}
            activeScale={0.98}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>{t('save')}</Text>
            )}
          </HoverCard>
        </View>
      </View>
    </View>
  );

  const BasicInfoSection = () => (
    <Wrapper title={t('basic_info')} isDesktop={isDesktop}>
      <ProfileField
        label={t('bio_label')}
        value={profile.bio}
        onChangeText={(text) => updateField('bio', text)}
        placeholder={t('bio_placeholder')}
        multiline={true}
      />
      <View style={isDesktop ? styles.row : {}}>
        <View style={isDesktop ? { flex: 1, marginEnd: 15 } : {}}>
          <ProfileField
            label={t('speciality_label')}
            value={profile.speciality}
            onChangeText={(text) => updateField('speciality', text)}
            placeholder={t('speciality_placeholder')}
          />
        </View>
        <View style={isDesktop ? { flex: 1 } : {}}>
          <ProfileField
            label={t('education_label')}
            value={profile.education}
            onChangeText={(text) => updateField('education', text)}
            placeholder={t('education_placeholder')}
          />
        </View>
      </View>
      <ProfileField
        label={t('experience_years_label')}
        value={profile.experience_years}
        onChangeText={(text) => updateField('experience_years', text)}
        placeholder="0"
        numeric={true}
      />
    </Wrapper>
  );

  const TeachingDetailsSection = () => (
    <Wrapper title={t('teaching_details')} isDesktop={isDesktop}>
      <ProfileField
        label={t('subjects_taught_label')}
        value={profile.subjects_taught}
        onChangeText={(text) => updateField('subjects_taught', text)}
        placeholder={t('subjects_taught_placeholder')}
      />
      <ProfileField
        label={t('teaching_style_label')}
        value={profile.teaching_style}
        onChangeText={(text) => updateField('teaching_style', text)}
        placeholder={t('teaching_style_placeholder')}
        multiline={true}
      />
      <ProfileField
        label={t('languages_label')}
        value={profile.languages}
        onChangeText={(text) => updateField('languages', text)}
        placeholder={t('languages_placeholder')}
      />
    </Wrapper>
  );

  const ProfessionalInfoSection = () => (
    <Wrapper title={t('professional_info')} isDesktop={isDesktop}>
      <ProfileField
        label={t('certifications_label')}
        value={profile.certifications}
        onChangeText={(text) => updateField('certifications', text)}
        placeholder={t('certifications_placeholder')}
        multiline={true}
      />
      <ProfileField
        label={t('achievements_label')}
        value={profile.achievements}
        onChangeText={(text) => updateField('achievements', text)}
        placeholder={t('achievements_placeholder')}
        multiline={true}
      />
      <ProfileField
        label={t('working_hours_label')}
        value={profile.working_hours}
        onChangeText={(text) => updateField('working_hours', text)}
        placeholder={t('working_hours_placeholder')}
      />
    </Wrapper>
  );

  const SocialPortfolioSection = () => (
    <Wrapper title={t('social_portfolio')} isDesktop={isDesktop}>
      <ProfileField
        label={t('portfolio_website_label')}
        value={profile.portfolio_website || ''}
        onChangeText={(text) => updateField('portfolio_website', text)}
        placeholder="https://..."
      />
      <ProfileField
        label={t('linkedin_url_label')}
        value={profile.linkedin_url || ''}
        onChangeText={(text) => updateField('linkedin_url', text)}
        placeholder="Linkedin URL"
      />
      <ProfileField
        label={t('twitter_url_label')}
        value={profile.twitter_url || ''}
        onChangeText={(text) => updateField('twitter_url', text)}
        placeholder="Twitter URL"
      />
      <ProfileField
        label={t('youtube_url_label')}
        value={profile.youtube_url || ''}
        onChangeText={(text) => updateField('youtube_url', text)}
        placeholder="Youtube URL"
      />
    </Wrapper>
  );

  const PricingAvailabilitySection = () => (
    <Wrapper title={t('pricing_availability')} isDesktop={isDesktop}>
      <ProfileField
        label={t('hourly_rate_label', { symbol: currencySymbol })}
        value={profile.hourly_rate}
        onChangeText={(text) => updateField('hourly_rate', text)}
        placeholder="0"
        numeric={true}
        toggleKey="show_hourly_rate"
        isToggled={profile.show_hourly_rate}
        onToggle={(val) => updateField('show_hourly_rate', val)}
      />
      <ProfileField
        label={t('class_price_label', { symbol: currencySymbol })}
        value={profile.class_rate}
        onChangeText={(text) => updateField('class_rate', text)}
        placeholder="0"
        numeric={true}
        toggleKey="show_class_rate"
        isToggled={profile.show_class_rate}
        onToggle={(val) => updateField('show_class_rate', val)}
      />
      <ProfileField
        label={t('term_price_label', { symbol: currencySymbol })}
        value={profile.term_rate}
        onChangeText={(text) => updateField('term_rate', text)}
        placeholder="0"
        numeric={true}
        toggleKey="show_term_rate"
        isToggled={profile.show_term_rate}
        onToggle={(val) => updateField('show_term_rate', val)}
      />
      <ProfileField
        label={t('demo_price_label', { symbol: currencySymbol })}
        value={profile.demo_price}
        onChangeText={(text) => updateField('demo_price', text)}
        placeholder="0"
        numeric={true}
        toggleKey="is_demo_offered"
        isToggled={profile.is_demo_offered}
        onToggle={(val) => updateField('is_demo_offered', val)}
      />
      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>{t('available_for_bookings')}</Text>
        <Switch
          value={isAvailable}
          onValueChange={setIsAvailable}
          trackColor={{ false: '#767577', true: '#3498db' }}
          thumbColor={isAvailable ? '#fff' : '#f4f3f4'}
        />
      </View>
    </Wrapper>
  );

  const ReviewsSection = () => (
    <Wrapper title={t('reviews_section')} isDesktop={isDesktop}>
      {renderReviews()}
    </Wrapper>
  );


  return (
    <View style={styles.container}>
      <SeoHead
        title={profile.id ? `${t('professional_profile_title')}` : 'Lecturer Profile'}
        description={profile.bio || t('profile_saved_success')}
        path="/lecturer-profile"
        keywords={`${profile.speciality || 'lecturer'}, ${profile.subjects_taught || 'teaching'}, Taalomy profile`}
      />
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {isDesktop ? (
        <>
          {HeroSection()}
          <ScrollView style={styles.content} contentContainerStyle={styles.desktopContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.desktopGrid}>
              {/* Left Column (Main - 65%) */}
              <View style={styles.desktopMainCol}>
                {BasicInfoSection()}
                {TeachingDetailsSection()}
                {ProfessionalInfoSection()}
                {ReviewsSection()}
              </View>

              {/* Right Column (Sidebar - 35%) */}
              <View style={styles.desktopSidebarCol}>
                {PricingAvailabilitySection()}
                {SocialPortfolioSection()}
              </View>
            </View>
          </ScrollView>
        </>
      ) : (
        <>
          <LinearGradient
            colors={['#1b1b1b', '#1b1b1b', '#2d2d2d']}
            style={styles.backgroundGradient}
          />
          {/* Mobile Header */}
          <View style={styles.mobileHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name={i18n.language === 'ar' ? "chevron-forward" : "chevron-back"} size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('professional_profile_title')}</Text>
            <TouchableOpacity onPress={saveProfile} style={styles.saveButtonMobile}>
              {isSaving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveButtonText}>{t('save')}</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {ProfileImageSection({ profile })}
            {BasicInfoSection()}
            {TeachingDetailsSection()}
            {ProfessionalInfoSection()}
            {SocialPortfolioSection()}
            {PricingAvailabilitySection()}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('profile_status')}</Text>
              <View style={styles.statusContainer}>
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>{t('verification_status')}</Text>
                  <View style={[styles.statusBadge, profile.is_verified ? styles.verifiedBadge : styles.unverifiedBadge]}>
                    <Text style={styles.statusText}>{profile.is_verified ? t('verified') : t('pending')}</Text>
                  </View>
                </View>
                {/* Mobile review summary */}
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>{t('rating')}</Text>
                  <Text style={styles.ratingText}>★ {typeof profile.rating === 'number' ? profile.rating.toFixed(1) : parseFloat(profile.rating).toFixed(1)} ({profile.total_reviews})</Text>
                </View>
              </View>
            </View>
            {ReviewsSection()}
          </ScrollView>
        </>
      )}
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

// Extracted components to prevent re-renders on every keystroke (Fixes Focus Loss)
const ProfileField = React.memo(({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  numeric = false,
  toggleKey,
  isToggled,
  onToggle
}: {
  label: string;
  value: string | number;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  numeric?: boolean;
  toggleKey?: string;
  isToggled?: boolean;
  onToggle?: (val: boolean) => void;
}) => (
  <View style={styles.fieldContainer}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <Text style={{ fontSize: 13, color: '#bdc3c7', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      {toggleKey && onToggle && (
        <Switch
          value={!!isToggled}
          onValueChange={onToggle}
          trackColor={{ false: '#767577', true: '#3498db' }}
          thumbColor={isToggled ? '#fff' : '#f4f3f4'}
          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
        />
      )}
    </View>
    <TextInput
      style={[styles.textInput, multiline && styles.multilineInput]}
      value={String(value || '')}
      onChangeText={(text) => onChangeText(numeric ? (text === '' ? '0' : text) : text)} // Pass raw text for now, convert in parent if needed
      placeholder={placeholder}
      placeholderTextColor="#555"
      multiline={multiline}
      numberOfLines={multiline ? 4 : 1}
      keyboardType={numeric ? 'numeric' : 'default'}
    />
  </View>
));

const Wrapper = ({ children, title, isDesktop }: { children: React.ReactNode, title: string, isDesktop: boolean }) => (
  <View style={[styles.section, isDesktop && styles.card]}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const ProfileImageSection = ({ profile }: { profile: LecturerProfile }) => (
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
        <Ionicons name="person" size={60} color="#fff" />
      </View>
    )}
    <View style={{ marginTop: 10 }}>
      {/* Placeholder for future upload functionality */}
      <TouchableOpacity style={styles.verifyButton}>
        <Text style={styles.verifyButtonText}>Change Photo</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1b1b1b', // Match sidebar background
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: '#1b1b1b',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  saveButtonMobile: {
    backgroundColor: '#3498db',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  // Hero Styles - Corrected Alignment
  heroContainer: {
    height: 80,
    width: '100%',
    position: 'relative',
    marginBottom: 20,
    justifyContent: 'center', // Align center vertically
    paddingHorizontal: 24, // Match sidebar logo container
    borderBottomWidth: 1, // Add border
    borderBottomColor: '#2d2d2d', // Add border color
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center', // Changed from flex-end to center
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    gap: 30, // Match Grid Gap
  },
  heroLeftCol: {
    flex: 2, // 66% - Align with Main Content
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 24, // Matches Card's internal padding (24px)
  },
  heroRightCol: {
    flex: 1, // 33% - Align with Sidebar
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    // removed background/padding to look cleaner in 80px header
    marginRight: 24,
  },
  heroAvatarContainer: {
    marginRight: 15,
  },
  heroAvatar: {
    width: 50, // Reduced from 70 to 50
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#fff',
  },
  heroInfo: {
    justifyContent: 'center',
  },
  heroName: {
    fontSize: 20, // Reduced from 24
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  heroStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  heroStatusText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: '600',
    fontSize: 11,
  },
  // Right Col Content
  heroStatsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStatsItem: {
    alignItems: 'center',
    marginHorizontal: 10,
  },
  heroStatValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  heroStatLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
  },
  heroStatsDivider: {
    width: 1,
    height: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroSaveButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 15,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  // Layout
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  desktopContainer: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },
  desktopGrid: {
    flexDirection: 'row',
    gap: 30,
    alignItems: 'flex-start',
  },
  desktopMainCol: {
    flex: 2, // 66%
  },
  desktopSidebarCol: {
    flex: 1, // 33%
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
    marginBottom: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
  },
  fieldContainer: {
    marginBottom: 20,
  },
  textInput: {
    fontSize: 16,
    color: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)', // Darker input bg
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  multilineInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderRadius: 10,
  },
  switchLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  // Status components (Mobile mainly)
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
  saveButton: {
    // Intentionally empty if not used elsewhere, but kept to prevent errors
  },
  backButton: {
    padding: 8,
  }
});

export default LecturerProfileScreen;
