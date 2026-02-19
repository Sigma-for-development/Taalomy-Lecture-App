import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

type StorageKey = 'access_token' | 'refresh_token' | 'user_data' | 'user_settings' | 'user_region' | 'user-language' | 'welcome_dismissed' | 'has_seen_onboarding' | 'system_zoom_level';

/**
 * Robust token storage that handles platform differences (Web vs Native)
 * Native: Uses Expo SecureStore (Encrypted)
 * Web: Uses localStorage (Standard)
 */
export const tokenStorage = {
    /**
     * Save an item to secure storage
     */
    setItem: async (key: StorageKey, value: string): Promise<void> => {
        try {
            if (Platform.OS === 'web') {
                if (typeof window !== 'undefined') {
                    localStorage.setItem(key, value);
                }
            } else {
                await SecureStore.setItemAsync(key, value);
            }
        } catch (error) {
            console.error(`[tokenStorage] Error setting ${key}:`, error);
            throw error;
        }
    },

    /**
     * Get an item from secure storage
     */
    getItem: async (key: StorageKey): Promise<string | null> => {
        try {
            if (Platform.OS === 'web') {
                if (typeof window !== 'undefined') {
                    return localStorage.getItem(key);
                }
                return null;
            } else {
                return await SecureStore.getItemAsync(key);
            }
        } catch (error) {
            console.error(`[tokenStorage] Error getting ${key}:`, error);
            return null;
        }
    },

    /**
     * Remove an item from secure storage
     */
    removeItem: async (key: StorageKey): Promise<void> => {
        try {
            if (Platform.OS === 'web') {
                if (typeof window !== 'undefined') {
                    localStorage.removeItem(key);
                }
            } else {
                await SecureStore.deleteItemAsync(key);
            }
        } catch (error) {
            console.error(`[tokenStorage] Error removing ${key}:`, error);
        }
    },

    /**
     * Clear all auth tokens (Logout)
     */
    clearAuth: async (): Promise<void> => {
        await tokenStorage.removeItem('access_token');
        await tokenStorage.removeItem('refresh_token');
        await tokenStorage.removeItem('user_data');
    }
};
