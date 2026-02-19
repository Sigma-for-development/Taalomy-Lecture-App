import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    StatusBar,
    Platform,
    Modal
    , I18nManager
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { changeLanguage as i18nChangeLanguage } from '../src/i18n';
import { tokenStorage } from '../utils/tokenStorage';
import { BlurView } from 'expo-blur';
import { HoverCard } from '../src/components/HoverCard';
import { useResponsive } from '../src/hooks/useResponsive';
import { useZoom, ZoomLevel } from '../src/context/ZoomContext';

export default function SettingsScreen() {
    const { t, i18n } = useTranslation();
    const { isDesktop } = useResponsive();
    const { zoomLevel, setZoomLevel } = useZoom();
    const isWeb = Platform.OS === 'web';
    const [isLanguageModalVisible, setIsLanguageModalVisible] = React.useState(false);

    const changeLanguage = async (lang: 'en' | 'ar') => {
        if (i18n.language === lang) return;

        try {
            await i18nChangeLanguage(lang);
            setIsLanguageModalVisible(false);

            if (Platform.OS !== 'web') {
                const isRTL = lang === 'ar';
                if (I18nManager.isRTL !== isRTL) {
                    Alert.alert(t('language_changed'), t('restart_app_msg'));
                }
            }
        } catch (error) {
            console.error('Error changing language:', error);
        }
    };

    const showLanguageOptions = () => {
        setIsLanguageModalVisible(true);
    };

    const renderSettingItem = (
        icon: keyof typeof Ionicons.glyphMap,
        title: string,
        onPress: () => void,
        color: string = '#3498db'
    ) => (
        <HoverCard
            style={[styles.settingItem, { marginBottom: 12 }]} // Distinct cards
            onPress={onPress}
            activeScale={0.98}
            hoverBorderColor="#3498db" // Highlight border on hover
            baseBorderColor="rgba(255, 255, 255, 0.05)"
        >
            <View style={styles.settingIconContainer}>
                <Ionicons name={icon} size={22} color={color} />
            </View>
            <Text style={[styles.settingText, { textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }]}>{title}</Text>
            <Ionicons
                name={i18n.dir() === 'rtl' ? "chevron-back" : "chevron-forward"}
                size={20}
                color="#95a5a6"
            />
        </HoverCard>
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
            {/* <LinearGradient
                colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
                style={styles.backgroundGradient}
            /> */}

            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />

            {/* Custom Header */}
            <View style={[
                styles.header,
                isWeb && {
                    justifyContent: 'flex-start',
                    height: 80,
                    paddingTop: 0,
                    paddingBottom: 0,
                }
            ]}>
                {!isWeb && (
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                )}
                <Text style={[styles.headerTitle, isWeb && { textAlign: 'left', marginLeft: 0 }]}>{t('settings')}</Text>
                {!isWeb && <View style={{ width: 40 }} />}
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }]}>
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

                {/* System Zoom Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }]}>
                        {t('appearance_settings') || 'Appearance'}
                    </Text>
                    <View style={styles.zoomContainer}>
                        <Text style={styles.zoomLabel}>{t('system_zoom') || 'System Zoom'}</Text>
                        <View style={styles.zoomOptionsGrid}>
                            {(['compact', 'default', 'zoomed', 'extra'] as ZoomLevel[]).map((level) => (
                                <TouchableOpacity
                                    key={level}
                                    style={[
                                        styles.zoomOption,
                                        zoomLevel === level && styles.zoomOptionActive
                                    ]}
                                    onPress={() => setZoomLevel(level)}
                                >
                                    <Ionicons
                                        name={level === 'compact' ? 'contract' : level === 'default' ? 'expand' : level === 'zoomed' ? 'add-circle' : 'sparkles'}
                                        size={20}
                                        color={zoomLevel === level ? '#fff' : '#95a5a6'}
                                    />
                                    <Text style={[
                                        styles.zoomOptionText,
                                        zoomLevel === level && styles.zoomOptionTextActive
                                    ]}>
                                        {t(`zoom_${level}`) || level.charAt(0).toUpperCase() + level.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }]}>
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
                        () => {
                            if (Platform.OS === 'web') {
                                window.alert(`${t('about')}\n\n${t('app_version_info')}`);
                            } else {
                                Alert.alert(t('about'), t('app_version_info'));
                            }
                        }
                    )}
                </View>

                {/* Logout Section */}
                <View style={styles.section}>
                    <HoverCard
                        style={[styles.settingItem, { marginBottom: 12 }]}
                        onPress={handleLogout}
                        activeScale={0.98}
                        hoverBorderColor="#e74c3c"
                        baseBorderColor="rgba(231, 76, 60, 0.3)"
                    >
                        <View style={[styles.settingIconContainer, { backgroundColor: 'rgba(231, 76, 60, 0.1)' }]}>
                            <Ionicons name="log-out-outline" size={22} color="#e74c3c" />
                        </View>
                        <Text style={[styles.settingText, { color: '#e74c3c', textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }]}>
                            {t('logout')}
                        </Text>
                    </HoverCard>
                </View>
            </ScrollView>

            {/* Language Selection Modal */}
            <Modal
                visible={isLanguageModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsLanguageModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setIsLanguageModalVisible(false)}
                >
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('switch_language')}</Text>

                        <TouchableOpacity
                            style={[styles.languageOption, i18n.language === 'en' && styles.languageOptionActive]}
                            onPress={() => changeLanguage('en')}
                        >
                            <Text style={[styles.languageOptionText, i18n.language === 'en' && styles.languageOptionTextActive]}>
                                {t('english')}
                            </Text>
                            {i18n.language === 'en' && <Ionicons name="checkmark-circle" size={20} color="#3498db" />}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.languageOption, i18n.language === 'ar' && styles.languageOptionActive]}
                            onPress={() => changeLanguage('ar')}
                        >
                            <Text style={[styles.languageOptionText, i18n.language === 'ar' && styles.languageOptionTextActive]}>
                                {t('arabic')}
                            </Text>
                            {i18n.language === 'ar' && <Ionicons name="checkmark-circle" size={20} color="#3498db" />}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.modalCancelButton}
                            onPress={() => setIsLanguageModalVisible(false)}
                        >
                            <Text style={styles.modalCancelText}>{t('cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1b1b1b', // Match Sidebar Background
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
        paddingHorizontal: 24, // Standardized 24px padding
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: '#1b1b1b', // Match Sidebar Background
        zIndex: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#2c2c2c',
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
        fontSize: 24, // Increased to 24 to match Intakes
        fontWeight: '700',
        color: '#fff',
    },
    content: {
        flex: 1,
        padding: 20,
        ...(Platform.OS === 'web' && {
            maxWidth: 1000,
            width: '100%',
            alignSelf: 'center',
            paddingTop: 40,
        })
    },
    section: {
        marginBottom: 30,
        // backgroundColor: 'rgba(255, 255, 255, 0.05)', // Removed section background
        // borderRadius: 16,
        padding: 0, // Removed padding
        // borderWidth: 1,
        // borderColor: 'rgba(255, 255, 255, 0.1)',
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
        paddingHorizontal: 16, // Increased padding
        // borderBottomWidth: 1, // Removed for card style
        // borderBottomColor: 'rgba(255, 255, 255, 0.05)',
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
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    modalContent: {
        width: '85%',
        maxWidth: 400,
        backgroundColor: '#1a1a1a',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 20,
        textAlign: 'center',
    },
    languageOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginBottom: 10,
    },
    languageOptionActive: {
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        borderColor: 'rgba(52, 152, 219, 0.3)',
        borderWidth: 1,
    },
    languageOptionText: {
        fontSize: 16,
        color: '#bdc3c7',
    },
    languageOptionTextActive: {
        color: '#3498db',
        fontWeight: 'bold',
    },
    modalCancelButton: {
        marginTop: 10,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalCancelText: {
        fontSize: 16,
        color: '#95a5a6',
    },
    zoomContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    zoomLabel: {
        fontSize: 16,
        color: '#ecf0f1',
        marginBottom: 15,
        fontWeight: '600',
    },
    zoomOptionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    zoomOption: {
        flex: 1,
        minWidth: '45%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    zoomOptionActive: {
        backgroundColor: '#3498db',
        borderColor: '#3498db',
    },
    zoomOptionText: {
        fontSize: 14,
        color: '#95a5a6',
        marginStart: 8,
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    zoomOptionTextActive: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
