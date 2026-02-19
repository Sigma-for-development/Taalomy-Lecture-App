import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, StyleSheet, Image, Animated, Easing, Alert, I18nManager } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useResponsive } from '../hooks/useResponsive';
import { LinearGradient } from 'expo-linear-gradient';
import { tokenStorage } from '../../utils/tokenStorage';
import ProfilePicture from './ProfilePicture';
import { appEventEmitter } from '../utils/eventEmitter';
import { useTranslation } from 'react-i18next';

interface WebLayoutProps {
    children: React.ReactNode;
}

const SidebarItem = ({ icon, label, route, isActive, onPress }: any) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const { i18n } = useTranslation();
    const isRTL = i18n.dir() === 'rtl';

    return (
        <TouchableOpacity
            onPress={onPress}
            {...({
                onMouseEnter: () => Platform.OS === 'web' && setIsHovered(true),
                onMouseLeave: () => Platform.OS === 'web' && setIsHovered(false)
            } as any)}
            style={[
                styles.sidebarItem,
                isActive && styles.sidebarItemActive,
                !isActive && isHovered && styles.sidebarItemHover
            ]}
        >
            <Ionicons
                name={icon}
                size={22}
                color={isActive || isHovered ? '#FFFFFF' : '#BDC3C7'}
                style={{ [isRTL ? 'marginLeft' : 'marginRight']: 18 }}
            />
            <Text style={[
                styles.sidebarText,
                (isActive || isHovered) && styles.sidebarTextActive,
                { textAlign: isRTL ? 'right' : 'left', flex: 1 }
            ]}>
                {label}
            </Text>
        </TouchableOpacity >
    );
};

const AISidebarItem = ({ label, route, isActive, onPress }: any) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const glowAnim = React.useRef(new Animated.Value(0)).current;
    const { i18n } = useTranslation();
    const isRTL = i18n.dir() === 'rtl';

    React.useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, {
                    toValue: 1,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: false,
                }),
                Animated.timing(glowAnim, {
                    toValue: 0,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: false,
                }),
            ])
        ).start();
    }, []);

    const glowColor = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(108, 92, 231, 0.1)', 'rgba(162, 155, 254, 0.6)'], // Deep Purple Glow
    });

    const shadowOpacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.8],
    });

    return (
        <TouchableOpacity
            onPress={onPress}
            {...({
                onMouseEnter: () => Platform.OS === 'web' && setIsHovered(true),
                onMouseLeave: () => Platform.OS === 'web' && setIsHovered(false)
            } as any)}
            style={[
                styles.sidebarItem,
                !isActive && styles.sidebarItemMagic,
                isActive && styles.sidebarItemActiveMagic,
                !isActive && isHovered && styles.sidebarItemHover,
                { marginBottom: 12 }
            ]}
        >
            <Animated.View style={{
                shadowColor: '#a29bfe',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: shadowOpacity,
                shadowRadius: 8,
            }}>
                <Ionicons
                    name="sparkles"
                    size={22}
                    color={isActive ? '#FFFFFF' : '#a29bfe'}
                    style={{ [isRTL ? 'marginLeft' : 'marginRight']: 18 }}
                />
            </Animated.View>
            <Text style={[
                styles.sidebarText,
                (isActive || isHovered) && styles.sidebarTextActive,
                !isActive && { color: '#a29bfe', fontWeight: 'bold' },
                { textAlign: isRTL ? 'right' : 'left', flex: 1 }
            ]}>
                {label}
            </Text>
            <Animated.View style={{
                position: 'absolute',
                [isRTL ? 'left' : 'right']: 12,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: isActive ? '#FFFFFF' : glowColor,
            }} />
        </TouchableOpacity>
    );
};

