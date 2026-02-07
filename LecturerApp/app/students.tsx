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
    Image
} from 'react-native';
import { router } from 'expo-router';
import { tokenStorage } from '../utils/tokenStorage';
const AsyncStorage = tokenStorage;
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_CONFIG } from '../src/config/api';
import { useTranslation } from 'react-i18next';
import ProfilePicture from '../src/components/ProfilePicture';

interface Student {
    id: number;
    name: string;
    email: string;
    profile_picture_url?: string;
    intakes: { id: number; name: string }[];
}

const StudentsScreen = () => {
    const { t } = useTranslation();
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

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={{ color: '#fff', marginTop: 16 }}>{t('loading_students')}</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View
                style={{
                    paddingTop: 60,
                    paddingBottom: 20,
                    paddingHorizontal: 20,
                    backgroundColor: '#1a1a1a',
                    borderBottomWidth: 1,
                    borderBottomColor: '#2c2c2c',
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
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
                    <Text style={{ fontSize: 24, fontWeight: '700', color: '#fff' }}>
                        {t('students_directory_title')}
                    </Text>
                </View>

                {/* Search Bar */}
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

            <ScrollView
                style={{ flex: 1 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3498db" />
                }
            >
                <View style={{ padding: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>
                            {t('all_students_title')} ({filteredStudents.length})
                        </Text>
                        {loading && <ActivityIndicator size="small" color="#3498db" />}
                    </View>

                    {filteredStudents.map((student) => (
                        <TouchableOpacity
                            key={student.id}
                            onPress={() => router.push(`/student-details/${student.id}`)}
                            style={{
                                backgroundColor: '#252525',
                                borderRadius: 16,
                                padding: 16,
                                marginBottom: 12,
                                flexDirection: 'row',
                                alignItems: 'center',
                                borderWidth: 1,
                                borderColor: '#333'
                            }}
                        >
                            <View style={{ marginEnd: 16 }}>
                                <ProfilePicture
                                    imageUrl={student.profile_picture_url}
                                    firstName={student.name ? student.name.split(' ')[0] : 'Student'}
                                    lastName={student.name && student.name.split(' ').length > 1 ? student.name.split(' ').slice(1).join(' ') : ''}
                                    size={56}
                                />
                            </View>

                            <View style={{ flex: 1 }}>
                                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 4 }}>
                                    {student.name}
                                </Text>
                                <Text style={{ color: '#bdc3c7', fontSize: 14, marginBottom: 8 }}>
                                    {student.email}
                                </Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
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
                        </TouchableOpacity>
                    ))}

                    {filteredStudents.length === 0 && (
                        <View style={{ alignItems: 'center', paddingVertical: 60, opacity: 0.5 }}>
                            <Ionicons name="people-outline" size={64} color="#7f8c8d" />
                            <Text style={{ color: '#7f8c8d', marginTop: 15, fontSize: 16, textAlign: 'center' }}>
                                {t('no_students_found')}
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

export default StudentsScreen;
