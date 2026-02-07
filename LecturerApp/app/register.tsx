import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform, StatusBar, Image } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import axios, { AxiosError } from 'axios';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_CONFIG } from '../src/config/api';
import DatePicker from '../src/components/DatePicker';
import CountryPickerModal from '../src/components/CountryPickerModal';
import Toast from 'react-native-toast-message';
import { tokenStorage } from '../utils/tokenStorage';
import { useTranslation } from 'react-i18next'; // Added import
import { useResponsive } from '../src/hooks/useResponsive';

WebBrowser.maybeCompleteAuthSession();

// const { width, height } = Dimensions.get('window');

interface UserData {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  date_of_birth: string;
  address: string;
  user_type: 'lecturer';
  password: string;
}

interface ApiError {
  message?: string;
  detail?: string;
  error?: string;
  email?: string[];
  username?: string[];
  phone_number?: string[];
}

interface ApiResponse {
  user: UserData;
  access: string;
  refresh: string;
}

const Register = () => {
  const { isDesktop } = useResponsive();
  const { t, i18n } = useTranslation();
  const [userData, setUserData] = useState<UserData>({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    date_of_birth: '',
    address: '',
    user_type: 'lecturer',
    password: '',
  });
  const [selectedCountryCode, setSelectedCountryCode] = useState('+20');
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const baseurl = API_CONFIG.ACCOUNTS_BASE_URL;

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        handleGoogleSignUp(authentication.accessToken);
      } else {
        Toast.show({
          type: 'error',
          text1: t('authentication_error'),
          text2: t('failed_google_token')
        });
      }
    } else if (response?.type === 'error') {
      Toast.show({
        type: 'error',
        text1: t('google_signup_failed'),
        text2: t('google_login_failed')
      });
    }
  }, [response]);

  const storeTokens = async (access: string, refresh: string) => {
    try {
      await tokenStorage.setItem('access_token', access);
      await tokenStorage.setItem('refresh_token', refresh);
    } catch (error) {
      console.error('Error storing tokens:', error);
      Toast.show({
        type: 'error',
        text1: t('storage_error'),
        text2: t('failed_store_credentials')
      });
    }
  };

  const validateForm = (): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    const phoneRegex = /^\d{9,15}$/; // Basic phone number validation

    if (!userData.username || !userData.email || !userData.first_name || !userData.last_name || !userData.phone_number || !userData.address || !userData.password) {
      Toast.show({
        type: 'error',
        text1: t('missing_info'),
        text2: t('please_fill_all_fields')
      });
      return false;
    }

    if (!emailRegex.test(userData.email)) {
      Toast.show({
        type: 'error',
        text1: t('invalid_email_title'),
        text2: t('invalid_email_msg')
      });
      return false;
    }

    if (userData.username.length < 3) {
      Toast.show({
        type: 'error',
        text1: t('invalid_username_title'),
        text2: t('invalid_username_msg')
      });
      return false;
    }

    if (!usernameRegex.test(userData.username)) {
      Toast.show({
        type: 'error',
        text1: t('invalid_username_title'),
        text2: t('invalid_username_chars')
      });
      return false;
    }

    if (!phoneRegex.test(userData.phone_number)) {
      Toast.show({
        type: 'error',
        text1: t('invalid_phone'),
        text2: t('invalid_phone_msg')
      });
      return false;
    }

    if (userData.password.length < 8) {
      Toast.show({
        type: 'error',
        text1: t('invalid_password_title'),
        text2: t('invalid_password_len')
      });
      return false;
    }

    const hasUpperCase = /[A-Z]/.test(userData.password);
    const hasLowerCase = /[a-z]/.test(userData.password);
    const hasNumber = /[0-9]/.test(userData.password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      Toast.show({
        type: 'error',
        text1: t('invalid_password_title'),
        text2: t('invalid_password_complexity')
      });
      return false;
    }

    if (userData.password !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: t('password_mismatch_title'),
        text2: t('password_mismatch_msg')
      });
      return false;
    }

    if (!selectedDate) {
      Toast.show({
        type: 'error',
        text1: t('missing_dob'),
        text2: t('select_dob_msg')
      });
      return false;
    }
    return true;
  };

  const handleRegister = async (): Promise<void> => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const dob = selectedDate
        ? `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedDate.getDate().toString().padStart(2, '0')}`
        : '';
      const dataToSend = {
        ...userData,
        date_of_birth: dob,
        phone_number: selectedCountryCode + userData.phone_number,
      };

      const res = await axios.post(`${baseurl}users/`, dataToSend);
      const { access, refresh, user } = res.data;

      // Check if user is a lecturer
      if (user.user_type !== 'lecturer') {
        Toast.show({
          type: 'error',
          text1: t('access_denied'),
          text2: t('lecturer_app_only')
        });
        setIsLoading(false);
        return;
      }

      await storeTokens(access, refresh);
      if (user) {
        await tokenStorage.setItem('user_data', JSON.stringify(user));
      }
      Toast.show({
        type: 'success',
        text1: t('registration_successful'),
        text2: t('welcome_taalomy_lecturer')
      });
      setUserData({
        email: '',
        username: '',
        first_name: '',
        last_name: '',
        phone_number: '',
        date_of_birth: '',
        address: '',
        user_type: 'lecturer',
        password: '',
      });
      setConfirmPassword('');
      setSelectedDate(undefined);
      setSelectedCountryCode('+20');

      // Redirect to OTP verification
      router.push({ pathname: '/auth/otp', params: { email: dataToSend.email } });
      // router.push('/onboarding'); // Moved to after OTP verification
    } catch (error: any) {
      console.error('Registration error:', error.response?.data);
      const errorData: ApiError = error.response?.data || {};
      let errorMessage = errorData.detail || t('registration_failed');

      if (errorData.email) {
        errorMessage = t('email_in_use');
      } else if (errorData.username) {
        errorMessage = t('username_taken');
      } else if (errorData.phone_number) {
        errorMessage = errorData.phone_number[0];
      }

      Toast.show({
        type: 'error',
        text1: t('registration_failed'),
        text2: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async (accessToken: string): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await axios.post(`${baseurl}auth/google/`, {
        token: accessToken,
        user_type: 'lecturer',
      });
      const { access, refresh, user } = res.data;

      // Check if user is a lecturer
      if (user.user_type !== 'lecturer') {
        Toast.show({
          type: 'error',
          text1: t('access_denied'),
          text2: t('lecturer_app_only')
        });
        return;
      }

      await storeTokens(access, refresh);
      if (user) {
        await tokenStorage.setItem('user_data', JSON.stringify(user));
        setUserData({
          email: user.email ?? '',
          username: user.username ?? '',
          first_name: user.first_name ?? '',
          last_name: user.last_name ?? '',
          phone_number: user.phone_number ?? '',
          date_of_birth: user.date_of_birth ?? '',
          address: '',
          user_type: 'lecturer',
          password: '',
        });
        setIsGoogleUser(true);
      }
      Toast.show({
        type: 'success',
        text1: t('registration_successful'),
        text2: t('welcome_taalomy_lecturer')
      });
      router.push('/onboarding');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || t('google_signup_failed');
      Toast.show({
        type: 'error',
        text1: t('google_signup_failed'),
        text2: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />


        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            {
              paddingHorizontal: 30,
              paddingTop: Platform.OS === 'ios' ? 60 : 40,
              paddingBottom: 40
            },
            isDesktop && {
              width: '100%',
              maxWidth: 600,
              alignSelf: 'center',
              paddingHorizontal: 0
            }
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* University Branding */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 5,
              marginEnd: 15
            }}>
              <View style={{
                width: 80,
                height: 80,
                alignItems: 'center',
                justifyContent: 'center',
                marginEnd: -20,
              }}>
                <Image
                  source={require('../assets/taalomy-white-txt.png')}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />
              </View>
              <Text style={{
                fontSize: 42,
                fontWeight: '700',
                color: '#ecf0f1',
                marginTop: 5,
              }}>aalomy</Text>
            </View>
            <View style={{
              height: 4,
              width: 50,
              backgroundColor: '#3498db',
              borderRadius: 2,
              marginBottom: 15,
            }} />
            <Text style={{
              fontSize: 18,
              color: '#bdc3c7',
              textAlign: 'center',
              fontWeight: '500',
              marginBottom: 5,
            }}>{t('lecturer_portal')}</Text>
            <Text style={{
              fontSize: 14,
              color: '#95a5a6',
              textAlign: 'center',
              fontWeight: '400',
            }}>{t('create_lecturer_account')}</Text>
          </View>

          {/* Professional Registration Card */}
          <View style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 16,
            padding: 30,
            marginBottom: 30,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 8,
          }}>
            <View style={{ marginBottom: 30 }}>
              <Text style={{
                fontSize: 24,
                fontWeight: '600',
                color: '#ecf0f1',
                textAlign: 'center',
                marginBottom: 8,
              }}>{t('join_lecturer_portal')}</Text>
              <Text style={{
                fontSize: 14,
                color: '#95a5a6',
                textAlign: 'center',
                fontWeight: '400',
              }}>{t('complete_lecturer_registration')}</Text>
            </View>

            {/* Google Sign Up */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderRadius: 12,
                paddingVertical: 14,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                marginBottom: 20,
                opacity: isLoading ? 0.6 : 1,
              }}
              onPress={() => promptAsync()}
              disabled={!request || isLoading}
            >
              <View style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                alignItems: 'center',
                justifyContent: 'center',
                marginEnd: 10,
              }}>
                <Text style={{ fontSize: 12 }}>G</Text>
              </View>
              <Text style={{
                fontSize: 14,
                fontWeight: '500',
                color: '#bdc3c7',
              }}>
                {isLoading ? t('signing_up') : t('continue_google_workspace')}
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginVertical: 20,
            }}>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
              <Text style={{
                color: '#95a5a6',
                paddingHorizontal: 15,
                fontSize: 12,
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>{t('register_manually')}</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
            </View>

            {/* Lecturer Type Indicator */}
            <View style={{ marginBottom: 25 }}>
              <View style={{
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: '#3498db',
                alignItems: 'center',
              }}>
                <Ionicons name="school-outline" size={24} color="#3498db" />
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#ecf0f1',
                  marginTop: 8,
                }}>{t('lecturer_account')}</Text>
                <Text style={{
                  fontSize: 12,
                  color: '#95a5a6',
                  textAlign: 'center',
                  marginTop: 4,
                }}>{t('academic_staff_registration')}</Text>
              </View>
            </View>

            {/* Form Fields */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{
                fontSize: 13,
                fontWeight: '600',
                color: '#bdc3c7',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>{t('username')}</Text>
              <TextInput
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: '#ecf0f1',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  textAlign: i18n.language === 'ar' ? 'right' : 'left'
                }}
                placeholder={t('letters_numbers_only')}
                placeholderTextColor="#666"
                value={userData.username}
                onChangeText={(text) => setUserData({ ...userData, username: text })}
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={{
                fontSize: 13,
                fontWeight: '600',
                color: '#bdc3c7',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>{t('first_name')}</Text>
              <TextInput
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: '#ecf0f1',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  textAlign: i18n.language === 'ar' ? 'right' : 'left'
                }}
                placeholder={t('enter_first_name')}
                placeholderTextColor="#666"
                value={userData.first_name}
                onChangeText={(text) => setUserData({ ...userData, first_name: text })}
                editable={!isLoading}
              />
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={{
                fontSize: 13,
                fontWeight: '600',
                color: '#bdc3c7',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>{t('last_name')}</Text>
              <TextInput
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: '#ecf0f1',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  textAlign: i18n.language === 'ar' ? 'right' : 'left'
                }}
                placeholder={t('enter_last_name')}
                placeholderTextColor="#666"
                value={userData.last_name}
                onChangeText={(text) => setUserData({ ...userData, last_name: text })}
                editable={!isLoading}
              />
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={{
                fontSize: 13,
                fontWeight: '600',
                color: '#bdc3c7',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>{t('email_address')}</Text>
              <TextInput
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: '#ecf0f1',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  textAlign: i18n.language === 'ar' ? 'right' : 'left'
                }}
                placeholder={t('enter_institutional_email')}
                placeholderTextColor="#666"
                value={userData.email}
                onChangeText={(text) => setUserData({ ...userData, email: text.toLowerCase() })}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isLoading}
              />
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={{
                fontSize: 13,
                fontWeight: '600',
                color: '#bdc3c7',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>{t('password')}</Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}>
                <TextInput
                  style={{
                    flex: 1,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    fontSize: 16,
                    color: '#ecf0f1',
                    textAlign: i18n.language === 'ar' ? 'right' : 'left'
                  }}
                  placeholder={t('min_password_chars')}
                  placeholderTextColor="#666"
                  value={userData.password}
                  onChangeText={(text) => setUserData({ ...userData, password: text })}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={{ padding: 10 }}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#95a5a6" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={{
                fontSize: 13,
                fontWeight: '600',
                color: '#bdc3c7',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>{t('confirm_password_label')}</Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}>
                <TextInput
                  style={{
                    flex: 1,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    fontSize: 16,
                    color: '#ecf0f1',
                    textAlign: i18n.language === 'ar' ? 'right' : 'left'
                  }}
                  placeholder={t('confirm_password_placeholder')}
                  placeholderTextColor="#666"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={{ padding: 10 }}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#95a5a6" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={{
                fontSize: 13,
                fontWeight: '600',
                color: '#bdc3c7',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>{t('address')}</Text>
              <TextInput
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: '#ecf0f1',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  minHeight: 80,
                  textAlignVertical: 'top',
                  textAlign: i18n.language === 'ar' ? 'right' : 'left'
                }}
                placeholder={t('enter_full_address')}
                placeholderTextColor="#666"
                value={userData.address}
                onChangeText={(text) => setUserData({ ...userData, address: text })}
                multiline
                editable={!isLoading}
              />
            </View>

            {/* Phone Number Input */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{
                fontSize: 13,
                fontWeight: '600',
                color: '#bdc3c7',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>{t('phone_number')}</Text>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    marginEnd: 8,
                    justifyContent: 'center',
                    paddingHorizontal: 12,
                    minWidth: 70,
                    alignItems: 'center',
                  }}
                  onPress={() => setCountryPickerVisible(true)}
                >
                  <Text style={{
                    color: '#ecf0f1',
                    fontSize: 16,
                  }}>{selectedCountryCode}</Text>
                </TouchableOpacity>
                <TextInput
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    fontSize: 16,
                    color: '#ecf0f1',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    textAlign: i18n.language === 'ar' ? 'right' : 'left'
                  }}
                  placeholder={t('enter_phone_number')}
                  placeholderTextColor="#666"
                  value={userData.phone_number}
                  onChangeText={(text) => setUserData({ ...userData, phone_number: text })}
                  keyboardType="phone-pad"
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Date of Birth Input */}
            <View style={{ marginBottom: 30 }}>
              <Text style={{
                fontSize: 13,
                fontWeight: '600',
                color: '#bdc3c7',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>{t('date_of_birth')}</Text>
              <DatePicker
                value={selectedDate}
                onChange={setSelectedDate}
                maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 16))}
                minimumDate={new Date(1924, 0, 1)}
                disabled={isLoading}
                placeholder={t('select_date_of_birth')}
              />
            </View>

            {/* Terms of Service Checkbox */}
            <View style={{ marginBottom: 20, flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => setTermsAccepted(!termsAccepted)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: termsAccepted ? '#2ecc71' : '#95a5a6',
                  backgroundColor: termsAccepted ? '#2ecc71' : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginEnd: 10,
                }}
              >
                {termsAccepted && <Ionicons name="checkmark" size={16} color="#fff" />}
              </TouchableOpacity>

              <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap' }}>
                <TouchableOpacity onPress={() => router.push('/terms-of-service')}>
                  <Text style={{ color: '#bdc3c7', fontSize: 14 }}>
                    {t('accept_tos')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={{
                borderRadius: 12,
                overflow: 'hidden',
                opacity: (isLoading || !termsAccepted) ? 0.6 : 1,
              }}
              onPress={handleRegister}
              disabled={isLoading || !termsAccepted}
            >
              <LinearGradient
                colors={(isLoading || !termsAccepted) ? ['#444', '#555'] : ['#2c3e50', '#34495e']}
                style={{
                  paddingVertical: 16,
                  alignItems: 'center',
                }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ecf0f1" />
                ) : (
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#ecf0f1',
                    letterSpacing: 1,
                  }}>
                    {t('register_action')}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}>
            <Text style={{
              fontSize: 14,
              color: '#95a5a6',
            }}>{t('already_have_account')} </Text>
            <TouchableOpacity
              onPress={() => router.push('/login')}
              disabled={isLoading}
            >
              <Text style={{
                fontSize: 14,
                color: '#3498db',
                fontWeight: '600',
              }}>{t('sign_in')}</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={{ alignItems: 'center', marginTop: 10 }}>
            <Text style={{
              fontSize: 11,
              color: '#7f8c8d',
              marginBottom: 2,
            }}>
              {t('copyright_footer')}
            </Text>
            <Text style={{
              fontSize: 9,
              color: '#7f8c8d',
              fontWeight: '300',
            }}>{t('secure_reliable_professional')}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CountryPickerModal
        visible={countryPickerVisible}
        onClose={() => setCountryPickerVisible(false)}
        onSelect={(country) => {
          setSelectedCountryCode(country.dial_code);
          setCountryPickerVisible(false);
        }}
        allowedCountries={['SA', 'AE', 'EG']}
      />
    </View>
  );
};

export default Register;
