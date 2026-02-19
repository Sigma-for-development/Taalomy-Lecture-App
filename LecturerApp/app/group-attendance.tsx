import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    ActivityIndicator,
    FlatList,
    Animated,
    RefreshControl
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { tokenStorage } from '../utils/tokenStorage';
import { API_CONFIG } from '../src/config/api';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import ProfilePicture from '../src/components/ProfilePicture';
const AsyncStorage = tokenStorage;

interface Group {
    id: number;
    name: string;
    description: string;
    class_obj: number;
    class_name: string;
    current_students: number;
}

interface GroupAttendance {
    id: number;
    group: number;
    group_name: string;
    attendance_code: string;
    is_active: boolean;
    created_at: string;
    expires_at: string;
    time_remaining: number;
}

interface Student {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    username: string;
    profile_picture_url?: string | null;
    is_present?: boolean;
}

const GroupAttendanceScreen = () => {
    const { t, i18n } = useTranslation();
    const [groups, setGroups] = useState<Group[]>([]);
    const [activeAttendance, setActiveAttendance] = useState<GroupAttendance | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isStartingAttendance, setIsStartingAttendance] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState<number>(0);
    const [isExpired, setIsExpired] = useState<boolean>(false);
    const [showExtendButton, setShowExtendButton] = useState<boolean>(false);

    // Student List State
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Use useMemo to initialize Animated values
    const { fadeAnim, colorAnim } = useMemo(() => {
        return {
            fadeAnim: new Animated.Value(1),
            colorAnim: new Animated.Value(0), // 0 for normal, 1 for red
        };
    }, []);

    // Color Interpolations - MUST useNativeDriver: false
    const backgroundColor = useMemo(() => colorAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(39, 174, 96, 0.1)', 'rgba(231, 76, 60, 0.1)']
    }), [colorAnim]);

    const borderColor = useMemo(() => colorAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#27ae60', '#e74c3c']
    }), [colorAnim]);

    const timeColor = useMemo(() => colorAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#f39c12', '#e74c3c']
    }), [colorAnim]);

    useEffect(() => {
        loadGroups();
    }, []);

    // Load students when active session exists
    useEffect(() => {
        if (activeAttendance) {
            loadSessionStudents();
        } else {
            setStudents([]);
        }
    }, [activeAttendance]);

    // Countdown timer & Animation Effect
    useEffect(() => {
        let countdownInterval: any = null;
        setIsExpired(false);
        setShowExtendButton(false);
        colorAnim.setValue(0);

        if (activeAttendance) {
            setTimeRemaining(activeAttendance.time_remaining);

            if (activeAttendance.time_remaining > 0) {
                countdownInterval = setInterval(() => {
                    setTimeRemaining(prevTime => {
                        if (prevTime <= 10 && prevTime > 0) {
                            setShowExtendButton(true);
                        } else {
                            setShowExtendButton(false);
                        }

                        if (prevTime <= 1) {
                            if (countdownInterval) clearInterval(countdownInterval);
                            setIsExpired(true);

                            // IMPORTANT: useNativeDriver: false for color animations
                            Animated.timing(colorAnim, {
                                toValue: 1,
                                duration: 500,
                                useNativeDriver: false,
                            }).start(() => {
                                Animated.timing(fadeAnim, {
                                    toValue: 0,
                                    duration: 2000,
                                    useNativeDriver: true, // Opacity supports native driver
                                }).start(() => {
                                    setActiveAttendance(null);
                                });
                            });
                            return 0;
                        }
                        return prevTime - 1;
                    });
                }, 1000);
            } else {
                setIsExpired(true);
                setActiveAttendance(null);
            }
        }

        return () => {
            if (countdownInterval) clearInterval(countdownInterval);
        };
    }, [activeAttendance]);

    const loadGroups = async () => {
        try {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) return;

            const response = await axios.get(`${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/groups/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 200) {
                setGroups(response.data);
            }
        } catch (error) {
            console.error('Error loading groups:', error);
            Toast.show({
                type: 'error',
                text1: t('error_loading_groups'),
                text2: t('failed_load_groups')
            });
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const loadSessionStudents = async () => {
        if (!activeAttendance) return;
        try {
            setIsLoadingStudents(true);
            const token = await AsyncStorage.getItem('access_token');

            // 1. Get All Enrolled Students
            const enrolledRes = await axios.get(
                `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/groups/${activeAttendance.group}/enrolled-students/`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            // 2. Get Present Students
            const presentRes = await axios.get(
                `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/group-attendance/${activeAttendance.id}/students/`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            // 3. Merge Data
            const presentIds = new Set(presentRes.data.map((s: any) => s.student_id || s.id));

            const mergedStudents = enrolledRes.data.map((student: Student) => ({
                ...student,
                is_present: presentIds.has(student.id)
            }));

            // Sort: Present first, then alphabetical
            mergedStudents.sort((a: Student, b: Student) => {
                if (a.is_present === b.is_present) {
                    return a.first_name.localeCompare(b.first_name);
                }
                return a.is_present ? -1 : 1;
            });

            setStudents(mergedStudents);

        } catch (error) {
            console.error('Error loading session students:', error);
        } finally {
            setIsLoadingStudents(false);
        }
    };

    const handleToggleAttendance = async (studentId: number, currentStatus: boolean) => {
        if (!activeAttendance) return;
        try {
            const token = await AsyncStorage.getItem('access_token');
            const newStatus = !currentStatus;

            // Optimistically update UI
            setStudents(prev => prev.map(s =>
                s.id === studentId ? { ...s, is_present: newStatus } : s
            ));

            // Call appropriate endpoint based on desired status
            const endpoint = newStatus
                ? `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/group-attendance/${activeAttendance.id}/mark/`
                : `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/group-attendance/${activeAttendance.id}/unmark/`;

            await axios.post(
                endpoint,
                { student_id: studentId },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            Toast.show({
                type: 'success',
                text1: newStatus ? t('attendance_marked') : t('attendance_unmarked'),
                text2: newStatus ? t('student_marked_present') : t('student_marked_absent')
            });

        } catch (error) {
            console.error('Error toggling attendance:', error);
            // Revert on error
            setStudents(prev => prev.map(s =>
                s.id === studentId ? { ...s, is_present: currentStatus } : s
            ));
            Toast.show({
                type: 'error',
                text1: t('error'),
                text2: t('failed_toggle_attendance')
            });
        }
    };

    const startAttendance = async (groupId: number) => {
        try {
            setIsStartingAttendance(true);
            const token = await AsyncStorage.getItem('access_token');
            const response = await axios.post(
                `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/group-attendance/`,
                { group: groupId },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (response.status === 201) {
                setActiveAttendance(response.data);
                setTimeRemaining(response.data.time_remaining);
                setIsExpired(false);
                setShowExtendButton(false);
                fadeAnim.setValue(1);
                colorAnim.setValue(0);
                Toast.show({
                    type: 'success',
                    text1: t('attendance_started'),
                    text2: t('attendance_code_expires', { code: response.data.attendance_code })
                });
            }
        } catch (error: any) {
            console.error('Error starting attendance:', error);
            Toast.show({
                type: 'error',
                text1: t('start_failed'),
                text2: error.response?.data?.error || t('failed_start_attendance')
            });
        } finally {
            setIsStartingAttendance(false);
        }
    };

    const extendAttendance = async () => {
        if (!activeAttendance) return;
        try {
            const token = await AsyncStorage.getItem('access_token');
            const response = await axios.post(
                `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/group-attendance/${activeAttendance.id}/extend/`,
                {},
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (response.status === 200) {
                const updatedAttendance = {
                    ...activeAttendance,
                    expires_at: response.data.expires_at,
                    time_remaining: response.data.time_remaining
                };
                setActiveAttendance(updatedAttendance);
                setTimeRemaining(updatedAttendance.time_remaining);
                setShowExtendButton(false);
                colorAnim.setValue(0);

                Toast.show({
                    type: 'success',
                    text1: t('time_extended'),
                    text2: t('time_extended_msg')
                });
            }
        } catch (error: any) {
            console.error('Error extending attendance:', error);
            Toast.show({
                type: 'error',
                text1: t('extension_failed'),
                text2: error.response?.data?.error || t('failed_extend_attendance')
            });
        }
    };

    const cancelAttendance = async () => {
        if (!activeAttendance) return;
        try {
            const token = await AsyncStorage.getItem('access_token');
            const response = await axios.post(
                `${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/group-attendance/${activeAttendance.id}/cancel/`,
                {},
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (response.status === 200) {
                setActiveAttendance(null);
                setIsExpired(true);
                Toast.show({
                    type: 'success',
                    text1: t('attendance_cancelled'),
                    text2: t('attendance_cancelled_msg')
                });
            }
        } catch (error: any) {
            console.error('Error cancelling attendance:', error);
            Toast.show({
                type: 'error',
                text1: t('cancellation_failed'),
                text2: error.response?.data?.error || t('failed_cancel_attendance')
            });
        }
    };

    const viewAttendanceHistory = (groupId: number) => {
        router.push(`/group-attendance-history/${groupId}`);
    };

    const renderGroupCard = ({ item }: { item: Group }) => (
        <View style={styles.groupCard}>
            <View style={styles.groupHeader}>
                <View style={styles.groupIconContainer}>
                    <Ionicons name="people-outline" size={24} color="#3498db" />
                </View>
                <View style={styles.groupInfo}>
                    <Text style={styles.groupName}>{item.name}</Text>
                    <Text style={styles.groupDescription}>{item.description}</Text>
                    <Text style={styles.className}>{item.class_name}</Text>
                    <Text style={[styles.studentCount, { textAlign: i18n.language === 'ar' ? 'right' : 'left' }]}>
                        {t('students_enrolled_count', { count: item.current_students })}
                    </Text>
                </View>
            </View>

            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.startButton]}
                    onPress={() => startAttendance(item.id)}
                    disabled={isStartingAttendance}
                >
                    {isStartingAttendance ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="play-circle-outline" size={16} color="#fff" />
                            <Text style={styles.actionButtonText}>{t('start_attendance_action')}</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.historyButton]}
                    onPress={() => viewAttendanceHistory(item.id)}
                >
                    <Ionicons name="time-outline" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>{t('history_action')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderStudentItem = ({ item }: { item: Student }) => (
        <View style={styles.studentItem}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <ProfilePicture
                    imageUrl={item.profile_picture_url}
                    firstName={item.first_name}
                    lastName={item.last_name}
                    size={40}
                />
                <View style={{ marginLeft: 12 }}>
                    <Text style={styles.studentNameList}>{item.first_name} {item.last_name}</Text>
                    <Text style={styles.studentUsername}>@{item.username}</Text>
                </View>
            </View>

            {item.is_present ? (
                <TouchableOpacity
                    style={[styles.statusBadge, { backgroundColor: 'rgba(39, 174, 96, 0.2)' }]}
                    onPress={() => handleToggleAttendance(item.id, true)}
                >
                    <Ionicons name="checkmark-circle" size={16} color="#27ae60" />
                    <Text style={[styles.statusText, { color: '#27ae60' }]}>{t('present')}</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    style={[styles.statusBadge, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}
                    onPress={() => handleToggleAttendance(item.id, false)}
                >
                    <Ionicons name="radio-button-off" size={16} color="#95a5a6" />
                    <Text style={[styles.statusText, { color: '#95a5a6' }]}>{t('mark_present')}</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3498db" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <View style={styles.backgroundContainer} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('group_attendance_title')}</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={loadGroups} tintColor="#fff" />
                }
            >
                {/* Active Session Card */}
                {activeAttendance && (
                    <Animated.View style={[
                        styles.activeSessionCard,
                        {
                            opacity: fadeAnim,
                            backgroundColor: backgroundColor,
                            borderColor: borderColor
                        }
                    ]}>
                        <View style={styles.activeSessionHeader}>
                            <Ionicons name="radio-button-on" size={20} color="#27ae60" />
                            <Text style={styles.activeSessionTitle}>{t('active_attendance_session')}</Text>
                        </View>
                        <Text style={styles.groupName}>{activeAttendance.group_name}</Text>

                        <View style={[styles.codeContainer, { flexDirection: i18n.language === 'ar' ? 'row-reverse' : 'row' }]}>
                            <Text style={styles.codeLabel}>{t('attendance_code')}</Text>
                            <Text style={styles.attendanceCode}>{activeAttendance.attendance_code}</Text>
                            <TouchableOpacity onPress={cancelAttendance} style={styles.cancelButton}>
                                <Ionicons name="close-circle" size={24} color="#e74c3c" />
                            </TouchableOpacity>
                        </View>

                        <Animated.Text style={[styles.timeRemaining, { color: timeColor }]}>
                            {isExpired ? t('expired_label') : t('time_remaining_label', { time: Math.max(0, timeRemaining) })}
                        </Animated.Text>

                        {showExtendButton && (
                            <TouchableOpacity style={styles.extendButton} onPress={extendAttendance}>
                                <Ionicons name="time-outline" size={16} color="#fff" />
                                <Text style={styles.extendButtonText}>{t('extend_time_action')}</Text>
                            </TouchableOpacity>
                        )}
                    </Animated.View>
                )}

                {/* Groups List (Only show if no active session or below it) */}
                <View style={{ marginBottom: 40 }}>
                    <Text style={[styles.sectionTitle, { textAlign: i18n.language === 'ar' ? 'right' : 'left' }]}>
                        {t('select_group')}
                    </Text>
                    <FlatList
                        data={groups}
                        renderItem={renderGroupCard}
                        keyExtractor={(item) => item.id.toString()}
                        scrollEnabled={false} // Since we are inside ScrollView
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="people-outline" size={64} color="#95a5a6" />
                                <Text style={styles.emptyText}>{t('no_groups_found')}</Text>
                            </View>
                        }
                    />
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    backgroundContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: '#1b1b1b',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0a0a0a'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
    },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    placeholder: { width: 40 },
    content: { flex: 1, paddingHorizontal: 20 },

    // Active Session
    activeSessionCard: {
        backgroundColor: 'rgba(39, 174, 96, 0.1)',
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#27ae60',
    },
    activeSessionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    activeSessionTitle: { fontSize: 16, fontWeight: 'bold', color: '#27ae60', marginStart: 8 },
    groupName: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 15 },
    codeContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    codeLabel: { fontSize: 14, color: '#bdc3c7', marginEnd: 10 },
    attendanceCode: { fontSize: 24, fontWeight: 'bold', color: '#27ae60', letterSpacing: 2 },
    cancelButton: { marginStart: 10 },
    timeRemaining: { fontSize: 14, color: '#f39c12', fontWeight: '600' },
    extendButton: {
        backgroundColor: '#3498db',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        marginTop: 15,
    },
    extendButtonText: { color: '#fff', fontSize: 14, fontWeight: '600', marginStart: 8 },

    // Student List inside Session
    studentListContainer: {
        marginTop: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        paddingTop: 15
    },
    studentListHeader: {
        color: '#bdc3c7',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 10
    },
    studentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)'
    },
    studentNameList: { color: '#fff', fontSize: 14, fontWeight: '600' },
    studentUsername: { color: '#bdc3c7', fontSize: 12 },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6
    },
    statusText: { fontSize: 12, fontWeight: '600' },

    // Group Cards
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 15 },
    groupCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 15,
        padding: 20,
        marginBottom: 15,
    },
    groupHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    groupIconContainer: {
        width: 50, height: 50, borderRadius: 25,
        backgroundColor: 'rgba(52, 152, 219, 0.2)',
        alignItems: 'center', justifyContent: 'center', marginEnd: 15
    },
    groupInfo: { flex: 1 },
    groupDescription: { fontSize: 14, color: '#bdc3c7', marginBottom: 4 },
    className: { fontSize: 14, color: '#3498db', marginBottom: 4 },
    studentCount: { fontSize: 12, color: '#95a5a6' },
    actionButtons: { flexDirection: 'row', gap: 10 },
    actionButton: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 12, borderRadius: 10
    },
    startButton: { backgroundColor: '#27ae60' },
    historyButton: { backgroundColor: '#3498db' },
    actionButtonText: { color: '#fff', fontSize: 14, fontWeight: '600', marginStart: 6 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 18, color: '#fff', marginTop: 20 },
});

export default GroupAttendanceScreen;