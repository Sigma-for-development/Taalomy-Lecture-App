import React, { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View, Text, StyleSheet, StatusBar, ActivityIndicator, Alert, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, Image, AppState, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, FadeOutDown, FadeIn, Layout, useAnimatedStyle, withTiming, useSharedValue, FadeInRight, FadeInLeft, LinearTransition } from 'react-native-reanimated';
import api, { API_CONFIG } from '../../src/config/api';
import { socketIOManager, ChatMessage, UserEvent } from '../../src/utils/socketio';
import { tokenStorage } from '../../utils/tokenStorage';
import { useTranslation } from 'react-i18next';
const AsyncStorage = tokenStorage;

const baseurl = API_CONFIG.CHAT_BASE_URL;

export default function DirectMessageScreen() {
  const { t } = useTranslation();
  // id here is the studentId for Direct Messages
  const { id } = useLocalSearchParams();
  const [chatRoom, setChatRoom] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [studentDetails, setStudentDetails] = useState<any>(null);
  const [studentBookings, setStudentBookings] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const chatRoomRef = useRef<any>(null);
  const router = useRouter();
  const sendScaleValue = useSharedValue(1);

  // Validate that id exists and is not undefined
  const studentId = Array.isArray(id) ? id[0] : id;
  const isValidStudentId = studentId && typeof studentId === 'string';

  useEffect(() => {
    // Check if we have a valid student ID before proceeding
    if (!isValidStudentId) {
      setError(t('invalid_student_id'));
      setLoading(false);
      return;
    }

    loadChatRoom();

    return () => {
      console.log('Unmounting DirectMessageScreen - cleaning up socket');
      socketIOManager.leaveRoom();
      // Only disconnect if really unmounting and NOT just changing studentId
      // Actually, socketIOManager is a singleton, so disconnecting might affect other screens
      // But DirectMessageScreen expects its own socket lifecycle.
      socketIOManager.disconnect();
    };
  }, [studentId, isValidStudentId]);

  // Add AppState listener to handle background/foreground - Lecturer App
  useEffect(() => {
    const handleAppStateChange = (nextAppState: any) => {
      if (nextAppState === 'active') {
        console.log('App came to foreground, checking socket connection');
        socketIOManager.connect().then(() => {
          if (chatRoom?.id) {
            socketIOManager.joinRoom(chatRoom.id.toString());
          }
        });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [chatRoom]);

  const sendButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScaleValue.value }],
  }));

  useEffect(() => {
    // Socket.IO event listeners
    const handleMessage = (message: ChatMessage) => {
      setMessages(prev => {
        // 1. Check if message already exists by official ID to prevent duplicates from multiple rooms
        if (prev.some(m => m.message_id === message.message_id)) {
          return prev;
        }

        // 2. If it's my own message, check if we have a matching optimistic one to replace
        const isOwn = chatRoomRef.current?.current_user_id && message.user_id === chatRoomRef.current.current_user_id;
        if (isOwn) {
          // Look for an optimistic message with the same content
          // We check content because for now we don't have a shared client_id/nonce
          const optimisticIndex = prev.findIndex(m =>
            (m as any).isOptimistic && m.message === message.message
          );

          if (optimisticIndex !== -1) {
            const updated = [...prev];
            updated[optimisticIndex] = message; // Replace optimistic with official
            return updated;
          }
        }

        return [message, ...prev];
      });
      // Auto-scroll to bottom (offset 0 in inverted list)
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    };

    const handleUserJoin = (event: UserEvent) => {
      console.log(`${event.username} joined the chat`);
    };

    const handleUserLeave = (event: UserEvent) => {
      console.log(`${event.username} left the chat`);
    };

    const handleConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
    };

    const handleError = (errorMessage: string) => {
      console.log('Socket error:', errorMessage);
    };

    socketIOManager.onMessage(handleMessage);
    socketIOManager.onUserJoin(handleUserJoin);
    socketIOManager.onUserLeave(handleUserLeave);
    socketIOManager.onConnectionChange(handleConnectionChange);
    socketIOManager.onError(handleError);

    return () => {
      socketIOManager.removeMessageCallback(handleMessage);
      socketIOManager.removeUserJoinCallback(handleUserJoin);
      socketIOManager.removeUserLeaveCallback(handleUserLeave);
      socketIOManager.removeConnectionCallback(handleConnectionChange);
      socketIOManager.removeErrorCallback(handleError);
    };
  }, []); // Empty dependency array for stability

  const loadChatRoom = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem('access_token');

      if (!token) {
        setError(t('error_no_token'));
        setLoading(false);
        return;
      }

      // Check for valid ID again
      if (!studentId) {
        setError(t('invalid_student_id'));
        setLoading(false);
        return;
      }

      // 1. Fetch Student Details
      try {
        // Try public profile first
        const studentResponse = await api.get(`users/public/${studentId}/`);
        setStudent(studentResponse.data);
      } catch (err) {
        console.log('Failed to load student public profile details', err);
        // Fallback: Check if we have student info in the chatRoom object later
      }

      // 2. Get the Direct Message Room ID
      const response = await api.get(`direct-messages/${studentId}/`, {
        baseURL: baseurl,
        timeout: 10000
      });

      chatRoomRef.current = response.data;
      setChatRoom(response.data);

      // If student fetch failed, try to set from chatRoom
      if (!student && response.data) {
        // Direct Message rooms often contain the other party info
        // Assuming the structure might have it, or we try to use the name/image from room
        // But for now, let's also try to fetch via authenticated user endpoint if public failed
        // Note: The public endpoint failure is the most likely cause.
      }

      const roomId = response.data.id;

      // 4. Fetch extra student details for the popup (Intakes, Payments)
      fetchStudentExtraDetails(studentId);
      const messagesResponse = await api.get(`rooms/${roomId}/messages/`, {
        baseURL: baseurl,
        timeout: 10000
      });

      // Convert messages to the expected format
      const formattedMessages = messagesResponse.data.map((msg: any) => ({
        message_id: msg.id,
        user_id: msg.sender?.id,
        username: msg.sender?.username,
        first_name: msg.sender?.first_name,
        last_name: msg.sender?.last_name,
        profile_picture_url: msg.sender?.profile_picture_url,
        message: msg.content,
        timestamp: msg.created_at,
        type: 'message'
      }));

      setMessages(formattedMessages.reverse());

      // 4. Connect to Socket.IO and Join Room
      await socketIOManager.connect();

      const userDataString = await AsyncStorage.getItem('user_data');
      if (userDataString) {
        setCurrentUser(JSON.parse(userDataString));
      }
      const currentUserId = userDataString ? JSON.parse(userDataString).id : chatRoom?.current_user_id;
      let dmRoomId: string | undefined = undefined;
      if (currentUserId && studentId) {
        dmRoomId = `dm_${Math.min(Number(currentUserId), Number(studentId))}_${Math.max(Number(currentUserId), Number(studentId))}`;
      }

      // Use the improved joinRoom that handles persistence and secondary IDs
      if (roomId) {
        await socketIOManager.joinRoom(roomId.toString(), dmRoomId);
      }

      // Mark as read
      if (response.data.unread_count > 0 && messagesResponse.data.length > 0) {
        const latestMessage = messagesResponse.data[messagesResponse.data.length - 1];
        if (socketIOManager['socket']) {
          socketIOManager['socket'].emit('mark_read', { message_id: latestMessage.id });
        }
      }

    } catch (error: any) {
      console.error('Error loading chat room:', error);
      if (error.response?.status === 404) {
        Alert.alert('Chat Unavailable', 'This user or chat no longer exists.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        setLoading(false);
        return;
      }
      if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
        setError(t('error_network_failed'));
      } else {
        setError(error.response?.data?.error || t('error_load_failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentExtraDetails = async (sId: any) => {
    try {
      setLoadingDetails(true);
      const token = await AsyncStorage.getItem('access_token');

      // Fetch details (intakes)
      const detailsResponse = await api.get(`/lecturer/student/${sId}/details/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setStudentDetails(detailsResponse.data);

      // Fetch bookings for payment history
      const bookingsResponse = await api.get(`${API_CONFIG.ACCOUNTS_BASE_URL}lecturer/bookings/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // Filter bookings for this student only
      const sBookings = bookingsResponse.data.filter((b: any) => b.student?.id === Number(sId) || b.student_id === Number(sId));
      setStudentBookings(sBookings);
    } catch (err) {
      console.log('Failed to fetch extra student details', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !chatRoom) return;

    const messageContent = newMessage.trim();
    setSending(true);

    // Optimistic Update
    const optimisticMessage: ChatMessage & { isOptimistic?: boolean } = {
      message_id: Date.now(), // Temporary ID
      user_id: chatRoom.current_user_id,
      username: 'me',
      first_name: '',
      last_name: '',
      message: messageContent,
      timestamp: new Date().toISOString(),
      type: 'message',
      isOptimistic: true
    };

    setMessages(prev => [optimisticMessage, ...prev]);
    setNewMessage('');

    try {
      // Send message via Socket.IO
      socketIOManager.sendMessage(messageContent);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert(t('error_title'), t('error_send_message'));
      // Rollback optimistic update if needed, but usually socket will just fail
    } finally {
      setSending(false);
    }
  };

  // Typing indicator removed as requested


  const retryLoad = () => {
    loadChatRoom();
  };

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    // In an inverted list, 0 is the newest message (bottom)
    // Positive offsetY means we've scrolled "up" into history
    setShowScrollBottom(offsetY > 200);
  };

  const scrollToBottom = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const renderMessage = ({ item, index }: { item: ChatMessage, index: number }) => {
    // For own messages, we need to make sure we have the profile picture data
    const isOwnMessage =
      chatRoomRef.current?.current_user_id && item.user_id === chatRoomRef.current.current_user_id;

    // Grouping Logic
    const isFirstInGroup = index === messages.length - 1 || messages[index + 1].user_id !== item.user_id;
    const isLastInGroup = index === 0 || messages[index - 1].user_id !== item.user_id;

    // Use keys for avatar fallbacks
    let profilePictureUrl = item.profile_picture_url;
    let firstName = item.first_name;
    let lastName = item.last_name;

    // Helper to check for localhost URLs
    const isLocalhost = (url?: string) => url && (url.includes('localhost') || url.includes('127.0.0.1'));

    if (!isOwnMessage) {
      if (student) {
        if (!profilePictureUrl || isLocalhost(profilePictureUrl)) {
          if (student.profile_picture_url) profilePictureUrl = student.profile_picture_url;
        }
        if (!firstName) firstName = student.first_name;
        if (!lastName) lastName = student.last_name;
      }

      const hasName = (firstName && firstName.trim()) || (lastName && lastName.trim());
      const isAdmin = item.username?.toLowerCase() === 'admin' || (student && student.username?.toLowerCase() === 'admin');

      if (!hasName || isAdmin) {
        firstName = "Taalomy";
        lastName = "Support";
        profilePictureUrl = undefined;
      }
    } else {
      // For my own messages, if details are missing, use currentUser state
      if (currentUser) {
        if (!profilePictureUrl || isLocalhost(profilePictureUrl)) {
          if (currentUser.profile_picture_url) profilePictureUrl = currentUser.profile_picture_url;
        }
        if (!firstName) firstName = currentUser.first_name;
        if (!lastName) lastName = currentUser.last_name;
      }
    }

    const radii = {
      topLeft: isOwnMessage ? 20 : (isFirstInGroup ? 20 : 4),
      bottomLeft: isOwnMessage ? 20 : (isLastInGroup ? 20 : 4),
      topRight: isOwnMessage ? (isFirstInGroup ? 20 : 4) : 20,
      bottomRight: isOwnMessage ? (isLastInGroup ? 20 : 4) : 20,
    };

    const bubbleStyle = [
      styles.messageBubble,
      isOwnMessage ? styles.ownBubble : styles.otherBubble,
      {
        borderTopLeftRadius: radii.topLeft,
        borderBottomLeftRadius: radii.bottomLeft,
        borderTopRightRadius: radii.topRight,
        borderBottomRightRadius: radii.bottomRight,
        marginTop: isFirstInGroup ? 12 : 2,
      }
    ];

    const innerRadiusStyle = {
      borderTopLeftRadius: radii.topLeft,
      borderBottomLeftRadius: radii.bottomLeft,
      borderTopRightRadius: radii.topRight,
      borderBottomRightRadius: radii.bottomRight,
    };

    return (
      <Animated.View
        entering={isOwnMessage ? FadeInRight.duration(400).springify() : FadeInLeft.duration(400).springify()}
        layout={LinearTransition.springify()}
        style={[styles.messageContainer, isOwnMessage ? styles.ownMessage : styles.otherMessage]}
      >
        {isFirstInGroup && (
          <View style={[styles.messageHeaderWithAvatar, isOwnMessage && { flexDirection: 'row-reverse' }]}>
            <Image
              source={
                (!isOwnMessage && firstName === "Taalomy" && lastName === "Support")
                  ? require('../../assets/taalomy-dark-back.png')
                  : profilePictureUrl
                    ? { uri: profilePictureUrl }
                    : require('../../src/assets/images/default-avatar.png')
              }
              style={styles.avatar as any}
            />
            <View style={[styles.messageHeaderInfo, isOwnMessage ? { marginEnd: 10, marginStart: 0, flexDirection: 'row-reverse' } : {}]}>
              <Text style={styles.messageSender}>{firstName} {lastName}</Text>
            </View>
          </View>
        )}

        <View style={bubbleStyle}>
          {isOwnMessage ? (
            <LinearGradient
              colors={['#3498db', '#2980b9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.bubbleGradient, innerRadiusStyle]}
            >
              <Text style={[styles.messageText, styles.ownMessageText]}>
                {item.message}
              </Text>
              <Text style={styles.bubbleTimeInnerMe}>
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </LinearGradient>
          ) : (
            <View style={[styles.otherBubbleInner, innerRadiusStyle]}>
              <Text style={[styles.messageText, styles.otherMessageText]}>
                {item.message}
              </Text>
              <Text style={styles.bubbleTimeInnerOther}>
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };


  // Show error screen if we don't have a valid ID
  if (!isValidStudentId) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#1b1b1b', '#1b1b1b']}
          style={styles.backgroundGradient}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('invalid_student_id')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>{t('go_back_button')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#1b1b1b', '#1b1b1b']}
          style={styles.backgroundGradient}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>{t('loading_messages')}</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
          style={styles.backgroundGradient}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retryLoad}>
            <Text style={styles.retryButtonText}>{t('retry_button')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Platform.OS !== 'web' && <StatusBar barStyle="light-content" />}
      <LinearGradient
        colors={['#1b1b1b', '#1b1b1b']}
        style={styles.backgroundGradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          {...({ onMouseEnter: () => { }, onMouseLeave: () => { } } as any)} // For hover on web
        >
          <View style={styles.glassButton}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerProfileContainer}
          onPress={() => setShowDetailsModal(true)}
        >
          <Image
            source={
              (student?.first_name === "Taalomy" && student?.last_name === "Support") || student?.username === 'admin'
                ? require('../../assets/taalomy-dark-back.png')
                : student?.profile_picture_url
                  ? { uri: student.profile_picture_url }
                  : require('../../src/assets/images/default-avatar.png')
            }
            style={styles.headerAvatar as any}
          />
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {((student?.first_name || student?.last_name) && (student.first_name || student.last_name).trim())
                ? `${student.first_name || ''} ${student.last_name || ''}`
                : 'Taalomy Support'}
            </Text>
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, isConnected ? styles.connected : styles.disconnected]} />
              <Text style={styles.headerSubtitle}>
                {isConnected ? t('status_online') : t('status_connecting')}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.detailsButton} onPress={() => setShowDetailsModal(true)}>
          <View style={styles.glassButton}>
            <Ionicons name="ellipsis-horizontal" size={22} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Details Modal */}
      <Modal
        visible={showDetailsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDetailsModal(false)}
        >
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={styles.detailsGlassCard}
          >
            <TouchableOpacity activeOpacity={1} style={{ width: '100%' }}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('details_modal_title')}</Text>
                <TouchableOpacity onPress={() => setShowDetailsModal(false)} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalProfileSection}>
                  <Image
                    source={
                      (student?.first_name === "Taalomy" && student?.last_name === "Support") || student?.username === 'admin'
                        ? require('../../assets/taalomy-dark-back.png')
                        : student?.profile_picture_url
                          ? { uri: student.profile_picture_url }
                          : require('../../src/assets/images/default-avatar.png')
                    }
                    style={styles.modalAvatar as any}
                  />
                  <Text style={styles.modalName}>
                    {((student?.first_name || student?.last_name) && (student.first_name || student.last_name).trim())
                      ? `${student.first_name || ''} ${student.last_name || ''}`
                      : 'Taalomy Support'}
                  </Text>
                  <Text style={styles.modalRole}>
                    {student?.user_type ? t(student.user_type.toLowerCase()) : t('student')}
                  </Text>
                  {student?.email && <Text style={styles.modalEmail}>{student.email}</Text>}
                </View>

                {/* Intakes Section */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{t('intakes_label')}</Text>
                  {loadingDetails ? (
                    <ActivityIndicator size="small" color="#3498db" style={{ padding: 10 }} />
                  ) : studentDetails?.intakes?.length > 0 ? (
                    studentDetails.intakes.map((intake: any) => (
                      <View key={intake.id} style={styles.modalIntakeCard}>
                        <Ionicons name="school-outline" size={18} color="#3498db" />
                        <View style={{ marginStart: 10, flex: 1 }}>
                          <Text style={styles.modalIntakeName}>{intake.name}</Text>
                          <Text style={styles.modalIntakeStatus}>{t('enrolled_in')} {intake.status}</Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.modalEmptyText}>{t('no_active_enrollments')}</Text>
                  )}
                </View>

                {/* Payments Section */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{t('payments_history')}</Text>
                  {loadingDetails ? (
                    <ActivityIndicator size="small" color="#3498db" style={{ padding: 10 }} />
                  ) : studentBookings.length > 0 ? (
                    studentBookings.slice(0, 3).map((booking: any) => (
                      <View key={booking.id} style={styles.modalPaymentCard}>
                        <View style={styles.paymentIcon}>
                          <Ionicons name="cash-outline" size={16} color="#2ecc71" />
                        </View>
                        <View style={{ flex: 1, marginStart: 10 }}>
                          <Text style={styles.paymentSubject}>{booking.subject}</Text>
                          <Text style={styles.paymentDate}>{new Date(booking.booking_date).toLocaleDateString()}</Text>
                        </View>
                        <Text style={styles.paymentAmount}>${booking.total_amount}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.modalEmptyText}>{t('no_payments_found')}</Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.viewFullProfileButton}
                  onPress={() => {
                    setShowDetailsModal(false);
                    router.push(`/student-details/${studentId}`);
                  }}
                >
                  <Text style={styles.viewFullProfileText}>{t('go_to_profile')}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#3498db" />
                </TouchableOpacity>
              </ScrollView>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        extraData={student} // Ensure list updates when student profile loads
        keyExtractor={(item) => (item.message_id ? item.message_id.toString() : Math.random().toString())}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        inverted={true}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#7f8c8d" />
            <Text style={styles.emptyText}>{t('dm_empty_title')}</Text>
            <Text style={styles.emptySubtext}>{t('dm_empty_subtext')}</Text>
          </View>
        }
      />

      {/* Scroll to Bottom Button */}
      {showScrollBottom && (
        <Animated.View
          entering={FadeInUp.duration(300)}
          exiting={FadeOutDown.duration(300)}
          style={styles.scrollBottomContainer}
        >
          <TouchableOpacity style={styles.scrollBottomButton} onPress={scrollToBottom}>
            <Ionicons name="arrow-down" size={20} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        style={styles.keyboardView}
      >
        <View style={styles.inputContainer}>
          <View style={styles.inputContent}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder={t('type_message_placeholder')}
                placeholderTextColor="#7f8c8d"
                multiline
                maxLength={1000}
                onKeyPress={(e: any) => {
                  if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <Animated.View style={sendButtonAnimatedStyle}>
                <TouchableOpacity
                  style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
                  onPress={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  onPressIn={() => sendScaleValue.value = withTiming(0.92, { duration: 100 })}
                  onPressOut={() => sendScaleValue.value = withTiming(1, { duration: 100 })}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="send" size={20} color="#fff" style={{ marginStart: 2 }} />
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a', // Match WebLayout mainContent
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
    marginTop: 10,
    fontSize: 16,
    color: '#bdc3c7',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24, // Match WebLayout logoContainer
    height: 80, // Match WebLayout logoContainer
    marginTop: Platform.OS === 'ios' ? 40 : 0, // Removed 10px margin on web for alignment
    backgroundColor: '#1b1b1b',
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d2d', // Match WebLayout logoContainer
    zIndex: 10,
  },
  backButton: {
    padding: 4,
  },
  glassButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    // Glassmorphic shadow/blur effects are handled via BG and Border on web
  },
  headerProfileContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
  },
  headerContent: {
    flex: 1,
    marginStart: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  detailsButton: {
    padding: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginEnd: 6,
  },
  connected: {
    backgroundColor: '#2ecc71',
  },
  disconnected: {
    backgroundColor: '#e74c3c',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#bdc3c7',
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 24, // More breathing room for desktop
    paddingBottom: 40,
  },
  messageContainer: {
    maxWidth: Platform.OS === 'web' ? '70%' : '85%',
    marginVertical: 2,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageHeaderWithAvatar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
  },
  messageHeaderInfo: {
    marginStart: 10,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  messageSender: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  messageTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginStart: 8,
  },
  ownMessageTime: {
    textAlign: 'right',
    marginTop: 4,
    marginEnd: 12,
  },
  messageBubble: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 80,
  },
  bubbleGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  ownBubble: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    shadowColor: '#3498db',
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  otherBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  otherBubbleInner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
    } : {}),
  },
  bubbleTimeInnerMe: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  bubbleTimeInnerOther: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.3)',
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  ownMessageText: {
    color: '#fff',
    fontWeight: '500',
  },
  otherMessageText: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    backgroundColor: 'rgba(27, 27, 27, 0.7)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    } : {}),
  },
  inputContent: {
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center', // Centered for better desktop symmetry
  },
  attachButton: {
    display: 'none', // Effectively removed
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center', // Center text and send button
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    fontSize: 15,
    color: '#fff',
    maxHeight: 150,
    outlineStyle: 'none', // Remove focus outline on web
  } as any,
  sendButton: {
    backgroundColor: '#3498db',
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginStart: 4,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    shadowOpacity: 0,
  },
  keyboardView: {
    width: '100%',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bdc3c7',
    marginTop: 8,
  },
  scrollBottomContainer: {
    position: 'absolute',
    bottom: 110,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  scrollBottomButton: {
    backgroundColor: '#3498db',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailsGlassCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(30,30,30,0.95)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalProfileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#3498db',
  },
  modalName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center'
  },
  modalRole: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3498db',
    textAlign: 'center',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  modalEmail: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center'
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3498db',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalIntakeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  modalIntakeName: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  modalIntakeStatus: {
    fontSize: 12,
    color: '#95a5a6',
  },
  modalPaymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  paymentIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentSubject: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  paymentDate: {
    fontSize: 12,
    color: '#95a5a6',
  },
  paymentAmount: {
    fontSize: 15,
    color: '#2ecc71',
    fontWeight: '700',
  },
  modalEmptyText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontStyle: 'italic',
    paddingStart: 4,
  },
  viewFullProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  viewFullProfileText: {
    color: '#3498db',
    fontSize: 15,
    fontWeight: '600',
    marginEnd: 4,
  }
});