import * as ImagePicker from 'expo-image-picker';
import { tokenStorage } from '../../utils/tokenStorage';
import { API_CONFIG } from '../config/api';
import { appEventEmitter } from './eventEmitter';
const AsyncStorage = tokenStorage;

export const pickImage = async (): Promise<string | null> => {
  try {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to make this work!');
      return null;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      return result.assets[0].uri;
    }

    return null;
  } catch (error) {
    console.error('Error picking image:', error);
    return null;
  }
};

export const takePhoto = async (): Promise<string | null> => {
  try {
    // Request permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera permissions to make this work!');
      return null;
    }

    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      return result.assets[0].uri;
    }

    return null;
  } catch (error) {
    console.error('Error taking photo:', error);
    return null;
  }
};

export const uploadProfilePicture = async (imageUri: string, onProgress?: (progress: number) => void): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token found');
    }

    // Create form data
    const formData = new FormData();
    formData.append('profile_picture', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'profile_picture.jpg',
    } as any);

    // Upload to server
    const response = await fetch(`${API_CONFIG.ACCOUNTS_BASE_URL}${API_CONFIG.ENDPOINTS.PROFILE_PICTURE}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Note: Don't set Content-Type for FormData, let browser set it with boundary
      },
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Upload response:', data);
      // Handle both profile_picture_url and profile_picture fields
      let profilePictureUrl = data.profile_picture_url || data.profile_picture;

      // If the URL is relative, make it absolute
      if (profilePictureUrl && !profilePictureUrl.startsWith('http')) {
        // Handle both absolute paths and relative paths
        if (profilePictureUrl.startsWith('/')) {
          profilePictureUrl = `${API_CONFIG.BASE_URL}${profilePictureUrl}`;
        } else {
          const fullUrl = `${API_CONFIG.BASE_URL}/${profilePictureUrl}`;
          console.log('Constructed full URL:', fullUrl);
          return fullUrl;
        }
      }
      console.log('Using provided URL:', profilePictureUrl);
      return profilePictureUrl;
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload profile picture');
    }
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    throw error;
  }
};

// Function to refresh user data across the app
export const refreshUserData = async (updatedUserData: any) => {
  try {
    // Update AsyncStorage
    await AsyncStorage.setItem('user_data', JSON.stringify(updatedUserData));

    // Emit an event to notify other components
    appEventEmitter.emit('userProfileUpdated', updatedUserData);

    return true;
  } catch (error) {
    console.error('Error refreshing user data:', error);
    return false;
  }
};

// Function to fetch the latest user data from the server
export const fetchUserDataFromServer = async () => {
  try {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token found');
    }

    // Get user ID from stored user data
    const userDataString = await AsyncStorage.getItem('user_data');
    if (!userDataString) {
      throw new Error('No user data found in storage');
    }

    const currentUserData = JSON.parse(userDataString);
    const userId = currentUserData.id;

    if (!userId) {
      throw new Error('User ID not found in stored user data');
    }

    // Fetch latest user data from server
    const response = await fetch(`${API_CONFIG.BASE_URL}/accounts/users/${userId}/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const userData = await response.json();

      // Ensure profile_picture_url is properly set
      if (userData.profile_picture && !userData.profile_picture_url) {
        userData.profile_picture_url = userData.profile_picture;
      } else if (!userData.profile_picture && !userData.profile_picture_url) {
        userData.profile_picture_url = null;
      }

      // If the URL is relative, make it absolute
      if (userData.profile_picture_url && !userData.profile_picture_url.startsWith('http')) {
        // Handle both absolute paths and relative paths
        if (userData.profile_picture_url.startsWith('/')) {
          userData.profile_picture_url = `${API_CONFIG.BASE_URL}${userData.profile_picture_url}`;
        } else {
          userData.profile_picture_url = `${API_CONFIG.BASE_URL}/${userData.profile_picture_url}`;
        }
      }

      // Update AsyncStorage with latest data
      await AsyncStorage.setItem('user_data', JSON.stringify(userData));

      // Emit event to notify other components
      appEventEmitter.emit('userProfileUpdated', userData);

      return userData;
    } else {
      throw new Error('Failed to fetch user data from server');
    }
  } catch (error) {
    console.error('Error fetching user data from server:', error);
    throw error;
  }
};

export const showImagePickerOptions = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    // In a real app, you'd show an action sheet here
    // For now, we'll just pick from library
    pickImage().then(resolve);
  });
};