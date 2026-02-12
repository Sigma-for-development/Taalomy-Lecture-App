import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Platform, KeyboardAvoidingView, Animated, Easing, Text, Image, TouchableOpacity, TextInput, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { GiftedChat, Bubble, Send, InputToolbar, Composer, Avatar } from 'react-native-gifted-chat';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { aiService, AIChatMessage } from '../src/utils/aiService';
import { LinearGradient } from 'expo-linear-gradient';
import Markdown from 'react-native-markdown-display';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';

import { BlurView } from 'expo-blur';
import { formatGregorianDate } from '../src/utils/dateFormatter';
import Toast from 'react-native-toast-message';

const AnimatedMessage = ({ children }: { children: React.ReactNode }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(10)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 400,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    return (
        <Animated.View style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            marginBottom: 16
        }}>
            {children}
        </Animated.View>
    );
};

const CustomTypingIndicator = () => {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animate = (anim: Animated.Value, delay: number) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim, {
                        toValue: 0,
                        duration: 500,
                        useNativeDriver: true,
                    })
                ])
            ).start();
        };

        animate(dot1, 0);
        animate(dot2, 200);
        animate(dot3, 400);
    }, []);

    const dotStyle = (anim: Animated.Value) => ({
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#3498db',
        marginHorizontal: 3,
        opacity: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.3, 1]
        }),
        transform: [{
            translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -4]
            })
        }]
    });

    return (
        <View style={{ flexDirection: 'row', padding: 15, alignItems: 'center' }}>
            <Animated.View style={dotStyle(dot1)} />
            <Animated.View style={dotStyle(dot2)} />
            <Animated.View style={dotStyle(dot3)} />
        </View>
    );
};

