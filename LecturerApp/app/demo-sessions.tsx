import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    RefreshControl,
    TextInput,
    ActivityIndicator,
    FlatList,
    Platform
} from 'react-native';
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { tokenStorage } from '../utils/tokenStorage';
const AsyncStorage = tokenStorage;
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_CONFIG } from '../src/config/api';
import { useResponsive } from '../src/hooks/useResponsive';

interface Intake {
    id: number;
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    max_students: number;
    current_students: number;
    status: 'active' | 'inactive' | 'completed';
    is_demo: boolean;
    price: string;
}

const DemoSessionsScreen = () => {
    const { t } = useTranslation();
    const { isDesktop } = useResponsive();
    const isWeb = Platform.OS === 'web';
    const [intakes, setIntakes] = useState<Intake[]>([]);
    const [filteredIntakes, setFilteredIntakes] = useState<Intake[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const baseurl = API_CONFIG.ACCOUNTS_BASE_URL;

    // Calculate statistics
    const totalSessions = filteredIntakes.length;
    const upcomingSessions = filteredIntakes.filter(i => i.status === 'active').length;
    const completedSessions = filteredIntakes.filter(i => i.status === 'completed').length;
    const totalParticipants = filteredIntakes.reduce((sum, i) => sum + i.current_students, 0);

    useEffect(() => {
        loadIntakes();
    }, []);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredIntakes(intakes);
        } else {
            const filtered = intakes.filter(intake =>
                intake.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                intake.description.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredIntakes(filtered);
        }
    }, [searchQuery, intakes]);

    const loadIntakes = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('access_token');
            // Fetch all intakes and filter for demos client-side
            const response = await axios.get(`${baseurl}lecturer/intakes/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Filter for demo sessions only
            const demoIntakes = response.data.filter((intake: Intake) => intake.is_demo === true);
            setIntakes(demoIntakes);
            setFilteredIntakes(demoIntakes);
        } catch (error) {
            console.error('Error loading demo sessions:', error);
            Toast.show({
                type: 'error',
                text1: t('error_loading_demo'),
                text2: t('error_load_demo_msg')
            });
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadIntakes();
        setRefreshing(false);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
                <ActivityIndicator size="large" color="#2ecc71" />
                <Text style={{ color: '#fff', marginTop: 16 }}>{t('loading')}...</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
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
                    paddingHorizontal: isDesktop ? 24 : 20,
                    backgroundColor: '#1a1a1a',
                    borderBottomWidth: 1,
                    borderBottomColor: '#2c2c2c',
                }}
            >
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
                                borderWidth: 1,
                                borderColor: '#333',
                                marginEnd: 15
                            }}
                        >
                            <Ionicons name="arrow-back" size={22} color="#fff" />
                        </TouchableOpacity>
                    )}
                    <Text style={{ fontSize: 24, fontWeight: '700', color: '#fff' }}>
                        {t('demo_sessions_title')}
                    </Text>
                </View>
            </View>

            {/* Statistics Cards */}
            <View style={{
                flexDirection: isDesktop ? 'row' : 'column',
                flexWrap: 'wrap',
                paddingHorizontal: isDesktop ? 24 : 20,
                paddingTop: 20,
                paddingBottom: 16,
                gap: 12,
                backgroundColor: '#1a1a1a',
                ...(isDesktop && { maxWidth: 1400, alignSelf: 'center', width: '100%' })
            }}>
                <View style={{
                    flex: isDesktop ? 1 : undefined,
                    minWidth: isDesktop ? 150 : undefined,
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
                        <Ionicons name="flask" size={24} color="#2ecc71" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 2 }}>
                            {totalSessions}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#95a5a6', fontWeight: '500' }}>
                            {t('total_demo_sessions')}
                        </Text>
                    </View>
                </View>

                <View style={{
                    flex: isDesktop ? 1 : undefined,
                    minWidth: isDesktop ? 150 : undefined,
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
                        <Ionicons name="calendar" size={24} color="#3498db" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 2 }}>
                            {upcomingSessions}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#95a5a6', fontWeight: '500' }}>
                            {t('upcoming_sessions')}
                        </Text>
                    </View>
                </View>

                <View style={{
                    flex: isDesktop ? 1 : undefined,
                    minWidth: isDesktop ? 150 : undefined,
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
                        <Ionicons name="checkmark-circle" size={24} color="#9b59b6" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 2 }}>
                            {completedSessions}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#95a5a6', fontWeight: '500' }}>
                            {t('completed_sessions')}
                        </Text>
                    </View>
                </View>

                <View style={{
                    flex: isDesktop ? 1 : undefined,
                    minWidth: isDesktop ? 150 : undefined,
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
                        <Ionicons name="people" size={24} color="#f39c12" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 2 }}>
                            {totalParticipants}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#95a5a6', fontWeight: '500' }}>
                            {t('total_participants')}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Search Bar */}
            <View style={{
                paddingHorizontal: isDesktop ? 24 : 20,
                paddingVertical: 16,
                backgroundColor: '#1a1a1a',
                ...(isDesktop && { maxWidth: 1400, alignSelf: 'center', width: '100%' })
            }}>
                <TextInput
                    style={{
                        backgroundColor: '#252525',
                        borderRadius: 10,
                        paddingHorizontal: 15,
                        paddingVertical: 12,
                        color: '#fff',
                        fontSize: 16,
                        borderWidth: 1,
                        borderColor: '#333',
                    }}
                    placeholder={t('demo_sessions_search_placeholder')}
                    placeholderTextColor="#7f8c8d"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="done"
                />
            </View>

            <FlatList
                data={filteredIntakes}
                key={isDesktop ? 'desktop-3-col' : 'mobile-1-col'}
                numColumns={isDesktop ? 3 : 1}
                keyExtractor={(item) => item.id.toString()}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2ecc71" />
                }
                contentContainerStyle={{
                    paddingHorizontal: isDesktop ? 18 : 20,
                    paddingBottom: 40,
                    ...(isDesktop && { maxWidth: 1400, alignSelf: 'center', width: '100%' })
                }}
                columnWrapperStyle={isDesktop ? { marginBottom: 12 } : undefined}
                renderItem={({ item: intake }) => (
                    <View style={{ width: isDesktop ? '33.33%' : '100%', paddingHorizontal: isDesktop ? 6 : 0, marginBottom: isDesktop ? 0 : 16 }}>
                        <TouchableOpacity
                            onPress={() => router.push(`/intake-details/${intake.id}`)}
                            style={{
                                backgroundColor: '#2c2c2c',
                                borderRadius: 15,
                                padding: 20,
                                borderLeftWidth: 4,
                                borderLeftColor: '#2ecc71',
                                height: '100%'
                            }}
                        >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1 }}>
                                    {intake.name}
                                </Text>
                                <View style={{
                                    backgroundColor: 'rgba(46, 204, 113, 0.2)',
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 12,
                                }}>
                                    <Text style={{ color: '#2ecc71', fontSize: 12, fontWeight: 'bold' }}>
                                        {t('demo_label')}
                                    </Text>
                                </View>
                            </View>

                            <Text style={{ color: '#bdc3c7', fontSize: 14, marginBottom: 10, lineHeight: 20 }} numberOfLines={2}>
                                {intake.description}
                            </Text>

                            <View style={{ flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                                <Text style={{ color: '#95a5a6', fontSize: 12 }}>
                                    <Text style={{ fontWeight: 'bold' }}>{t('date_label')}:</Text> {formatDate(intake.start_date)}
                                </Text>
                                <Text style={{ color: '#2ecc71', fontSize: 14, fontWeight: 'bold' }}>
                                    {t('price_label')}: ${intake.price}
                                </Text>
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ color: '#2ecc71', fontSize: 14, fontWeight: 'bold' }}>
                                    {intake.current_students} {t('students_enrolled_suffix')}
                                </Text>
                                {!isDesktop && <Ionicons name="chevron-forward" size={16} color="#95a5a6" />}
                            </View>
                        </TouchableOpacity>
                    </View>
                )}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                        <Ionicons name="flask-outline" size={48} color="#7f8c8d" />
                        <Text style={{ color: '#7f8c8d', marginTop: 10, fontSize: 16 }}>
                            {t('no_demo_sessions')}
                        </Text>
                    </View>
                }
            />
        </View>
    );
};

export default DemoSessionsScreen;
