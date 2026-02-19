import axios from 'axios';
import { tokenStorage } from '../../utils/tokenStorage';
import { API_CONFIG } from '../config/api';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
const AsyncStorage = tokenStorage;

const api = axios.create({
    baseURL: API_CONFIG.ACCOUNTS_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor for adding the authentication token
api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for handling token refresh and 401 errors
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Prevent infinite loops
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = await AsyncStorage.getItem('refresh_token');

                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }

                const response = await axios.post(`${API_CONFIG.ACCOUNTS_BASE_URL}token/refresh/`, {
                    refresh: refreshToken,
                });

                if (response.status === 200) {
                    const { access } = response.data;

                    await AsyncStorage.setItem('access_token', access);

                    // Retry the original request with the new token
                    originalRequest.headers.Authorization = `Bearer ${access}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                // If refresh fails, redirect to login
                console.error('Token refresh failed:', refreshError);

                await AsyncStorage.removeItem('access_token');
                await AsyncStorage.removeItem('refresh_token');
                await AsyncStorage.removeItem('user_data');

                Toast.show({
                    type: 'error',
                    text1: 'Session Expired',
                    text2: 'Please login again to continue.',
                    visibilityTime: 4000,
                });

                router.replace('/login');
                return Promise.reject(refreshError);
            }
        }

        // If it's not a 401 or retry failed, reject
        return Promise.reject(error);
    }
);

export default api;
