import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
  Image
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import axios from 'axios';
import { router } from 'expo-router';
import { tokenStorage } from '../utils/tokenStorage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_CONFIG } from '../src/config/api';
import Toast from 'react-native-toast-message';
import { useResponsive } from '../src/hooks/useResponsive';
import { TwinklingDotsBackground } from '../src/components/TwinklingDotsBackground';

WebBrowser.maybeCompleteAuthSession();

const Login: React.FC = () => {
  const { isDesktop, width: screenWidth } = useResponsive();
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
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
        handleGoogleLogin(authentication.accessToken);
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
        text1: t('google_login_failed_title'),
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

  const handleLogin = async (): Promise<void> => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: t('missing_info'),
        text2: t('enter_email_password')
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post(`${baseurl}api/token/`, {
        username: email,
        password,
      }, {
        timeout: 10000
      });
      const { access, refresh, user } = res.data;

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
        try {
          const response = await axios.get(`${baseurl}users/me/`, {
            headers: { 'Authorization': `Bearer ${access}` }
          });

          const updatedUser = response.data;

          if (updatedUser.profile_picture && !updatedUser.profile_picture_url) {
            updatedUser.profile_picture_url = updatedUser.profile_picture;
          } else if (!updatedUser.profile_picture && !updatedUser.profile_picture_url) {
            updatedUser.profile_picture_url = null;
          }

          await tokenStorage.setItem('user_data', JSON.stringify(updatedUser));
        } catch (fetchError) {
          console.error('Error fetching latest user data:', fetchError);
          const fallbackUser = { ...user };
          await tokenStorage.setItem('user_data', JSON.stringify(fallbackUser));
        }
      }

      Toast.show({
        type: 'success',
        text1: t('login_successful'),
        text2: t('welcome_back_message')
      });

      router.push('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error.response?.data);

      const errorCode = error.response?.data?.code;
      const isEmailNotVerified = Array.isArray(errorCode)
        ? errorCode.includes('email_not_verified')
        : errorCode === 'email_not_verified';

      if (isEmailNotVerified) {
        Toast.show({
          type: 'info',
          text1: t('verification_required'),
          text2: t('please_verify_email')
        });
        router.push({ pathname: '/auth/otp', params: { email, autoSend: 'true' } });
        return;
      }

      const errorMessage = error.response?.data?.detail || t('invalid_credentials');
      Toast.show({
        type: 'error',
        text1: t('login_failed'),
        text2: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async (accessToken: string): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await axios.post(`${baseurl}auth/google/`, {
        token: accessToken,
      });
      const { access, refresh, user } = res.data;

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
      }

      Toast.show({
        type: 'success',
        text1: t('login_successful'),
        text2: t('welcome_back_message')
      });

      router.push('/dashboard');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || t('google_login_failed');
      Toast.show({
        type: 'error',
        text1: t('google_login_failed_title'),
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

        {isDesktop ? (
          // Desktop Split-Screen Layout
          <View style={{ flex: 1, flexDirection: 'row' }}>
            {/* Left Branding Section */}
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 60, overflow: 'hidden' }}>
              <LinearGradient
                colors={['rgba(52, 152, 219, 0.1)', 'rgba(52, 152, 219, 0.05)', 'transparent']}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                }}
              />

              {/* Twinkling Dots Background */}
              {isDesktop && <TwinklingDotsBackground />}

              {/* Bold Branding Section */}
              <View style={{ alignItems: 'flex-start', marginBottom: 50, zIndex: 1, maxWidth: 550 }}>
                {/* Logo */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 5,
                  marginLeft: -40,
                }}>
                  <View style={{
                    width: 120,
                    height: 120,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: -30,
                  }}>
                    <Image
                      source={require('../assets/taalomy-white-txt.png')}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={{
                    fontSize: 72,
                    fontWeight: '800',
                    color: '#ecf0f1',
                    letterSpacing: -1,
                  }}>aalomy</Text>
                </View>

                {/* Power Tag */}
                <View style={{
                  backgroundColor: 'rgba(52, 152, 219, 0.15)',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: 'rgba(52, 152, 219, 0.3)',
                  marginBottom: 24,
                }}>
                  <Text style={{
                    fontSize: 13,
                    color: '#3498db',
                    fontWeight: '600',
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}>Lecturer Portal</Text>
                </View>

                {/* Main Headline */}
                <Text style={{
                  fontSize: 48,
                  fontWeight: '800',
                  color: '#ffffff',
                  lineHeight: 56,
                  marginBottom: 20,
                  letterSpacing: -0.5,
                }}>
                  Empower Your{'\n'}
                  <Text style={{ color: '#3498db' }}>Teaching Journey</Text>
                </Text>

                {/* Subheadline */}
                <Text style={{
                  fontSize: 18,
                  color: '#95a5a6',
                  lineHeight: 28,
                  marginBottom: 40,
                  maxWidth: 480,
                }}>
                  A comprehensive platform designed to streamline your academic workflow and enhance student engagement.
                </Text>

                {/* Value Props - Bold Grid */}
                <View style={{ width: '100%' }}>
                  {[
                    {
                      icon: 'flash',
                      title: 'Instant Insights',
                      desc: 'Real-time analytics and performance tracking'
                    },
                    {
                      icon: 'people',
                      title: 'Student-Centric',
                      desc: 'Manage classes and connect seamlessly'
                    },
                    {
                      icon: 'rocket',
                      title: 'Boost Productivity',
                      desc: 'Organize schedules and automate workflows'
                    },
                  ].map((item, index) => (
                    <View key={index} style={{
                      marginBottom: 20,
                      paddingLeft: 20,
                      borderLeftWidth: 2,
                      borderLeftColor: index === 0 ? '#3498db' : 'rgba(52, 152, 219, 0.3)',
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <Ionicons
                          name={item.icon as any}
                          size={20}
                          color={index === 0 ? '#3498db' : '#7f8c8d'}
                          style={{ marginRight: 10 }}
                        />
                        <Text style={{
                          fontSize: 17,
                          fontWeight: '700',
                          color: '#ecf0f1',
                        }}>{item.title}</Text>
                      </View>
                      <Text style={{
                        fontSize: 14,
                        color: '#95a5a6',
                        lineHeight: 20,
                        paddingLeft: 30,
                      }}>{item.desc}</Text>
                    </View>
                  ))}
                </View>

                {/* Trust Badge */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 30,
                  paddingTop: 30,
                  borderTopWidth: 1,
                  borderTopColor: 'rgba(255, 255, 255, 0.1)',
                  width: '100%',
                }}>
                  <Ionicons name="shield-checkmark" size={22} color="#2ecc71" />
                  <Text style={{
                    fontSize: 13,
                    color: '#7f8c8d',
                    marginLeft: 10,
                    fontWeight: '500',
                  }}>
                    Trusted by educators • Secure & Reliable
                  </Text>
                </View>
              </View>
            </View>

            {/* Right Form Section */}
            <View style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 60,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
            }}>
              <ScrollView
                style={{ flex: 1, width: '100%' }}
                contentContainerStyle={{
                  flexGrow: 1,
                  justifyContent: 'center',
                  maxWidth: 480,
                  alignSelf: 'center',
                  width: '100%',
                }}
                showsVerticalScrollIndicator={false}
              >
                {/* Login Form - Optimized for Web */}
                <View style={{ paddingVertical: 60, paddingHorizontal: 20 }}>
                  {/* Header */}
                  <View style={{ marginBottom: 48 }}>
                    <Text style={{
                      fontSize: 32,
                      fontWeight: '800',
                      color: '#ffffff',
                      marginBottom: 10,
                      letterSpacing: -0.5,
                    }}>{t('welcome_back')}</Text>
                    <Text style={{
                      fontSize: 16,
                      color: '#95a5a6',
                      fontWeight: '400',
                    }}>{t('access_lecturer_portal')}</Text>
                  </View>

                  {/* Email Input */}
                  <View style={{ marginBottom: 24 }}>
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: '#ecf0f1',
                      marginBottom: 10,
                    }}>{t('email_address')}</Text>
                    <TextInput
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: 10,
                        paddingHorizontal: 20,
                        paddingVertical: 18,
                        fontSize: 16,
                        color: '#ecf0f1',
                        borderWidth: 2,
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        textAlign: i18n.language === 'ar' ? 'right' : 'left',
                        outlineStyle: 'none',
                      } as any}
                      placeholder={t('enter_institutional_email')}
                      placeholderTextColor="#6c7a89"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!isLoading}
                    />
                  </View>

                  {/* Password Input */}
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: '#ecf0f1',
                      marginBottom: 10,
                    }}>{t('password')}</Text>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                    }}>
                      <TextInput
                        style={{
                          flex: 1,
                          paddingHorizontal: 20,
                          paddingVertical: 18,
                          fontSize: 16,
                          color: '#ecf0f1',
                          textAlign: i18n.language === 'ar' ? 'right' : 'left',
                          outlineStyle: 'none',
                        } as any}
                        placeholder={t('enter_password')}
                        placeholderTextColor="#6c7a89"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        editable={!isLoading}
                      />
                      <TouchableOpacity
                        style={{
                          paddingHorizontal: 18,
                          paddingVertical: 18,
                        }}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Ionicons
                          name={showPassword ? "eye-off-outline" : "eye-outline"}
                          size={22}
                          color="#95a5a6"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Forgot Password Link */}
                  <TouchableOpacity
                    style={{ alignSelf: 'flex-end', marginBottom: 32 }}
                    onPress={() => router.push('/auth/forgot-password')}
                  >
                    <Text style={{
                      fontSize: 14,
                      color: '#3498db',
                      fontWeight: '600',
                    }}>{t('forgot_password')}</Text>
                  </TouchableOpacity>

                  {/* Login Button */}
                  <TouchableOpacity
                    style={{
                      borderRadius: 10,
                      overflow: 'hidden',
                      marginBottom: 24,
                      opacity: isLoading ? 0.6 : 1,
                      shadowColor: '#3498db',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 12,
                      elevation: 8,
                    }}
                    onPress={handleLogin}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={isLoading ? ['#555', '#666'] : ['#3498db', '#2980b9']}
                      style={{
                        paddingVertical: 20,
                        alignItems: 'center',
                      }}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={{
                        fontSize: 17,
                        fontWeight: '700',
                        color: '#fff',
                        letterSpacing: 0.3,
                      }}>
                        {isLoading ? t('authenticating_status') : t('sign_in')}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Divider */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginVertical: 28,
                  }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />
                    <Text style={{
                      color: '#7f8c8d',
                      paddingHorizontal: 16,
                      fontSize: 13,
                      fontWeight: '500',
                    }}>{t('or_continue_with')}</Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />
                  </View>

                  {/* Google Sign In */}
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: 12,
                      paddingVertical: 16,
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                      marginBottom: 20,
                      opacity: isLoading ? 0.6 : 1,
                    }}
                    onPress={() => promptAsync()}
                    disabled={!request || isLoading}
                    activeOpacity={0.8}
                  >
                    <View style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: 'rgba(52, 152, 219, 0.3)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginEnd: 12,
                    }}>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#3498db' }}>G</Text>
                    </View>
                    <Text style={{
                      fontSize: 15,
                      fontWeight: '600',
                      color: '#bdc3c7',
                    }}>
                      {isLoading ? t('authenticating_status') : t('google_workspace')}
                    </Text>
                  </TouchableOpacity>

                  {/* Forgot Password Link */}
                  <TouchableOpacity
                    style={{
                      alignItems: 'center',
                      marginBottom: 16,
                    }}
                    onPress={() => router.push('/auth/forgot-password')}
                  >
                    <Text style={{
                      fontSize: 13,
                      color: '#3498db',
                      fontWeight: '600',
                    }}>{t('forgot_password')}</Text>
                  </TouchableOpacity>

                  {/* Register Link */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingTop: 20,
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(255, 255, 255, 0.1)',
                  }}>
                    <Text style={{
                      fontSize: 14,
                      color: '#95a5a6',
                      marginRight: 6,
                    }}>{t('new_lecturer_question')}</Text>
                    <TouchableOpacity
                      onPress={() => router.push('/register')}
                      disabled={isLoading}
                    >
                      <Text style={{
                        fontSize: 14,
                        color: '#3498db',
                        fontWeight: '700',
                      }}>{t('register_action')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View >
        ) : (
          // Mobile/Tablet Layout
          <ScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingTop: Platform.OS === 'ios' ? 60 : 40,
              paddingBottom: Platform.OS === 'ios' ? 40 : 60
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* University Branding */}
            <View style={{
              alignItems: 'center',
              marginBottom: 30,
              marginTop: Platform.OS === 'ios' ? 20 : 40,
            }}>
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
                fontSize: 16,
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
              }}>{t('academic_management_system')}</Text>
            </View>

            {/* Professional Login Card */}
            <View style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 16,
              padding: 24,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.1)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 8,
            }}>
              <View style={{ marginBottom: 24 }}>
                <Text style={{
                  fontSize: 22,
                  fontWeight: '600',
                  color: '#ecf0f1',
                  textAlign: 'center',
                  marginBottom: 8,
                }}>{t('welcome_back')}</Text>
                <Text style={{
                  fontSize: 14,
                  color: '#95a5a6',
                  textAlign: 'center',
                  fontWeight: '400',
                }}>{t('access_lecturer_portal')}</Text>
              </View>

              {/* Email Input */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: '#bdc3c7',
                  marginBottom: 6,
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
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isLoading}
                />
              </View>

              {/* Password Input */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: '#bdc3c7',
                  marginBottom: 6,
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
                    placeholder={t('enter_password')}
                    placeholderTextColor="#666"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 14,
                    }}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#95a5a6"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={{
                  borderRadius: 12,
                  overflow: 'hidden',
                  marginBottom: 16,
                  opacity: isLoading ? 0.6 : 1,
                }}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={isLoading ? ['#444', '#555'] : ['#2c3e50', '#34495e']}
                  style={{
                    paddingVertical: 16,
                    alignItems: 'center',
                  }}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#ecf0f1',
                    letterSpacing: 1,
                  }}>
                    {isLoading ? t('authenticating_status') : t('sign_in')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Professional Divider */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginVertical: 16,
              }}>
                <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
                <Text style={{
                  color: '#95a5a6',
                  paddingHorizontal: 12,
                  fontSize: 11,
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}>{t('or_continue_with')}</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
              </View>

              {/* Google Sign In */}
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
                  marginBottom: 16,
                  opacity: isLoading ? 0.6 : 1,
                }}
                onPress={() => promptAsync()}
                disabled={!request || isLoading}
                activeOpacity={0.8}
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
                  {isLoading ? t('authenticating_status') : t('google_workspace')}
                </Text>
              </TouchableOpacity>

              {/* Forgot Password Link */}
              <TouchableOpacity
                style={{
                  alignItems: 'center',
                  marginBottom: 8,
                }}
                onPress={() => router.push('/auth/forgot-password')}
              >
                <Text style={{
                  fontSize: 12,
                  color: '#3498db',
                  fontWeight: '500',
                }}>{t('forgot_password')}</Text>
              </TouchableOpacity>
            </View>

            {/* Register Link */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}>
              <Text style={{
                fontSize: 14,
                color: '#95a5a6',
              }}>{t('new_lecturer_question')}</Text>
              <TouchableOpacity
                onPress={() => router.push('/register')}
                disabled={isLoading}
              >
                <Text style={{
                  fontSize: 14,
                  color: '#3498db',
                  fontWeight: '600',
                }}>{t('register_action')}</Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={{ alignItems: 'center', marginTop: 10 }}>
              <Text style={{
                fontSize: 11,
                color: '#7f8c8d',
                marginBottom: 2,
              }}>{t('copyright_footer')}</Text>
              <Text style={{
                fontSize: 9,
                color: '#7f8c8d',
                fontWeight: '300',
              }}>{t('secure_reliable_professional')}</Text>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView >
    </View >
  );
};

export default Login;
