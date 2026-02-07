import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    StatusBar,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { tokenStorage } from '../../utils/tokenStorage';
const AsyncStorage = tokenStorage;
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_CONFIG } from '../../src/config/api';
import { useTranslation } from 'react-i18next';

interface StudentAnswer {
    id: number;
    question_text: string;
    question_type: string;
    student_answer: string;
    correct_answer: string;
    max_points: number;
    points_awarded: number | null;
}

interface SubmissionDetail {
    id: number;
    student_name: string;
    quiz_title: string;
    intake_name: string;
    submitted_at: string;
    total_score: number | null;
    is_graded: boolean;
    answers: StudentAnswer[];
}

const SubmissionGradingScreen = () => {
    const { t } = useTranslation();
    const { id } = useLocalSearchParams();
    const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [grade, setGrade] = useState('');
    const [feedback, setFeedback] = useState('');

    const baseurl = API_CONFIG.ACCOUNTS_BASE_URL;

    useEffect(() => {
        if (id) {
            loadSubmissionDetails();
        }
    }, [id]);

    const loadSubmissionDetails = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('access_token');
            const response = await axios.get(`${baseurl}lecturer/submission/${id}/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setSubmission(response.data);
            if (response.data.total_score !== null) {
                setGrade(response.data.total_score.toString());
            }
        } catch (error) {
            console.error('Error loading submission:', error);
            Alert.alert(t('error'), t('error_loading_details'));
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitGrade = async () => {
        if (!grade.trim()) {
            Alert.alert(t('error'), t('please_enter_grade'));
            return;
        }

        try {
            setSubmitting(true);
            const token = await AsyncStorage.getItem('access_token');
            await axios.post(`${baseurl}lecturer/submission/${id}/grade/`, {
                score: parseFloat(grade),
                feedback: feedback
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            Alert.alert(t('success'), t('grade_submitted_success_msg'), [
                { text: t('ok'), onPress: () => loadSubmissionDetails() }
            ]);
        } catch (error) {
            console.error('Error submitting grade:', error);
            Alert.alert(t('error'), t('grading_failed'));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <LinearGradient
                    colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
                    style={styles.backgroundGradient}
                />
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={styles.loadingText}>{t('loading_submission')}</Text>
            </View>
        );
    }

    if (!submission) return null;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <LinearGradient
                colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
                style={styles.backgroundGradient}
            />

            {/* Premium Header */}
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {t('grading_header')}
                    </Text>
                </View>
                <View style={styles.subHeaderContainer}>
                    <Text style={styles.subHeaderStudent}>{submission.student_name}</Text>
                    <Text style={styles.subHeaderDetail}>
                        {submission.quiz_title} • {submission.intake_name}
                    </Text>
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    {/* Questions & Answers */}
                    <Text style={styles.sectionTitle}>
                        {t('student_responses')}
                    </Text>

                    {submission.answers.map((answer, index) => (
                        <View key={answer.id} style={styles.glassCard}>
                            <View style={styles.questionHeader}>
                                <Text style={styles.questionMeta}>
                                    {t('question_header_prefix')} {index + 1} ({answer.max_points} {t('pts_suffix')})
                                </Text>
                                <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }]}>
                                    <Text style={styles.badgeText}>{answer.question_type.toUpperCase()}</Text>
                                </View>
                            </View>

                            <Text style={styles.questionText}>
                                {answer.question_text}
                            </Text>

                            <View style={styles.answerBox}>
                                <Text style={styles.answerLabel}>{t('students_answer')}</Text>
                                <Text style={styles.answerText}>{answer.student_answer}</Text>
                            </View>

                            <View style={styles.correctBox}>
                                <Text style={[styles.answerLabel, { color: '#2ecc71' }]}>{t('correct_answer_label')}</Text>
                                <Text style={styles.answerText}>{answer.correct_answer}</Text>
                            </View>
                        </View>
                    ))}

                    {/* Grading Section */}
                    <View style={[styles.glassCard, styles.gradingSection]}>
                        <View style={styles.gradingHeader}>
                            <Ionicons name="create-outline" size={24} color="#f1c40f" />
                            <Text style={styles.gradingTitle}>
                                {t('final_grade_title')}
                            </Text>
                        </View>

                        <Text style={styles.inputLabel}>{t('score_awarded_label')}</Text>
                        <TextInput
                            style={styles.glassInput}
                            placeholder={t('enter_total_score_placeholder')}
                            placeholderTextColor="#7f8c8d"
                            keyboardType="numeric"
                            value={grade}
                            onChangeText={setGrade}
                        />

                        <Text style={styles.inputLabel}>{t('instructor_feedback_label')}</Text>
                        <TextInput
                            style={[styles.glassInput, styles.textArea]}
                            placeholder={t('enter_feedback_placeholder')}
                            placeholderTextColor="#7f8c8d"
                            multiline
                            textAlignVertical="top"
                            value={feedback}
                            onChangeText={setFeedback}
                        />

                        <TouchableOpacity
                            onPress={handleSubmitGrade}
                            disabled={submitting}
                            style={styles.submitButton}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <Text style={styles.submitButtonText}>
                                    {t('btn_submit_grade')}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    backgroundGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        marginTop: 16,
        fontSize: 16,
    },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: 'rgba(10, 10, 10, 0.8)',
        zIndex: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        marginEnd: 15,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        flex: 1,
    },
    subHeaderContainer: {
        marginTop: 10,
        paddingStart: 55,
    },
    subHeaderStudent: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    subHeaderDetail: {
        color: '#bdc3c7',
        fontSize: 13,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 16,
        letterSpacing: 0.5,
    },
    glassCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    questionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    questionMeta: {
        color: '#bdc3c7',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
    },
    badgeText: {
        color: '#bdc3c7',
        fontSize: 10,
        fontWeight: '700',
    },
    questionText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
        lineHeight: 24,
    },
    answerBox: {
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(52, 152, 219, 0.2)',
    },
    correctBox: {
        backgroundColor: 'rgba(46, 204, 113, 0.1)',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(46, 204, 113, 0.2)',
    },
    answerLabel: {
        color: '#3498db',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    answerText: {
        color: '#ecf0f1',
        fontSize: 15,
        lineHeight: 22,
    },
    gradingSection: {
        marginTop: 10,
        borderColor: 'rgba(241, 196, 15, 0.3)',
        backgroundColor: 'rgba(241, 196, 15, 0.05)',
    },
    gradingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 10,
    },
    gradingTitle: {
        color: '#f1c40f',
        fontSize: 20,
        fontWeight: '700',
    },
    inputLabel: {
        color: '#bdc3c7',
        fontSize: 14,
        marginBottom: 8,
        marginLeft: 4,
    },
    glassInput: {
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        marginBottom: 16,
    },
    textArea: {
        minHeight: 120,
        marginBottom: 24,
    },
    submitButton: {
        backgroundColor: '#f1c40f',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#f1c40f',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    submitButtonText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
});

export default SubmissionGradingScreen;
