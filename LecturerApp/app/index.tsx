import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ActivityIndicator, Image } from 'react-native';
import { Redirect } from "expo-router";
import { tokenStorage } from '../utils/tokenStorage';
const AsyncStorage = tokenStorage;
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_CONFIG } from '../src/config/api';

export default function Index() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const validateToken = async (accessToken: string) => {
    try {
      // Try to make a request to a protected endpoint to validate the token
      const response = await axios.get(`${API_CONFIG.ACCOUNTS_BASE_URL}userID/`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: 5000 // 5 second timeout to prevent hanging
      });
      return response.status === 200;
    } catch (error) {
      console.log('Token validation failed:', error);
      return false;
    }
  };

  const checkLoginStatus = async () => {
    try {
      // Check if access token exists
      const accessToken = await AsyncStorage.getItem('access_token');
      const userData = await AsyncStorage.getItem('user_data');

      if (accessToken && userData) {
        // Validate the token
        const isTokenValid = await validateToken(accessToken);

        if (isTokenValid) {
          // Check if user is a lecturer
          const user = JSON.parse(userData);
          if (user.user_type === 'lecturer') {
            const hasSeenOnboarding = await AsyncStorage.getItem('has_seen_onboarding');
            console.log('Lecturer auto-login successful', { hasSeenOnboarding });

            if (hasSeenOnboarding === 'true') {
              setIsLoggedIn(true);
            } else {
              setIsLoggedIn(true); // Treat as logged in regardless
            }
          } else {
            console.log('User is not a lecturer, clearing storage');
            await AsyncStorage.removeItem('access_token');
            await AsyncStorage.removeItem('refresh_token');
            await AsyncStorage.removeItem('user_data');
            setIsLoggedIn(false);
          }
        } else {
          // Token is invalid, clear storage and redirect to login
          console.log('Token expired, clearing storage');
          await AsyncStorage.removeItem('access_token');
          await AsyncStorage.removeItem('refresh_token');
          await AsyncStorage.removeItem('user_data');
          setIsLoggedIn(false);
        }
      } else {
        // No tokens found, redirect to login
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('Error checking login status:', error);
      // On error, clear storage and redirect to login
      try {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('refresh_token');
        await AsyncStorage.removeItem('user_data');
      } catch (clearError) {
        console.error('Error clearing storage:', clearError);
      }
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
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
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            width: 150,
            height: 150,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}>
            <Image
              source={require('../assets/taalomy-white-txt.png')}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          </View>
          <Text style={{
            fontSize: 24,
            fontWeight: 'bold',
            color: '#ecf0f1',
            marginBottom: 20
          }}>
            {t('app_name')}
          </Text>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={{
            fontSize: 16,
            color: '#bdc3c7',
            marginTop: 20
          }}>
            {t('loading')}
          </Text>
        </View>
      </View>
    );
  }

  if (isLoggedIn) {
    return <Redirect href="/dashboard" />;
  }

  return <Redirect href="/login" />;
}
