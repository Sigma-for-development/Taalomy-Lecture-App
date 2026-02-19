import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    StatusBar,
    RefreshControl,
    TextInput,
    ActivityIndicator,
    Image,
    FlatList,
    Platform
} from 'react-native';
import { router } from 'expo-router';
import { tokenStorage } from '../utils/tokenStorage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_CONFIG } from '../src/config/api';
import { useTranslation } from 'react-i18next';
import ProfilePicture from '../src/components/ProfilePicture';
import { useResponsive } from '../src/hooks/useResponsive';
import { HoverCard } from '../src/components/HoverCard';
import { Skeleton } from '../src/components/Skeleton';
const AsyncStorage = tokenStorage;

interface Student {
    id: number;
    name: string;
    email: string;
    profile_picture_url?: string;
    intakes: { id: number; name: string }[];
}

const StudentsScreen = () => {
    const { t } = useTranslation();
    const { isDesktop } = useResponsive();
    const isWeb = Platform.OS === 'web';
    const [students, setStudents] = useState<Student[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const baseurl = API_CONFIG.ACCOUNTS_BASE_URL;

    useEffect(() => {
        loadStudents();
    }, []);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredStudents(students);
        } else {
            const filtered = students.filter(student =>
                student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                student.email.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredStudents(filtered);
        }
    }, [searchQuery, students]);

    const loadStudents = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('access_token');
            const response = await axios.get(`${baseurl}lecturer/students/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setStudents(response.data);
            setFilteredStudents(response.data);
        } catch (error) {
            console.error('Error loading students:', error);
            Alert.alert(t('error'), t('error_loading_students'));
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadStudents();
        setRefreshing(false);
    };

    // Skeleton Loading Component
    const StudentSkeleton = () => (
        <View style={{ flex: 1, backgroundColor: '#1b1b1b' }}>
            <StatusBar barStyle="light-content" />

            {/* Header Skeleton */}
            <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                ...(isWeb ? { height: 80 } : { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20 }),
                paddingHorizontal: 24, backgroundColor: '#1b1b1b', borderBottomWidth: 1, borderBottomColor: '#2c2c2c',
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {!isWeb && <Skeleton width={40} height={40} borderRadius={20} style={{ marginRight: 15 }} />}
                    <Skeleton width={200} height={32} />
                </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Search Bar Skeleton */}
                <View style={{ paddingHorizontal: 24, paddingVertical: 16, ...(isDesktop && { maxWidth: 1400, alignSelf: 'center', width: '100%' }) }}>
                    <Skeleton width="100%" height={48} borderRadius={12} />
                </View>

                {/* Desktop Stats Skeleton */}
                {isDesktop && (
                    <View style={{ flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 16, gap: 12, maxWidth: 1400, alignSelf: 'center', width: '100%' }}>
                        {[1, 2, 3, 4].map(i => (
                            <View key={i} style={{ flex: 1, height: 80, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' }}>
                                <Skeleton width={48} height={48} borderRadius={24} style={{ marginRight: 12 }} />
                                <View style={{ flex: 1 }}>
                                    <Skeleton width={30} height={20} style={{ marginBottom: 4 }} />
                                    <Skeleton width={80} height={12} />
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* List Header Skeleton */}
                <View style={{ paddingHorizontal: 24, marginTop: 20, marginBottom: 16, ...(isDesktop && { maxWidth: 1400, alignSelf: 'center', width: '100%' }) }}>
                    <Skeleton width={150} height={24} />
                </View>

                {/* Student Grid/List Skeleton */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: isDesktop ? 18 : 24, ...(isDesktop && { maxWidth: 1400, alignSelf: 'center', width: '100%' }) }}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <View key={i} style={{ width: isDesktop ? '33.33%' : '100%', paddingHorizontal: isDesktop ? 6 : 0, marginBottom: isDesktop ? 12 : 12 }}>
                            <View style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 16, padding: 16,
                                flexDirection: isDesktop ? 'column' : 'row', alignItems: isDesktop ? 'flex-start' : 'center',
                                borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
                                ...(isDesktop && { height: 200, alignItems: 'center', justifyContent: 'center' })
                            }}>
                                <View style={{ marginEnd: isDesktop ? 0 : 16, marginBottom: isDesktop ? 12 : 0 }}>
                                    <Skeleton width={56} height={56} borderRadius={28} />
                                </View>
                                <View style={{ flex: 1, width: '100%', alignItems: isDesktop ? 'center' : 'flex-start' }}>
                                    <Skeleton width={120} height={20} style={{ marginBottom: 6 }} />
                                    <Skeleton width={180} height={14} style={{ marginBottom: 12 }} />
                                    <View style={{ flexDirection: 'row', gap: 6 }}>
                                        <Skeleton width={60} height={24} borderRadius={6} />
                                        <Skeleton width={60} height={24} borderRadius={6} />
                                    </View>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </View>
    );

    if (loading) {
        return <StudentSkeleton />;
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#1b1b1b' }}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    ...(isWeb ? { height: 80 } : {
                        paddingTop: Platform.OS === 'ios' ? 60 : 40,
                        paddingBottom: 20,
                    }),
                    paddingHorizontal: 24, // Standardized 24px padding
                    backgroundColor: '#1b1b1b',
                    borderBottomWidth: 1,
                    borderBottomColor: '#2c2c2c',
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {!isWeb && (
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: '#252525',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginEnd: 15,
                                borderWidth: 1,
                                borderColor: '#333'
                            }}
                        >
                            <Ionicons name="arrow-back" size={22} color="#fff" />
                        </TouchableOpacity>
                    )}
                    <Text style={{ fontSize: 24, fontWeight: '700', color: '#fff' }}>
                        {t('students_directory_title')}
                    </Text>
                </View>
            </View>

            {/* Search Bar */}
            <View style={{
                paddingHorizontal: 24, // Standardized 24px padding
                paddingVertical: 16,
                backgroundColor: '#1b1b1b', // Match sidebar background
                ...(isDesktop && { maxWidth: 1400, alignSelf: 'center', width: '100%' })
            }}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#252525',
                    borderRadius: 12,
                    paddingHorizontal: 15,
                    borderWidth: 1,
                    borderColor: '#333'
                }}>
                    <Ionicons name="search" size={20} color="#7f8c8d" />
                    <TextInput
                        style={{
                            flex: 1,
                            paddingVertical: 12,
                            paddingHorizontal: 10,
                            color: '#fff',
                            fontSize: 16,
                        }}
                        placeholder={t('search_students_placeholder')}
                        placeholderTextColor="#7f8c8d"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {/* Statistics Cards - Desktop Only */}
            {isDesktop && (
                <View style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    paddingHorizontal: 24,
                    paddingVertical: 16,
                    gap: 12,
                    maxWidth: 1400,
                    alignSelf: 'center',
                    width: '100%'
                }}>
                    <HoverCard style={{
                        flex: 1,
                        minWidth: 200,
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: 12,
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.08)',
                    }}>
                        <View style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: 12,
                        }}>
                            <Ionicons name="people" size={24} color="#3498db" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 2 }}>
                                {students.length}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#95a5a6', fontWeight: '500' }}>
                                {t('total_students')}
                            </Text>
                        </View>
                    </HoverCard>

                    <HoverCard style={{
                        flex: 1,
                        minWidth: 200,
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: 12,
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.08)',
                    }}>
                        <View style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: 12,
                        }}>
                            <Ionicons name="checkmark-circle" size={24} color="#2ecc71" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 2 }}>
                                {students.filter(s => s.intakes && s.intakes.length > 0).length}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#95a5a6', fontWeight: '500' }}>
                                {t('active_students')}
                            </Text>
                        </View>
                    </HoverCard>

                    <HoverCard style={{
                        flex: 1,
                        minWidth: 200,
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: 12,
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.08)',
                    }}>
                        <View style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: 12,
                        }}>
                            <Ionicons name="school" size={24} color="#9b59b6" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 2 }}>
                                {[...new Set(students.flatMap(s => s.intakes?.map(i => i.id) || []))].length}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#95a5a6', fontWeight: '500' }}>
                                {t('total_intakes')}
                            </Text>
                        </View>
                    </HoverCard>

                    <HoverCard style={{
                        flex: 1,
                        minWidth: 200,
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: 12,
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.08)',
                    }}>
                        <View style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: 12,
                        }}>
                            <Ionicons name="analytics" size={24} color="#f39c12" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 2 }}>
                                {students.length > 0 ? Math.round(students.reduce((sum, s) => sum + (s.intakes?.length || 0), 0) / students.length * 10) / 10 : 0}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#95a5a6', fontWeight: '500' }}>
                                {t('avg_intakes_per_student')}
                            </Text>
                        </View>
                    </HoverCard>
                </View>
            )}

            <FlatList
                data={filteredStudents}
                key={isDesktop ? 'desktop-3-col' : 'mobile-1-col'}
                numColumns={isDesktop ? 3 : 1}
                keyExtractor={(item) => item.id.toString()}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3498db" />
                }
                contentContainerStyle={{
                    paddingHorizontal: isDesktop ? 18 : 20,
                    paddingBottom: 40,
                    ...(isDesktop && { maxWidth: 1400, alignSelf: 'center', width: '100%' })
                }}
                columnWrapperStyle={isDesktop ? { marginBottom: 12 } : undefined}
                ListHeaderComponent={
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 20 }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>
                            {t('all_students_title')} ({filteredStudents.length})
                        </Text>
                        {loading && <ActivityIndicator size="small" color="#3498db" />}
                    </View>
                }
                renderItem={({ item: student }) => (
                    <View style={{ width: isDesktop ? '33.33%' : '100%', paddingHorizontal: isDesktop ? 6 : 0, marginBottom: isDesktop ? 0 : 12 }}>
                        <HoverCard
                            onPress={() => router.push(`/student-details/${student.id}`)}
                            style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                borderRadius: 16,
                                padding: 16,
                                flexDirection: isDesktop ? 'column' : 'row',
                                alignItems: isDesktop ? 'flex-start' : 'center',
                                borderWidth: 1,
                                borderColor: 'rgba(255, 255, 255, 0.08)',
                                height: isDesktop ? '100%' : undefined
                            }}
                            activeScale={0.98}
                        >
                            <View style={{ marginEnd: isDesktop ? 0 : 16, marginBottom: isDesktop ? 12 : 0, alignSelf: isDesktop ? 'center' : 'flex-start' }}>
                                <ProfilePicture
                                    imageUrl={student.profile_picture_url}
                                    firstName={student.name ? student.name.split(' ')[0] : 'Student'}
                                    lastName={student.name && student.name.split(' ').length > 1 ? student.name.split(' ').slice(1).join(' ') : ''}
                                    size={56}
                                />
                            </View>

                            <View style={{ flex: 1, width: '100%' }}>
                                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 4, textAlign: isDesktop ? 'center' : 'left' }}>
                                    {student.name}
                                </Text>
                                <Text style={{ color: '#bdc3c7', fontSize: 14, marginBottom: 8, textAlign: isDesktop ? 'center' : 'left' }}>
                                    {student.email}
                                </Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: isDesktop ? 'center' : 'flex-start' }}>
                                    {student.intakes.map((intake, index) => (
                                        <View
                                            key={index}
                                            style={{
                                                backgroundColor: 'rgba(52, 152, 219, 0.15)',
                                                paddingHorizontal: 10,
                                                paddingVertical: 4,
                                                borderRadius: 6,
                                                borderWidth: 1,
                                                borderColor: 'rgba(52, 152, 219, 0.3)'
                                            }}
                                        >
                                            <Text style={{ color: '#3498db', fontSize: 11, fontWeight: '600' }}>{intake.name}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>

                            {!isDesktop && (
                                <View style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    backgroundColor: '#333',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Ionicons name="chevron-forward" size={16} color="#fff" />
                                </View>
                            )}
                        </HoverCard>
                    </View>
                )}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', paddingVertical: 60, opacity: 0.5 }}>
                        <Ionicons name="people-outline" size={64} color="#7f8c8d" />
                        <Text style={{ color: '#7f8c8d', marginTop: 15, fontSize: 16, textAlign: 'center' }}>
                            {t('no_students_found')}
                        </Text>
                    </View>
                }
            />
        </View>
    );
};

export default StudentsScreen;
