import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { tokenStorage } from '../../utils/tokenStorage';
import { router } from 'expo-router';

// Use environment variables for API URL
const API_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!API_URL) {
  console.warn('Missing EXPO_PUBLIC_API_BASE_URL environment variable');
}

export const API_CONFIG = {
  ROOT_URL: API_URL,
  BASE_URL: `${API_URL}/api`,
  ACCOUNTS_BASE_URL: `${API_URL}/accounts/`,
  CHAT_BASE_URL: `${API_URL}/chat/`,
  VIDEOS_BASE_URL: `${API_URL}/videos/`,
  TIMEOUT: 15000, // 15 seconds
  ENDPOINTS: {
    LOGIN: 'api/token/',
    REGISTER: 'users/',
    REFRESH_TOKEN: 'token/refresh/',
    USER_PROFILE: 'users/me/',
    INTAKES: 'intakes/',
    CLASSES: 'classes/',
    GROUPS: 'student-groups/',
    LECTURER_BOOKINGS: 'lecturer-bookings/',
    VERIFICATION_REQUEST: 'lecturer/verification-requests/',
    BANK_DETAILS: 'lecturer-bank-details/',
    NOTIFICATIONS: 'notifications/',
    WALLET: 'wallet/',
    SUPPORT_TICKETS: 'support-tickets/',
    PROFILE_PICTURE: 'users/profile-picture/',
  }
};

// Helper function to get full URL for any endpoint
export const getApiUrl = (endpoint: string) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function to get full URL for video endpoints
export const getVideosUrl = (endpoint: string = '') => {
  return `${API_CONFIG.VIDEOS_BASE_URL}${endpoint}`;
};

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_CONFIG.ACCOUNTS_BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Network Helper for Logging (Dev only)
const logNetworkRequest = (config: InternalAxiosRequestConfig) => {
  if (__DEV__) {
    // Simplified logging - avoiding sensitive data dumps
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
  }
};

// Request Interceptor
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    logNetworkRequest(config);

    // Check if it's a chat endpoint and switch baseURL if needed
    if (config.url?.startsWith('chat/') || config.url?.startsWith('rooms/') || config.url?.startsWith('messages/')) {
      config.baseURL = API_CONFIG.CHAT_BASE_URL;
    } else if (config.url?.startsWith('ai-assistant/')) {
      config.baseURL = API_CONFIG.BASE_URL;
    }

    const token = await tokenStorage.getItem('access_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized (Token Expiry)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await tokenStorage.getItem('refresh_token');

        if (!refreshToken) {
          // No refresh token, force logout
          await tokenStorage.clearAuth();
          router.replace('/login');
          return new Promise(() => { }); // Halt execution
        }

        // Try to refresh the token using the dedicated networkApi (to avoid circular interceptors)
        const refreshResponse = await axios.post(`${API_CONFIG.ACCOUNTS_BASE_URL}api/token/refresh/`, {
          refresh: refreshToken
        });

        const { access } = refreshResponse.data;

        // Save new token
        await tokenStorage.setItem('access_token', access);

        // Retry original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access}`;
        }

        // Retry the call using the ORIGINAL axios instance (api)
        return api(originalRequest);

      } catch (refreshError) {
        // Refresh failed (token expired or invalid)
        console.error('[API] Session expired. Please log in again.');
        await tokenStorage.clearAuth();

        // Redirect to login
        router.replace('/login');
        return new Promise(() => { }); // Halt execution
      }
    }

    // Log helpful error messages
    if (error.response) {
      // Server responded with a status code outside 2xx
      if (__DEV__) console.warn(`[API Error] ${error.response.status} - ${error.config?.url}`, error.response.data);
    } else if (error.request) {
      // Request sent but no response
      console.warn('[API Peer Error] No response received. Check network.');
    } else {
      console.warn('[API Config Error]', error.message);
    }

    return Promise.reject(error);
  }
);

export default api;