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
    Modal,
    StatusBar
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { tokenStorage } from '../utils/tokenStorage';
import { API_CONFIG } from '../src/config/api';
import { useTranslation } from 'react-i18next';
const AsyncStorage = tokenStorage;

interface PrivacySettingsData {
    id?: number;
    profile_visibility: 'everyone' | 'contacts' | 'me';
    show_online_status: boolean;
    read_receipts: boolean;
    group_add_permission: 'everyone' | 'contacts' | 'nobody';
}

export default function PrivacySettings() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [settings, setSettings] = useState<PrivacySettingsData>({
        profile_visibility: 'everyone',
        show_online_status: true,
        read_receipts: true,
        group_add_permission: 'everyone',
    });

    // Modal states
    const [visibilityModalVisible, setVisibilityModalVisible] = useState(false);
    const [groupModalVisible, setGroupModalVisible] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) return;

            const response = await axios.get(`${API_CONFIG.ACCOUNTS_BASE_URL}privacy-settings/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (Array.isArray(response.data) && response.data.length > 0) {
                setSettings(response.data[0]);
            } else if (response.data && !Array.isArray(response.data)) {
                setSettings(response.data);
            }
        } catch (error) {
            console.error('Error loading privacy settings:', error);
            Toast.show({
                type: 'error',
                text1: t('error_privacy_load_title'),
                text2: t('error_privacy_load_msg')
            });
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = async (key: string, value: any) => {
        // Optimistic update
        const oldSettings = { ...settings };
        const newSettings = { ...settings, [key]: value };

        setSettings(newSettings);
        setUpdating(true);

        try {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) return;

            let response;
            if (settings.id) {
                response = await axios.patch(
                    `${API_CONFIG.ACCOUNTS_BASE_URL}privacy-settings/${settings.id}/`,
                    { [key]: value },
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );
            } else {
                response = await axios.post(
                    `${API_CONFIG.ACCOUNTS_BASE_URL}privacy-settings/`,
                    { ...newSettings },
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );
            }

            if (response.data) {
                setSettings(response.data);
                Toast.show({
                    type: 'success',
                    text1: t('success_privacy_save_title'),
                    text2: t('success_privacy_save_msg')
                });
            }
        } catch (error) {
            console.error('Error updating privacy settings:', error);
            Toast.show({
                type: 'error',
                text1: t('error_privacy_update_title'),
                text2: t('error_privacy_update_msg')
            });
            setSettings(oldSettings);
        } finally {
            setUpdating(false);
        }
    };

    const SelectionModal = ({
        visible,
        onClose,
        title,
        options,
        currentValue,
        onSelect
    }: {
        visible: boolean,
        onClose: () => void,
        title: string,
        options: { label: string, value: string }[],
        currentValue: string,
        onSelect: (value: string) => void
    }) => (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>{title}</Text>
                    {options.map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            style={styles.modalOption}
                            onPress={() => {
                                onSelect(option.value);
                                onClose();
                            }}
                        >
                            <Text style={[
                                styles.modalOptionText,
                                currentValue === option.value && styles.selectedOptionText
                            ]}>
                                {option.label}
                            </Text>
                            {currentValue === option.value && (
                                <Ionicons name="checkmark" size={20} color="#3498db" />
                            )}
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>{t('button_cancel')}</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    const SettingItem = ({
        label,
        description,
        value,
        onValueChange,
        type = 'switch',
        displayValue = ''
    }: {
        label: string,
        description?: string,
        value: boolean | string,
        onValueChange: (val: any) => void,
        type?: 'switch' | 'select',
        displayValue?: string
    }) => (
        <TouchableOpacity
            style={styles.settingItem}
            onPress={() => type === 'select' && onValueChange(null)}
            disabled={type === 'switch'}
        >
            <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>{label}</Text>
                {description && <Text style={styles.settingDescription}>{description}</Text>}
            </View>

            {type === 'switch' ? (
                <Switch
                    trackColor={{ false: '#3e3e3e', true: '#3498db' }}
                    thumbColor={value ? '#fff' : '#f4f3f4'}
                    ios_backgroundColor="#3e3e3e"
                    onValueChange={onValueChange}
                    value={value as boolean}
                />
            ) : (
                <View style={styles.selectValueContainer}>
                    <Text style={styles.selectValueText}>{displayValue}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#95a5a6" />
                </View>
            )}
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3498db" />
            </View>
        );
    }

    const visibilityOptions = [
        { label: t('privacy_option_everyone'), value: 'everyone' },
        { label: t('privacy_option_contacts'), value: 'contacts' },
        { label: t('privacy_option_me'), value: 'me' },
    ];

    const groupOptions = [
        { label: t('privacy_option_everyone'), value: 'everyone' },
        { label: t('privacy_option_contacts'), value: 'contacts' },
        { label: t('privacy_option_nobody'), value: 'nobody' },
    ];

    const getLabel = (options: any[], value: string) => {
        return options.find(o => o.value === value)?.label || value;
    };

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
                    headerTitle: t('privacy_settings_title'),
                    headerStyle: { backgroundColor: '#0a0a0a' },
                    headerTintColor: '#fff',
                    headerBackTitle: t('back'),
                }}
            />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('profile_privacy_section')}</Text>
                    <SettingItem
                        label={t('privacy_profile_visibility_label')}
                        description={t('privacy_profile_visibility_desc')}
                        value={settings.profile_visibility}
                        type="select"
                        displayValue={getLabel(visibilityOptions, settings.profile_visibility)}
                        onValueChange={() => setVisibilityModalVisible(true)}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('activity_status_section')}</Text>
                    <SettingItem
                        label={t('privacy_online_status_label')}
                        description={t('privacy_online_status_desc')}
                        value={settings.show_online_status}
                        onValueChange={(val) => updateSetting('show_online_status', val)}
                    />
                    <SettingItem
                        label={t('privacy_read_receipts_label')}
                        description={t('privacy_read_receipts_desc')}
                        value={settings.read_receipts}
                        onValueChange={(val) => updateSetting('read_receipts', val)}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('groups_section')}</Text>
                    <SettingItem
                        label={t('privacy_group_invites_label')}
                        description={t('privacy_group_invites_desc')}
                        value={settings.group_add_permission}
                        type="select"
                        displayValue={getLabel(groupOptions, settings.group_add_permission)}
                        onValueChange={() => setGroupModalVisible(true)}
                    />
                </View>
            </ScrollView>

            <SelectionModal
                visible={visibilityModalVisible}
                onClose={() => setVisibilityModalVisible(false)}
                title={t('privacy_profile_visibility_label')}
                options={visibilityOptions}
                currentValue={settings.profile_visibility}
                onSelect={(val) => updateSetting('profile_visibility', val)}
            />

            <SelectionModal
                visible={groupModalVisible}
                onClose={() => setGroupModalVisible(false)}
                title={t('privacy_group_invites_label')}
                options={groupOptions}
                currentValue={settings.group_add_permission}
                onSelect={(val) => updateSetting('group_add_permission', val)}
            />
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
    selectValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectValueText: {
        color: '#3498db',
        marginEnd: 8,
        fontSize: 14,
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        width: '100%',
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    modalOptionText: {
        fontSize: 16,
        color: '#bdc3c7',
    },
    selectedOptionText: {
        color: '#3498db',
        fontWeight: 'bold',
    },
    closeButton: {
        marginTop: 20,
        padding: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 8,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
