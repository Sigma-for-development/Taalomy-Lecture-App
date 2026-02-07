import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    StatusBar,
    Platform
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { I18nManager } from 'react-native';
import { tokenStorage } from '../utils/tokenStorage';

export default function SettingsScreen() {
    const { t, i18n } = useTranslation();

    const changeLanguage = async (lang: 'en' | 'ar') => {
        if (i18n.language === lang) return;

        try {
            await tokenStorage.setItem('user-language', lang);
            await i18n.changeLanguage(lang);

            const isRTL = lang === 'ar';
            if (I18nManager.isRTL !== isRTL) {
                I18nManager.allowRTL(isRTL);
                I18nManager.forceRTL(isRTL);
                Alert.alert(t('language_changed'), t('restart_app_msg'));
            }
        } catch (error) {
            console.error('Error changing language:', error);
        }
    };

    const showLanguageOptions = () => {
        Alert.alert(
            t('switch_language'),
            t('language'),
            [
                {
                    text: t('english'),
                    onPress: () => changeLanguage('en'),
                    style: i18n.language === 'en' ? 'default' : 'default'
                },
                {
                    text: t('arabic'),
                    onPress: () => changeLanguage('ar'),
                    style: i18n.language === 'ar' ? 'default' : 'default'
                },
                {
                    text: t('cancel'),
                    style: 'cancel'
                }
            ]
        );
    };

    const renderSettingItem = (
        icon: keyof typeof Ionicons.glyphMap,
        title: string,
        onPress: () => void,
        color: string = '#3498db'
    ) => (
        <TouchableOpacity style={styles.settingItem} onPress={onPress}>
            <View style={styles.settingIconContainer}>
                <Ionicons name={icon} size={22} color={color} />
            </View>
            <Text style={[styles.settingText, { textAlign: I18nManager.isRTL ? 'right' : 'left' }]}>{title}</Text>
            <Ionicons
                name={I18nManager.isRTL ? "chevron-back" : "chevron-forward"}
                size={20}
                color="#95a5a6"
            />
        </TouchableOpacity>
    );

    const handleLogout = async () => {
        if (Platform.OS === 'web') {
            const confirmMsg = t('logout_confirm_msg') || "Are you sure you want to log out?";
            if (window.confirm(confirmMsg)) {
                try {
                    await tokenStorage.removeItem('access_token');
                    await tokenStorage.removeItem('refresh_token');
                    await tokenStorage.removeItem('user_data');
                    router.replace('/');
                } catch (error) {
                    console.error('Error during logout:', error);
                }
            }
        } else {
            Alert.alert(
                t('logout_confirm_title') || "Logout",
                t('logout_confirm_msg') || "Are you sure you want to log out?",
                [
                    {
                        text: t('cancel'),
                        style: 'cancel',
                    },
                    {
                        text: t('logout'),
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await tokenStorage.removeItem('access_token');
                                await tokenStorage.removeItem('refresh_token');
                                await tokenStorage.removeItem('user_data');
                                router.replace('/');
                            } catch (error) {
                                console.error('Error during logout:', error);
                            }
                        },
                    },
                ]
            );
        }
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
                    headerShown: false,
                }}
            />

            {/* Custom Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('settings')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { textAlign: I18nManager.isRTL ? 'right' : 'left' }]}>
                        {t('general')}
                    </Text>
                    {renderSettingItem(
                        'notifications-outline',
                        t('notification_settings'),
                        () => router.push('/notification-settings')
                    )}

                    {renderSettingItem(
                        'globe-outline',
                        t('language'),
                        showLanguageOptions,
                        '#2ecc71'
                    )}

                    {renderSettingItem(
                        'lock-closed-outline',
                        t('privacy_settings'),
                        () => router.push('/privacy-settings')
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { textAlign: I18nManager.isRTL ? 'right' : 'left' }]}>
                        {t('support_and_legal')}
                    </Text>
                    {renderSettingItem(
                        'help-circle-outline',
                        t('help_support'),
                        () => router.push('/support')
                    )}
                    {renderSettingItem(
                        'document-text-outline',
                        t('terms_of_service'),
                        () => router.push('/terms-of-service')
                    )}
                    {renderSettingItem(
                        'information-circle-outline',
                        t('about'),
                        () => Alert.alert(t('about'), t('app_version_info'))
                    )}
                </View>

                {/* Logout Section */}
                <View style={[styles.section, { borderColor: 'rgba(231, 76, 60, 0.3)' }]}>
                    <TouchableOpacity
                        style={[styles.settingItem, { borderBottomWidth: 0 }]}
                        onPress={handleLogout}
                    >
                        <View style={[styles.settingIconContainer, { backgroundColor: 'rgba(231, 76, 60, 0.1)' }]}>
                            <Ionicons name="log-out-outline" size={22} color="#e74c3c" />
                        </View>
                        <Text style={[styles.settingText, { color: '#e74c3c', textAlign: I18nManager.isRTL ? 'right' : 'left' }]}>
                            {t('logout')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View >
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: 'rgba(10, 10, 10, 0.5)',
        zIndex: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    section: {
        marginBottom: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#3498db',
        marginBottom: 10,
        marginStart: 10,
        marginTop: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    settingIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginEnd: 15,
    },
    settingText: {
        flex: 1,
        fontSize: 16,
        color: '#ecf0f1',
        fontWeight: '500',
    },
});
