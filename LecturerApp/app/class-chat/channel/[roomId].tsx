import React, { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    View, Text, StyleSheet, StatusBar, ActivityIndicator, Alert, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, Image, TouchableWithoutFeedback, Keyboard, Linking, Modal
} from 'react-native';
import Animated, { FadeInRight, FadeInLeft, FadeOutDown, LinearTransition, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_CONFIG } from '../../../src/config/api';
import { socketIOManager, ChatMessage, TypingEvent, UserEvent } from '../../../src/utils/socketio';
import { tokenStorage } from '../../../utils/tokenStorage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTranslation } from 'react-i18next';
const AsyncStorage = tokenStorage;

// NOTE: ReviewModal removed as Lecturers don't review classes

const baseurl = API_CONFIG.CHAT_BASE_URL;

export default function ClassChatScreen() {
    const { t } = useTranslation();
    const { roomId } = useLocalSearchParams();
    const [chatRoom, setChatRoom] = useState<any>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [typingUsers, setTypingUsers] = useState<TypingEvent[]>([]);
    const [sending, setSending] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const flatListRef = useRef<FlatList>(null);
    const chatRoomRef = useRef<any>(null);
    const sendScaleValue = useSharedValue(1);
    const router = useRouter();

    // AI Quiz State
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [quizConfig, setQuizConfig] = useState({ numQuestions: 5, difficulty: 'Medium' });
    const [generatingQuiz, setGeneratingQuiz] = useState(false);
    const [showQuizPreview, setShowQuizPreview] = useState(false);
    const [generatedQuiz, setGeneratedQuiz] = useState<any>(null);

    const isMaterialsChannel = chatRoom?.channel_type === 'materials';
    const isDesktop = Platform.OS === 'web' && typeof window !== 'undefined' && window.innerWidth > 768;

    // Validate that id exists and is not undefined
    const validRoomId = Array.isArray(roomId) ? roomId[0] : roomId;
    const isValidRoomId = validRoomId && typeof validRoomId === 'string';

    // Helper to ensure URLs are absolute
    const getAbsoluteUrl = (url: string | null | undefined): string | undefined => {
        if (!url) return undefined;
        if (url.startsWith('http')) return url;
        const baseUrl = API_CONFIG.ROOT_URL?.replace(/\/$/, '') || '';
        const path = url.startsWith('/') ? url : `/${url}`;
        return `${baseUrl}${path}`;
    };

    useEffect(() => {
        // Check if we have a valid room ID before proceeding
        if (!isValidRoomId) {
            setError(t('invalid_chat_room_id'));
            setLoading(false);
            return;
        }

        loadChatRoom();
        return () => {
            socketIOManager.disconnect();
        };
    }, [isValidRoomId]); // Use isValidRoomId instead of id

    useEffect(() => {
        // Socket.IO event listeners
        const handleMessage = (message: ChatMessage) => {
            setMessages(prev => {
                // 1. Check if message already exists by official ID to prevent duplicates
                if (prev.some(m => m.message_id === message.message_id)) {
                    return prev;
                }

                // 2. Identify if this is our own message to check for optimistic replacement
                const isOwnMessage = chatRoomRef.current?.current_user_id && message.user_id === chatRoomRef.current.current_user_id;

                if (isOwnMessage) {
                    // Look for an optimistic message with the same content (text or file_url)
                    const optimisticIndex = prev.findIndex(m =>
                        (m as any).isOptimistic &&
                        (m.message === message.message || (m.file_url && m.file_url === message.file_url))
                    );

                    if (optimisticIndex !== -1) {
                        const updated = [...prev];
                        updated[optimisticIndex] = {
                            ...message,
                            file_url: message.file_url ? getAbsoluteUrl(message.file_url) : undefined
                        };
                        return updated;
                    }
                }

                // Ensure file_url is absolute
                if (message.file_url) {
                    message.file_url = getAbsoluteUrl(message.file_url);
                }

                // Default fallback logic for names/PFPs
                const baseurl = API_CONFIG.CHAT_BASE_URL || '';
                const needsPfpFallback = !message.profile_picture_url ||
                    (message.profile_picture_url.includes('52.59.250.11') && !baseurl.includes('52.59.250.11')) ||
                    (message.profile_picture_url.includes('localhost') && !baseurl.includes('localhost'));

                if (isOwnMessage && needsPfpFallback && chatRoomRef.current?.current_user) {
                    message.profile_picture_url = chatRoomRef.current.current_user.profile_picture_url;
                    message.first_name = chatRoomRef.current.current_user.first_name;
                    message.last_name = chatRoomRef.current.current_user.last_name;
                } else if (needsPfpFallback && chatRoomRef.current?.participants) {
                    const sender = chatRoomRef.current.participants.find((p: any) => p.id == message.user_id);
                    if (sender) {
                        message.profile_picture_url = sender.profile_picture_url;
                        if (!message.first_name) message.first_name = sender.first_name;
                        if (!message.last_name) message.last_name = sender.last_name;
                    }
                }

                return [...prev, message];
            });
            // Auto-scroll to bottom
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        };

        const handleTyping = (event: TypingEvent) => {
            setTypingUsers(prev => {
                const filtered = prev.filter(u => u.user_id !== event.user_id);
                if (event.typing) {
                    return [...filtered, event];
                }
                return filtered;
            });
        };

        const handleUserJoin = (event: UserEvent) => {
            // Could show a notification or update UI
            console.log(`${event.username} joined the chat`);
        };

        const handleUserLeave = (event: UserEvent) => {
            // Could show a notification or update UI
            console.log(`${event.username} left the chat`);
        };

        const handleConnectionChange = (connected: boolean) => {
            setIsConnected(connected);
        };

        const handleError = (errorMessage: string) => {
            setError(errorMessage);
        };

        const loadUserFromStorage = async () => {
            const userDataString = await AsyncStorage.getItem('user_data');
            if (userDataString) {
                setCurrentUser(JSON.parse(userDataString));
            }
        };

        loadUserFromStorage();

        socketIOManager.onMessage(handleMessage);
        socketIOManager.onTyping(handleTyping);
        socketIOManager.onUserJoin(handleUserJoin);
        socketIOManager.onUserLeave(handleUserLeave);
        socketIOManager.onConnectionChange(handleConnectionChange);
        socketIOManager.onError(handleError);

        return () => {
            socketIOManager.removeMessageCallback(handleMessage);
            socketIOManager.removeTypingCallback(handleTyping);
            socketIOManager.removeUserJoinCallback(handleUserJoin);
            socketIOManager.removeUserLeaveCallback(handleUserLeave);
            socketIOManager.removeConnectionCallback(handleConnectionChange);
            socketIOManager.removeErrorCallback(handleError);
        };
    }, []);

    const sendButtonAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: sendScaleValue.value }],
    }));

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

            // Ensure id is a string (already validated above)
            const validId = Array.isArray(roomId) ? roomId[0] : roomId;

            // Additional validation to ensure roomId is valid
            if (!validId || validId === 'undefined') {
                setError(t('invalid_chat_room_id'));
                setLoading(false);
                return;
            }

            // Load chat room details
            const response = await axios.get(`${baseurl}rooms/${validId}/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                timeout: 10000
            });

            setChatRoom(response.data);
            chatRoomRef.current = response.data;

            // Load existing messages
            const messagesResponse = await axios.get(`${baseurl}rooms/${response.data.id}/messages/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                timeout: 10000
            });

            // Convert messages to the expected format
            const formattedMessages = messagesResponse.data.map((msg: any) => ({
                message_id: msg.id,
                user_id: msg.sender?.id,
                username: msg.sender?.username,
                first_name: msg.sender?.first_name,
                last_name: msg.sender?.last_name,
                profile_picture_url: msg.sender?.profile_picture_url, // Add profile picture URL
                message: msg.content,
                timestamp: msg.created_at,
                type: msg.message_type || 'message',
                file_url: msg.file_url,
                use_for_quizzes: msg.use_for_quizzes, // Map use_for_quizzes from backend
            }));

            // Filter out potential duplicates from the API response
            const uniqueMessages = formattedMessages.filter((msg: ChatMessage, index: number, self: ChatMessage[]) =>
                index === self.findIndex((m) => m.message_id === msg.message_id)
            );

            setMessages(uniqueMessages);

            // Connect to Socket.IO
            await socketIOManager.connect();
            await socketIOManager.joinRoom(response.data.id.toString());

            // Mark all messages as read when entering the chat room
            if (response.data.unread_count > 0) {
                // Emit mark_read event for the latest message to update last_read_at timestamp
                if (uniqueMessages.length > 0) {
                    const latestMessage = uniqueMessages[uniqueMessages.length - 1];
                    // Use the socketIOManager's socket directly to emit the event
                    if (socketIOManager['socket']) {
                        socketIOManager['socket'].emit('mark_read', { message_id: latestMessage.id });

                        // Add a small delay to ensure the server processes the mark_read event
                        // before we potentially refresh the chat room list
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
            }

        } catch (error: any) {
            console.error('Error loading chat room:', error);
            if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
                setError(t('error_network_failed'));
            } else {
                setError(error.response?.data?.error || t('error_load_failed'));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAttachment = () => {
        Alert.alert(
            t('select_attachment'),
            t('choose_file_type'),
            [
                {
                    text: t('image'),
                    onPress: pickImage,
                },
                {
                    text: t('document'),
                    onPress: pickDocument,
                },
                {
                    text: t('cancel'),
                    style: 'cancel',
                },
            ]
        );
    };

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 1, // Get full quality first, then compress
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];

                // Compress image using ImageManipulator
                const manipResult = await ImageManipulator.manipulateAsync(
                    asset.uri,
                    [{ resize: { width: 1024 } }], // Resize to max width 1024, height auto-scaled
                    { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
                );

                await uploadAndSendFile({
                    uri: manipResult.uri,
                    name: asset.fileName || 'image.jpg',
                    mimeType: 'image/jpeg',
                }, 'image');
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert(t('error'), t('error_picking_image'));
        }
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                await uploadAndSendFile(result.assets[0], 'file');
            }
        } catch (error) {
            console.error('Error picking document:', error);
            Alert.alert(t('error'), t('error_picking_document'));
        }
    };

    const uploadAndSendFile = async (file: any, type: 'image' | 'file') => {
        setSending(true);
        try {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) return;

            const formData = new FormData();
            if (Platform.OS === 'web') {
                const response = await fetch(file.uri);
                const blob = await response.blob();
                formData.append('file', blob, file.name || (type === 'image' ? 'image.jpg' : 'document.pdf'));
            } else {
                formData.append('file', {
                    uri: file.uri,
                    name: file.name || (type === 'image' ? 'image.jpg' : 'document.pdf'),
                    type: file.mimeType || (type === 'image' ? 'image/jpeg' : 'application/pdf'),
                } as any);
            }

            // Upload file
            const response = await axios.post(`${API_CONFIG.CHAT_BASE_URL}upload/`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data && response.data.file_url) {
                // Send message with file URL
                socketIOManager.sendMessage('', {
                    file_url: response.data.file_url,
                    message_type: type,
                });

                // Manually add message to state for instant visibility
                if (chatRoom && chatRoom.current_user) {
                    const optimisticMessage: ChatMessage = {
                        message_id: Date.now(), // Temporary ID
                        user_id: chatRoom.current_user_id,
                        username: chatRoom.current_user.username,
                        first_name: chatRoom.current_user.first_name,
                        last_name: chatRoom.current_user.last_name,
                        profile_picture_url: chatRoom.current_user.profile_picture_url,
                        message: '',
                        timestamp: new Date().toISOString(),
                        type: type,
                        file_url: getAbsoluteUrl(response.data.file_url),
                        message_type: type,
                        use_for_quizzes: false, // Default new uploads to false
                        isOptimistic: true
                    } as any;

                    setMessages(prev => [...prev, optimisticMessage]);

                    // Auto-scroll
                    setTimeout(() => {
                        flatListRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                }
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            Alert.alert(t('error'), t('error_uploading_file'));
        } finally {
            setSending(false);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || sending || !chatRoom) return;

        const messageText = newMessage.trim();
        setNewMessage('');
        setSending(true);

        try {
            // Optimistic update for text
            const optimisticMessage: ChatMessage = {
                message_id: Date.now(),
                user_id: chatRoom.current_user_id,
                username: chatRoom.current_user?.username || '',
                first_name: chatRoom.current_user?.first_name || '',
                last_name: chatRoom.current_user?.last_name || '',
                profile_picture_url: chatRoom.current_user?.profile_picture_url,
                message: messageText,
                timestamp: new Date().toISOString(),
                type: 'message',
                isOptimistic: true
            } as any;

            setMessages(prev => [...prev, optimisticMessage]);

            // Send message via Socket.IO
            socketIOManager.sendMessage(messageText);
        } catch (error) {
            console.error('Error sending message:', error);
            Alert.alert(t('error_title'), t('error_send_message'));
        } finally {
            setSending(false);
        }
    };

    const handleTyping = (text: string) => {
        setNewMessage(text);
        // Send typing indicator
        socketIOManager.sendTyping(text.length > 0);
    };

    const retryLoad = () => {
        loadChatRoom();
    };

    const handleGenerateQuiz = async () => {
        if (!chatRoom?.class_obj?.id) return;

        setGeneratingQuiz(true);
        try {
            const token = await AsyncStorage.getItem('access_token');
            // Use API_CONFIG.BASE_URL for ai-assistant endpoints (routed in api.ts interceptor or direct here)
            // Since we use direct axios here, we need the full URL
            const response = await axios.post(`${API_CONFIG.BASE_URL}/ai-assistant/practice-quiz/generate/`, {
                class_id: chatRoom.class_obj.id,
                num_questions: quizConfig.numQuestions,
                difficulty: quizConfig.difficulty
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Fetch the full quiz details to get questions
            const fullQuizResponse = await axios.get(`${API_CONFIG.BASE_URL}/ai-assistant/practice-quiz/${response.data.id}/`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setGeneratedQuiz(fullQuizResponse.data);
            setShowQuizModal(false);
            setShowQuizPreview(true);
        } catch (error: any) {
            console.error('Quiz generation error:', error);
            const errorMessage = error.response?.data?.error || t('quiz_generation_error');
            Alert.alert(t('error'), errorMessage);
        } finally {
            setGeneratingQuiz(false);
        }
    };

    const handlePublishQuiz = async () => {
        if (!generatedQuiz?.id) return;

        try {
            const token = await AsyncStorage.getItem('access_token');
            await axios.post(`${API_CONFIG.BASE_URL}/ai-assistant/practice-quiz/${generatedQuiz.id}/publish/`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setShowQuizPreview(false);
            setGeneratedQuiz(null); // Clear state after publish
            Alert.alert(t('success'), t('quiz_published_success'));
        } catch (error: any) {
            console.error('Quiz publish error:', error);
            Alert.alert(t('error'), t('quiz_publish_error'));
        }
    };

    const handleDeleteQuiz = async () => {
        if (!generatedQuiz?.id) return;

        Alert.alert(
            t('confirm_delete'),
            t('confirm_delete_quiz'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('access_token');
                            await axios.delete(`${API_CONFIG.BASE_URL}/ai-assistant/practice-quiz/${generatedQuiz.id}/delete/`, {
                                headers: { Authorization: `Bearer ${token}` }
                            });

                            setShowQuizPreview(false);
                            setGeneratedQuiz(null); // Clear state after delete
                            Alert.alert(t('success'), t('quiz_deleted_success'));
                        } catch (error: any) {
                            console.error('Quiz delete error:', error);
                            Alert.alert(t('error'), t('quiz_delete_error'));
                        }
                    }
                }
            ]
        );
    };

    const handleMaterialLongPress = (message: ChatMessage) => {
        if (message.user_id !== chatRoom?.current_user_id) return; // Only sender can manage
        if (!message.file_url) return; // Only for file messages

        Alert.alert(
            t('manage_material'),
            '',
            [
                {
                    text: t('delete_material'),
                    style: 'destructive',
                    onPress: () => handleDeleteMaterial(message.message_id)
                },
                {
                    text: t('cancel'),
                    style: 'cancel'
                }
            ]
        );
    };

    const handleToggleQuizMarking = async (messageId: number) => {
        try {
            const token = await AsyncStorage.getItem('access_token');
            const response = await axios.patch(`${API_CONFIG.CHAT_BASE_URL}messages/${messageId}/toggle-quiz/`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Update the message in the local state
            setMessages(prev => prev.map(msg =>
                msg.message_id === messageId
                    ? { ...msg, use_for_quizzes: response.data.use_for_quizzes }
                    : msg
            ));

            // Silent update for better UX (No Alert)
        } catch (error: any) {
            console.error('Toggle quiz marking error:', error);
            Alert.alert(t('error'), error.response?.data?.error || 'Failed to toggle quiz marking');
        }
    };

    const handleDeleteMaterial = (messageId: number) => {
        Alert.alert(
            t('delete_material'),
            t('confirm_delete_material'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('access_token');
                            await axios.delete(`${API_CONFIG.CHAT_BASE_URL}messages/${messageId}/delete/`, {
                                headers: { Authorization: `Bearer ${token}` }
                            });

                            // Remove from local state
                            setMessages(prev => prev.filter(msg => msg.message_id !== messageId));
                            Alert.alert(t('success'), t('material_deleted'));
                        } catch (error: any) {
                            console.error('Delete material error:', error);
                            Alert.alert(t('error'), t('material_delete_error'));
                        }
                    }
                }
            ]
        );
    };

    const renderMessage = ({ item, index }: { item: ChatMessage, index: number }) => {
        const isOwnMessage = item.user_id === chatRoom?.current_user_id;

        // Grouping Logic
        // In this chat, messages are ordered by timestamp (not inverted in current view)
        // Wait, looking at the DM code, it was inverted=true.
        // Let's check the FlatList in this file. It is NOT inverted currently.
        // If it's NOT inverted, index 0 is the oldest message.
        const isFirstInGroup = index === 0 || messages[index - 1].user_id !== item.user_id;
        const isLastInGroup = index === messages.length - 1 || messages[index + 1].user_id !== item.user_id;

        let profilePictureUrl = item.profile_picture_url;
        let firstName = item.first_name;
        let lastName = item.last_name;

        if (isOwnMessage) {
            if (currentUser) {
                if (!profilePictureUrl) profilePictureUrl = currentUser.profile_picture_url;
                if (!firstName) firstName = currentUser.first_name;
                if (!lastName) lastName = currentUser.last_name;
            } else if (chatRoom?.current_user) {
                if (!profilePictureUrl) profilePictureUrl = chatRoom.current_user.profile_picture_url;
                if (!firstName) firstName = chatRoom.current_user.first_name;
                if (!lastName) lastName = chatRoom.current_user.last_name;
            }
        }

        const isMaterialsChannel = chatRoom?.channel_type === 'materials';
        const hasMaterialFile = item.file_url && item.type === 'file';
        const canManage = isOwnMessage && isMaterialsChannel && hasMaterialFile;

        const radii = {
            topLeft: isOwnMessage ? 20 : (isFirstInGroup ? 20 : 4),
            bottomLeft: isOwnMessage ? 20 : (isLastInGroup ? 20 : 4),
            topRight: isOwnMessage ? (isFirstInGroup ? 20 : 4) : 20,
            bottomRight: isOwnMessage ? (isLastInGroup ? 20 : 4) : 20,
        };

        const bubbleStyle = [
            styles.messageBubble,
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
            <TouchableOpacity
                activeOpacity={canManage ? 0.7 : 1}
                onLongPress={() => canManage && handleMaterialLongPress(item)}
                delayLongPress={500}
                style={{ width: '100%' }}
            >
                <Animated.View
                    entering={isOwnMessage ? FadeInRight.duration(400).springify() : FadeInLeft.duration(400).springify()}
                    layout={LinearTransition.springify()}
                    style={[styles.messageContainer, isOwnMessage ? styles.ownMessage : styles.otherMessage]}
                >
                    {isFirstInGroup && (
                        <View style={[styles.messageHeaderWithAvatar, isOwnMessage && { flexDirection: 'row-reverse' }]}>
                            <Image
                                source={profilePictureUrl ? { uri: profilePictureUrl } : require('../../../src/assets/images/default-avatar.png')}
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
                                {canManage && (
                                    <TouchableOpacity
                                        onPress={() => handleToggleQuizMarking(item.message_id)}
                                        style={styles.quizToggleBadge}
                                    >
                                        <Ionicons
                                            name={item.use_for_quizzes ? "checkbox" : "square-outline"}
                                            size={14}
                                            color="#fff"
                                        />
                                        <Text style={styles.quizToggleText}>
                                            {t('quiz_toggle') || 'Quiz'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                {renderMessageContent(item, isOwnMessage)}
                                <Text style={styles.bubbleTimeInnerMe}>
                                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </LinearGradient>
                        ) : (
                            <View style={[styles.otherBubbleInner, innerRadiusStyle]}>
                                {renderMessageContent(item, isOwnMessage)}
                                <Text style={styles.bubbleTimeInnerOther}>
                                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        )}
                    </View>
                </Animated.View>
            </TouchableOpacity>
        );
    };

    const renderMessageContent = (item: ChatMessage, isOwnMessage: boolean) => {
        if (item.type === 'image' && item.file_url) {
            return (
                <TouchableOpacity onPress={() => setSelectedImage(item.file_url || null)}>
                    <Image
                        source={{ uri: item.file_url }}
                        style={styles.messageImage}
                        resizeMode="cover"
                    />
                </TouchableOpacity>
            );
        }

        if (item.type === 'file' && item.file_url) {
            return (
                <TouchableOpacity
                    style={styles.fileMessageLayout}
                    onPress={() => Linking.openURL(item.file_url!)}
                >
                    <Ionicons name="document-text" size={24} color={isOwnMessage ? '#fff' : '#bdc3c7'} />
                    <Text style={[styles.messageText, isOwnMessage ? styles.ownMessageText : styles.otherMessageText, styles.fileNameText]}>
                        {t('download_file')}
                    </Text>
                </TouchableOpacity>
            );
        }

        return (
            <Text style={[styles.messageText, isOwnMessage ? styles.ownMessageText : styles.otherMessageText]}>
                {item.message}
            </Text>
        );
    };

    const renderTypingIndicator = () => {
        if (typingUsers.length === 0) return null;

        return (
            <View style={styles.typingContainer}>
                <Text style={styles.typingText}>
                    {typingUsers.map(u => u.first_name).join(', ')} {t(typingUsers.length === 1 ? 'typing_single' : 'typing_plural')}
                </Text>
                <View style={styles.typingDots}>
                    <View style={[styles.dot, styles.dot1]} />
                    <View style={[styles.dot, styles.dot2]} />
                    <View style={[styles.dot, styles.dot3]} />
                </View>
            </View>
        );
    };

    // Show error screen if we don't have a valid room ID
    if (!isValidRoomId) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" />
                <LinearGradient
                    colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
                    style={styles.backgroundGradient}
                />
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{t('invalid_chat_room_id')}</Text>
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
                    colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
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
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <View style={styles.glassButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </View>
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {chatRoom?.name || t('class_chat_title')}
                    </Text>
                    <View style={styles.statusContainer}>
                        <View style={[styles.statusDot, isConnected ? styles.connected : styles.disconnected]} />
                        <Text style={styles.headerSubtitle}>
                            {isConnected ? t('status_online') : t('status_connecting')}
                        </Text>
                    </View>
                </View>
                {chatRoom?.channel_type === 'practice-quizzes' ? (
                    <TouchableOpacity
                        style={styles.aiButton}
                        onPress={() => {
                            if (generatedQuiz) {
                                setShowQuizPreview(true);
                            } else {
                                setShowQuizModal(true);
                            }
                        }}
                    >
                        <Text style={styles.aiButtonText}>{t('ai_quiz_button')}</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.headerSpacer} />
                )}
            </View>

            {/* Messages List */}
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item, index) => {
                    if (item.message_id) return item.message_id.toString();
                    // Fallback for optimistic or malformed messages: use timestamp + index to ensure uniqueness
                    return `temp-${item.timestamp || Date.now()}-${index}`;
                }}
                style={styles.messagesList}
                contentContainerStyle={styles.messagesContainer}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                ListFooterComponent={renderTypingIndicator}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="chatbubbles-outline" size={64} color="#7f8c8d" />
                        <Text style={styles.emptyText}>{t('welcome_to_chat', { name: chatRoom?.name })}</Text>
                        <Text style={styles.emptySubtext}>{t('start_discussing')}</Text>
                    </View>
                }
            />

            {/* Input Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? (isMaterialsChannel ? 80 : 0) : 0}
                style={styles.keyboardView}
            >
                <View style={styles.footerContainer}>
                    <View style={styles.inputBarInner}>
                        <View style={styles.inputActionsLeft}>
                            {Platform.OS === 'web' ? (
                                <>
                                    <TouchableOpacity
                                        style={styles.iconActionButton}
                                        onPress={pickImage}
                                        disabled={sending}
                                    >
                                        <Ionicons name="image" size={22} color="#bdc3c7" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.iconActionButton}
                                        onPress={pickDocument}
                                        disabled={sending}
                                    >
                                        <Ionicons name="document-text" size={22} color="#bdc3c7" />
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <TouchableOpacity
                                    style={styles.iconActionButton}
                                    onPress={handleAttachment}
                                    disabled={sending}
                                >
                                    <Ionicons name="attach-outline" size={24} color="#bdc3c7" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.textInput}
                                value={newMessage}
                                onChangeText={handleTyping}
                                placeholder={t('type_message_placeholder')}
                                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                                multiline
                                maxLength={1000}
                                onKeyPress={(e: any) => {
                                    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                                        e.preventDefault();
                                        sendMessage();
                                    }
                                }}
                            />
                        </View>

                        <View style={styles.inputActionsRight}>
                            <Animated.View style={sendButtonAnimatedStyle}>
                                <TouchableOpacity
                                    style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
                                    onPress={sendMessage}
                                    disabled={!newMessage.trim() || sending}
                                    onPressIn={() => { sendScaleValue.value = withTiming(0.9, { duration: 100 }); }}
                                    onPressOut={() => { sendScaleValue.value = withTiming(1, { duration: 100 }); }}
                                >
                                    {sending ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Ionicons name="paper-plane" size={18} color="#fff" style={{ marginLeft: 2 }} />
                                    )}
                                </TouchableOpacity>
                            </Animated.View>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>

            <Modal visible={!!selectedImage} transparent={true} onRequestClose={() => setSelectedImage(null)}>
                <View style={styles.modalContainer}>
                    <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedImage(null)}>
                        <Ionicons name="close" size={30} color="#fff" />
                    </TouchableOpacity>
                    {selectedImage && (
                        <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />
                    )}
                </View>
            </Modal>

            {/* AI Quiz Generation Modal */}
            <Modal
                visible={showQuizModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowQuizModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('generate_ai_quiz')}</Text>

                        <Text style={styles.label}>{t('number_of_questions')}: {quizConfig.numQuestions}</Text>
                        <View style={styles.optionsRow}>
                            {[3, 5, 10].map(num => (
                                <TouchableOpacity
                                    key={num}
                                    style={[styles.optionButton, quizConfig.numQuestions === num && styles.optionButtonSelected]}
                                    onPress={() => setQuizConfig({ ...quizConfig, numQuestions: num })}
                                >
                                    <Text style={[styles.optionText, quizConfig.numQuestions === num && styles.optionTextSelected]}>{num}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>{t('difficulty')}:</Text>
                        <View style={styles.optionsRow}>
                            {['Easy', 'Medium', 'Hard'].map(diff => (
                                <TouchableOpacity
                                    key={diff}
                                    style={[styles.optionButton, quizConfig.difficulty === diff && styles.optionButtonSelected]}
                                    onPress={() => setQuizConfig({ ...quizConfig, difficulty: diff })}
                                >
                                    <Text style={[styles.optionText, quizConfig.difficulty === diff && styles.optionTextSelected]}>{diff}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setShowQuizModal(false)}
                            >
                                <Text style={styles.buttonText}>{t('cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.createButton]}
                                onPress={handleGenerateQuiz}
                                disabled={generatingQuiz}
                            >
                                {generatingQuiz ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('generate')}</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Quiz Preview Modal */}
            <Modal
                visible={showQuizPreview}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowQuizPreview(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: '80%' }]}>
                        <Text style={styles.modalTitle}>{t('quiz_draft')}</Text>

                        <FlatList
                            data={generatedQuiz?.questions || []}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={({ item, index }) => (
                                <View style={{ marginBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingBottom: 15 }}>
                                    <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 8 }}>
                                        {index + 1}. {item.question}
                                    </Text>
                                    {item.options.map((option: string, optIndex: number) => (
                                        <Text
                                            key={optIndex}
                                            style={{
                                                color: option === item.correct_answer ? '#2ecc71' : '#bdc3c7',
                                                marginLeft: 10,
                                                marginBottom: 4,
                                                fontWeight: option === item.correct_answer ? 'bold' : 'normal'
                                            }}
                                        >
                                            • {option}
                                        </Text>
                                    ))}
                                </View>
                            )}
                            style={{ marginBottom: 20 }}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.deleteButton]}
                                onPress={handleDeleteQuiz}
                            >
                                <Text style={styles.buttonText}>{t('discard')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.createButton]}
                                onPress={handlePublishQuiz}
                            >
                                <Text style={styles.buttonText}>{t('publish')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1b1b1b',
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
        paddingHorizontal: 24,
        height: 80,
        marginTop: Platform.OS === 'ios' ? 40 : 0,
        zIndex: 10,
        backgroundColor: '#1b1b1b',
        borderBottomWidth: 1,
        borderBottomColor: '#2d2d2d',
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
    },
    headerContent: {
        flex: 1,
        marginStart: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
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
    headerSpacer: {
        width: 32,
        alignItems: 'flex-end',
    },
    aiButton: {
        backgroundColor: 'rgba(155, 89, 182, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(155, 89, 182, 0.5)',
    },
    aiButtonText: {
        color: '#9b59b6',
        fontSize: 12,
        fontWeight: '700',
    },
    messagesList: {
        flex: 1,
    },
    messagesContainer: {
        padding: 24,
        paddingBottom: 40,
    },
    messageContainer: {
        marginBottom: 2,
        width: '100%',
    },
    ownMessage: {
        alignItems: 'flex-end',
    },
    otherMessage: {
        alignItems: 'flex-start',
    },
    messageHeaderWithAvatar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        marginTop: 12,
    },
    avatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    messageHeaderInfo: {
        marginStart: 10,
    },
    messageSender: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.6)',
    },
    messageBubble: {
        maxWidth: Platform.OS === 'web' ? '70%' : '85%',
        overflow: 'hidden',
    },
    bubbleGradient: {
        padding: 12,
        paddingBottom: 8,
    },
    otherBubbleInner: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        padding: 12,
        paddingBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        ...Platform.select({
            web: {
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
            }
        })
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
        color: '#fff',
    },
    ownMessageText: {
        color: '#fff',
    },
    otherMessageText: {
        color: 'rgba(255, 255, 255, 0.9)',
    },
    bubbleTimeInnerMe: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'right',
        marginTop: 4,
    },
    bubbleTimeInnerOther: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.4)',
        textAlign: 'right',
        marginTop: 4,
    },
    typingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 15,
        alignSelf: 'flex-start',
    },
    typingText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.5)',
        marginEnd: 8,
    },
    typingDots: {
        flexDirection: 'row',
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        marginHorizontal: 1.5,
    },
    dot1: {},
    dot2: {},
    dot3: {},
    keyboardView: {
        width: '100%',
    },
    footerContainer: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: 'rgba(27, 27, 27, 0.7)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
        ...Platform.select({
            web: {
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
            }
        })
    },
    inputBarInner: {
        flexDirection: 'row',
        alignItems: 'center',
        maxWidth: 900,
        alignSelf: 'center',
        width: '100%',
    },
    inputActionsLeft: {
        flexDirection: 'row',
        marginRight: 8,
    },
    iconActionButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        marginRight: 8,
    },
    inputWrapper: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 24,
        paddingHorizontal: 18,
        minHeight: 44,
        maxHeight: 120,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    textInput: {
        fontSize: 15,
        color: '#fff',
        paddingVertical: 10,
        ...Platform.select({
            web: { outlineStyle: 'none' } as any
        })
    },
    inputActionsRight: {
        marginLeft: 12,
    },
    sendButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#3498db',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#3498db',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    sendButtonDisabled: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        shadowOpacity: 0,
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
    messageImage: {
        width: 240,
        height: 180,
        borderRadius: 12,
    },
    fileMessageLayout: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 4,
    },
    fileNameText: {
        marginLeft: 8,
        textDecorationLine: 'underline',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 30,
        zIndex: 20,
        padding: 10,
    },
    fullImage: {
        width: '100%',
        height: '80%',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 20,
        textAlign: 'center',
    },
    label: {
        color: '#bdc3c7',
        marginBottom: 10,
        fontSize: 14,
    },
    optionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    optionButton: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    optionButtonSelected: {
        backgroundColor: 'rgba(52, 152, 219, 0.2)',
        borderColor: '#3498db',
    },
    optionText: {
        color: '#bdc3c7',
        fontWeight: '600',
    },
    optionTextSelected: {
        color: '#3498db',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    createButton: {
        backgroundColor: '#3498db',
    },
    deleteButton: {
        backgroundColor: '#e74c3c',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    previewText: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24
    },
    quizToggleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(39, 174, 96, 0.8)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 8,
        alignSelf: 'flex-start',
    },
    quizToggleText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 4,
    },
});
