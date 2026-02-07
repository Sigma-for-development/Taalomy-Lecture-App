import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    StatusBar,
    RefreshControl,
    ActivityIndicator
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { tokenStorage } from '../utils/tokenStorage';
const AsyncStorage = tokenStorage;
import { Ionicons } from '@expo/vector-icons';
import { lecturerAPI } from '../src/utils/api';
import { useTranslation } from 'react-i18next';
import { API_CONFIG } from '../src/config/api';

interface PendingSubmission {
    id: number;
    quiz_title: string;
    quiz_id: number;
    student_name: string;
    intake_name: string;
    submitted_at: string;
    student_id: number;
}

const GradingScreen = () => {
    const { t, i18n } = useTranslation();
    const [submissions, setSubmissions] = useState<PendingSubmission[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const baseurl = API_CONFIG.ACCOUNTS_BASE_URL;

    useFocusEffect(
        useCallback(() => {
            loadPendingGrades();
        }, [])
    );

    const loadPendingGrades = async () => {
        try {
            setLoading(true);
            const response = await lecturerAPI.getPendingGrades();
            setSubmissions(response.data);
        } catch (error) {
            console.error('Error loading pending grades:', error);
            Alert.alert(t('error_loading_grades_title'), t('error_loading_grades_msg'));
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadPendingGrades();
        setRefreshing(false);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
                <ActivityIndicator size="large" color="#f1c40f" />
                <Text style={{ color: '#fff', marginTop: 16 }}>{t('loading_pending_grades')}</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
            <StatusBar barStyle="light-content" />

            {/* Premium Header */}
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
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
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
                    <Text style={{ fontSize: 24, fontWeight: '700', color: '#fff' }}>
                        {t('grading_center_header')}
                    </Text>
                </View>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginStart: 55,
                    backgroundColor: 'rgba(241, 196, 15, 0.1)',
                    alignSelf: 'flex-start',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: 'rgba(241, 196, 15, 0.3)'
                }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#f1c40f', marginEnd: 8 }} />
                    <Text style={{ color: '#f1c40f', fontSize: 13, fontWeight: '600' }}>
                        {t(submissions.length === 1 ? 'submissions_waiting_msg' : 'submissions_waiting_msg_other', { count: submissions.length })}
                    </Text>
                </View>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 20 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3498db" />
                }
            >
                {submissions.map((submission) => (
                    <TouchableOpacity
                        key={submission.id}
                        onPress={() => router.push(`/submission-grading/${submission.id}`)}
                        style={{
                            backgroundColor: '#252525',
                            borderRadius: 16,
                            padding: 20,
                            marginBottom: 16,
                            borderWidth: 1,
                            borderColor: '#333',
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 4,
                            elevation: 3
                        }}
                    >
                        {/* Header Row */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <View style={{ flex: 1, paddingEnd: 10 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                    <View style={{
                                        backgroundColor: 'rgba(241, 196, 15, 0.15)',
                                        paddingHorizontal: 8,
                                        paddingVertical: 4,
                                        borderRadius: 6,
                                        borderWidth: 1,
                                        borderColor: 'rgba(241, 196, 15, 0.3)',
                                        alignSelf: 'flex-start'
                                    }}>
                                        <Text style={{ color: '#f1c40f', fontSize: 10, fontWeight: '700' }}>{t('ungraded_badge').toUpperCase()}</Text>
                                    </View>
                                </View>
                                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', lineHeight: 22 }}>
                                    {submission.quiz_title}
                                </Text>
                            </View>
                            <View style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: '#333',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Ionicons name="chevron-forward" size={18} color="#bdc3c7" />
                            </View>
                        </View>

                        {/* Divider */}
                        <View style={{ height: 1, backgroundColor: '#333', marginBottom: 12 }} />

                        {/* Student Info */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(52, 152, 219, 0.1)', alignItems: 'center', justifyContent: 'center', marginEnd: 10 }}>
                                <Ionicons name="person" size={14} color="#3498db" />
                            </View>
                            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{submission.student_name}</Text>
                        </View>

                        {/* Meta Info */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="time-outline" size={14} color="#7f8c8d" style={{ marginEnd: 6 }} />
                                <Text style={{ color: '#7f8c8d', fontSize: 13 }}>
                                    {formatDate(submission.submitted_at)}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="school-outline" size={14} color="#7f8c8d" style={{ marginEnd: 6 }} />
                                <Text style={{ color: '#7f8c8d', fontSize: 13 }}>
                                    {submission.intake_name}
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}

                {submissions.length === 0 && (
                    <View style={{ alignItems: 'center', paddingVertical: 80, opacity: 0.6 }}>
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
                            <Ionicons name="checkmark-done" size={48} color="#2ecc71" />
                        </View>
                        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 10 }}>
                            {t('all_caught_up_title')}
                        </Text>
                        <Text style={{ color: '#7f8c8d', fontSize: 15, textAlign: 'center' }}>
                            {t('no_pending_submissions_msg')}
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

export default GradingScreen;
