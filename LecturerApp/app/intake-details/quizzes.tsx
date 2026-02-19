import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
  RefreshControl,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import Toast from 'react-native-toast-message';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { tokenStorage } from '../../utils/tokenStorage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_CONFIG } from '../../src/config/api';
import { useTranslation } from 'react-i18next';
import DatePicker from '../../src/components/DatePicker';
const AsyncStorage = tokenStorage;

interface Quiz {
  id: number;
  title: string;
  description: string;
  created_at: string;
  is_published: boolean;
  scheduled_at: string | null;
  end_time: string | null;
  time_limit: number;
  total_questions: number;
}

interface Question {
  id: number;
  question_text: string;
  question_type: 'mcq' | 'essay';
  points: number;
  options?: string[];
  correct_answer?: string;
  order: number;
}

const QuizzesScreen = () => {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Replaced activeTab with viewMode for clearer separation
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');

  // Modals
  const [showCreateQuizModal, setShowCreateQuizModal] = useState(false);
  const [showCreateQuestionModal, setShowCreateQuestionModal] = useState(false);
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [creatingQuestion, setCreatingQuestion] = useState(false);

  // Form states
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState<'mcq' | 'essay'>('mcq');
  const [questionPoints, setQuestionPoints] = useState('1');
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [mcqOptions, setMcqOptions] = useState(['', '', '', '']);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number | null>(null);

  // Scheduling
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [quizToSchedule, setQuizToSchedule] = useState<Quiz | null>(null);
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [useEndTime, setUseEndTime] = useState(false);

  // Publish
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [quizToPublish, setQuizToPublish] = useState<Quiz | null>(null);
  const [publishEndDate, setPublishEndDate] = useState<Date>(new Date());
  const [publishUseEndTime, setPublishUseEndTime] = useState(false);

  const [timeLimit, setTimeLimit] = useState<string>('0');
  const [publishTimeLimit, setPublishTimeLimit] = useState<string>('0');

  // Current quiz
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  const baseurl = API_CONFIG.ACCOUNTS_BASE_URL;

  // Validate that id exists and is not undefined
  const intakeId = Array.isArray(id) ? id[0] : id;
  const isValidIntakeId = intakeId && typeof intakeId === 'string';

  useEffect(() => {
    if (isValidIntakeId) {
      loadQuizzes();
    }
  }, [id, isValidIntakeId]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('access_token');

      // Load quizzes for this intake
      const response = await axios.get(`${baseurl}lecturer/intakes/${intakeId}/quizzes/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setQuizzes(response.data);
    } catch (error) {
      console.error('Error loading quizzes:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('error_loading_msg')
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadQuizzes();
    setRefreshing(false);
  };

  const handleCreateQuiz = async () => {
    if (!quizTitle.trim()) {
      Toast.show({
        type: 'error',
        text1: t('validation_error'),
        text2: t('enter_quiz_title')
      });
      return;
    }

    try {
      setCreatingQuiz(true);
      const token = await AsyncStorage.getItem('access_token');

      const quizData = {
        title: quizTitle.trim(),
        description: quizDescription.trim(),
        intake: parseInt(intakeId as string)
      };

      const response = await axios.post(`${baseurl}lecturer/intakes/${intakeId}/quizzes/`, quizData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      Toast.show({
        type: 'success',
        text1: t('quiz_created_success'),
        text2: t('quiz_created_msg')
      });
      setQuizTitle('');
      setQuizDescription('');
      setShowCreateQuizModal(false);

      // Auto switch to editor mode
      setCurrentQuiz(response.data);
      setViewMode('editor');
      setQuestions([]); // New quiz has no questions

      onRefresh();
    } catch (error: any) {
      console.error('Error creating quiz:', error);
      Toast.show({
        type: 'error',
        text1: t('quiz_creation_failed'),
        text2: error.response?.data?.error || error.response?.data?.detail || t('error_common')
      });
    } finally {
      setCreatingQuiz(false);
    }
  };

  const handleSaveQuestion = async () => {
    if (!questionText.trim()) {
      Toast.show({
        type: 'error',
        text1: t('validation_error'),
        text2: t('enter_question_text')
      });
      return;
    }

    if (questionType === 'mcq') {
      // Validate MCQ options
      const validOptions = mcqOptions.filter(option => option.trim() !== '');
      if (validOptions.length < 2) {
        Toast.show({
          type: 'error',
          text1: t('validation_error'),
          text2: t('enter_two_options')
        });
        return;
      }

      if (correctAnswerIndex === null || correctAnswerIndex >= validOptions.length) {
        Toast.show({
          type: 'error',
          text1: t('validation_error'),
          text2: t('select_correct_answer')
        });
        return;
      }
    }

    const points = parseInt(questionPoints);
    if (isNaN(points) || points <= 0) {
      Toast.show({
        type: 'error',
        text1: t('validation_error'),
        text2: t('invalid_points')
      });
      return;
    }

    try {
      setCreatingQuestion(true);
      const token = await AsyncStorage.getItem('access_token');

      const questionData = {
        question_text: questionText.trim(),
        question_type: questionType,
        points: points,
        options: questionType === 'mcq' ? mcqOptions.filter(option => option.trim() !== '') : undefined,
        correct_answer: questionType === 'mcq' ? correctAnswerIndex?.toString() : undefined
      };

      if (editingQuestionId) {
        await axios.patch(`${baseurl}lecturer/questions/${editingQuestionId}/`, questionData, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        Toast.show({
          type: 'success',
          text1: t('question_updated'),
          text2: t('success_saved')
        });
      } else {
        await axios.post(`${baseurl}lecturer/quizzes/${currentQuiz?.id}/questions/`, questionData, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        Toast.show({
          type: 'success',
          text1: t('question_added'),
          text2: t('success_saved')
        });
      }
      setQuestionText('');
      setQuestionType('mcq');
      setQuestionPoints('1');
      setMcqOptions(['', '', '', '']);
      setCorrectAnswerIndex(null);
      setEditingQuestionId(null);
      setShowCreateQuestionModal(false);
      // Reset form
      setQuestionText('');
      setQuestionType('mcq');
      setQuestionPoints('1');
      setMcqOptions(['', '', '', '']);
      setCorrectAnswerIndex(null);
      // Reload questions and refresh quiz list to update total_questions
      loadQuestions();
      onRefresh();
    } catch (error: any) {
      console.error('Error creating question:', error);
      Toast.show({
        type: 'error',
        text1: t('save_failed'),
        text2: error.response?.data?.error || error.response?.data?.detail || t('error_common')
      });
    } finally {
      setCreatingQuestion(false);
    }
  };

  const loadQuestions = async () => {
    if (!currentQuiz) return;

    try {
      const token = await AsyncStorage.getItem('access_token');

      const response = await axios.get(`${baseurl}lecturer/quizzes/${currentQuiz.id}/questions/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setQuestions(response.data);
    } catch (error) {
      console.error('Error loading questions:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('error_loading_msg')
      });
    }
  };

  useEffect(() => {
    if (currentQuiz) {
      loadQuestions();
    }
  }, [currentQuiz]);

  const handlePublishClick = (quiz: Quiz) => {
    // Check validation first
    const questionCount = (currentQuiz && currentQuiz.id === quiz.id) ? questions.length : quiz.total_questions;

    if (questionCount === 0) {
      Toast.show({
        type: 'error',
        text1: t('cannot_publish'),
        text2: t('cannot_publish_empty')
      });
      return;
    }

    setQuizToPublish(quiz);
    setPublishEndDate(new Date(Date.now() + 60 * 60 * 1000)); // Default 1 hour later
    setPublishUseEndTime(false);
    setPublishTimeLimit(quiz.time_limit ? quiz.time_limit.toString() : '0');
    setShowPublishModal(true);
  };

  const confirmPublishQuiz = async () => {
    if (!quizToPublish) return;

    try {
      const token = await AsyncStorage.getItem('access_token');

      const payload: any = {};
      const timeLimitValue = parseInt(publishTimeLimit) || 0;
      payload.time_limit = timeLimitValue;

      if (publishUseEndTime) {
        if (publishEndDate <= new Date()) {
          Toast.show({
            type: 'error',
            text1: t('invalid_time'),
            text2: t('end_time_future')
          });
          return;
        }
        payload.end_time = publishEndDate.toISOString();
      }

      await axios.patch(`${baseurl}lecturer/quizzes/${quizToPublish.id}/publish/`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      Toast.show({
        type: 'success',
        text1: t('quiz_published_success'),
        text2: t('success_saved')
      });
      setShowPublishModal(false);
      setQuizToPublish(null);
      // Don't close editor if we are editing
      onRefresh();

      // Update local currentQuiz if needed
      if (currentQuiz && currentQuiz.id === quizToPublish.id) {
        setCurrentQuiz({ ...currentQuiz, is_published: true });
      }
    } catch (error: any) {
      console.error('Error publishing quiz:', error);
      Toast.show({
        type: 'error',
        text1: t('publish_failed'),
        text2: error.response?.data?.error || t('error_common')
      });
    }
  };

  const handleScheduleQuiz = async () => {
    if (!quizToSchedule) return;

    try {
      const token = await AsyncStorage.getItem('access_token');

      // Format date for backend (ISO string)
      const scheduledAtISO = scheduledDate.toISOString();
      const endTimeISO = useEndTime ? endDate.toISOString() : null;
      const timeLimitValue = parseInt(timeLimit) || 0;

      if (useEndTime && endDate <= scheduledDate) {
        Toast.show({
          type: 'error',
          text1: t('invalid_time'),
          text2: t('end_time_after_start')
        });
        return;
      }

      await axios.patch(`${baseurl}lecturer/quizzes/${quizToSchedule.id}/`, {
        scheduled_at: scheduledAtISO,
        end_time: endTimeISO,
        time_limit: timeLimitValue,
        is_published: true // Auto-publish when scheduled time arrives (handled by backend filter)
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      Toast.show({
        type: 'success',
        text1: t('quiz_scheduled_success'),
        text2: t('success_saved')
      });
      setShowScheduleModal(false);
      setQuizToSchedule(null);
      onRefresh();
    } catch (error: any) {
      console.error('Error scheduling quiz:', error);
      Toast.show({
        type: 'error',
        text1: t('schedule_failed'),
        text2: error.response?.data?.error || t('error_common')
      });
    }
  };

  const openScheduleModal = (quiz: Quiz) => {
    // If we are currently editing this quiz, use the local questions state
    const questionCount = (currentQuiz && currentQuiz.id === quiz.id) ? questions.length : quiz.total_questions;

    if (questionCount === 0) {
      Toast.show({
        type: 'error',
        text1: t('cannot_schedule'),
        text2: t('cannot_schedule_empty')
      });
      return;
    }
    setQuizToSchedule(quiz);
    setScheduledDate(new Date());
    setEndDate(new Date(Date.now() + 60 * 60 * 1000)); // Default end time 1 hour later
    setUseEndTime(false);
    setTimeLimit(quiz.time_limit ? quiz.time_limit.toString() : '0');
    setShowScheduleModal(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const addMcqOption = () => {
    if (mcqOptions.length < 6) {
      setMcqOptions([...mcqOptions, '']);
    }
  };

  const removeMcqOption = (index: number) => {
    if (mcqOptions.length > 2) {
      const newOptions = [...mcqOptions];
      newOptions.splice(index, 1);
      setMcqOptions(newOptions);

      // Adjust correct answer index if needed
      if (correctAnswerIndex === index) {
        setCorrectAnswerIndex(null);
      } else if (correctAnswerIndex !== null && correctAnswerIndex > index) {
        setCorrectAnswerIndex(correctAnswerIndex - 1);
      }
    }
  };

  const updateMcqOption = (index: number, value: string) => {
    const newOptions = [...mcqOptions];
    newOptions[index] = value;
    setMcqOptions(newOptions);
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestionId(question.id);
    setQuestionText(question.question_text);
    setQuestionType(question.question_type);
    setQuestionPoints(question.points.toString());
    if (question.question_type === 'mcq' && question.options) {
      // Ensure there are at least 4 options for editing, fill with empty strings if less
      const options = [...question.options];
      while (options.length < 4) {
        options.push('');
      }
      setMcqOptions(options);
      setCorrectAnswerIndex(question.correct_answer ? parseInt(question.correct_answer) : null);
    } else {
      setMcqOptions(['', '', '', '']);
      setCorrectAnswerIndex(null);
    }
    setShowCreateQuestionModal(true);
  };

  // Helper filters for the dashboard
  const activeQuizzes = quizzes.filter(q => q.is_published && (!q.scheduled_at || new Date(q.scheduled_at) <= new Date()) && (!q.end_time || new Date(q.end_time) > new Date()));
  const upcomingQuizzes = quizzes.filter(q => q.scheduled_at && new Date(q.scheduled_at) > new Date());
  const pastQuizzes = quizzes.filter(q => q.end_time && new Date(q.end_time) <= new Date());
  const draftQuizzes = quizzes.filter(q => !q.is_published && !q.scheduled_at);

  const renderQuizCard = (quiz: Quiz) => (
    <View
      key={quiz.id}
      style={{
        backgroundColor: '#252525',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#333'
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 6 }}>
            {quiz.title}
          </Text>
          <Text style={{ color: '#bdc3c7', fontSize: 14, lineHeight: 20 }}>
            {quiz.description}
          </Text>
        </View>
        <View style={{
          backgroundColor: quiz.is_published ? 'rgba(39, 174, 96, 0.15)' : 'rgba(230, 126, 34, 0.15)',
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: quiz.is_published ? 'rgba(39, 174, 96, 0.3)' : 'rgba(230, 126, 34, 0.3)',
        }}>
          <Text style={{
            color: quiz.is_published ? '#27ae60' : '#e67e22',
            fontSize: 12,
            fontWeight: '700'
          }}>
            {quiz.is_published
              ? (quiz.scheduled_at && new Date(quiz.scheduled_at) > new Date()
                ? t('quiz_scheduled')
                : t('quiz_published'))
              : t('quiz_draft')}
          </Text>
        </View>
      </View>

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
        <View>
          <Text style={{ color: '#7f8c8d', fontSize: 11, textTransform: 'uppercase', marginBottom: 2 }}>{t('questions_count_suffix')}</Text>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{quiz.total_questions}</Text>
        </View>
        <View style={{ width: 1, backgroundColor: '#333' }} />
        <View>
          <Text style={{ color: '#7f8c8d', fontSize: 11, textTransform: 'uppercase', marginBottom: 2 }}>{t('created_at')}</Text>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{formatDate(quiz.created_at)}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
        {!quiz.is_published && (
          <>
            <TouchableOpacity
              onPress={() => openScheduleModal(quiz)}
              style={{
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: 'rgba(52, 152, 219, 0.3)',
              }}
            >
              <Text style={{ color: '#3498db', fontSize: 12, fontWeight: '600' }}>{t('btn_schedule')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handlePublishClick(quiz)}
              style={{
                backgroundColor: 'rgba(39, 174, 96, 0.1)',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: 'rgba(39, 174, 96, 0.3)',
              }}
            >
              <Text style={{ color: '#27ae60', fontSize: 12, fontWeight: '600' }}>{t('btn_publish_now')}</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity
          onPress={() => {
            setCurrentQuiz(quiz);
            setViewMode('editor');
            loadQuestions();
          }}
          style={{
            backgroundColor: '#3498db',
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: "#3498db",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <Ionicons name="create-outline" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push({
            pathname: `/intake-details/quiz-submissions/${intakeId}`,
            params: { quizId: quiz.id }
          } as any)}
          style={{
            backgroundColor: '#9b59b6',
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: "#9b59b6",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <Ionicons name="list-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <TouchableOpacity
              onPress={() => {
                if (viewMode === 'editor') {
                  setViewMode('list');
                  setCurrentQuiz(null);
                } else {
                  router.back();
                }
              }}
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
              {viewMode === 'list' ? t('quizzes_title') : currentQuiz?.title}
            </Text>
          </View>

          {viewMode === 'list' && (
            <TouchableOpacity
              onPress={() => setShowCreateQuizModal(true)}
              style={{
                backgroundColor: '#27ae60',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: "#27ae60",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 3,
                elevation: 5
              }}
            >
              <Ionicons name="add" size={20} color="#fff" style={{ marginRight: 4 }} />
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('create_new_quiz_btn')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3498db" />
        }
      >
        {viewMode === 'list' ? (
          <View style={{ padding: 20 }}>
            {/* Active Quizzes Section */}
            {activeQuizzes.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#2ecc71', marginBottom: 16 }}>
                  {t('section_active_quizzes')}
                </Text>
                {activeQuizzes.map(renderQuizCard)}
              </View>
            )}

            {/* Upcoming Quizzes Section */}
            {upcomingQuizzes.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#3498db', marginBottom: 16 }}>
                  {t('section_upcoming_quizzes')}
                </Text>
                {upcomingQuizzes.map(renderQuizCard)}
              </View>
            )}

            {/* Draft Quizzes Section */}
            {draftQuizzes.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#f39c12', marginBottom: 16 }}>
                  {t('section_draft_quizzes')}
                </Text>
                {draftQuizzes.map(renderQuizCard)}
              </View>
            )}

            {/* Past Quizzes Section */}
            {pastQuizzes.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#95a5a6', marginBottom: 16 }}>
                  {t('section_past_quizzes')}
                </Text>
                {pastQuizzes.map(renderQuizCard)}
              </View>
            )}

            {quizzes.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="document-text" size={48} color="#7f8c8d" />
                <Text style={{ color: '#7f8c8d', marginTop: 10, fontSize: 16 }}>
                  {t('no_quizzes_yet')}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowCreateQuizModal(true)}
                  style={{
                    marginTop: 20,
                    backgroundColor: '#3498db',
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: '#fff' }}>{t('create_first_quiz')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          currentQuiz && (
            <View style={{ padding: 20 }}>
              <View style={{
                backgroundColor: '#1E1E1E',
                borderRadius: 20,
                padding: 24,
                marginBottom: 24,
                borderWidth: 1,
                borderColor: '#333',
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 5
              }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8, lineHeight: 30 }}>
                  {currentQuiz.title}
                </Text>
                <Text style={{ color: '#aaa', marginBottom: 20, lineHeight: 22, fontSize: 15 }}>
                  {currentQuiz.description || t('no_description')}
                </Text>
                <View style={{ height: 1, backgroundColor: '#333', marginBottom: 20 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="list" size={18} color="#3498db" />
                    <Text style={{ color: '#3498db', marginLeft: 8, fontWeight: '600' }}>
                      {questions.length} {t('questions_count_suffix')}
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: currentQuiz.is_published ? 'rgba(39, 174, 96, 0.15)' : 'rgba(230, 126, 34, 0.15)',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: currentQuiz.is_published ? 'rgba(39, 174, 96, 0.3)' : 'rgba(230, 126, 34, 0.3)',
                  }}>
                    <Text style={{ color: currentQuiz.is_published ? '#27ae60' : '#e67e22', fontWeight: '700', fontSize: 12 }}>
                      {currentQuiz.is_published ? t('quiz_published') : t('quiz_draft')}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: 0.5 }}>
                  {t('questions_section_title')}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setEditingQuestionId(null);
                    setQuestionText('');
                    setQuestionType('mcq');
                    setQuestionPoints('1');
                    setMcqOptions(['', '', '', '']);
                    setCorrectAnswerIndex(null);
                    setShowCreateQuestionModal(true);
                  }}
                  style={{
                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(39, 174, 96, 0.3)'
                  }}
                >
                  <Ionicons name="add" size={18} color="#27ae60" />
                  <Text style={{ color: '#27ae60', marginStart: 6, fontWeight: '600' }}>{t('btn_add_question')}</Text>
                </TouchableOpacity>
              </View>

              {questions.map((question, index) => (
                <View
                  key={question.id}
                  style={{
                    backgroundColor: '#1E1E1E',
                    borderRadius: 16,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: '#333',
                    overflow: 'hidden'
                  }}
                >
                  <View style={{ padding: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                          <Text style={{ color: '#7f8c8d', fontWeight: 'bold', marginRight: 8 }}>{index + 1}.</Text>
                          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', lineHeight: 24, flex: 1 }}>
                            {question.question_text}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                          <View style={{ backgroundColor: 'rgba(52, 152, 219, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                            <Text style={{ color: '#3498db', fontSize: 12, fontWeight: '600' }}>
                              {question.question_type === 'mcq' ? t('mcq') : t('essay')}
                            </Text>
                          </View>
                          <View style={{ backgroundColor: 'rgba(189, 195, 199, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                            <Text style={{ color: '#bdc3c7', fontSize: 12, fontWeight: '600' }}>
                              {question.points} {t('points_label')}
                            </Text>
                          </View>
                        </View>

                        {question.question_type === 'mcq' && question.options && (
                          <View style={{ marginTop: 4 }}>
                            {question.options.map((option, optionIndex) => (
                              <View
                                key={optionIndex}
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  marginBottom: 6,
                                  paddingVertical: 6,
                                  paddingHorizontal: 10,
                                  backgroundColor: optionIndex.toString() === question.correct_answer ? 'rgba(39, 174, 96, 0.1)' : 'transparent',
                                  borderRadius: 8,
                                  borderLeftWidth: 3,
                                  borderLeftColor: optionIndex.toString() === question.correct_answer ? '#27ae60' : 'transparent'
                                }}
                              >
                                <Text style={{
                                  color: optionIndex.toString() === question.correct_answer ? '#27ae60' : '#7f8c8d',
                                  fontWeight: optionIndex.toString() === question.correct_answer ? '700' : '500',
                                  marginEnd: 10,
                                  fontSize: 13,
                                  width: 20
                                }}>
                                  {String.fromCharCode(65 + optionIndex)}.
                                </Text>
                                <Text style={{
                                  color: optionIndex.toString() === question.correct_answer ? '#fff' : '#aaa',
                                  flex: 1,
                                  fontSize: 14
                                }}>
                                  {option}
                                </Text>
                                {optionIndex.toString() === question.correct_answer && (
                                  <Ionicons name="checkmark-circle" size={16} color="#27ae60" />
                                )}
                              </View>
                            ))}
                          </View>
                        )}
                        {question.question_type === 'essay' && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                            <Ionicons name="information-circle-outline" size={16} color="#e67e22" />
                            <Text style={{ color: '#e67e22', fontStyle: 'italic', marginLeft: 6, fontSize: 13 }}>
                              {t('manual_grading_notice')}
                            </Text>
                          </View>
                        )}
                      </View>

                      <TouchableOpacity
                        onPress={() => handleEditQuestion(question)}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 12,
                          backgroundColor: '#2C2C2C',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: '#444'
                        }}
                      >
                        <Ionicons name="pencil" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}

              {questions.length === 0 && (
                <View style={{ alignItems: 'center', paddingVertical: 60, backgroundColor: '#1E1E1E', borderRadius: 20, borderWidth: 1, borderColor: '#333', borderStyle: 'dashed' }}>
                  <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(52, 152, 219, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                    <Ionicons name="rocket-outline" size={40} color="#3498db" />
                  </View>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
                    {t('no_questions_added')}
                  </Text>
                  <Text style={{ color: '#95a5a6', fontSize: 14, textAlign: 'center', marginBottom: 24, maxWidth: '70%' }}>
                    {t('add_first_question_prompt')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowCreateQuestionModal(true)}
                    style={{
                      shadowColor: "#3498db",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 6
                    }}
                  >
                    <LinearGradient
                      colors={['#2980b9', '#3498db']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        paddingHorizontal: 24,
                        paddingVertical: 14,
                        borderRadius: 16,
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{t('btn_add_question_short')}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}

              {!currentQuiz.is_published && questions.length > 0 && (
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 32, marginBottom: 40 }}>
                  <TouchableOpacity
                    onPress={() => openScheduleModal(currentQuiz)}
                    style={{ flex: 1 }}
                  >
                    <View style={{
                      backgroundColor: '#2C2C2C',
                      paddingVertical: 18,
                      borderRadius: 16,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: '#444'
                    }}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                        {t('btn_schedule')}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handlePublishClick(currentQuiz)}
                    style={{ flex: 1 }}
                  >
                    <LinearGradient
                      colors={['#27ae60', '#2ecc71']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        paddingVertical: 18,
                        borderRadius: 16,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                        {t('btn_publish_now')}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )
        )}
      </ScrollView >

      {/* Create Quiz Modal */}
      <Modal
        visible={showCreateQuizModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateQuizModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.8)' }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{
              backgroundColor: '#1E1E1E',
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              paddingTop: 12,
              paddingHorizontal: 24,
              paddingBottom: 40,
              borderWidth: 1,
              borderColor: '#333',
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 10,
            }}>
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <View style={{ width: 48, height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2.5 }} />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff' }}>
                  {t('create_new_quiz_title')}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowCreateQuizModal(false)}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    padding: 8,
                    borderRadius: 20,
                  }}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={{ marginBottom: 24 }}>
                <Text style={{ color: '#aaa', marginBottom: 8, fontWeight: '600', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {t('quiz_title_label')}
                </Text>
                <TextInput
                  style={{
                    backgroundColor: '#2C2C2C',
                    borderRadius: 16,
                    padding: 18,
                    color: '#fff',
                    fontSize: 16,
                    borderWidth: 1,
                    borderColor: '#444',
                    marginBottom: 4
                  }}
                  placeholder={t('quiz_title_placeholder')}
                  placeholderTextColor="#666"
                  value={quizTitle}
                  onChangeText={setQuizTitle}
                  returnKeyType="next"
                  autoFocus={true}
                />
              </View>

              <View style={{ marginBottom: 32 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#aaa', fontWeight: '600', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {t('description_label')}
                  </Text>
                  <Text style={{ color: '#666', fontSize: 12 }}>{t('optional')}</Text>
                </View>
                <TextInput
                  style={{
                    backgroundColor: '#2C2C2C',
                    borderRadius: 16,
                    padding: 18,
                    color: '#fff',
                    fontSize: 16,
                    borderWidth: 1,
                    borderColor: '#444',
                    minHeight: 120,
                    lineHeight: 24
                  }}
                  placeholder={t('description_optional_placeholder')}
                  placeholderTextColor="#666"
                  value={quizDescription}
                  onChangeText={setQuizDescription}
                  multiline
                  numberOfLines={3}
                  returnKeyType="done"
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                onPress={handleCreateQuiz}
                disabled={creatingQuiz}
                style={{
                  shadowColor: "#3498db",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.25,
                  shadowRadius: 16,
                  elevation: 12,
                }}
              >
                <LinearGradient
                  colors={['#2980b9', '#3498db']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    paddingVertical: 18,
                    borderRadius: 18,
                    alignItems: 'center',
                  }}
                >
                  {creatingQuiz ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 17, letterSpacing: 0.5 }}>
                      {t('btn_create_quiz')}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal >

      {/* Schedule Quiz Modal */}
      < Modal
        animationType="slide"
        transparent={true}
        visible={showScheduleModal}
        onRequestClose={() => setShowScheduleModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 }}>
          <View style={{ backgroundColor: '#2c2c2c', borderRadius: 15, padding: 20, maxHeight: '80%' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' }}>
              {t('schedule_quiz_title')}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ color: '#bdc3c7', marginBottom: 10 }}>{t('select_start_date_time')}</Text>
              <DatePicker
                value={scheduledDate}
                onChange={setScheduledDate}
                mode="datetime"
                minimumDate={new Date()}
              />

              <View style={{ marginTop: 20 }}>
                <Text style={{ color: '#fff', marginBottom: 8 }}>{t('time_limit_label')}</Text>
                <TextInput
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 8,
                    padding: 12,
                    color: '#fff',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)'
                  }}
                  placeholder={t('time_limit_placeholder')}
                  placeholderTextColor="#7f8c8d"
                  keyboardType="numeric"
                  value={timeLimit}
                  onChangeText={setTimeLimit}
                />
                <Text style={{ color: '#7f8c8d', fontSize: 12, marginTop: 4 }}>
                  {t('time_limit_hint')}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 }}>
                <Text style={{ color: '#fff', fontSize: 16 }}>{t('set_end_time')}</Text>
                <Switch
                  value={useEndTime}
                  onValueChange={setUseEndTime}
                  trackColor={{ false: "#767577", true: "#27ae60" }}
                  thumbColor={useEndTime ? "#fff" : "#f4f3f4"}
                />
              </View>

              {useEndTime && (
                <View>
                  <Text style={{ color: '#bdc3c7', marginBottom: 10 }}>{t('select_end_date_time')}</Text>
                  <DatePicker
                    value={endDate}
                    onChange={setEndDate}
                    mode="datetime"
                    minimumDate={scheduledDate}
                  />
                </View>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 }}>
                <TouchableOpacity
                  onPress={() => setShowScheduleModal(false)}
                  style={{
                    flex: 1,
                    backgroundColor: '#7f8c8d',
                    padding: 12,
                    borderRadius: 8,
                    marginEnd: 10,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleScheduleQuiz}
                  style={{
                    flex: 1,
                    backgroundColor: '#3498db',
                    padding: 12,
                    borderRadius: 8,
                    marginStart: 10,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('btn_schedule')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal >

      {/* Publish Quiz Modal */}
      < Modal
        animationType="slide"
        transparent={true}
        visible={showPublishModal}
        onRequestClose={() => setShowPublishModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 }}>
          <View style={{ backgroundColor: '#2c2c2c', borderRadius: 15, padding: 20, maxHeight: '80%' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' }}>
              {t('publish_quiz_title')}
            </Text>

            <Text style={{ color: '#bdc3c7', textAlign: 'center', marginBottom: 20 }}>
              {t('publish_confirmation_msg', { title: quizToPublish?.title })}
            </Text>

            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: '#fff', marginBottom: 8 }}>{t('time_limit_label')}</Text>
              <TextInput
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 8,
                  padding: 12,
                  color: '#fff',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                }}
                placeholder={t('time_limit_placeholder')}
                placeholderTextColor="#7f8c8d"
                keyboardType="numeric"
                value={publishTimeLimit}
                onChangeText={setPublishTimeLimit}
              />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ color: '#fff', fontSize: 16 }}>{t('set_end_time')}</Text>
              <Switch
                value={publishUseEndTime}
                onValueChange={setPublishUseEndTime}
                trackColor={{ false: "#767577", true: "#27ae60" }}
                thumbColor={publishUseEndTime ? "#fff" : "#f4f3f4"}
              />
            </View>

            {publishUseEndTime && (
              <View>
                <Text style={{ color: '#bdc3c7', marginBottom: 10 }}>{t('select_end_date_time')}</Text>
                <DatePicker
                  value={publishEndDate}
                  onChange={setPublishEndDate}
                  mode="datetime"
                  minimumDate={new Date()}
                />
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 }}>
              <TouchableOpacity
                onPress={() => setShowPublishModal(false)}
                style={{
                  flex: 1,
                  backgroundColor: '#7f8c8d',
                  padding: 12,
                  borderRadius: 8,
                  marginEnd: 10,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmPublishQuiz}
                style={{
                  flex: 1,
                  backgroundColor: '#27ae60',
                  padding: 12,
                  borderRadius: 8,
                  marginStart: 10,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('btn_publish_now')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal >

      {/* Create Question Modal */}
      <Modal
        visible={showCreateQuestionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateQuestionModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.8)' }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{
              backgroundColor: '#1E1E1E',
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              paddingTop: 12,
              paddingHorizontal: 24,
              paddingBottom: 40,
              maxHeight: '90%',
              borderWidth: 1,
              borderColor: '#333',
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 10,
            }}>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View style={{ width: 48, height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2.5 }} />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff' }}>
                  {editingQuestionId ? t('edit_question_title') : t('add_new_question_title')}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowCreateQuestionModal(false)}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    padding: 8,
                    borderRadius: 20,
                  }}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ flexGrow: 0, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>

                <View style={{ marginBottom: 24 }}>
                  <Text style={{ color: '#aaa', marginBottom: 12, fontWeight: '600', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {t('question_type_label')}
                  </Text>
                  <View style={{ flexDirection: 'row', backgroundColor: '#2C2C2C', padding: 4, borderRadius: 14, borderWidth: 1, borderColor: '#444' }}>
                    <TouchableOpacity
                      onPress={() => setQuestionType('mcq')}
                      style={{ flex: 1 }}
                    >
                      {questionType === 'mcq' ? (
                        <LinearGradient
                          colors={['#3498db', '#2980b9']}
                          style={{ paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
                        >
                          <Text style={{ color: '#fff', fontWeight: '700' }}>{t('mcq')}</Text>
                        </LinearGradient>
                      ) : (
                        <View style={{ paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}>
                          <Text style={{ color: '#7f8c8d', fontWeight: '600' }}>{t('mcq')}</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setQuestionType('essay')}
                      style={{ flex: 1 }}
                    >
                      {questionType === 'essay' ? (
                        <LinearGradient
                          colors={['#3498db', '#2980b9']}
                          style={{ paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
                        >
                          <Text style={{ color: '#fff', fontWeight: '700' }}>{t('essay')}</Text>
                        </LinearGradient>
                      ) : (
                        <View style={{ paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}>
                          <Text style={{ color: '#7f8c8d', fontWeight: '600' }}>{t('essay')}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ marginBottom: 24 }}>
                  <Text style={{ color: '#aaa', marginBottom: 8, fontWeight: '600', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {t('question_text_placeholder')}
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: '#2C2C2C',
                      borderRadius: 16,
                      padding: 18,
                      color: '#fff',
                      fontSize: 16,
                      borderWidth: 1,
                      borderColor: '#444',
                      minHeight: 120,
                      lineHeight: 24
                    }}
                    placeholder={t('enter_question_text_placeholder')}
                    placeholderTextColor="#666"
                    value={questionText}
                    onChangeText={setQuestionText}
                    multiline
                    textAlignVertical="top"
                  />
                </View>

                <View style={{ marginBottom: 28 }}>
                  <Text style={{ color: '#aaa', marginBottom: 8, fontWeight: '600', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {t('points_label')}
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: '#2C2C2C',
                      borderRadius: 16,
                      padding: 18,
                      color: '#fff',
                      fontSize: 16,
                      borderWidth: 1,
                      borderColor: '#444',
                    }}
                    placeholder="1"
                    placeholderTextColor="#666"
                    value={questionPoints}
                    onChangeText={setQuestionPoints}
                    keyboardType="numeric"
                  />
                </View>

                {questionType === 'mcq' && (
                  <View style={{ marginBottom: 28 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <Text style={{ color: '#aaa', fontWeight: '600', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {t('options_label')}
                      </Text>
                      <Text style={{ color: '#7f8c8d', fontSize: 12 }}>
                        Select the correct answer
                      </Text>
                    </View>

                    {mcqOptions.map((option, index) => (
                      <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <TouchableOpacity
                          onPress={() => setCorrectAnswerIndex(index)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            borderWidth: 2,
                            borderColor: correctAnswerIndex === index ? '#27ae60' : '#444',
                            backgroundColor: correctAnswerIndex === index ? '#27ae60' : 'transparent',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginEnd: 12,
                          }}
                        >
                          {correctAnswerIndex === index ? (
                            <Ionicons name="checkmark" size={18} color="#fff" />
                          ) : (
                            <Text style={{ color: '#7f8c8d', fontWeight: '700', fontSize: 12 }}>{String.fromCharCode(65 + index)}</Text>
                          )}
                        </TouchableOpacity>

                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                          <TextInput
                            style={{
                              flex: 1,
                              backgroundColor: '#2C2C2C',
                              borderRadius: 14,
                              paddingVertical: 14,
                              paddingHorizontal: 16,
                              color: '#fff',
                              fontSize: 15,
                              borderWidth: 1,
                              borderColor: correctAnswerIndex === index ? 'rgba(39, 174, 96, 0.5)' : '#444'
                            }}
                            placeholder={t('option_placeholder', { label: String.fromCharCode(65 + index) })}
                            placeholderTextColor="#555"
                            value={option}
                            onChangeText={(text) => updateMcqOption(index, text)}
                          />

                          {mcqOptions.length > 2 && (
                            <TouchableOpacity
                              onPress={() => removeMcqOption(index)}
                              style={{
                                width: 40,
                                height: 40,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginStart: 8,
                                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: 'rgba(231, 76, 60, 0.2)'
                              }}
                            >
                              <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))}

                    {mcqOptions.length < 6 && (
                      <TouchableOpacity
                        onPress={addMcqOption}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          paddingVertical: 16,
                          borderRadius: 14,
                          backgroundColor: 'rgba(52, 152, 219, 0.08)',
                          borderWidth: 1,
                          borderColor: 'rgba(52, 152, 219, 0.3)',
                          borderStyle: 'dashed',
                          marginTop: 8,
                        }}
                      >
                        <Ionicons name="add-circle-outline" size={20} color="#3498db" />
                        <Text style={{ color: '#3498db', marginStart: 8, fontWeight: '700' }}>{t('btn_add_option')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {questionType === 'essay' && (
                  <LinearGradient
                    colors={['rgba(230, 126, 34, 0.1)', 'rgba(230, 126, 34, 0.05)']}
                    style={{
                      borderRadius: 16,
                      padding: 24,
                      marginBottom: 28,
                      borderWidth: 1,
                      borderColor: 'rgba(230, 126, 34, 0.3)',
                      alignItems: 'center'
                    }}
                  >
                    <Ionicons name="document-text-outline" size={32} color="#e67e22" style={{ marginBottom: 12 }} />
                    <Text style={{ color: '#e67e22', textAlign: 'center', lineHeight: 22, fontWeight: '500' }}>
                      {t('essay_grading_notice')}
                    </Text>
                  </LinearGradient>
                )}

                <TouchableOpacity
                  onPress={handleSaveQuestion}
                  disabled={creatingQuestion}
                  style={{
                    marginBottom: 10,
                    shadowColor: "#27ae60",
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.25,
                    shadowRadius: 16,
                    elevation: 12,
                  }}
                >
                  <LinearGradient
                    colors={['#27ae60', '#2ecc71']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      paddingVertical: 18,
                      borderRadius: 18,
                      alignItems: 'center',
                    }}
                  >
                    {creatingQuestion ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 17, letterSpacing: 0.5 }}>
                        {editingQuestionId ? t('save_changes') : t('btn_add_question')}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

    </View >
  );
};

export default QuizzesScreen;