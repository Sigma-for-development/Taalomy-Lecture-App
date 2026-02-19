import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput
} from 'react-native';
import Toast from 'react-native-toast-message';
import { router, useLocalSearchParams } from 'expo-router';
import { tokenStorage } from '../../../utils/tokenStorage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_CONFIG } from '../../../src/config/api';
import { useTranslation } from 'react-i18next';
const AsyncStorage = tokenStorage;

interface QuizSubmission {
  id: number;
  quiz: number; // This is just the quiz ID now
  student: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  submitted_at: string;
  total_score: number | null;
  is_graded: boolean;
}

interface Answer {
  id: number;
  question_text: string;
  question_type: 'mcq' | 'essay';
  essay_text: string | null;
  points_awarded: number | null;
  max_points: number;
  mcq_option_text?: string | null;
  student_mcq_option?: number | null;
}

const QuizSubmissionsScreen = () => {
  const { t } = useTranslation();
  const { id, quizId } = useLocalSearchParams();
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]); // Store quiz details
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<QuizSubmission | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [gradingAnswer, setGradingAnswer] = useState<Answer | null>(null);
  const [pointsAwarded, setPointsAwarded] = useState('');
  const [grading, setGrading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const baseurl = API_CONFIG.ACCOUNTS_BASE_URL;

  // Validate that id exists and is not undefined
  const intakeId = Array.isArray(id) ? id[0] : id;
  const isValidIntakeId = intakeId && typeof intakeId === 'string';

  useEffect(() => {
    if (isValidIntakeId) {
      loadSubmissions();
    }
  }, [id, isValidIntakeId]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('access_token');

      // Load quizzes for this intake first
      const quizzesResponse = await axios.get(`${baseurl}lecturer/intakes/${intakeId}/quizzes/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Load questions for each quiz
      const quizzesWithQuestions = await Promise.all(
        quizzesResponse.data.map(async (quiz: any) => {
          try {
            const questionsResponse = await axios.get(`${baseurl}lecturer/quizzes/${quiz.id}/questions/`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            return {
              ...quiz,
              questions: questionsResponse.data
            };
          } catch (error) {
            console.error(`Error loading questions for quiz ${quiz.id}:`, error);
            return {
              ...quiz,
              questions: []
            };
          }
        })
      );

      setQuizzes(quizzesWithQuestions);

      // Load submissions for quizzes in this intake
      const response = await axios.get(`${baseurl}lecturer/quiz-submissions/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const quizIds = quizzesWithQuestions.map((quiz: any) => quiz.id);

      // Filter submissions for quizzes in this intake
      let intakeSubmissions = response.data.filter((submission: any) =>
        quizIds.includes(submission.quiz)
      );

      // If a specific quizId is provided, filter by it
      if (quizId) {
        const targetQuizId = Array.isArray(quizId) ? parseInt(quizId[0]) : parseInt(quizId);
        if (!isNaN(targetQuizId)) {
          intakeSubmissions = intakeSubmissions.filter((s: any) => s.quiz === targetQuizId);
        }
      }

      setSubmissions(intakeSubmissions);
    } catch (error) {
      console.error('Error loading submissions:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('error_loading_submissions')
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSubmissions();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get quiz title by ID
  const getQuizTitle = (quizId: number) => {
    const quiz = quizzes.find(q => q.id === quizId);
    return quiz ? quiz.title : t('unknown_quiz');
  };

  // Calculate total possible points for a submission
  const calculateTotalPossiblePoints = (quizId: number) => {
    const quiz = quizzes.find(q => q.id === quizId);
    if (!quiz) return 0;

    // Sum up points from all questions
    return quiz.questions?.reduce((sum: number, question: any) => sum + (question.points || 0), 0) || 0;
  };

  // Calculate percentage for a submission
  const calculatePercentage = (score: number | null, total: number) => {
    if (!score || total === 0) return 0;
    return Math.round((score / total) * 100);
  };

  const loadSubmissionDetails = async (submission: QuizSubmission) => {
    try {
      setSelectedSubmission(submission);
      const token = await AsyncStorage.getItem('access_token');

      // Load answers for this submission
      const response = await axios.get(`${baseurl}lecturer/quiz-submissions/${submission.id}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Check if response has answers array
      if (!response.data || !Array.isArray(response.data.answers)) {
        console.error('Invalid response structure:', response.data);
        Toast.show({
          type: 'error',
          text1: t('error'),
          text2: t('error_loading_details')
        });
        return;
      }

      // Format answers
      const formattedAnswers = response.data.answers.map((answer: any) => ({
        id: answer.id,
        question_text: answer.question?.question_text || t('unknown_question'),
        question_type: answer.question?.question_type || 'unknown',
        essay_text: answer.essay_text,
        points_awarded: answer.points_awarded,
        max_points: answer.question?.points || 0,
        mcq_option_text: answer.mcq_option_text, // For MCQ answers
        student_mcq_option: answer.mcq_option // For MCQ answers
      }));

      setAnswers(formattedAnswers);
      setShowGradingModal(true);
    } catch (error: any) {
      console.error('Error loading submission details:', error);
      Toast.show({
        text1: t('error'),
        text2: `${t('error_loading_details')}: ${error.message || t('error_common')}`
      });
    }
  };

  const handleGradeEssay = async () => {


    if (!gradingAnswer || !selectedSubmission) {
      console.log('❌ Missing gradingAnswer or selectedSubmission');
      Toast.show({
        text1: t('grading_error'),
        text2: t('missing_grading_info')
      });
      return;
    }

    const points = parseFloat(pointsAwarded);
    console.log('Points entered:', points);
    console.log('Max points:', gradingAnswer.max_points);

    if (isNaN(points) || points < 0) {
      console.log('❌ Invalid points value - too low');
      Toast.show({
        text1: t('validation_error'),
        text2: t('invalid_points_low')
      });
      return;
    }

    if (points > gradingAnswer.max_points) {
      console.log('❌ Invalid points value - too high');
      Toast.show({
        text1: t('validation_error'),
        text2: t('invalid_points_high', { max: gradingAnswer.max_points })
      });
      return;
    }

    try {
      setGrading(true);
      const token = await AsyncStorage.getItem('access_token');

      if (!token) {
        Toast.show({
          text1: t('authentication_error'),
          text2: t('auth_token_missing')
        });
        return;
      }

      const url = `${baseurl}lecturer/quiz-submissions/${selectedSubmission.id}/grade_essay/`;
      console.log('Making API call to:', url);
      console.log('Payload:', {
        answer_id: gradingAnswer.id,
        points_awarded: points
      });

      const response = await axios.post(url, {
        answer_id: gradingAnswer.id,
        points_awarded: points
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ API response:', response.data);

      Toast.show({
        text1: t('graded_successfully'),
        text2: t('essay_graded_msg')
      });
      // Don't close the main modal, just reset grading state
      setGradingAnswer(null);
      setPointsAwarded('');

      // Update local state instead of full refresh for better UX
      setAnswers(prevAnswers =>
        prevAnswers.map(a =>
          a.id === gradingAnswer.id ? { ...a, points_awarded: points } : a
        )
      );

      // Still refresh in background to keep data in sync
      onRefresh();
    } catch (error: any) {


      let errorMessage = t('grading_failed');
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Toast.show({
        text1: t('grading_failed'),
        text2: errorMessage
      });
    } finally {
      console.log('🔄 Grading process finished');
      setGrading(false);
    }
  };

  const handleCancelAttempt = async (submission: QuizSubmission) => {
    Alert.alert(
      t('cancel_quiz_attempt_title'),
      t('cancel_quiz_attempt_msg'),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: t('btn_yes_cancel'),
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);
              const token = await AsyncStorage.getItem('access_token');

              await axios.delete(`${baseurl}lecturer/quiz-submissions/${submission.id}/cancel_attempt/`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });

              Toast.show({
                type: 'success',
                text1: t('attempt_cancelled'),
                text2: t('attempt_cancelled_msg')
              });
              onRefresh();
            } catch (error: any) {
              console.error('Error cancelling attempt:', error);
              Toast.show({
                type: 'error',
                text1: t('cancellation_failed'),
                text2: error.response?.data?.error || t('cancellation_failed')
              });
            } finally {
              setCancelling(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={{ color: '#fff', marginTop: 16 }}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
      <StatusBar barStyle="light-content" />

      {/* Header - Matching Quizzes Screen Style */}
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
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#fff', flex: 1 }}>
            {t('quiz_submissions_title')}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3498db" />
        }
      >
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 16 }}>
          {t('student_submissions')}
        </Text>

        {submissions.length > 0 ? (
          submissions.map((submission) => (
            <View
              key={submission.id}
              style={{
                backgroundColor: '#252525',
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: '#333'
              }}
            >
              {/* Top Row: Title and Status Badge */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 6 }}>
                    {getQuizTitle(submission.quiz)}
                  </Text>
                </View>

                {submission.is_graded ? (
                  <View style={{
                    backgroundColor: 'rgba(39, 174, 96, 0.15)',
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: 'rgba(39, 174, 96, 0.3)',
                    alignItems: 'flex-end'
                  }}>
                    <Text style={{ color: '#27ae60', fontSize: 12, fontWeight: '700' }}>
                      {submission.total_score || 0} / {calculateTotalPossiblePoints(submission.quiz)} ({submission.total_score ? `${calculatePercentage(submission.total_score, calculateTotalPossiblePoints(submission.quiz))}%` : '0%'})
                    </Text>
                  </View>
                ) : (
                  <View style={{
                    backgroundColor: 'rgba(230, 126, 34, 0.15)',
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: 'rgba(230, 126, 34, 0.3)',
                  }}>
                    <Text style={{ color: '#e67e22', fontSize: 12, fontWeight: '700' }}>
                      {t('pending_grading')}
                    </Text>
                  </View>
                )}
              </View>

              {/* Middle Box: Metadata */}
              <View style={{
                flexDirection: 'row',
                backgroundColor: '#1a1a1a',
                borderRadius: 10,
                padding: 12,
                marginBottom: 16,
                justifyContent: 'space-between',
                borderWidth: 1,
                borderColor: '#2c2c2c'
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#7f8c8d', fontSize: 11, textTransform: 'uppercase', marginBottom: 2 }}>
                    {t('student_label')}
                  </Text>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                    {submission.student.first_name} {submission.student.last_name}
                  </Text>
                </View>
                <View style={{ width: 1, backgroundColor: '#333', marginHorizontal: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#7f8c8d', fontSize: 11, textTransform: 'uppercase', marginBottom: 2 }}>
                    {t('submitted_label')}
                  </Text>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>
                    {formatDate(submission.submitted_at)}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => loadSubmissionDetails(submission)}
                  style={{
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: 'rgba(52, 152, 219, 0.3)',
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}
                >
                  <Ionicons name="eye-outline" size={16} color="#3498db" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#3498db', fontSize: 12, fontWeight: '600' }}>{t('view_details')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleCancelAttempt(submission)}
                  disabled={cancelling}
                  style={{
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: 'rgba(231, 76, 60, 0.3)',
                    opacity: cancelling ? 0.6 : 1,
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color="#e74c3c" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#e74c3c', fontSize: 12, fontWeight: '600' }}>{t('cancel_attempt')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Ionicons name="document-text" size={48} color="#7f8c8d" />
            <Text style={{ color: '#7f8c8d', marginTop: 10, fontSize: 16 }}>
              {t('no_submissions_yet')}
            </Text>
            <Text style={{ color: '#95a5a6', marginTop: 5, fontSize: 14, textAlign: 'center' }}>
              {t('students_will_appear')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Grading Modal */}
      <Modal
        visible={showGradingModal}
        animationType="slide"
        onRequestClose={() => setShowGradingModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
          <StatusBar barStyle="light-content" />

          {/* Header - Fixed to match Main Screen Style */}
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
                onPress={() => setShowGradingModal(false)}
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
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#fff', flex: 1 }}>
                {t('grade_submission')}
              </Text>
            </View>
          </View>

          <ScrollView style={{ flex: 1, padding: 20 }}>
            {selectedSubmission && (
              <View style={{
                marginBottom: 24,
                backgroundColor: '#252525',
                padding: 16,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#333'
              }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
                  {getQuizTitle(selectedSubmission.quiz)}
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <View>
                    <Text style={{ color: '#7f8c8d', fontSize: 11, textTransform: 'uppercase', marginBottom: 2 }}>
                      {t('student_label')}
                    </Text>
                    <Text style={{ color: '#bdc3c7', fontWeight: '600' }}>
                      {selectedSubmission.student.first_name} {selectedSubmission.student.last_name}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#7f8c8d', fontSize: 11, textTransform: 'uppercase', marginBottom: 2 }}>
                      {t('submitted_label')}
                    </Text>
                    <Text style={{ color: '#3498db', fontWeight: '600' }}>
                      {formatDate(selectedSubmission.submitted_at)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {answers.map((answer) => (
              <View
                key={answer.id}
                style={{
                  backgroundColor: '#252525',
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: '#333'
                }}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12, lineHeight: 24 }}>
                  {answer.question_text}
                </Text>

                {answer.question_type === 'essay' ? (
                  <>
                    <View style={{
                      backgroundColor: 'rgba(52, 152, 219, 0.1)',
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 16,
                      borderWidth: 1,
                      borderColor: 'rgba(52, 152, 219, 0.2)'
                    }}>
                      <Text style={{ color: '#3498db', fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>
                        {t('students_answer')}
                      </Text>
                      <Text style={{ color: '#ecf0f1', fontSize: 15, lineHeight: 22 }}>
                        {answer.essay_text || t('no_answer_provided')}
                      </Text>
                    </View>

                    {gradingAnswer?.id === answer.id ? (
                      /* Inline Grading Form */
                      <View style={{
                        marginTop: 10,
                        backgroundColor: '#1a1a1a',
                        padding: 15,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#27ae60'
                      }}>
                        <Text style={{ color: '#fff', marginBottom: 8, fontWeight: '600', fontSize: 14 }}>
                          {t('points_awarded_label', { max: answer.max_points })}
                        </Text>
                        <TextInput
                          value={pointsAwarded}
                          onChangeText={setPointsAwarded}
                          placeholder={t('enter_points_placeholder')}
                          placeholderTextColor="#7f8c8d"
                          keyboardType="numeric"
                          style={{
                            backgroundColor: '#333',
                            color: '#fff',
                            borderRadius: 8,
                            padding: 12,
                            marginBottom: 16,
                            fontSize: 16,
                            borderWidth: 1,
                            borderColor: '#444'
                          }}
                          autoFocus={true}
                        />
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <TouchableOpacity
                            onPress={() => setGradingAnswer(null)}
                            style={{
                              flex: 1,
                              backgroundColor: '#333',
                              paddingVertical: 12,
                              borderRadius: 8,
                              alignItems: 'center',
                              borderWidth: 1,
                              borderColor: '#444'
                            }}
                          >
                            <Text style={{ color: '#ccc', fontWeight: '600' }}>{t('cancel')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={handleGradeEssay}
                            disabled={grading}
                            style={{
                              flex: 1,
                              backgroundColor: '#27ae60',
                              paddingVertical: 12,
                              borderRadius: 8,
                              alignItems: 'center'
                            }}
                          >
                            {grading ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Text style={{ color: '#fff', fontWeight: '600' }}>{t('btn_submit_grade')}</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <View>
                          <Text style={{ color: '#7f8c8d', fontSize: 11, textTransform: 'uppercase', marginBottom: 2 }}>
                            {t('points_label')}
                          </Text>
                          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                            {answer.points_awarded !== null ? answer.points_awarded : t('not_graded')} <Text style={{ color: '#7f8c8d' }}>/ {answer.max_points}</Text>
                          </Text>
                        </View>
                        {answer.points_awarded === null && (
                          <TouchableOpacity
                            onPress={() => {
                              setGradingAnswer(answer);
                              setPointsAwarded('');
                            }}
                            style={{
                              backgroundColor: '#27ae60',
                              paddingHorizontal: 16,
                              paddingVertical: 8,
                              borderRadius: 20,
                              shadowColor: "#27ae60",
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.3,
                              shadowRadius: 3,
                              elevation: 4,
                            }}
                          >
                            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>{t('btn_grade')}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </>
                ) : (
                  <>
                    <View style={{
                      backgroundColor: 'rgba(52, 152, 219, 0.1)',
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 16,
                      borderWidth: 1,
                      borderColor: 'rgba(52, 152, 219, 0.2)'
                    }}>
                      <Text style={{ color: '#3498db', fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>
                        {t('students_answer')}
                      </Text>
                      <Text style={{ color: '#ecf0f1', fontSize: 15, lineHeight: 22 }}>
                        {answer.mcq_option_text || t('no_answer_provided')}
                      </Text>
                    </View>

                    <View style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#1a1a1a',
                      padding: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: '#333'
                    }}>
                      <Text style={{ color: '#bdc3c7', fontSize: 13 }}>
                        {t('auto_graded_mcq')}
                      </Text>
                      <Text style={{ color: '#27ae60', fontWeight: '700' }}>
                        {answer.points_awarded !== null ? `${answer.points_awarded} / ${answer.max_points}` : t('not_graded')}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

export default QuizSubmissionsScreen;