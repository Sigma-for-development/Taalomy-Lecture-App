import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    RefreshControl,
    Platform,
    ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tokenStorage } from '../utils/tokenStorage';
const AsyncStorage = tokenStorage;
import { lecturerAPI } from '../src/utils/api';
import { useTranslation } from 'react-i18next';

// Unified interface for display
interface ScheduleItem {
    id: number;
    type: 'class' | 'group';
    name: string;
    description?: string;
    venue?: string;
    start_time?: string;
    end_time?: string;
    days_of_week?: string;
    // Specific fields
    max_students?: number;
    current_students?: number;
    class_name?: string; // For groups to show parent class
}

interface Class {
    id: number;
    name: string;
    description: string;
    max_students: number;
    current_students: number;
    venue?: string;
    start_time?: string;
    end_time?: string;
    days_of_week?: string;
}

interface Group {
    id: number;
    name: string;
    description: string;
    class_obj: number;
    class_name: string;
    current_students: number;
    max_students: number;
    venue?: string;
    start_time?: string;
    end_time?: string;
    days_of_week?: string;
}

const TimetableScreen = () => {
    const { t } = useTranslation();
    const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadSchedule();
    }, []);

    const loadSchedule = async () => {
        try {
            // Fetch both classes and groups in parallel
            const [classesRes, groupsRes] = await Promise.all([
                lecturerAPI.getClasses(),
                lecturerAPI.getGroups()
            ]);

            const classes: Class[] = classesRes.data;
            const groups: Group[] = groupsRes.data;

            // Map to unified ScheduleItem
            const uniqueClasses: ScheduleItem[] = classes.map(c => ({
                ...c,
                type: 'class'
            }));

            const uniqueGroups: ScheduleItem[] = groups.map(g => ({
                ...g,
                type: 'group'
            }));

            setScheduleItems([...uniqueClasses, ...uniqueGroups]);

        } catch (error) {
            console.error('Error loading schedule:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadSchedule();
        setRefreshing(false);
    };

    // Helper to format time (e.g., "14:00:00" -> "2:00 PM")
    const formatTime = (timeString: string) => {
        if (!timeString) return '';
        try {
            const [hours, minutes] = timeString.split(':');
            const date = new Date();
            date.setHours(parseInt(hours, 10));
            date.setMinutes(parseInt(minutes, 10));
            return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } catch (e) {
            return timeString;
        }
    };

    // Group and sort items by day
    const getGroupedSchedule = () => {
        const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const grouped: { [key: string]: ScheduleItem[] } = {};

        // Initialize groups
        daysOrder.forEach(day => {
            grouped[day] = [];
        });

        // Distribute items
        scheduleItems.forEach(item => {
            if (item.days_of_week) {
                const days = item.days_of_week.split(',').map(d => d.trim());
                days.forEach(day => {
                    // Normalize day string
                    const formattedDay = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();

                    // Direct match
                    if (grouped[formattedDay]) {
                        grouped[formattedDay].push(item);
                    } else {
                        // Fallback case-insensitive search
                        const key = daysOrder.find(d => d.toLowerCase() === day.toLowerCase());
                        if (key) grouped[key].push(item);
                    }
                });
            }
        });

        // Sort by start time within each day
        Object.keys(grouped).forEach(day => {
            grouped[day].sort((a, b) => {
                if (!a.start_time) return 1;
                if (!b.start_time) return -1;
                return a.start_time.localeCompare(b.start_time);
            });
        });

        return grouped;
    };

    const groupedSchedule = getGroupedSchedule();
    const daysWithItems = Object.keys(groupedSchedule).filter(day => groupedSchedule[day].length > 0);

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('my_timetable_title')}</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#3498db" />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('my_timetable_title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#3498db"
                        colors={['#3498db']}
                    />
                }
            >
                {daysWithItems.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={{
                            width: 100,
                            height: 100,
                            borderRadius: 50,
                            backgroundColor: '#252525',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginBottom: 24,
                            borderWidth: 1,
                            borderColor: '#333'
                        }}>
                            <Ionicons name="calendar-outline" size={48} color="#7f8c8d" />
                        </View>
                        <Text style={styles.emptyText}>{t('no_classes_scheduled')}</Text>
                        <Text style={styles.emptySubText}>{t('schedule_appear_msg')}</Text>
                    </View>
                ) : (
                    daysWithItems.map((day) => (
                        <View key={day} style={styles.daySection}>
                            <View style={styles.dayHeaderContainer}>
                                <View style={styles.dayIndicator}>
                                    <Text style={styles.dayIndicatorText}>{t(day.toLowerCase() + '_short')}</Text>
                                </View>
                                <Text style={styles.dayHeader}>{t(day.toLowerCase())}</Text>
                            </View>

                            <View style={styles.timelineContainer}>
                                {groupedSchedule[day].map((item, index) => (
                                    <View key={`${day}-${item.type}-${item.id}-${index}`} style={styles.itemCardWrapper}>
                                        <View style={styles.timelineLine} />
                                        <View style={[styles.timelineDot, {
                                            backgroundColor: item.type === 'class' ? '#3498db' : '#9b59b6'
                                        }]} />

                                        <TouchableOpacity
                                            activeOpacity={0.9}
                                            onPress={() => {
                                                if (item.type === 'class') {
                                                    router.push(`/class-details/${item.id}`);
                                                } else {
                                                    router.push(`/group-details/${item.id}`);
                                                }
                                            }}
                                            style={[styles.itemCard, {
                                                borderColor: item.type === 'class' ? '#333' : 'rgba(155, 89, 182, 0.3)'
                                            }]}
                                        >
                                            <View style={styles.timeContainer}>
                                                <Text style={styles.timeText}>
                                                    {item.start_time ? formatTime(item.start_time) : t('tba')}
                                                </Text>
                                                <Text style={styles.timeToText}>{t('time_to')}</Text>
                                                <Text style={styles.timeText}>
                                                    {item.end_time ? formatTime(item.end_time) : t('tba')}
                                                </Text>
                                            </View>

                                            <View style={styles.itemInfo}>
                                                {/* Type Badge */}
                                                <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                                                    <View style={{
                                                        backgroundColor: item.type === 'class' ? 'rgba(52, 152, 219, 0.15)' : 'rgba(155, 89, 182, 0.15)',
                                                        paddingHorizontal: 8,
                                                        paddingVertical: 2,
                                                        borderRadius: 4,
                                                    }}>
                                                        <Text style={{
                                                            fontSize: 10,
                                                            fontWeight: '700',
                                                            color: item.type === 'class' ? '#3498db' : '#9b59b6',
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            {item.type === 'class' ? t('type_class') : t('type_group')}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <Text style={styles.itemName}>{item.name}</Text>

                                                {item.type === 'group' && item.class_name && (
                                                    <Text style={styles.parentClassName}>{item.class_name}</Text>
                                                )}

                                                <View style={styles.venueContainer}>
                                                    <View style={{
                                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                        padding: 6,
                                                        borderRadius: 8,
                                                        marginEnd: 8
                                                    }}>
                                                        <Ionicons name="location" size={12} color="#bdc3c7" />
                                                    </View>
                                                    <Text style={styles.venueText}>
                                                        {item.venue || t('no_venue_assigned')}
                                                    </Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: '#1a1a1a',
        borderBottomWidth: 1,
        borderBottomColor: '#2c2c2c',
        zIndex: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: '#252525',
        borderWidth: 1,
        borderColor: '#333',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
        opacity: 0.6,
    },
    emptyText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        marginTop: 0,
    },
    emptySubText: {
        color: '#7f8c8d',
        fontSize: 16,
        marginTop: 8,
    },
    daySection: {
        marginBottom: 30,
    },
    dayHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    dayIndicator: {
        backgroundColor: 'rgba(52, 152, 219, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginEnd: 12,
        borderWidth: 1,
        borderColor: 'rgba(52, 152, 219, 0.3)',
    },
    dayIndicatorText: {
        color: '#3498db',
        fontWeight: '700',
        fontSize: 14,
        textTransform: 'uppercase',
    },
    dayHeader: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
    },
    timelineContainer: {
        paddingStart: 20,
    },
    itemCardWrapper: {
        position: 'relative',
        marginBottom: 16,
        paddingStart: 24,
    },
    timelineLine: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: -20, // Extend to next item
        width: 2,
        backgroundColor: '#333',
    },
    timelineDot: {
        position: 'absolute',
        left: -4,
        top: 28, // Center with card top
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: '#1a1a1a',
        zIndex: 5,
    },
    itemCard: {
        flexDirection: 'row',
        backgroundColor: '#252525',
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    timeContainer: {
        padding: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 95,
        borderRightWidth: 1,
        borderRightColor: '#333',
    },
    timeText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
    },
    timeToText: {
        color: '#7f8c8d',
        fontSize: 11,
        marginVertical: 4,
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    itemInfo: {
        flex: 1,
        padding: 16,
        justifyContent: 'center',
    },
    itemName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
        lineHeight: 22,
    },
    parentClassName: {
        color: '#7f8c8d',
        fontSize: 13,
        marginBottom: 8,
    },
    venueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    venueText: {
        color: '#bdc3c7',
        fontSize: 13,
        fontWeight: '500',
    },
});

export default TimetableScreen;