const ActionConfirmationCard = ({ action, onConfirm, onCancel, status }: any) => {
    const { t } = useTranslation();
    const isSent = status === 'sent';
    const isError = status === 'error';
    const isPending = status === 'pending';

    return (
        <View style={styles.actionCard}>
            <View style={styles.actionCardHeader}>
                <Ionicons
                    name={isSent ? "checkmark-circle" : "mail-outline"}
                    size={20}
                    color={isSent ? "#2ecc71" : "#3498db"}
                />
                <Text style={styles.actionCardTitle}>
                    {isSent ? t('message_sent') || "Message Sent" : `${t('text_to') || "Text to"} ${action.student_name} (ID: ${action.student_id})`}
                </Text>
            </View>

            {!isSent && (
                <>
                    <Text style={styles.actionCardContent}>{action.content}</Text>
                    <View style={styles.actionCardActions}>
                        <TouchableOpacity
                            style={[styles.confirmButton, isPending && { opacity: 0.7 }]}
                            onPress={onConfirm}
                            disabled={isPending}
                        >
                            {isPending ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.confirmButtonText}>{t('confirm_send') || "Confirm Send"}</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={isPending}>
                            <Text style={styles.cancelButtonText}>{t('cancel') || "Cancel"}</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}

            {isSent && (
                <Text style={styles.actionCardSuccess}>
                    {t('message_sent_to') || "Message sent to"} {action.student_name}.
                </Text>
            )}

            {isError && (
                <Text style={styles.actionCardError}>
                    {t('message_error') || "Failed to send message."}
                </Text>
            )}
        </View>
    );
};

const IntakeSetupConfirmationCard = ({ action, onConfirm, onCancel, status }: any) => {
    const { t } = useTranslation();
    const isSent = status === 'sent';
    const isPending = status === 'pending';
    const isError = status === 'error';

    return (
        <View style={styles.actionCard}>
            <View style={styles.actionCardHeader}>
                <Ionicons
                    name={isSent ? "checkmark-circle" : "calendar-outline"}
                    size={20}
                    color={isSent ? "#2ecc71" : "#e67e22"}
                />
                <Text style={styles.actionCardTitle}>
                    {isSent ? t('setup_complete') || "Setup Complete" : t('confirm_intake_setup') || "Confirm Intake Setup"}
                </Text>
            </View>

            {!isSent && (
                <>
                    <View style={styles.setupBrief}>
                        <Text style={styles.setupTitle}>{action.intake.name}</Text>
                        <Text style={styles.setupSubtitle}>
                            {action.intake.start_date} to {action.intake.end_date}
                        </Text>

                        <View style={styles.setupStats}>
                            <View style={styles.setupStat}>
                                <Ionicons name="school-outline" size={14} color="#bdc3c7" />
                                <Text style={styles.setupStatText}>{t('classes_count_plural', { count: action.classes?.length || 0 })}</Text>
                            </View>
                            <View style={styles.setupStat}>
                                <Ionicons name="people-outline" size={14} color="#bdc3c7" />
                                <Text style={styles.setupStatText}>{t('groups_count_plural', { count: action.groups?.length || 0 })}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.actionCardActions}>
                        <TouchableOpacity
                            style={[styles.confirmButton, { backgroundColor: '#e67e22' }, isPending && { opacity: 0.7 }]}
                            onPress={onConfirm}
                            disabled={isPending}
                        >
                            {isPending ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.confirmButtonText}>{t('confirm_setup_action') || "Create All"}</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={isPending}>
                            <Text style={styles.cancelButtonText}>{t('cancel') || "Cancel"}</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}

            {isSent && (
                <Text style={styles.actionCardSuccess}>
                    {t('intake_created_successfully') || "Intake and associated items have been created successfully."}
                </Text>
            )}

            {isError && (
                <Text style={styles.actionCardError}>
                    {t('setup_error') || "Failed to create intake setup."}
                </Text>
            )}
        </View>
    );
};

const DeleteIntakeConfirmationCard = ({ action, onConfirm, onCancel, status }: any) => {
    const { t } = useTranslation();
    const isSent = status === 'sent';
    const isPending = status === 'pending';
    const isError = status === 'error';

    return (
        <View style={styles.actionCard}>
            <View style={styles.actionCardHeader}>
                <Ionicons
                    name={isSent ? "checkmark-circle" : "trash-outline"}
                    size={20}
                    color={isSent ? "#2ecc71" : "#e74c3c"}
                />
                <Text style={styles.actionCardTitle}>
                    {isSent ? t('deleted') || "Deleted" : t('confirm_deletion') || "Confirm Deletion"}
                </Text>
            </View>

            {!isSent && (
                <>
                    <View style={styles.setupBrief}>
                        <Text style={{ color: '#ecf0f1', fontSize: 14, marginBottom: 5 }}>
                            {t('confirm_delete_intake_msg') || "Are you sure you want to delete this intake? This cannot be undone."}
                        </Text>
                        <Text style={[styles.setupTitle, { color: '#e74c3c' }]}>
                            {t('intake_id') || "Intake ID"}: {action.intake_id}
                        </Text>
                    </View>

                    <View style={styles.actionCardActions}>
                        <TouchableOpacity
                            style={[styles.confirmButton, { backgroundColor: '#e74c3c' }, isPending && { opacity: 0.7 }]}
                            onPress={onConfirm}
                            disabled={isPending}
                        >
                            {isPending ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.confirmButtonText}>{t('confirm_delete') || "Delete"}</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={isPending}>
                            <Text style={styles.cancelButtonText}>{t('cancel') || "Cancel"}</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}

            {isSent && (
                <Text style={styles.actionCardSuccess}>
                    {t('intake_deleted_successfully') || "Intake has been deleted successfully."}
                </Text>
            )}

            {isError && (
                <Text style={styles.actionCardError}>
                    {t('delete_error') || "Failed to delete intake."}
                </Text>
            )}
        </View>
    );
};

const AIAssistantScreen = () => {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const isRTL = i18n.dir() === 'rtl';
    const [messages, setMessages] = useState<any[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [sessions, setSessions] = useState<any[]>([]);
    const [currentSession, setCurrentSession] = useState<any>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [pdfContent, setPdfContent] = useState<string>('');
    const [isUploadingPDF, setIsUploadingPDF] = useState(false);
    const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
    const [usage, setUsage] = useState<{ used: number, limit: number, reset_time?: string } | null>(null);
    const inFlightActions = useRef<Set<string>>(new Set());
    const usageAnim = useRef(new Animated.Value(0)).current;

    const updateUsage = useCallback(async () => {
        const data = await aiService.fetchUsage();
        if (data) {
            setUsage(data);
            Animated.timing(usageAnim, {
                toValue: data.used / data.limit,
                duration: 1000,
                useNativeDriver: false,
            }).start();
        }
    }, [usageAnim]);

    const [countdown, setCountdown] = useState<string | null>(null);

    useEffect(() => {
        let interval: any;
        if (usage && usage.used >= usage.limit && usage.reset_time) {
            interval = setInterval(() => {
                const now = new Date();
                const reset = new Date(usage.reset_time!); // Non-null assertion strictly because of the check above
                const diff = reset.getTime() - now.getTime();

                if (diff <= 0) {
                    setCountdown(null);
                    updateUsage(); // Refresh usage to see if unlocked
                } else {
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                    setCountdown(`${hours}h ${minutes}m ${seconds}s`);
                }
            }, 1000);
        } else {
            setCountdown(null);
        }
        return () => clearInterval(interval);
    }, [usage, updateUsage]);

    const loadSessions = useCallback(async () => {
        const fetchedSessions = await aiService.fetchSessions();
        setSessions(fetchedSessions);
        return fetchedSessions;
    }, []);

    const selectSession = useCallback(async (session: any) => {
        setCurrentSession(session);
        setShowHistory(false);
        setIsLoading(true);
        const history = await aiService.fetchHistory(session.id);
        const formattedHistory = history.map((m: any) => ({
            _id: m.id,
            text: m.content,
            createdAt: new Date(m.created_at),
            status: m.action_status,
            user: {
                _id: m.role === 'user' ? 1 : 2,
                name: m.role === 'user' ? (t('me') || 'Me') : (t('ai_assistant') || "AI Assistant"),
                avatar: m.role === 'user' ? null : require('../assets/aibot.png'),
            },
        })).reverse();
        setMessages(formattedHistory);
        setIsLoading(false);
    }, [t]);

    const startNewChat = useCallback(async () => {
        setCurrentSession(null);
        setMessages([]);
        setShowHistory(false);
        // We'll create the session on the backend when the first message is sent
    }, []);

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (!result.canceled) {
                const file = result.assets[0];
                setIsUploadingPDF(true);
                setAttachedFileName(file.name);
                const extractedText = await aiService.parsePDF(file.uri);
                if (extractedText) {
                    setPdfContent(extractedText);
                } else {
                    setAttachedFileName(null);
                }
                setIsUploadingPDF(false);
            }
        } catch (err) {
            console.error('Pick document error:', err);
            setIsUploadingPDF(false);
            setAttachedFileName(null);
        }
    };

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            const fetchedSessions = await loadSessions();
            if (fetchedSessions.length > 0) {
                await selectSession(fetchedSessions[0]);
            } else {
                startNewChat();
                setIsLoading(false);
            }
            updateUsage();
        };
        init();
    }, [loadSessions, selectSession, startNewChat]);

    const handleSend = useCallback(async (text: string) => {
        if (!text.trim()) return;

        let activeSession = currentSession;
        if (!activeSession) {
            activeSession = await aiService.createSession(text.trim());
            setCurrentSession(activeSession);
            loadSessions();
        }

        const message = {
            _id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
            text: text.trim(),
            createdAt: new Date(),
            user: { _id: 1 },
        };

        setMessages((previousMessages) =>
            GiftedChat.append(previousMessages, [message] as any)
        );

        setInputText('');
        setIsTyping(true);

        try {
            // Prepare chat history for AI service
            const chatHistory: AIChatMessage[] = messages.slice(0, 10).map((m) => ({
                role: (m.user._id === 1 ? 'user' : 'assistant') as 'user' | 'assistant',
                content: m.text,
            })).reverse();

            const response = await aiService.getChatResponse(activeSession.id, [
                ...chatHistory,
                { role: 'user', content: text.trim() }
            ], pdfContent);

            // Handle string (error/API key) or object (success) response
            const responseText = typeof response === 'string' ? response : (response as any).text;
            const responseId = typeof response === 'object' && response !== null ? (response as any).id : null;
            const responseStatus = typeof response === 'object' && response !== null ? (response as any).status : 'idle';

            const aiBotMessage = {
                _id: responseId || `${Date.now()}-${Math.random().toString(36).substring(7)}`,
                text: responseText,
                createdAt: new Date(),
                status: responseStatus,
                user: {
                    _id: 2,
                    name: t('ai_assistant') || "AI Assistant",
                    avatar: require('../assets/aibot.png'),
                },
            };

            setMessages((previousMessages) =>
                GiftedChat.append(previousMessages, [aiBotMessage] as any)
            );
        } catch (error) {
            console.error('Error in AI Assistant chat:', error);
        } finally {
            setIsTyping(false);
            setPdfContent('');
            setAttachedFileName(null);
            updateUsage();
        }
    }, [currentSession, messages, t, loadSessions, pdfContent, updateUsage]);

    const renderAvatar = (props: any) => {
        if (props.position === 'right') return null;
        return (
            <Image
                source={require('../assets/aibot.png')}
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                }}
            />
        );
    };

    const renderBubble = (props: any) => {
        return (
            <Bubble
                {...props}
                wrapperStyle={{
                    right: {
                        backgroundColor: '#3498db',
                        borderRadius: 20,
                        padding: 4,
                        marginBottom: 8,
                    },
                    left: {
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: 20,
                        padding: 4,
                        marginBottom: 8,
                    },
                }}
                textStyle={{
                    right: { color: '#fff', fontSize: 15 },
                    left: { color: '#ecf0f1', fontSize: 15 },
                }}
                renderMessageText={(props) => {
                    const text = props.currentMessage.text;
                    const actionMatch = text.match(/\{[\s\S]*"action":\s*"(send_message|create_intake_setup|delete_intake)"[\s\S]*\}/);
                    let actionData = null;
                    let cleanText = text;

                    if (actionMatch) {
                        try {
                            actionData = JSON.parse(actionMatch[0]);
                            cleanText = text.replace(actionMatch[0], '').trim();
                        } catch (e) {
                            console.error("Failed to parse AI action:", e);
                        }
                    }

                    const handleConfirm = async () => {
                        if (!actionData) return;
                        const msgId = String(props.currentMessage._id);

                        // Prevent multiple clicks synchronously
                        if (inFlightActions.current.has(msgId)) return;

                        // Check status from message itself for stability
                        if ((props.currentMessage as any).status === 'pending' || (props.currentMessage as any).status === 'sent') return;

                        inFlightActions.current.add(msgId);

                        // Update specific message in state to force re-render
                        setMessages(prev => prev.map(m =>
                            String(m._id) === msgId ? { ...m, status: 'pending' } : m
                        ));

                        try {
                            let success = false;
                            if (actionData.action === 'send_message') {
                                success = await aiService.sendMessage(actionData.student_id, actionData.content);
                            } else if (actionData.action === 'create_intake_setup') {
                                success = await aiService.setupIntake(actionData);
                            } else if (actionData.action === 'delete_intake') {
                                success = await aiService.deleteIntake(actionData.intake_id);
                            }

                            setMessages(prev => prev.map(m =>
                                String(m._id) === msgId ? { ...m, status: success ? 'sent' : 'error' } : m
                            ));

                            if (success) {
                                // Persist the status to backend
                                await aiService.updateMessageStatus(msgId, 'sent');

                                Toast.show({
                                    type: 'success',
                                    text1: t('action_confirmed') || "Action Confirmed",
                                    text2: t('action_executed_successfully') || "The action has been executed successfully."
                                });
                            }
                        } catch (err) {
                            setMessages(prev => prev.map(m =>
                                String(m._id) === msgId ? { ...m, status: 'error' } : m
                            ));
                        } finally {
                            inFlightActions.current.delete(msgId);
                        }
                    };

                    const msgStatus = (props.currentMessage as any).status || 'idle';

                    return (
                        <View>
                            {cleanText ? (
                                <Markdown
                                    style={{
                                        body: {
                                            color: props.position === 'right' ? '#fff' : '#ecf0f1',
                                            fontSize: 16,
                                            padding: 8,
                                        },
                                    }}
                                >
                                    {cleanText}
                                </Markdown>
                            ) : null}

                            {actionData && actionData.action === 'send_message' && (
                                <ActionConfirmationCard
                                    action={actionData}
                                    status={msgStatus}
                                    onConfirm={handleConfirm}
                                    onCancel={() => { }}
                                />
                            )}

                            {actionData && actionData.action === 'create_intake_setup' && (
                                <IntakeSetupConfirmationCard
                                    action={actionData}
                                    status={msgStatus}
                                    onConfirm={handleConfirm}
                                    onCancel={() => { }}
                                />
                            )}

                            {actionData && actionData.action === 'delete_intake' && (
                                <DeleteIntakeConfirmationCard
                                    action={actionData}
                                    status={msgStatus}
                                    onConfirm={handleConfirm}
                                    onCancel={() => { }}
                                />
                            )}
                        </View>
                    );
                }}
            />
        );
    };

    const handleSendAction = useCallback(() => {
        if (isTyping || (!inputText.trim() && !pdfContent)) return;
        handleSend(inputText);
    }, [handleSend, inputText, pdfContent, isTyping]);

    const renderChatFooter = () => (
        <View style={{ marginBottom: 5 }}>
            {isTyping && <CustomTypingIndicator />}
            {attachedFileName && (
                <BlurView intensity={20} tint="light" style={styles.accessoryContainer}>
                    <View style={styles.attachedFileBadge}>
                        <Ionicons name="document-text" size={14} color="#3498db" style={{ marginRight: 8 }} />
                        <Text style={styles.attachedFileText} numberOfLines={1}>{attachedFileName}</Text>
                        <TouchableOpacity
                            onPress={() => { setPdfContent(''); setAttachedFileName(null); }}
                            style={styles.removeFileButton}
                        >
                            <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.5)" />
                        </TouchableOpacity>
                    </View>
                </BlurView>
            )}
        </View>
    );

    const renderInputToolbar = (props: any) => {
        return (
            <InputToolbar
                {...props}
                containerStyle={[styles.inputToolbar, Platform.OS === 'web' && styles.webInputToolbar]}
                primaryStyle={{ alignItems: 'flex-end' }}
            />
        );
    };

    const renderComposer = (props: any) => {
        return (
            <View style={styles.composerContainer}>
                <TouchableOpacity
                    onPress={pickDocument}
                    style={styles.attachButton}
                    disabled={isUploadingPDF}
                >
                    {isUploadingPDF ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Ionicons name="attach" size={24} color={attachedFileName ? "#3498db" : "rgba(255, 255, 255, 0.4)"} />
                    )}
                </TouchableOpacity>
                {usage && usage.used >= usage.limit && countdown ? (
                    <View style={[styles.textInput, { justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={{ color: '#e74c3c', fontWeight: 'bold' }}>
                            {t('limit_reached_retry_in') || "Limit reached. Retry in:"} {countdown}
                        </Text>
                    </View>
                ) : (
                    <TextInput
                        {...props}
                        style={styles.textInput}
                        placeholder={t('ai_placeholder') || "How can I help you..."}
                        placeholderTextColor="rgba(255, 255, 255, 0.4)"
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        editable={!isTyping && (usage === null || usage.used < usage.limit)}
                        onKeyPress={(e: any) => {
                            if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendAction();
                            }
                        }}
                    />
                )}
                <TouchableOpacity
                    onPress={handleSendAction}
                    style={[styles.sendButton, (isTyping || (!inputText.trim() && !pdfContent) || (usage && usage.used >= usage.limit)) && { opacity: 0.5 }]}
                    disabled={isTyping || (!inputText.trim() && !pdfContent) || (usage !== null && usage.used >= usage.limit)}
                >
                    <Ionicons name="send" size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0a0a0a', '#141414']}
                style={StyleSheet.absoluteFill}
            />
            <Image
                source={require('../assets/ai-chat-bk.png')}
                style={[StyleSheet.absoluteFill, { opacity: 0.05 }]}
                resizeMode="cover"

            />

            <View style={[styles.contentContainer, Platform.OS === 'web' && styles.webContentContainer]}>
                {/* Header */}
                <View style={[styles.headerContainer, { paddingTop: insets.top + 5 }]}>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { top: insets.top + 10 }]}>
                        <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={22} color="#fff" />
                    </TouchableOpacity>

                    <BlurView intensity={20} tint="light" style={styles.capsuleHeader}>
                        <Image source={require('../assets/aibot.png')} style={styles.headerAvatar} />
                        <View style={styles.headerTitleContainer}>
                            <Text style={styles.headerTitle}>{t('ai_assistant') || "AI Assistant"}</Text>
                            <View style={styles.statusRow}>
                                <View style={styles.statusDot} />
                                <Text style={styles.statusText}>{t('ai_online') || "Online"}</Text>
                            </View>
                        </View>
                    </BlurView>

                    {usage && (
                        <View style={styles.usageWrapper}>
                            <View style={styles.usageContainer}>
                                <Animated.View
                                    style={[
                                        styles.usageBar,
                                        {
                                            width: usageAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: ['0%', '100%']
                                            }),
                                            backgroundColor: usageAnim.interpolate({
                                                inputRange: [0, 0.5, 0.8, 1],
                                                outputRange: ['#2ecc71', '#f1c40f', '#e67e22', '#e74c3c']
                                            })
                                        }
                                    ]}
                                />
                            </View>
                            <Text style={styles.usageText}>
                                {usage.limit - usage.used} {t('requests_left') || 'requests left'}
                            </Text>
                        </View>
                    )}

                    <View style={[styles.headerActions, { top: insets.top + 12 }]}>
                        <TouchableOpacity onPress={() => setShowHistory(true)} style={styles.actionButton}>
                            <Ionicons name="time-outline" size={22} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={startNewChat} style={styles.actionButton}>
                            <Ionicons name="add-circle-outline" size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ flex: 1 }}>
                    {isLoading ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="large" color="#3498db" />
                        </View>
                    ) : (
                        <GiftedChat
                            messages={messages}
                            user={{ _id: 1 }}
                            renderBubble={renderBubble}
                            renderAvatar={renderAvatar}
                            renderUsernameOnMessage={false}
                            showAvatarForEveryMessage={true}
                            renderChatFooter={renderChatFooter}
                            renderInputToolbar={renderInputToolbar}
                            renderComposer={renderComposer}
                            renderSend={() => null}
                            minInputToolbarHeight={65}
                            bottomOffset={insets.bottom}
                            isKeyboardInternallyHandled={true}
                            messagesContainerStyle={{
                                backgroundColor: 'transparent',
                            }}
                            inverted={true}
                        />
                    )}
                </View>
            </View>

            {/* History Overlay */}
            <Modal visible={showHistory} transparent={true} animationType="fade" onRequestClose={() => setShowHistory(false)}>
                <View style={styles.modalOverlay}>
                    <BlurView intensity={90} tint="dark" style={[styles.historyContainer, { paddingTop: insets.top + 20 }]}>
                        <View style={styles.historyHeader}>
                            <Text style={styles.historyTitle}>{t('chat_history') || "Chat History"}</Text>
                            <TouchableOpacity onPress={() => setShowHistory(false)} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.sessionsList} showsVerticalScrollIndicator={false}>
                            {sessions.length === 0 ? (
                                <View style={styles.emptyHistory}>
                                    <Ionicons name="chatbox-ellipses-outline" size={40} color="rgba(255,255,255,0.2)" />
                                    <Text style={styles.emptyText}>{t('no_history') || "No history yet"}</Text>
                                </View>
                            ) : (
                                sessions.map((session) => (
                                    <TouchableOpacity
                                        key={session.id}
                                        style={[styles.sessionItem, currentSession?.id === session.id && styles.activeSession]}
                                        onPress={() => selectSession(session)}
                                    >
                                        <View style={styles.sessionIcon}>
                                            <Ionicons name="chatbubble-outline" size={18} color={currentSession?.id === session.id ? "#3498db" : "#fff"} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.sessionText} numberOfLines={1}>{session.title}</Text>
                                            <Text style={styles.sessionDate}>{formatGregorianDate(session.created_at)}</Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.deleteButton}
                                            onPress={() => {
                                                aiService.deleteSession(session.id);
                                                loadSessions();
                                                if (currentSession?.id === session.id) startNewChat();
                                            }}
                                        >
                                            <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.3)" />
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </BlurView>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    headerContainer: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 15,
        paddingBottom: 15,
        zIndex: 100,
    },
    capsuleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        overflow: 'hidden',
    },
    headerAvatar: {
        width: 35,
        height: 35,
        borderRadius: 17.5,
        marginRight: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    backButton: {
        position: 'absolute',
        left: 15,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitleContainer: {
        flexDirection: 'column',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 1,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#2ecc71',
        marginRight: 6,
    },
    statusText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 10,
    },
    inputToolbar: {
        backgroundColor: '#111',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
        paddingTop: 8,
    },
    composerContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 25,
        marginHorizontal: 15,
        paddingHorizontal: 15,
        paddingVertical: 5,
        marginBottom: 5,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    textInput: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        minHeight: 40,
        maxHeight: 100,
        paddingTop: Platform.OS === 'ios' ? 10 : 8,
        paddingBottom: Platform.OS === 'ios' ? 10 : 8,
        marginRight: 10,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#3498db',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
    attachButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 5,
    },
    attachedFileBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        marginHorizontal: 15,
        marginVertical: 8,
    },
    attachedFileText: {
        color: '#fff',
        fontSize: 13,
        maxWidth: '80%',
    },
    removeFileButton: {
        marginLeft: 'auto',
        padding: 4,
    },
    accessoryContainer: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 20,
        marginHorizontal: 15,
        overflow: 'hidden',
    },
    usageWrapper: {
        alignItems: 'center',
        marginTop: 8,
    },
    usageContainer: {
        width: 120,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    usageBar: {
        height: '100%',
        borderRadius: 2,
    },
    usageText: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 9,
        marginTop: 3,
        fontWeight: '600',
    },
    headerActions: {
        position: 'absolute',
        right: 15,
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        marginLeft: 10,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    historyContainer: {
        backgroundColor: '#1a1a1a',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        height: '80%',
        paddingHorizontal: 20,
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    historyTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    sessionsList: {
        flex: 1,
    },
    sessionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: 15,
        borderRadius: 15,
        marginBottom: 10,
    },
    activeSession: {
        backgroundColor: 'rgba(52, 152, 219, 0.2)',
        borderColor: '#3498db',
        borderWidth: 1,
    },
    sessionText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    sessionDate: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
        marginTop: 2,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyHistory: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 50,
    },
    emptyText: {
        color: 'rgba(255,255,255,0.4)',
        marginTop: 10,
        fontSize: 14,
    },
    sessionIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    deleteButton: {
        padding: 8,
    },
    actionCard: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 15,
        padding: 15,
        margin: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        minWidth: 250,
    },
    actionCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    actionCardTitle: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    actionCardContent: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        marginBottom: 15,
        lineHeight: 20,
    },
    actionCardActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    confirmButton: {
        backgroundColor: '#3498db',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        flex: 1,
        marginRight: 10,
        alignItems: 'center',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: 'bold',
    },
    cancelButton: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13,
    },
    actionCardSuccess: {
        color: '#2ecc71',
        fontSize: 13,
        fontWeight: '500',
    },
    actionCardError: {
        color: '#e74c3c',
        fontSize: 13,
        fontWeight: '500',
    },
    setupBrief: {
        backgroundColor: 'rgba(230, 126, 34, 0.1)',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(230, 126, 34, 0.2)',
    },
    setupTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    setupSubtitle: {
        color: '#bdc3c7',
        fontSize: 14,
        marginBottom: 8,
    },
    setupStats: {
        flexDirection: 'row',
        gap: 16,
    },
    setupStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    setupStatText: {
        color: '#7f8c8d',
        fontSize: 12,
    },
    contentContainer: {
        flex: 1,
        width: '100%',
    },
    webContentContainer: {
        maxWidth: 1024,
        alignSelf: 'center',
    },
    webInputToolbar: {
        width: '100%',
        alignSelf: 'center',
        borderTopWidth: 0, // Remove border if it looks weird or double
        backgroundColor: 'transparent', // Let it blend or handle background separately
    }
});

export default AIAssistantScreen;
