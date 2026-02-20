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
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { tokenStorage } from '../utils/tokenStorage';
import ProfilePicture from '../src/components/ProfilePicture';
import CountryPickerModal, { COUNTRIES } from '../src/components/CountryPickerModal';
import { pickImage, takePhoto, uploadProfilePicture, refreshUserData } from '../src/utils/profilePicture';
import { API_CONFIG } from '../src/config/api';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { useResponsive } from '../src/hooks/useResponsive';
import { HoverCard } from '../src/components/HoverCard';
import { HoverIcon } from '../src/components/HoverIcon';
const AsyncStorage = tokenStorage; // Added import

interface UserData {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: string;
  date_of_birth?: string;
  phone_number?: string;
  address?: string;
  profile_picture_url?: string;
}

// Add password change state
interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ProfileEditScreen = () => {
  const { t } = useTranslation();
  const { isDesktop } = useResponsive();
  const isWeb = Platform.OS === 'web';
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValues, setTempValues] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    address: '',
  });
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState('+1');

  // Add password change state
  const [passwordChange, setPasswordChange] = useState<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userDataString = await AsyncStorage.getItem('user_data');
      if (userDataString) {
        const parsedUserData = JSON.parse(userDataString);

        // Ensure profile_picture_url is properly set from profile_picture if needed
        if (parsedUserData.profile_picture && !parsedUserData.profile_picture_url) {
          parsedUserData.profile_picture_url = parsedUserData.profile_picture;
        } else if (!parsedUserData.profile_picture && !parsedUserData.profile_picture_url) {
          parsedUserData.profile_picture_url = null;
        }

        setUserData(parsedUserData);
        setTempValues({
          first_name: parsedUserData.first_name || '',
          last_name: parsedUserData.last_name || '',
          phone_number: parsedUserData.phone_number || '',
          address: parsedUserData.address || '',
        });

        // Fetch the latest user data from server to ensure we have the current profile picture URL
        try {
          const token = await AsyncStorage.getItem('access_token');
          if (token && parsedUserData.id) {
            const response = await axios.get(`${API_CONFIG.ACCOUNTS_BASE_URL}users/me/`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });

            const updatedUser = response.data;

            // Ensure profile_picture_url is properly set
            if (updatedUser.profile_picture && !updatedUser.profile_picture_url) {
              updatedUser.profile_picture_url = updatedUser.profile_picture;
            } else if (!updatedUser.profile_picture && !updatedUser.profile_picture_url) {
              updatedUser.profile_picture_url = null;
            }

            setUserData(updatedUser as UserData | null);
            setTempValues({
              first_name: updatedUser.first_name || '',
              last_name: updatedUser.last_name || '',
              phone_number: updatedUser.phone_number || '',
              address: updatedUser.address || '',
            });
            await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
          }
        } catch (fetchError) {
          console.error('Error fetching latest user data:', fetchError);
          // Continue with cached data if fetch fails
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Toast.show({
        type: 'error',
        text1: t('error_loading_profile'),
        text2: t('failed_load_user_data')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImagePicker = async () => {
    if (isWeb) {
      // On web, direct pick is better
      const imageUri = await pickImage();
      if (imageUri) {
        await uploadImage(imageUri);
      }
      return;
    }

    Alert.alert(
      t('choose_photo'),
      t('choose_photo_msg'),
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('gallery'),
          onPress: async () => {
            const imageUri = await pickImage();
            if (imageUri) {
              await uploadImage(imageUri);
            }
          },
        },
        {
          text: t('camera'),
          onPress: async () => {
            const imageUri = await takePhoto();
            if (imageUri) {
              await uploadImage(imageUri);
            }
          },
        },
      ]
    );
  };

  const uploadImage = async (imageUri: string) => {
    try {
      setIsUploading(true);
      const profilePictureUrl = await uploadProfilePicture(imageUri);

      if (profilePictureUrl && userData) {
        console.log('Setting profile picture URL:', profilePictureUrl);
        const updatedUserData = { ...userData, profile_picture_url: profilePictureUrl };
        setUserData(updatedUserData as UserData | null);
        await AsyncStorage.setItem('user_data', JSON.stringify(updatedUserData));

        // Refresh user data across the app
        await refreshUserData(updatedUserData);

        Toast.show({
          type: 'success',
          text1: t('save_success'),
          text2: t('profile_pic_updated')
        });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Toast.show({
        type: 'error',
        text1: t('upload_failed'),
        text2: t('failed_upload_pic')
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveField = async (field: string) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: t('auth_error'),
          text2: t('no_token_msg')
        });
        return;
      }

      let valueToSave = tempValues[field as keyof typeof tempValues];

      // Combine country code and phone number if saving phone number
      if (field === 'phone_number') {
        valueToSave = selectedCountryCode + valueToSave;
      }

      const response = await axios.patch(`${API_CONFIG.ACCOUNTS_BASE_URL}users/me/`, {
        [field]: valueToSave,
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 200) {
        const updatedUserData = { ...userData, [field]: valueToSave } as UserData;
        setUserData(updatedUserData);
        await AsyncStorage.setItem('user_data', JSON.stringify(updatedUserData));
        Toast.show({
          type: 'success',
          text1: t('save_success'),
          text2: t('update_success', { field: field.replace('_', ' ') })
        });
      }
    } catch (error) {
      console.error('Error updating field:', error);
      Toast.show({
        type: 'error',
        text1: t('update_failed'),
        text2: t('failed_update_field', { field: field.replace('_', ' ') })
      });
    } finally {
      setEditingField(null);
    }
  };

  const startEditing = (field: string, value: string) => {
    if (field === 'phone_number') {
      // Try to parse country code
      // Sort countries by dial_code length (descending) to match longest code first
      const sortedCountries = [...COUNTRIES].sort((a, b) => b.dial_code.length - a.dial_code.length);
      const matchedCountry = sortedCountries.find(c => value.startsWith(c.dial_code));

      if (matchedCountry) {
        setSelectedCountryCode(matchedCountry.dial_code);
        setTempValues(prev => ({
          ...prev,
          [field]: value.substring(matchedCountry.dial_code.length)
        }));
      } else {
        // Default fallback if no match found
        setSelectedCountryCode('+1');
        setTempValues(prev => ({ ...prev, [field]: value }));
      }
    } else {
      setTempValues(prev => ({ ...prev, [field]: value }));
    }
    setEditingField(field);
  };

  const handleLogout = async () => {
    Alert.alert(
      t('logout'),
      t('confirm_logout'),
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              await tokenStorage.clearAuth();
              router.replace('/login');
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const renderEditableField = (field: string, label: string, value: string) => {
    const isEditing = editingField === field;

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {isEditing ? (
          <View style={styles.editContainer}>
            {field === 'phone_number' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    borderRightWidth: 1,
                    borderRightColor: 'rgba(255, 255, 255, 0.1)',
                    minWidth: 60,
                    alignItems: 'center',
                  }}
                  onPress={() => setCountryPickerVisible(true)}
                >
                  <Text style={{ color: '#fff', fontSize: 16 }}>{selectedCountryCode}</Text>
                </TouchableOpacity>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  value={tempValues[field as keyof typeof tempValues]}
                  onChangeText={(text) => setTempValues(prev => ({ ...prev, [field]: text }))}
                  placeholder={t('enter_placeholder', { label: label.toLowerCase() })}
                  placeholderTextColor="#95a5a6"
                  keyboardType="phone-pad"
                />
              </View>
            ) : (
              <TextInput
                style={styles.textInput}
                value={tempValues[field as keyof typeof tempValues]}
                onChangeText={(text) => setTempValues(prev => ({ ...prev, [field]: text }))}
                placeholder={t('enter_placeholder', { label: label.toLowerCase() })}
                placeholderTextColor="#95a5a6"
              />
            )}
            <View style={styles.editButtons}>
              <TouchableOpacity
                style={[styles.editButton, styles.saveButton]}
                onPress={() => handleSaveField(field)}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editButton, styles.cancelButton]}
                onPress={() => setEditingField(null)}
              >
                <Ionicons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.fieldValueContainer}>
            <Text style={styles.fieldValue}>{value || t('not_set')}</Text>
            <TouchableOpacity
              style={styles.editIcon}
              onPress={() => startEditing(field, value)}
            >
              <Ionicons name="pencil" size={16} color="#3498db" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

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

  // Add password change handler
  const handleChangePassword = async () => {
    // Validate passwords
    if (!passwordChange.currentPassword) {
      Toast.show({
        type: 'error',
        text1: t('missing_info'),
        text2: t('current_password_missing')
      });
      return;
    }

    if (!passwordChange.newPassword) {
      Toast.show({
        type: 'error',
        text1: t('missing_info'),
        text2: t('new_password_missing')
      });
      return;
    }

    if (passwordChange.newPassword.length < 8) {
      Toast.show({
        type: 'error',
        text1: t('invalid_password_title'),
        text2: t('invalid_password_len')
      });
      return;
    }

    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      Toast.show({
        type: 'error',
        text1: t('password_mismatch_title'),
        text2: t('password_mismatch_msg')
      });
      return;
    }

    try {
      setIsChangingPassword(true);
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: t('auth_error'),
          text2: t('no_token_msg')
        });
        return;
      }

      // Note: This is a simplified implementation. In a real application,
      // you would need a specific API endpoint for password changes.
      // For now, we'll show an info toast that this feature would be implemented
      // with a proper backend endpoint.
      Toast.show({
        type: 'info',
        text1: t('change_password'),
        text2: t('password_change_api_notice')
      });

      // Reset password fields
      setPasswordChange({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswordChange(false);
    } catch (error) {
      console.error('Error changing password:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('failed_change_password')
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {isWeb ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1a1a1a' }]} />
      ) : (
        <LinearGradient
          colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
          style={styles.backgroundGradient}
        />
      )}

      {/* Header */}
      <View style={[
        styles.header,
        isWeb && {
          height: 80,
          paddingTop: 0,
          backgroundColor: '#1a1a1a',
          borderBottomWidth: 1,
          borderBottomColor: '#2c2c2c',
          paddingHorizontal: isDesktop ? 24 : 20,
        }
      ]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {!isWeb && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
            )}
            <Text style={[
              styles.headerTitle,
              isWeb && { fontSize: 24, fontWeight: '700' }
            ]}>{t('edit_profile_title')}</Text>
          </View>
          {isWeb && <View style={styles.placeholder} />}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 40,
          paddingTop: isDesktop ? 30 : 20,
          paddingHorizontal: isDesktop ? 24 : 0,
        }}
      >
        <View style={{
          flexDirection: isDesktop ? 'row' : 'column',
          alignItems: 'flex-start',
          gap: 24,
        }}>
          {/* Left Column: Profile Picture (Desktop) */}
          <View style={{ flex: isDesktop ? 1 : undefined, width: '100%' }}>
            {/* Profile Picture Section */}
            <View style={[styles.profileSection, isDesktop && { marginBottom: 24, backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: 24, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { marginBottom: 4 }]}>{t('profile_picture_title')}</Text>
                <Text style={{ color: '#7f8c8d', fontSize: 13, marginBottom: 16 }}>{t('profile_pic_hint', 'Update your avatar to personalize your profile.')}</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <View style={styles.profilePictureContainer}>
                  <ProfilePicture
                    imageUrl={userData?.profile_picture_url || undefined}
                    firstName={userData?.first_name || ''}
                    lastName={userData?.last_name || ''}
                    size={isDesktop ? 120 : 120}
                    onPress={handleImagePicker}
                    showEditIcon={true}
                  />
                  {isUploading && (
                    <View style={[styles.uploadingOverlay, { borderRadius: 60 }]}>
                      <ActivityIndicator size="large" color="#fff" />
                      <Text style={styles.uploadingText}>{t('uploading')}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handleImagePicker}
                  disabled={isUploading}
                >
                  <Ionicons name="camera" size={20} color="#fff" />
                  <Text style={styles.uploadButtonText}>
                    {isUploading ? t('uploading') : t('change_photo')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Logout Section (Separate Card) */}
            <View style={[isDesktop && { backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: 24, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)', marginTop: 0 }]}>
              <TouchableOpacity
                style={[styles.logoutButton, { marginTop: 0 }]}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={20} color="#e74c3c" />
                <Text style={styles.logoutButtonText}>{t('logout')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Right Column: Information (Desktop) */}
          <View style={{ flex: isDesktop ? 2 : undefined, width: '100%' }}>
            {/* Personal Information Section */}
            <View style={[styles.section, isDesktop && { backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: 24, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)', marginBottom: 24 }]}>
              <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>{t('personal_info')}</Text>

              {renderEditableField('first_name', t('first_name'), userData?.first_name || '')}
              {renderEditableField('last_name', t('last_name'), userData?.last_name || '')}
              {renderEditableField('phone_number', t('phone_number'), userData?.phone_number || '')}
              {renderEditableField('address', t('address'), userData?.address || '')}
            </View>

            {/* Account Information Section */}
            <View style={[styles.section, isDesktop && { backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: 24, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' }]}>
              <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>{t('account_info')}</Text>

              <View style={[styles.fieldContainer, { marginBottom: 12 }]}>
                <Text style={styles.fieldLabel}>{t('email_address')}</Text>
                <View style={[styles.fieldValueContainer, { backgroundColor: 'rgba(255, 255, 255, 0.01)', opacity: 0.8, paddingVertical: 10 }]}>
                  <Text style={styles.fieldValue}>{userData?.email}</Text>
                  <Ionicons name="lock-closed-outline" size={16} color="#7f8c8d" />
                </View>
              </View>

              <View style={[styles.fieldContainer, { marginBottom: 12 }]}>
                <Text style={styles.fieldLabel}>{t('username')}</Text>
                <View style={[styles.fieldValueContainer, { backgroundColor: 'rgba(255, 255, 255, 0.01)', opacity: 0.8, paddingVertical: 10 }]}>
                  <Text style={styles.fieldValue}>{userData?.username}</Text>
                  <Ionicons name="lock-closed-outline" size={16} color="#7f8c8d" />
                </View>
              </View>

              <View style={[styles.fieldContainer, { marginBottom: 12 }]}>
                <Text style={styles.fieldLabel}>{t('user_type')}</Text>
                <View style={[styles.fieldValueContainer, { backgroundColor: 'rgba(255, 255, 255, 0.01)', opacity: 0.8, paddingVertical: 10 }]}>
                  <Text style={styles.fieldValue}>{userData?.user_type}</Text>
                  <Ionicons name="lock-closed-outline" size={16} color="#7f8c8d" />
                </View>
              </View>

              {/* Password Change Section */}
              <View style={styles.fieldContainer}>
                <TouchableOpacity
                  style={[styles.passwordChangeButton, { paddingVertical: 10 }]}
                  onPress={() => setShowPasswordChange(!showPasswordChange)}
                >
                  <Text style={styles.passwordChangeButtonText}>{t('change_password')}</Text>
                  <Ionicons
                    name={showPasswordChange ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#3498db"
                  />
                </TouchableOpacity>

                {showPasswordChange && (
                  <View style={styles.passwordChangeForm}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder={t('current_password')}
                      placeholderTextColor="#95a5a6"
                      secureTextEntry={true}
                      value={passwordChange.currentPassword}
                      onChangeText={(text) => setPasswordChange(prev => ({ ...prev, currentPassword: text }))}
                    />

                    <TextInput
                      style={styles.passwordInput}
                      placeholder={t('new_password')}
                      placeholderTextColor="#95a5a6"
                      secureTextEntry={true}
                      value={passwordChange.newPassword}
                      onChangeText={(text) => setPasswordChange(prev => ({ ...prev, newPassword: text }))}
                    />

                    <TextInput
                      style={styles.passwordInput}
                      placeholder={t('confirm_new_password')}
                      placeholderTextColor="#95a5a6"
                      secureTextEntry={true}
                      value={passwordChange.confirmPassword}
                      onChangeText={(text) => setPasswordChange(prev => ({ ...prev, confirmPassword: text }))}
                    />

                    <TouchableOpacity
                      style={styles.changePasswordButton}
                      onPress={handleChangePassword}
                      disabled={isChangingPassword}
                    >
                      {isChangingPassword ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.changePasswordButtonText}>{t('update_password')}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <CountryPickerModal
        visible={countryPickerVisible}
        onClose={() => setCountryPickerVisible(false)}
        onSelect={(country) => setSelectedCountryCode(country.dial_code)}
      />
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
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
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
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    alignSelf: 'flex-start',
  },
  profilePictureContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#fff',
    marginTop: 8,
    fontSize: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  uploadButtonText: {
    color: '#fff',
    marginStart: 8,
    fontWeight: '600',
  },
  section: {
    marginBottom: 30,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#bdc3c7',
    marginBottom: 8,
  },
  fieldValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  fieldValue: {
    fontSize: 16,
    color: '#ecf0f1',
    flex: 1,
  },
  editIcon: {
    padding: 8,
  },
  editContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  textInput: {
    fontSize: 16,
    color: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  editButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  editButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#27ae60',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },

  // Add new styles for password change
  passwordChangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.2)',
  },
  passwordChangeButtonText: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '600',
  },
  passwordChangeForm: {
    marginTop: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 15,
  },
  passwordInput: {
    fontSize: 16,
    color: '#fff',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  changePasswordButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePasswordButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.2)',
    width: '100%',
  },
  logoutButtonText: {
    color: '#e74c3c',
    marginStart: 8,
    fontWeight: '600',
  },
});

export default ProfileEditScreen;
