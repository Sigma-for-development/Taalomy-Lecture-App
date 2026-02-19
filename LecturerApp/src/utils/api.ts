import axios from 'axios';
import { router } from 'expo-router';
import { tokenStorage } from '../../utils/tokenStorage';
import { API_CONFIG } from '../config/api';
const AsyncStorage = tokenStorage;

// Create axios instance with base configuration for accounts
const api = axios.create({
  baseURL: API_CONFIG.ACCOUNTS_BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
});

// Create axios instance with base configuration for chat
const chatApi = axios.create({
  baseURL: API_CONFIG.CHAT_BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
});

// Request interceptor to add auth token for accounts API
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

// Request interceptor to add auth token for chat API
chatApi.interceptors.request.use(
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

// Response interceptor to handle token refresh for accounts API
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // If this was a retry (meaning refresh succeeded but request still failed), force logout
      if (originalRequest._retry) {
        console.warn('[API] Retry failed with 401. Forcing logout.');
        await AsyncStorage.clearAuth(); // Assuming clearAuth exists on wrapper, or use individual removeItems
        if (!AsyncStorage.clearAuth) {
          await AsyncStorage.removeItem('access_token');
          await AsyncStorage.removeItem('refresh_token');
          await AsyncStorage.removeItem('user_data');
        }
        router.replace('/login');
        return new Promise(() => { });
      }

      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (!refreshToken) {
          console.warn('[API] No refresh token found. Redirecting.');
          await AsyncStorage.removeItem('access_token');
          await AsyncStorage.removeItem('refresh_token');
          await AsyncStorage.removeItem('user_data');
          router.replace('/login');
          return new Promise(() => { });
        }

        console.log('[API] Attempting token refresh...');
        const response = await axios.post(`${API_CONFIG.ACCOUNTS_BASE_URL}api/token/refresh/`, {
          refresh: refreshToken
        });

        console.log('[API] Refresh successful.');
        const { access } = response.data;
        await AsyncStorage.setItem('access_token', access);

        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);

      } catch (refreshError) {
        console.error('[API] Token refresh failed:', refreshError);
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('refresh_token');
        await AsyncStorage.removeItem('user_data');

        router.replace('/login');
        return new Promise(() => { });
      }
    }

    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh for chat API
chatApi.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401
    if (error.response?.status === 401) {
      if (originalRequest._retry) {
        console.warn('[ChatAPI] Retry failed with 401. Forcing logout.');
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('refresh_token');
        await AsyncStorage.removeItem('user_data');
        router.replace('/login');
        return new Promise(() => { });
      }

      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (!refreshToken) {
          await AsyncStorage.removeItem('access_token');
          await AsyncStorage.removeItem('refresh_token');
          await AsyncStorage.removeItem('user_data');
          router.replace('/login');
          return new Promise(() => { });
        }

        const response = await axios.post(`${API_CONFIG.ACCOUNTS_BASE_URL}api/token/refresh/`, {
          refresh: refreshToken
        });

        const { access } = response.data;
        await AsyncStorage.setItem('access_token', access);

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return chatApi(originalRequest);
      } catch (refreshError) {
        console.error('[ChatAPI] Refresh failed:', refreshError);
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('refresh_token');
        await AsyncStorage.removeItem('user_data');

        router.replace('/login');
        return new Promise(() => { });
      }
    }

    return Promise.reject(error);
  }
);

