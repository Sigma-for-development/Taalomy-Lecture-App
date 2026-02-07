import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Switch,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    StatusBar
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { tokenStorage } from '../utils/tokenStorage';
const AsyncStorage = tokenStorage;
import { API_CONFIG } from '../src/config/api';
import { useTranslation } from 'react-i18next';

interface NotificationSettingsData {
    id?: number;
    intake_invites: boolean;
    class_invites: boolean;
    group_invites: boolean;
    chat_messages: boolean;
    quiz_published: boolean;
    all_notifications: boolean;
}

export default function NotificationSettings() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [settings, setSettings] = useState<NotificationSettingsData>({
        intake_invites: true,
        class_invites: true,
        group_invites: true,
        chat_messages: true,
        quiz_published: true,
        all_notifications: true,
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) return;

            const response = await axios.get(`${API_CONFIG.ACCOUNTS_BASE_URL}notification-settings/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (Array.isArray(response.data) && response.data.length > 0) {
                setSettings(response.data[0]);
            } else if (response.data && !Array.isArray(response.data)) {
                setSettings(response.data);
            }
        } catch (error) {
            console.error('Error loading notification settings:', error);
            Toast.show({
                type: 'error',
                text1: t('error_notification_load_title'),
                text2: t('error_notification_load_msg')
            });
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = async (key: string, value: boolean) => {
        // Optimistic update
        const oldSettings = { ...settings };
        const newSettings = { ...settings, [key]: value };

        // If toggling all_notifications, update local state immediately
        if (key === 'all_notifications') {
            // If turning off, just turn off main switch
            // If turning on, keep individual settings as is
        }

        setSettings(newSettings);
        setUpdating(true);

        try {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) return;

            let response;
            if (settings.id) {
                response = await axios.patch(
                    `${API_CONFIG.ACCOUNTS_BASE_URL}notification-settings/${settings.id}/`,
                    { [key]: value },
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );
            } else {
                response = await axios.post(
                    `${API_CONFIG.ACCOUNTS_BASE_URL}notification-settings/`,
                    { ...newSettings },
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );
            }

            if (response.data) {
                setSettings(response.data);
                Toast.show({
                    type: 'success',
                    text1: t('success_notification_save_title'),
                    text2: t('success_notification_save_msg')
                });
            }
        } catch (error) {
            console.error('Error updating notification settings:', error);
            Toast.show({
                type: 'error',
                text1: t('error_notification_update_title'),
                text2: t('error_notification_update_msg')
            });
            setSettings(oldSettings);
        } finally {
            setUpdating(false);
        }
    };

    const SettingItem = ({ label, description, value, onValueChange, disabled = false }: { label: string, description?: string, value: boolean, onValueChange: (val: boolean) => void, disabled?: boolean }) => (
        <View style={[styles.settingItem, disabled && styles.disabledItem]}>
            <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, disabled && styles.disabledText]}>{label}</Text>
                {description && <Text style={[styles.settingDescription, disabled && styles.disabledText]}>{description}</Text>}
            </View>
            <Switch
                trackColor={{ false: '#3e3e3e', true: '#3498db' }}
                thumbColor={value ? '#fff' : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
                onValueChange={onValueChange}
                value={value}
                disabled={disabled}
            />
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3498db" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <LinearGradient
                colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
                style={styles.backgroundGradient}
            />

            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: t('notification_settings_title'),
                    headerStyle: { backgroundColor: '#0a0a0a' },
                    headerTintColor: '#fff',
                    headerBackTitle: t('back'),
                }}
            />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('notification_general_section')}</Text>
                    <SettingItem
                        label={t('notification_allow_label')}
                        description={t('notification_allow_desc')}
                        value={settings.all_notifications}
                        onValueChange={(val) => updateSetting('all_notifications', val)}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('notification_invites_section')}</Text>
                    <SettingItem
                        label={t('notification_intake_invites_label')}
                        value={settings.intake_invites}
                        onValueChange={(val) => updateSetting('intake_invites', val)}
                        disabled={!settings.all_notifications}
                    />
                    <SettingItem
                        label={t('notification_class_invites_label')}
                        value={settings.class_invites}
                        onValueChange={(val) => updateSetting('class_invites', val)}
                        disabled={!settings.all_notifications}
                    />
                    <SettingItem
                        label={t('notification_group_invites_label')}
                        value={settings.group_invites}
                        onValueChange={(val) => updateSetting('group_invites', val)}
                        disabled={!settings.all_notifications}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('notification_activity_section')}</Text>
                    <SettingItem
                        label={t('notification_chat_messages_label')}
                        description={t('notification_chat_messages_desc')}
                        value={settings.chat_messages}
                        onValueChange={(val) => updateSetting('chat_messages', val)}
                        disabled={!settings.all_notifications}
                    />
                    <SettingItem
                        label={t('notification_quiz_published_label')}
                        description={t('notification_quiz_published_desc')}
                        value={settings.quiz_published}
                        onValueChange={(val) => updateSetting('quiz_published', val)}
                        disabled={!settings.all_notifications}
                    />
                </View>

                <TouchableOpacity
                    style={styles.enableButton}
                    onPress={() => Toast.show({
                        type: 'info',
                        text1: t('notification_troubleshoot_title'),
                        text2: t('notification_troubleshoot_msg')
                    })}
                >
                    <Text style={styles.enableButtonText}>{t('button_troubleshoot')}</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

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
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0a0a0a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 20,
    },
    section: {
        marginBottom: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#3498db',
        marginBottom: 15,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    disabledItem: {
        opacity: 0.5,
    },
    settingInfo: {
        flex: 1,
        marginEnd: 15,
    },
    settingLabel: {
        fontSize: 16,
        color: '#ecf0f1',
        fontWeight: '500',
        marginBottom: 4,
    },
    settingDescription: {
        fontSize: 12,
        color: '#95a5a6',
    },
    disabledText: {
        color: '#7f8c8d',
    },
    enableButton: {
        marginTop: 10,
        padding: 15,
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(52, 152, 219, 0.3)',
    },
    enableButtonText: {
        color: '#3498db',
        fontWeight: '600',
    },
});
