import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    StatusBar,
    ActivityIndicator,
    Image,
    StyleSheet
} from 'react-native';
import { tokenStorage } from '../../utils/tokenStorage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_CONFIG } from '../../src/config/api';
import { useTranslation } from 'react-i18next';
import ProfilePicture from '../../src/components/ProfilePicture';
const AsyncStorage = tokenStorage;

interface QuizGrade {
    id: number;
    submission_id: number | null;
    title: string;
    score: number | null;
    total_points: number;
    is_graded: boolean;
    status: string;
    submitted_at: string | null;
}

interface ClassInfo {
    id: number;
    name: string;
    description: string;
    attendance_score: number;
    total_sessions: number;
    attended_sessions: number;
}

interface GroupInfo {
    id: number;
    name: string;
    attendance_score: number;
    total_sessions: number;
    attended_sessions: number;
}

interface StudentIntake {
    id: number;
    name: string;
    status: string;
    classes: ClassInfo[];
    groups: GroupInfo[];
    quizzes: QuizGrade[];
}

interface StudentDetail {
    id: number;
    name: string;
    email: string;
    profile_picture_url?: string;
    intakes: StudentIntake[];
}

const StudentDetailsScreen = () => {
    const { t } = useTranslation();
    const { id } = useLocalSearchParams();
    const [student, setStudent] = useState<StudentDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedIntakes, setExpandedIntakes] = useState<number[]>([]);

    const baseurl = API_CONFIG.ACCOUNTS_BASE_URL;

    useFocusEffect(
        useCallback(() => {
            if (id) {
                loadStudentDetails();
            }
        }, [id])
    );

    const loadStudentDetails = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('access_token');
            const response = await axios.get(`${baseurl}lecturer/student/${id}/details/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setStudent(response.data);
            // Auto expand if only one intake
            if (response.data.intakes && response.data.intakes.length === 1) {
                setExpandedIntakes([response.data.intakes[0].id]);
            }
        } catch (error) {
            console.error('Error loading student details:', error);
            Alert.alert(t('error'), t('error_loading_details'));
        } finally {
            setLoading(false);
        }
    };

    const toggleIntake = (intakeId: number) => {
        if (expandedIntakes.includes(intakeId)) {
            setExpandedIntakes(expandedIntakes.filter(id => id !== intakeId));
        } else {
            setExpandedIntakes([...expandedIntakes, intakeId]);
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={styles.loadingText}>{t('loading_profile')}</Text>
            </View>
        );
    }

    if (!student) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{t('student_not_found')}</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>{t('go_back')}</Text>
                </TouchableOpacity>
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
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}
            >
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
                        borderColor: '#333'
                    }}
                >
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>

                <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>{t('student_profile_title')}</Text>

                <TouchableOpacity
                    onPress={() => router.push(`/direct-message/${student.id}`)}
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: '#3498db',
                        alignItems: 'center',
                        justifyContent: 'center',
                        elevation: 5,
                        shadowColor: "#3498db",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 3.84,
                    }}
                >
                    <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
                {/* Premium Profile Card */}
                <View style={{
                    backgroundColor: '#252525',
                    borderRadius: 20,
                    padding: 24,
                    marginBottom: 24,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#333',
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 5,
                    elevation: 5,
                }}>
                    <View style={{
                        padding: 4,
                        backgroundColor: '#1a1a1a',
                        borderRadius: 54, // size/2 + padding
                        marginBottom: 16,
                        borderWidth: 1,
                        borderColor: '#333'
                    }}>
                        <ProfilePicture
                            imageUrl={student.profile_picture_url}
                            firstName={student.name.split(' ')[0]}
                            lastName={student.name.split(' ').slice(1).join(' ')}
                            size={100}
                        />
                    </View>
                    <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 4, textAlign: 'center' }}>
                        {student.name}
                    </Text>
                    <Text style={{ fontSize: 14, color: '#bdc3c7', marginBottom: 16 }}>
                        {student.email}
                    </Text>

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ backgroundColor: 'rgba(52, 152, 219, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(52, 152, 219, 0.3)' }}>
                            <Text style={{ color: '#3498db', fontSize: 12, fontWeight: '600' }}>ID: #{student.id}</Text>
                        </View>
                        <View style={{ backgroundColor: 'rgba(46, 204, 113, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(46, 204, 113, 0.3)' }}>
                            <Text style={{ color: '#2ecc71', fontSize: 12, fontWeight: '600' }}>{student.intakes.length} {t('intakes_label')}</Text>
                        </View>
                    </View>
                </View>

                <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 16 }}>
                    {t('enrolled_intakes_title')}
                </Text>

                {student.intakes.map((intake) => (
                    <View
                        key={intake.id}
                        style={{
                            backgroundColor: '#252525',
                            borderRadius: 16,
                            marginBottom: 16,
                            borderWidth: 1,
                            borderColor: '#333',
                            overflow: 'hidden'
                        }}
                    >
                        <TouchableOpacity
                            onPress={() => toggleIntake(intake.id)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: 16,
                                backgroundColor: expandedIntakes.includes(intake.id) ? '#2c2c2c' : 'transparent'
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                <View style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: 'rgba(52, 152, 219, 0.15)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginEnd: 12
                                }}>
                                    <Ionicons name="school" size={20} color="#3498db" />
                                </View>
                                <View>
                                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 2 }}>{intake.name}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={{ fontSize: 12, color: '#bdc3c7', marginEnd: 8 }}>
                                            {intake.classes.length} {t('classes_suffix')}
                                        </Text>
                                        <View style={{
                                            backgroundColor: intake.status === 'Active' ? 'rgba(46, 204, 113, 0.2)' : 'rgba(149, 165, 166, 0.2)',
                                            paddingHorizontal: 6,
                                            paddingVertical: 2,
                                            borderRadius: 4
                                        }}>
                                            <Text style={{
                                                fontSize: 10,
                                                fontWeight: '700',
                                                color: intake.status === 'Active' ? '#2ecc71' : '#95a5a6'
                                            }}>
                                                {intake.status.toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                            <Ionicons
                                name={expandedIntakes.includes(intake.id) ? "chevron-up" : "chevron-down"}
                                size={20}
                                color="#7f8c8d"
                            />
                        </TouchableOpacity>

                        {expandedIntakes.includes(intake.id) && (
                            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#333' }}>
                                {/* Classes Section */}
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#7f8c8d', marginBottom: 12, textTransform: 'uppercase' }}>
                                    {t('classes_attendance_title')}
                                </Text>
                                {intake.classes.length > 0 ? (
                                    <View style={{ marginBottom: 20 }}>
                                        {intake.classes.map(cls => (
                                            <View key={cls.id} style={{
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: 10,
                                                backgroundColor: '#1a1a1a',
                                                padding: 12,
                                                borderRadius: 10,
                                                borderWidth: 1,
                                                borderColor: '#2c2c2c'
                                            }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Ionicons name="book" size={16} color="#bdc3c7" />
                                                    </View>
                                                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{cls.name}</Text>
                                                </View>
                                                <View style={{
                                                    backgroundColor: cls.attendance_score >= 75 ? 'rgba(46, 204, 113, 0.15)' : cls.attendance_score >= 50 ? 'rgba(241, 196, 15, 0.15)' : 'rgba(231, 76, 60, 0.15)',
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 4,
                                                    borderRadius: 6,
                                                    borderWidth: 1,
                                                    borderColor: cls.attendance_score >= 75 ? 'rgba(46, 204, 113, 0.3)' : cls.attendance_score >= 50 ? 'rgba(241, 196, 15, 0.3)' : 'rgba(231, 76, 60, 0.3)'
                                                }}>
                                                    <Text style={{
                                                        fontSize: 12,
                                                        fontWeight: '700',
                                                        color: cls.attendance_score >= 75 ? '#2ecc71' : cls.attendance_score >= 50 ? '#f1c40f' : '#e74c3c'
                                                    }}>
                                                        {cls.attendance_score}%
                                                    </Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <Text style={{ color: '#7f8c8d', fontStyle: 'italic', fontSize: 14, marginBottom: 20 }}>{t('no_classes_enrolled')}</Text>
                                )}

                                {/* Groups Section */}
                                {intake.groups && intake.groups.length > 0 && (
                                    <>
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#7f8c8d', marginBottom: 12, textTransform: 'uppercase' }}>
                                            {t('groups_attendance_title')}
                                        </Text>
                                        <View style={{ marginBottom: 20 }}>
                                            {intake.groups.map(grp => (
                                                <View key={grp.id} style={{
                                                    flexDirection: 'row',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: 10,
                                                    backgroundColor: '#1a1a1a',
                                                    padding: 12,
                                                    borderRadius: 10,
                                                    borderWidth: 1,
                                                    borderColor: '#2c2c2c'
                                                }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                        <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Ionicons name="people" size={16} color="#bdc3c7" />
                                                        </View>
                                                        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{grp.name}</Text>
                                                    </View>
                                                    <View style={{
                                                        backgroundColor: grp.attendance_score >= 75 ? 'rgba(46, 204, 113, 0.15)' : grp.attendance_score >= 50 ? 'rgba(241, 196, 15, 0.15)' : 'rgba(231, 76, 60, 0.15)',
                                                        paddingHorizontal: 8,
                                                        paddingVertical: 4,
                                                        borderRadius: 6,
                                                        borderWidth: 1,
                                                        borderColor: grp.attendance_score >= 75 ? 'rgba(46, 204, 113, 0.3)' : grp.attendance_score >= 50 ? 'rgba(241, 196, 15, 0.3)' : 'rgba(231, 76, 60, 0.3)'
                                                    }}>
                                                        <Text style={{
                                                            fontSize: 12,
                                                            fontWeight: '700',
                                                            color: grp.attendance_score >= 75 ? '#2ecc71' : grp.attendance_score >= 50 ? '#f1c40f' : '#e74c3c'
                                                        }}>
                                                            {grp.attendance_score}%
                                                        </Text>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    </>
                                )}

                                {/* Quizzes Section */}
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#7f8c8d', marginBottom: 12, textTransform: 'uppercase' }}>
                                    {t('quiz_grades_title')}
                                </Text>
                                {intake.quizzes.length > 0 ? (
                                    <View>
                                        {intake.quizzes.map(quiz => (
                                            <TouchableOpacity
                                                key={quiz.id}
                                                style={{
                                                    flexDirection: 'row',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: 10,
                                                    backgroundColor: '#1a1a1a',
                                                    padding: 12,
                                                    borderRadius: 10,
                                                    borderWidth: 1,
                                                    borderColor: '#2c2c2c'
                                                }}
                                                onPress={() => {
                                                    if (quiz.submission_id) {
                                                        router.push(`/submission-grading/${quiz.submission_id}`);
                                                    } else {
                                                        Alert.alert(t('info'), t('quiz_not_submitted_msg'));
                                                    }
                                                }}
                                            >
                                                <View style={{ flex: 1, marginEnd: 10 }}>
                                                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 4 }}>{quiz.title}</Text>
                                                    <Text style={{ color: '#7f8c8d', fontSize: 12 }}>
                                                        {t('submitted_label')} {formatDate(quiz.submitted_at)}
                                                    </Text>
                                                </View>
                                                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                                    {quiz.status === 'Graded' ? (
                                                        <View style={{
                                                            flexDirection: 'row',
                                                            alignItems: 'baseline',
                                                            backgroundColor: 'rgba(46, 204, 113, 0.15)',
                                                            paddingHorizontal: 8,
                                                            paddingVertical: 4,
                                                            borderRadius: 6,
                                                            borderWidth: 1,
                                                            borderColor: 'rgba(46, 204, 113, 0.3)'
                                                        }}>
                                                            <Text style={{ color: '#2ecc71', fontWeight: '700', fontSize: 14 }}>{quiz.score}</Text>
                                                            <Text style={{ color: '#2ecc71', fontSize: 10, marginStart: 1 }}>/{quiz.total_points}</Text>
                                                        </View>
                                                    ) : (
                                                        <View style={{
                                                            paddingHorizontal: 8,
                                                            paddingVertical: 4,
                                                            borderRadius: 6,
                                                            backgroundColor: quiz.status === 'Pending' ? 'rgba(241, 196, 15, 0.15)' : 'rgba(149, 165, 166, 0.15)',
                                                            borderWidth: 1,
                                                            borderColor: quiz.status === 'Pending' ? 'rgba(241, 196, 15, 0.3)' : 'rgba(149, 165, 166, 0.3)'
                                                        }}>
                                                            <Text style={{
                                                                fontSize: 10,
                                                                fontWeight: '700',
                                                                color: quiz.status === 'Pending' ? '#f1c40f' : '#95a5a6'
                                                            }}>
                                                                {quiz.status === 'Pending' ? t('pending') : quiz.status}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                                {quiz.submission_id && (
                                                    <Ionicons name="chevron-forward" size={16} color="#7f8c8d" style={{ marginStart: 8 }} />
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                ) : (
                                    <Text style={{ color: '#7f8c8d', fontStyle: 'italic', fontSize: 14 }}>{t('no_quizzes_taken')}</Text>
                                )}
                            </View>
                        )}
                    </View>
                ))}

                {student.intakes.length === 0 && (
                    <View style={{ alignItems: 'center', paddingVertical: 50, opacity: 0.5 }}>
                        <Ionicons name="folder-open-outline" size={64} color="#7f8c8d" />
                        <Text style={{ color: '#7f8c8d', marginTop: 15, fontSize: 16 }}>{t('no_active_enrollments')}</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
    },
    loadingText: {
        color: '#fff',
        marginTop: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
    },
    errorText: {
        color: '#e74c3c',
        fontSize: 18,
        marginBottom: 20,
    },
    backButton: {
        backgroundColor: '#3498db',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    backButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default StudentDetailsScreen;