export const WebLayout: React.FC<WebLayoutProps> = ({ children }) => {
    const { isDesktop, isWeb } = useResponsive();
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const pathname = usePathname();
    const [userData, setUserData] = React.useState<any>(null);
    const isRTL = i18n.dir() === 'rtl';

    React.useEffect(() => {
        loadUserData();

        // Listen for profile updates across the app
        const handleProfileUpdate = (updatedUserData: any) => {
            setUserData(updatedUserData);
        };

        appEventEmitter.on('userProfileUpdated', handleProfileUpdate);

        return () => {
            appEventEmitter.off('userProfileUpdated', handleProfileUpdate);
        };
    }, []);

    // Sync user data on navigation changes as a fallback
    React.useEffect(() => {
        if (!userData && !isPublicRoute) {
            loadUserData();
        }
    }, [pathname]);

    const loadUserData = async () => {
        try {
            const userDataString = await tokenStorage.getItem('user_data');
            if (userDataString) {
                setUserData(JSON.parse(userDataString));
            }
        } catch (error) {
            console.error('Error loading user data in WebLayout:', error);
        }
    };

    // Public/auth routes that should NOT have the sidebar
    const publicRoutes = ['/', '/login', '/register', '/auth/forgot-password', '/auth/reset-password', '/auth/otp', '/onboarding', '/terms-of-service', '/privacy-policy', '/contact'];
    const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/auth/');

    const handleLogout = async () => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm("Are you sure you want to log out?");
            if (confirmed) {
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
                "Logout",
                "Are you sure you want to log out?",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Logout",
                        style: "destructive",
                        onPress: async () => {
                            try {
                                await tokenStorage.removeItem('access_token');
                                await tokenStorage.removeItem('refresh_token');
                                await tokenStorage.removeItem('user_data');
                                router.replace('/');
                            } catch (error) {
                                console.error('Error during logout:', error);
                            }
                        }
                    }
                ]
            );
        }
    };

    // If not web or not desktop, render children normally (mobile layout)
    // Also skip sidebar for public/auth routes
    if (!isWeb || !isDesktop || isPublicRoute) {
        return <>{children}</>;
    }

    const navigate = (path: string) => {
        router.push(path as any);
    };

    // Helper to check if route is active
    const isActive = (path: string) => {
        if (path === '/dashboard' && pathname === '/dashboard') return true;
        if (path !== '/dashboard' && pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <View key={i18n.language} style={styles.container}>
            {/* Sidebar */}
            <View style={[styles.sidebar, isRTL ? { borderRightWidth: 0, borderLeftWidth: 1, borderLeftColor: '#2d2d2d' } : {}]}>
                <View style={styles.logoContainer}>
                    <View style={[styles.brandingContainer, isRTL && { flexDirection: 'row-reverse' }]}>
                        <View style={[styles.logoWrapper, { marginRight: -12 }]}>
                            <Image
                                source={require('../../assets/taalomy-white-txt.png')}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.aalomyText}>aalomy</Text>
                    </View>
                </View>

                <ScrollView style={styles.sidebarContent}>
                    <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('general')}</Text>

                    <SidebarItem
                        icon="grid-outline"
                        label={t('dashboard')}
                        route="/dashboard"
                        isActive={isActive('/dashboard')}
                        onPress={() => navigate('/dashboard')}
                    />
                    <SidebarItem
                        icon="calendar-outline"
                        label={t('timetable')}
                        route="/timetable"
                        isActive={isActive('/timetable')}
                        onPress={() => navigate('/timetable')}
                    />
                    <SidebarItem
                        icon="calendar-number-outline"
                        label={t('pending_bookings')}
                        route="/bookings"
                        isActive={isActive('/bookings')}
                        onPress={() => navigate('/bookings')}
                    />
                    <SidebarItem
                        icon="school-outline"
                        label={t('intakes')}
                        route="/intakes"
                        isActive={isActive('/intakes')}
                        onPress={() => navigate('/intakes')}
                    />
                    <SidebarItem
                        icon="people-outline"
                        label={t('students')}
                        route="/students"
                        isActive={isActive('/students')}
                        onPress={() => navigate('/students')}
                    />
                    <SidebarItem
                        icon="checkmark-circle-outline"
                        label={t('attendance')}
                        route="/attendance"
                        isActive={isActive('/attendance')}
                        onPress={() => navigate('/attendance')}
                    />
                    <SidebarItem
                        icon="document-text-outline"
                        label={t('grading')}
                        route="/grading"
                        isActive={isActive('/grading')}
                        onPress={() => navigate('/grading')}
                    />
                    <SidebarItem
                        icon="flask-outline"
                        label={t('demos')}
                        route="/demo-sessions"
                        isActive={isActive('/demo-sessions')}
                        onPress={() => navigate('/demo-sessions')}
                    />

                    <AISidebarItem
                        label={t('ai_assistant')}
                        route="/ai-assistant"
                        isActive={isActive('/ai-assistant')}
                        onPress={() => navigate('/ai-assistant')}
                    />

                    <Text style={[styles.sectionTitle, { marginTop: 24, textAlign: isRTL ? 'right' : 'left' }]}>
                        {t('communication')}
                    </Text>

                    <SidebarItem
                        icon="chatbubbles-outline"
                        label={t('messages')}
                        route="/messages"
                        isActive={isActive('/messages')}
                        onPress={() => navigate('/messages')}
                    />
                    <SidebarItem
                        icon="megaphone-outline"
                        label={t('announcements_header')}
                        route="/send-announcement"
                        isActive={isActive('/send-announcement')}
                        onPress={() => navigate('/send-announcement')}
                    />
                    <SidebarItem
                        icon="mail-open-outline"
                        label={t('invitations')}
                        route="/invitations"
                        isActive={isActive('/invitations')}
                        onPress={() => navigate('/invitations')}
                    />
                    <SidebarItem
                        icon="planet-outline"
                        label={t('lecturer_hub.title')}
                        route="/lecturer-hub"
                        isActive={isActive('/lecturer-hub')}
                        onPress={() => navigate('/lecturer-hub')}
                    />

                    <Text style={[styles.sectionTitle, { marginTop: 24, textAlign: isRTL ? 'right' : 'left' }]}>
                        {t('account')}
                    </Text>

                    <SidebarItem
                        icon="briefcase-outline"
                        label={t('professional_profile')}
                        route="/lecturer-profile"
                        isActive={isActive('/lecturer-profile')}
                        onPress={() => navigate('/lecturer-profile')}
                    />
                    <SidebarItem
                        icon="wallet-outline"
                        label={t('wallet')}
                        route="/wallet"
                        isActive={isActive('/wallet')}
                        onPress={() => navigate('/wallet')}
                    />
                    <SidebarItem
                        icon="settings-outline"
                        label={t('settings')}
                        route="/settings"
                        isActive={isActive('/settings')}
                        onPress={() => navigate('/settings')}
                    />

                </ScrollView>

                <View style={styles.sidebarFooter}>
                    <TouchableOpacity
                        onPress={() => navigate('/profile-edit')}
                        style={styles.userProfile}
                    >
                        <View style={{ [isRTL ? 'marginLeft' : 'marginRight']: 16 }}>
                            <ProfilePicture
                                imageUrl={userData?.profile_picture_url}
                                size={40}
                            />
                        </View>
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>
                                {userData ? `${userData.first_name} ${userData.last_name}` : t('profile')}
                            </Text>
                            <Text style={styles.userRole}>{t('lecturer')}</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Main Content Area */}
            <View style={styles.mainContent}>
                {/* We wrap children in a constrained max-width container for better readability on big screens */}
                {/* However, the children (screens) themselves might have their own scrolling and backgrounds. */}
                {/* Since children is a Stack, it renders the current screen. For web, the screen usually takes 100% height. */}
                {/* We need to ensure the screen content doesn't get hidden behind the sidebar if it was absolute. Here sidebar is flex. */}

                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#0a0a0a',
    },
    sidebar: {
        width: 280,
        backgroundColor: '#1b1b1b',
        borderRightWidth: 1,
        borderRightColor: '#2d2d2d',
        display: 'flex',
        flexDirection: 'column',
    },
    logoContainer: {
        height: 80,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#2d2d2d',
    },
    logoImage: {
        width: '100%',
        height: '100%',
    },
    brandingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    logoWrapper: {
        width: 50,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: -12, // Negative margin to pull text closer, similar to login screen
    },
    aalomyText: {
        fontSize: 26,
        fontWeight: '700',
        color: '#ecf0f1',
        marginTop: 4,
    },
    sidebarContent: {
        flex: 1,
        paddingVertical: 24,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        color: '#5e5e5e',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 8,
        paddingHorizontal: 12,
        width: '100%',
    },
    sidebarItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 4,
    },
    sidebarItemActive: {
        backgroundColor: '#3498db',
    },
    sidebarItemHover: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    sidebarText: {
        color: '#BDC3C7',
        fontSize: 15,
        fontWeight: '500',
    },
    sidebarTextActive: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    sidebarFooter: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#2d2d2d'
    },
    userProfile: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#2d2d2d',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    userInfo: {
        flex: 1
    },
    userName: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14
    },
    userRole: {
        color: '#7f8c8d',
        fontSize: 12
    },
    mainContent: {
        flex: 1,
        backgroundColor: '#0a0a0a',
        // On web, the Stack Navigator will fill this area
    },
    sidebarItemMagic: {
        backgroundColor: 'rgba(108, 92, 231, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(108, 92, 231, 0.15)',
    },
    sidebarItemActiveMagic: {
        backgroundColor: '#6c5ce7',
        shadowColor: '#6c5ce7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
});