// Lecturer-specific API endpoints
export const lecturerAPI = {
  // User & Dashboard
  getUserProfile: () => api.get('users/me/'),
  getDashboardStats: () => api.get('lecturer/dashboard-stats/'),
  getUnreadCount: () => chatApi.get('unread-count/'),

  // Lecturer Hub
  getLecturerDirectory: (params?: any) => api.get('lecturer-directory/', { params }),
  getLecturerDetails: (id: number) => api.get(`lecturer-directory/${id}/`),
  updatePrivacySettings: (data: any) => api.patch('privacy-settings/update/', data), // Check if url is correct, previously assumed ViewSet default

  // Intake management
  getIntakes: () => api.get('/lecturer/intakes/'),
  getIntake: (intakeId: string) => api.get(`/lecturer/intakes/${intakeId}/`),
  createIntake: (intakeData: any) => api.post('/lecturer/intakes/', intakeData),
  updateIntake: (intakeId: string, intakeData: any) => api.put(`/lecturer/intakes/${intakeId}/`, intakeData),
  deleteIntake: (intakeId: string) => api.delete(`/lecturer/intakes/${intakeId}/`),

  // Intake students
  getIntakeStudents: (intakeId: string) => api.get(`/lecturer/intakes/${intakeId}/students/`),
  inviteStudentToIntake: (intakeId: string, inviteData: any) => api.post(`/lecturer/intakes/${intakeId}/invite/`, inviteData),
  removeStudentFromIntake: (intakeId: string, studentId: string) => api.delete(`/lecturer/intakes/${intakeId}/students/${studentId}/remove/`),

  // Class students
  getClassStudents: (classId: string) => api.get(`/lecturer/classes/${classId}/students/`),
  inviteStudentToClass: (classId: string, inviteData: any) => api.post(`/lecturer/classes/${classId}/invite/`, inviteData),
  removeStudentFromClass: (classId: string, studentId: string) => api.delete(`/lecturer/classes/${classId}/students/${studentId}/remove/`),

  // Group students
  inviteStudentToGroup: (groupId: string, inviteData: any) => api.post(`/lecturer/groups/${groupId}/invite/`, inviteData),
  getGroupStudents: (groupId: string) => api.get(`/lecturer/groups/${groupId}/enrolled-students/`),

  // Class management
  getClasses: () => api.get('/lecturer/classes/'),
  getClass: (classId: string) => api.get(`/lecturer/classes/${classId}/`),
  createClass: (classData: any) => api.post('/lecturer/classes/', classData),
  updateClass: (classId: string, classData: any) => api.put(`/lecturer/classes/${classId}/`, classData),
  deleteClass: (classId: string) => api.delete(`/lecturer/classes/${classId}/`),

  // Group management
  getGroups: () => api.get('/lecturer/groups/'),
  getGroup: (groupId: string) => api.get(`/lecturer/groups/${groupId}/`),
  createGroup: (groupData: any) => api.post('/lecturer/groups/', groupData),
  updateGroup: (groupId: string, groupData: any) => api.put(`/lecturer/groups/${groupId}/`, groupData),
  deleteGroup: (groupId: string) => api.delete(`/lecturer/groups/${groupId}/`),

  // Class groups
  getClassGroups: (classId: string) => api.get(`/lecturer/classes/${classId}/groups/`),

  // Intake classes
  getIntakeClasses: (intakeId: string) => api.get(`/lecturer/intakes/${intakeId}/classes/`),

  // Chat management
  getChatRooms: () => chatApi.get('rooms/'),
  getChatRoom: (roomId: string) => chatApi.get(`rooms/${roomId}/`),
  createChatRoom: (roomData: any) => chatApi.post('rooms/', roomData),
  updateChatRoom: (roomId: string, roomData: any) => chatApi.put(`rooms/${roomId}/`, roomData),
  deleteChatRoom: (roomId: string) => chatApi.delete(`rooms/${roomId}/`),

  // Chat messages
  getChatMessages: (roomId: string) => chatApi.get(`rooms/${roomId}/messages/`),
  sendMessage: (roomId: string, messageData: any) => chatApi.post(`rooms/${roomId}/messages/`, messageData),
  updateMessage: (roomId: string, messageId: string, messageData: any) => chatApi.put(`rooms/${roomId}/messages/${messageId}/`, messageData),
  deleteMessage: (roomId: string, messageId: string) => chatApi.delete(`rooms/${roomId}/messages/${messageId}/`),

  // Class and Group chats
  getClassChat: (classId: string) => chatApi.get(`classes/${classId}/chat/`),
  getGroupChat: (groupId: string) => chatApi.get(`groups/${groupId}/chat/`),

  // Grading
  getPendingGrades: () => api.get('/lecturer/pending-grades/'),

  // Bookings
  getBookings: () => api.get('lecturer/bookings/'),
  bookingAction: (id: number, data: any) => api.patch(`lecturer/bookings/${id}/action/`, data),
};

export const chatAPI = {
  createOrGetChat: (userId: number) => chatApi.get(`direct-messages/${userId}/`),
  sendMessage: (roomId: string, message: string) => chatApi.post(`rooms/${roomId}/messages/`, { content: message }),
  getMessages: (roomId: string) => chatApi.get(`rooms/${roomId}/messages/`),
};

export default api;