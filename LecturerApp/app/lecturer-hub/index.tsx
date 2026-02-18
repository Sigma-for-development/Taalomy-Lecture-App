import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { lecturerAPI } from '../../src/utils/api';
import ProfilePicture from '../../src/components/ProfilePicture';
import { tokenStorage } from '../../utils/tokenStorage';
import { useResponsive } from '../../src/hooks/useResponsive';

interface Lecturer {
    id: number;
    lecturer: {
        id: number;
    };
    lecturer_name: string;
    lecturer_profile_picture: string | null;
    speciality: string;
    hourly_rate: string;
    rating: number;
    total_reviews: number;
    is_verified: boolean;
    languages: string;
}

export default function LecturerHubScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const { isDesktop } = useResponsive();
    const isWeb = Platform.OS === 'web';
    const [lecturers, setLecturers] = useState<Lecturer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    const fetchLecturers = async () => {
        try {
            setLoading(true);
            const response = await lecturerAPI.getLecturerDirectory({ search: searchQuery });
            setLecturers(response.data);
        } catch (error) {
            console.error('Error fetching lecturers:', error);
            Alert.alert('Error', 'Failed to load lecturers');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const loadUserAndFetch = async () => {
            const userData = await tokenStorage.getItem('user_data');
            if (userData) {
                try {
                    const parsed = JSON.parse(userData);
                    setCurrentUserId(parsed.id);
                } catch (e) {
                    console.error('Error parsing user data', e);
                }
            }
            fetchLecturers();
        };
        loadUserAndFetch();
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchLecturers();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    // Calculate statistics
    const totalLecturers = lecturers.length;
    const verifiedLecturers = lecturers.filter(lec => lec.is_verified).length;
    const averageRating = lecturers.length > 0
        ? (lecturers.reduce((sum, lec) => sum + lec.rating, 0) / lecturers.length).toFixed(1)
        : '0.0';
    const totalReviews = lecturers.reduce((sum, lec) => sum + lec.total_reviews, 0);

    const renderLecturer = ({ item }: { item: Lecturer }) => (
        <View style={{ width: isDesktop ? '33.33%' : '100%', paddingHorizontal: isDesktop ? 6 : 0, marginBottom: isDesktop ? 0 : 12 }}>
            <TouchableOpacity
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#1a1a1a',
                    padding: 16,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.05)',
                    height: isDesktop ? '100%' : undefined
                }}
                onPress={() => router.push(`/lecturer-hub/${item.id}`)}
            >
                <View style={{ marginRight: 16 }}>
                    <ProfilePicture
                        imageUrl={item.lecturer_profile_picture}
                        size={60}
                    />
                </View>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#ecf0f1' }} numberOfLines={1}>
                            {item.lecturer_name}
                            {item.lecturer.id === currentUserId && <Text style={{ color: '#3498db', fontSize: 14 }}>{t('lecturer_hub.me_suffix')}</Text>}
                        </Text>
                        {item.is_verified && <Ionicons name="checkmark-circle" size={16} color="#2ecc71" style={{ marginLeft: 4 }} />}
                    </View>
                    <Text style={{ fontSize: 14, color: '#bdc3c7', marginBottom: 4 }} numberOfLines={1}>{item.speciality}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Ionicons name="star" size={14} color="#f1c40f" />
                        <Text style={{ fontSize: 12, color: '#bdc3c7', marginLeft: 4 }}>{item.rating} ({item.total_reviews})</Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#2ecc71' }}>
                        {t('lecturer_hub.rate_from')}{parseFloat(item.hourly_rate).toFixed(0)} {t('currency')}{t('lecturer_hub.rate_suffix')}
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#bdc3c7" />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: '#1b1b1b' }}>
            {/* Header */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                ...(isWeb ? { height: 80 } : {
                    paddingTop: Platform.OS === 'ios' ? 60 : 40,
                    paddingBottom: 20,
                }),
                paddingHorizontal: isDesktop ? 24 : 20,
                backgroundColor: '#1b1b1b',
                borderBottomWidth: 1,
                borderBottomColor: '#2c2c2c',
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
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
                        {t('lecturer_hub.title')}
                    </Text>
                </View>
            </View>

            {/* Statistics Cards - Desktop Only */}
            {isDesktop && (
                <View style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    paddingHorizontal: isDesktop ? 24 : 20,
                    paddingTop: 20,
                    paddingBottom: 16,
                    gap: 12,
                    backgroundColor: '#1b1b1b',
                    ...(isDesktop && { maxWidth: 1400, alignSelf: 'center', width: '100%' })
                }}>
                    <View style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: 12,
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.08)',
                        ...(isDesktop && { flex: 1, minWidth: 150 })
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
                                {totalLecturers}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#95a5a6', fontWeight: '500' }}>
                                {t('total_lecturers')}
                            </Text>
                        </View>
                    </View>

                    <View style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: 12,
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.08)',
                        ...(isDesktop && { flex: 1, minWidth: 150 })
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
                                {verifiedLecturers}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#95a5a6', fontWeight: '500' }}>
                                {t('verified_lecturers')}
                            </Text>
                        </View>
                    </View>

                    <View style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: 12,
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.08)',
                        ...(isDesktop && { flex: 1, minWidth: 150 })
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
                            <Ionicons name="star" size={24} color="#f1c40f" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 2 }}>
                                {averageRating}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#95a5a6', fontWeight: '500' }}>
                                {t('average_rating')}
                            </Text>
                        </View>
                    </View>

                    <View style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: 12,
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.08)',
                        ...(isDesktop && { flex: 1, minWidth: 150 })
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
                            <Ionicons name="chatbubbles" size={24} color="#9b59b6" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 2 }}>
                                {totalReviews}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#95a5a6', fontWeight: '500' }}>
                                {t('total_reviews')}
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Search Bar */}
            <View style={{
                paddingHorizontal: isDesktop ? 24 : 20,
                paddingBottom: 12,
                backgroundColor: '#1b1b1b',
                ...(isDesktop && { maxWidth: 1400, alignSelf: 'center', width: '100%' })
            }}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#1a1a1a',
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    height: 50,
                    borderWidth: 1,
                    borderColor: '#2d3436',
                }}>
                    <Ionicons name="search" size={20} color="#7f8c8d" style={{ marginRight: 10 }} />
                    <TextInput
                        style={{
                            flex: 1,
                            height: '100%',
                            fontSize: 16,
                            color: '#ecf0f1',
                        }}
                        placeholder={t('lecturer_hub.search_placeholder')}
                        placeholderTextColor="#7f8c8d"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {loading && !refreshing ? (
                <ActivityIndicator size="large" color="#3498db" style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={lecturers}
                    key={isDesktop ? 'desktop-3-col' : 'mobile-1-col'}
                    numColumns={isDesktop ? 3 : 1}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{
                        paddingHorizontal: isDesktop ? 18 : 20,
                        paddingBottom: 20,
                        ...(isDesktop && { maxWidth: 1400, alignSelf: 'center', width: '100%' })
                    }}
                    columnWrapperStyle={isDesktop ? { marginBottom: 12 } : undefined}
                    refreshing={refreshing}
                    onRefresh={() => {
                        setRefreshing(true);
                        fetchLecturers();
                    }}
                    renderItem={renderLecturer}
                    ListEmptyComponent={
                        <Text style={{
                            textAlign: 'center',
                            marginTop: 40,
                            fontSize: 16,
                            color: '#bdc3c7',
                        }}>
                            {t('lecturer_hub.no_lecturers_found')}
                        </Text>
                    }
                />
            )}
        </View>
    );
}
