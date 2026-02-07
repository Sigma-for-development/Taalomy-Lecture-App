import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, StyleSheet, Image } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useResponsive } from '../hooks/useResponsive';
import { LinearGradient } from 'expo-linear-gradient';
import { tokenStorage } from '../../utils/tokenStorage';
import { Alert } from 'react-native';

interface WebLayoutProps {
    children: React.ReactNode;
}

const SidebarItem = ({ icon, label, route, isActive, onPress }: any) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[
                styles.sidebarItem,
                isActive && styles.sidebarItemActive
            ]}
        >
            <Ionicons
                name={icon}
                size={22}
                color={isActive ? '#FFFFFF' : '#BDC3C7'}
                style={{ marginRight: 12 }}
            />
            <Text style={[
                styles.sidebarText,
                isActive && styles.sidebarTextActive
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
};

export const WebLayout: React.FC<WebLayoutProps> = ({ children }) => {
    const { isDesktop, isWeb } = useResponsive();
    const router = useRouter();
    const pathname = usePathname();

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
    if (!isWeb || !isDesktop) {
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
        <View style={styles.container}>
            {/* Sidebar */}
            <View style={styles.sidebar}>
                <View style={styles.logoContainer}>
                    <View style={styles.brandingContainer}>
                        <View style={styles.logoWrapper}>
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
                    <Text style={styles.sectionTitle}>MENU</Text>

                    <SidebarItem
                        icon="grid-outline"
                        label="Dashboard"
                        route="/dashboard"
                        isActive={isActive('/dashboard')}
                        onPress={() => navigate('/dashboard')}
                    />
                    <SidebarItem
                        icon="calendar-outline"
                        label="Timetable"
                        route="/timetable"
                        isActive={isActive('/timetable')}
                        onPress={() => navigate('/timetable')}
                    />
                    <SidebarItem
                        icon="library-outline"
                        label="Intakes"
                        route="/intakes"
                        isActive={isActive('/intakes')}
                        onPress={() => navigate('/intakes')}
                    />
                    <SidebarItem
                        icon="people-outline"
                        label="Students"
                        route="/students"
                        isActive={isActive('/students')}
                        onPress={() => navigate('/students')}
                    />
                    <SidebarItem
                        icon="document-text-outline"
                        label="Grading"
                        route="/grading"
                        isActive={isActive('/grading')}
                        onPress={() => navigate('/grading')}
                    />

                    <Text style={[styles.sectionTitle, { marginTop: 24 }]}>COMMUNICATION</Text>

                    <SidebarItem
                        icon="chatbubbles-outline"
                        label="Messages"
                        route="/messages"
                        isActive={isActive('/messages')}
                        onPress={() => navigate('/messages')}
                    />
                    <SidebarItem
                        icon="megaphone-outline"
                        label="Announcements"
                        route="/send-announcement"
                        isActive={isActive('/send-announcement')}
                        onPress={() => navigate('/send-announcement')}
                    />

                    <Text style={[styles.sectionTitle, { marginTop: 24 }]}>ACCOUNT</Text>

                    <SidebarItem
                        icon="wallet-outline"
                        label="Wallet"
                        route="/wallet"
                        isActive={isActive('/wallet')}
                        onPress={() => navigate('/wallet')}
                    />
                    <SidebarItem
                        icon="settings-outline"
                        label="Settings"
                        route="/settings"
                        isActive={isActive('/settings')}
                        onPress={() => navigate('/settings')}
                    />

                    <View style={{ marginTop: 24, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 12 }}>
                        <SidebarItem
                            icon="log-out-outline"
                            label="Log Out"
                            route="/logout"
                            isActive={false}
                            onPress={handleLogout}
                        />
                    </View>
                </ScrollView>

                <View style={styles.sidebarFooter}>
                    <TouchableOpacity onPress={() => navigate('/profile-edit')} style={styles.userProfile}>
                        <View style={styles.avatarPlaceholder}>
                            <Ionicons name="person" size={20} color="#BDC3C7" />
                        </View>
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>My Profile</Text>
                            <Text style={styles.userRole}>Lecturer</Text>
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
});
