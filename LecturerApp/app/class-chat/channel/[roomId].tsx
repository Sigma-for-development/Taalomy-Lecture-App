import React, { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    View, Text, StyleSheet, StatusBar, ActivityIndicator, Alert, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, Image, TouchableWithoutFeedback, Keyboard, Linking, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_CONFIG } from '../../../src/config/api';
import { socketIOManager, ChatMessage, TypingEvent, UserEvent } from '../../../src/utils/socketio';
import { tokenStorage } from '../../../utils/tokenStorage';
const AsyncStorage = tokenStorage;
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTranslation } from 'react-i18next';

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
    const flatListRef = useRef<FlatList>(null);
    const router = useRouter();

    // AI Quiz State
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [quizConfig, setQuizConfig] = useState({ numQuestions: 5, difficulty: 'Medium' });
    const [generatingQuiz, setGeneratingQuiz] = useState(false);
    const [showQuizPreview, setShowQuizPreview] = useState(false);
    const [generatedQuiz, setGeneratedQuiz] = useState<any>(null);

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
                // Check if message already exists to prevent duplicates
                const messageExists = prev.some(m => m.message_id === message.message_id);
                if (messageExists) {
                    return prev;
                }

                const isOwnMessage = message.user_id === chatRoom?.current_user_id;

                // Ensure file_url is absolute
                if (message.file_url) {
                    message.file_url = getAbsoluteUrl(message.file_url);
                }

                // Determine if we should use the fallback for the profile picture
                const baseurl = API_CONFIG.CHAT_BASE_URL || '';
                const needsPfpFallback = !message.profile_picture_url ||
                    (message.profile_picture_url.includes('52.59.250.11') && !baseurl.includes('52.59.250.11')) ||
                    (message.profile_picture_url.includes('localhost') && !baseurl.includes('localhost'));

                if (isOwnMessage && needsPfpFallback && chatRoom?.current_user) {
                    message.profile_picture_url = chatRoom.current_user.profile_picture_url;
                    message.first_name = chatRoom.current_user.first_name;
                    message.last_name = chatRoom.current_user.last_name;
                } else if (needsPfpFallback && chatRoom?.participants) {
                    // Fallback: search for the sender in the participants list
                    // Use == for loose equality to handle string/number mismatches
                    const sender = chatRoom.participants.find((p: any) => p.id == message.user_id);
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
                        use_for_quizzes: false // Default new uploads to false
                    };

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

        setSending(true);
        try {
            // Send message via Socket.IO
            socketIOManager.sendMessage(newMessage.trim());
            setNewMessage('');
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

    const renderMessage = ({ item }: { item: ChatMessage }) => {
        // For own messages, we need to make sure we have the profile picture data
        const isOwnMessage = item.user_id === chatRoom?.current_user_id;

        // If it's our own message but we don't have profile picture data, try to get it from chatRoom
        let profilePictureUrl = item.profile_picture_url;
        let firstName = item.first_name;
        let lastName = item.last_name;

        if (isOwnMessage && !profilePictureUrl && chatRoom?.current_user) {
            profilePictureUrl = chatRoom.current_user.profile_picture_url;
            firstName = chatRoom.current_user.first_name;
            lastName = chatRoom.current_user.last_name;
        }

        const isMaterialsChannel = chatRoom?.channel_type === 'materials';
        const hasMaterialFile = item.file_url && item.type === 'file';
        const canManage = isOwnMessage && isMaterialsChannel && hasMaterialFile;

        return (
            <TouchableOpacity
                activeOpacity={canManage ? 0.7 : 1}
                onLongPress={() => canManage && handleMaterialLongPress(item)}
                delayLongPress={500}
            >
                <View style={[styles.messageContainer, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
                    {!isOwnMessage && (
                        <View style={styles.otherMessageRow}>
                            <Image
                                source={profilePictureUrl ? { uri: profilePictureUrl } : require('../../../src/assets/images/default-avatar.png')}
                                style={styles.avatar as any}
                            />
                            <View style={styles.otherMessageContent}>
                                <View style={styles.messageHeaderInfo}>
                                    <Text style={styles.messageSender}>{firstName} {lastName}</Text>
                                    <Text style={styles.messageTime}>
                                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                                <View style={[styles.messageBubble, styles.otherBubble]}>
                                    {renderMessageContent(item, isOwnMessage)}
                                </View>
                            </View>
                        </View>
                    )}

                    {isOwnMessage && (
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                            {canManage && (
                                <TouchableOpacity
                                    onPress={() => handleToggleQuizMarking(item.message_id)}
                                    style={styles.quizToggleBadge}
                                >
                                    <Ionicons
                                        name={item.use_for_quizzes ? "checkbox" : "square-outline"}
                                        size={16}
                                        color="#fff"
                                    />
                                    <Text style={styles.quizToggleText}>
                                        {t('quiz_toggle') || 'Quiz'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            <View style={styles.ownMessageContent}>
                                <View style={[styles.messageBubble, styles.ownBubble]}>
                                    {renderMessageContent(item, isOwnMessage)}
                                </View>
                                <Text style={[styles.messageTime, styles.ownMessageTime]}>
                                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
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
            <LinearGradient
                colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
                style={styles.backgroundGradient}
            />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
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
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <View style={styles.inputContainer}>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.textInput}
                            value={newMessage}
                            onChangeText={handleTyping}
                            placeholder={t('type_message_placeholder')}
                            placeholderTextColor="#7f8c8d"
                            multiline
                            maxLength={1000}
                        />
                        {Platform.OS === 'web' ? (
                            <>
                                <TouchableOpacity
                                    style={styles.attachButton}
                                    onPress={pickImage}
                                    disabled={sending}
                                >
                                    <Ionicons name="image" size={24} color="#bdc3c7" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.attachButton}
                                    onPress={pickDocument}
                                    disabled={sending}
                                >
                                    <Ionicons name="document-text" size={24} color="#bdc3c7" />
                                </TouchableOpacity>
                            </>
                        ) : (
                            <TouchableOpacity
                                style={styles.attachButton}
                                onPress={handleAttachment}
                                disabled={sending}
                            >
                                <Ionicons name="attach" size={24} color="#bdc3c7" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
                            onPress={sendMessage}
                            disabled={!newMessage.trim() || sending}
                        >
                            {sending ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Ionicons name="send" size={20} color="#fff" />
                            )}
                        </TouchableOpacity>
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
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 16,
        zIndex: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    backButton: {
        padding: 8,
        marginEnd: 8,
    },
    headerContent: {
        flex: 1,
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
        padding: 16,
        paddingBottom: 20,
    },
    messageContainer: {
        marginBottom: 16,
        maxWidth: '85%',
    },
    ownMessage: {
        alignSelf: 'flex-end',
    },
    otherMessage: {
        alignSelf: 'flex-start',
    },
    otherMessageRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(52, 152, 219, 0.2)',
        marginRight: 8,
        marginBottom: 4,
    },
    otherMessageContent: {
        flex: 1,
    },
    messageHeaderInfo: {
        marginBottom: 4,
        marginLeft: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    messageSender: {
        fontSize: 12,
        fontWeight: '600',
        color: '#bdc3c7',
    },
    messageTime: {
        fontSize: 10,
        color: '#7f8c8d',
        marginStart: 8,
    },
    ownMessageTime: {
        textAlign: 'right',
        marginTop: 2,
        marginEnd: 2,
    },
    messageBubble: {
        borderRadius: 20,
        padding: 12,
    },
    ownBubble: {
        backgroundColor: '#3498db',
        borderBottomEndRadius: 4,
    },
    otherBubble: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderBottomStartRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    ownMessageContent: {
        flex: 1,
        alignItems: 'flex-end'
    },
    ownMessageText: {
        color: '#fff',
    },
    otherMessageText: {
        color: '#ecf0f1',
    },
    typingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        alignSelf: 'flex-start',
        marginStart: 16,
    },
    typingText: {
        fontSize: 12,
        color: '#bdc3c7',
        marginEnd: 8,
        fontStyle: 'italic',
    },
    typingDots: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#bdc3c7',
        marginHorizontal: 1,
    },
    dot1: {
    },
    dot2: {
        opacity: 0.6,
    },
    dot3: {
        opacity: 0.3,
    },
    inputContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 34,
        backgroundColor: 'rgba(10, 10, 10, 0.95)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    textInput: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 12,
        paddingTop: 12,
        marginEnd: 10,
        fontSize: 16,
        color: '#fff',
        maxHeight: 120,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    attachButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        marginEnd: 10,
    },
    sendButton: {
        backgroundColor: '#3498db',
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#3498db',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    sendButtonDisabled: {
        backgroundColor: 'rgba(52, 152, 219, 0.3)',
        shadowOpacity: 0.1,
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
        width: 200,
        height: 200,
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
    // Modal Styles
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
        backgroundColor: 'rgba(255,255,255,0.1)',
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
        marginRight: 8,
        alignSelf: 'center',
    },
    quizToggleText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 4,
    },
});
