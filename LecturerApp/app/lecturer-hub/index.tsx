import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { lecturerAPI } from '../../src/utils/api';
import ProfilePicture from '../../src/components/ProfilePicture';
import { tokenStorage } from '../../utils/tokenStorage';

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

    const renderLecturer = ({ item }: { item: Lecturer }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/lecturer-hub/${item.id}`)}
        >
            <View style={{ marginRight: 16 }}>
                <ProfilePicture
                    imageUrl={item.lecturer_profile_picture}
                    size={60}
                />
            </View>
            <View style={styles.cardContent}>
                <View style={styles.headerRow}>
                    <Text style={styles.name}>
                        {item.lecturer_name}
                        {item.lecturer.id === currentUserId && <Text style={{ color: '#3498db', fontSize: 14 }}>{t('lecturer_hub.me_suffix')}</Text>}
                    </Text>
                    {item.is_verified && <Ionicons name="checkmark-circle" size={16} color="#2ecc71" style={{ marginLeft: 4 }} />}
                </View>
                <Text style={styles.speciality}>{item.speciality}</Text>
                <View style={styles.row}>
                    <Ionicons name="star" size={14} color="#f1c40f" />
                    <Text style={styles.rating}>{item.rating} ({item.total_reviews})</Text>
                </View>
                <Text style={styles.rate}>{t('lecturer_hub.rate_from')}{parseFloat(item.hourly_rate).toFixed(0)} {t('currency')}{t('lecturer_hub.rate_suffix')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#bdc3c7" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#ecf0f1" />
                </TouchableOpacity>
                <Text style={styles.title}>{t('lecturer_hub.title')}</Text>
            </View>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#7f8c8d" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={t('lecturer_hub.search_placeholder')}
                    placeholderTextColor="#7f8c8d"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {loading && !refreshing ? (
                <ActivityIndicator size="large" color="#3498db" style={styles.loader} />
            ) : (
                <FlatList
                    data={lecturers}
                    renderItem={renderLecturer}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.list}
                    refreshing={refreshing}
                    onRefresh={() => {
                        setRefreshing(true);
                        fetchLecturers();
                    }}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>{t('lecturer_hub.no_lecturers_found')}</Text>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#0a0a0a',
        paddingTop: 60,
        borderBottomWidth: 1,
        borderBottomColor: '#2d3436',
    },
    backButton: {
        marginRight: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ecf0f1',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        margin: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        height: 50,
        borderWidth: 1,
        borderColor: '#2d3436',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        fontSize: 16,
        color: '#ecf0f1',
    },
    list: {
        padding: 16,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 16,
    },
    cardContent: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ecf0f1',
    },
    speciality: {
        fontSize: 14,
        color: '#bdc3c7',
        marginBottom: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    rating: {
        fontSize: 12,
        color: '#bdc3c7',
        marginLeft: 4,
    },
    rate: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2ecc71',
    },
    loader: {
        marginTop: 40,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        fontSize: 16,
        color: '#bdc3c7',
    },
});
