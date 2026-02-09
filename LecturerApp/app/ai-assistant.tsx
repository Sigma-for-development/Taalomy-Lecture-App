import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Platform, KeyboardAvoidingView, Animated, Easing, Text, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { GiftedChat, Bubble, Send, InputToolbar, Composer, Avatar } from 'react-native-gifted-chat';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { aiService, AIChatMessage } from '../src/utils/aiService';
import { useResponsive } from '../src/hooks/useResponsive';
import { LinearGradient } from 'expo-linear-gradient';
import Markdown from 'react-native-markdown-display';

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

const AIAssistantScreen = () => {
    const { t, i18n } = useTranslation();
    const { isDesktop } = useResponsive();
    const router = useRouter();
    const isRTL = i18n.dir() === 'rtl';
    const [messages, setMessages] = useState<any[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [inputText, setInputText] = useState('');
    const welcomeFadeAnim = useRef(new Animated.Value(1)).current;
    const [welcomeVisible, setWelcomeVisible] = useState(true);

    const fadeOutWelcome = () => {
        Animated.timing(welcomeFadeAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
        }).start(() => setWelcomeVisible(false));
    };

    useEffect(() => {
        setMessages([
            {
                _id: 1,
                text: t('ai_greeting'),
                createdAt: new Date(),
                user: {
                    _id: 2,
                    name: t('ai_companion'),
                    avatar: require('../assets/aibot.png'),
                },
            },
        ]);
    }, [t]);

    const onSend = useCallback(async (newMessages: any[] = []) => {
        if (newMessages.length === 0) return;

        if (welcomeVisible) {
            fadeOutWelcome();
        }

        setMessages((previousMessages) =>
            GiftedChat.append(previousMessages, newMessages)
        );

        const userMessage = newMessages[0].text;
        setIsTyping(true);
        setInputText('');

        try {
            const chatHistory: AIChatMessage[] = messages.map((m) => ({
                role: (m.user._id === 1 ? 'user' : 'assistant') as 'user' | 'assistant',
                content: m.text,
            })).reverse();

            chatHistory.push({ role: 'user', content: userMessage });

            const aiResponse = await aiService.getChatResponse(chatHistory);

            const aiBotMessage = {
                _id: Math.random().toString(36).substring(7),
                text: aiResponse.trim(),
                createdAt: new Date(),
                user: {
                    _id: 2,
                    name: t('ai_companion'),
                    avatar: require('../assets/aibot.png'),
                },
            };

            setMessages((previousMessages) =>
                GiftedChat.append(previousMessages, [aiBotMessage])
            );
        } catch (error) {
            console.error('Error in AI Assistant chat:', error);
        } finally {
            setIsTyping(false);
        }
    }, [messages, t]);

    const renderAvatar = (props: any) => {
        // Ensure we are rendering for the left side (AI)
        if (props.position === 'right') return null;

        return (
            <Image
                source={require('../assets/aibot.png')}
                style={{
                    width: isDesktop ? 50 : 40,
                    height: isDesktop ? 50 : 40,
                    borderRadius: isDesktop ? 25 : 20,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    marginBottom: 5,
                }}
                resizeMode="cover"
            />
        );
    };

    const renderBubble = (props: any) => {
        return (
            <Bubble
                {...props}
                wrapperStyle={{
                    right: {
                        backgroundColor: 'rgba(52, 152, 219, 0.8)',
                        borderRadius: 18,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        maxWidth: isDesktop ? '70%' : '92%',
                        marginBottom: 14,
                    },
                    left: {
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: 18,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        maxWidth: isDesktop ? '70%' : '92%',
                        marginBottom: 14,
                        marginLeft: isRTL ? 0 : undefined,
                        marginRight: isRTL ? 0 : undefined,
                    },
                }}
                textStyle={{
                    right: { color: '#fff' },
                    left: { color: '#ecf0f1' },
                }}
                renderMessageText={(props) => (
                    <Markdown
                        style={{
                            body: {
                                color: props.position === 'right' ? '#fff' : '#ecf0f1',
                                fontSize: 16,
                                lineHeight: 24,
                            },
                            heading3: {
                                color: props.position === 'right' ? '#fff' : '#fff',
                                fontSize: 20,
                                fontWeight: 'bold',
                                marginVertical: 8,
                            },
                            hr: {
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                marginVertical: 12,
                            },
                            bullet_list: {
                                marginVertical: 4,
                            },
                            strong: {
                                fontWeight: 'bold',
                                color: props.position === 'right' ? '#fff' : '#fff',
                            }
                        }}
                    >
                        {props.currentMessage.text}
                    </Markdown>
                )}
                renderTicks={() => null}
            />
        );
    };

    const renderSend = (props: any) => {
        return (
            <Send {...props} containerStyle={{ justifyContent: 'center', height: '100%' }}>
                <View style={{
                    marginRight: 10,
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Ionicons name="send" size={20} color="#3498db" />
                </View>
            </Send>
        );
    };

    const renderInputToolbar = (props: any) => {
        return (
            <InputToolbar
                {...props}
                containerStyle={{
                    backgroundColor: '#111',
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(255, 255, 255, 0.05)',
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                }}
                primaryStyle={{ alignItems: 'center' }} // Changed back to center for better alignment
            />
        );
    };

    const renderComposer = (props: any) => {
        return (
            <Composer
                {...props}
                multiline={true}
                textInputStyle={{
                    color: '#fff',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 20,
                    paddingHorizontal: 15,
                    paddingTop: 10,
                    paddingBottom: 10,
                    marginRight: 10,
                    fontSize: isDesktop ? 15 : 16,
                    lineHeight: 20,
                    minHeight: 40,
                    maxHeight: 200,
                }}
                onTextChanged={(text) => {
                    setInputText(text);
                    props.onTextChanged(text);
                }}
                textInputProps={{
                    onKeyPress: (e: any) => {
                        if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (inputText.trim()) {
                                onSend([{
                                    _id: Math.random().toString(),
                                    text: inputText.trim(),
                                    createdAt: new Date(),
                                    user: { _id: 1 }
                                }]);
                            }
                        }
                    }
                }}
            />
        );
    };

    const renderChatHeader = () => (
        <View style={[styles.headerContainer, { top: isDesktop ? 25 : (Platform.OS === 'ios' ? 70 : 50) }]}>
            <View style={[styles.headerBlur, {
                paddingVertical: isDesktop ? 12 : 8,
                paddingHorizontal: isDesktop ? 24 : 16,
            }]}>
                <Image
                    source={require('../assets/aibot.png')}
                    style={styles.headerAvatar}
                />
                <View style={styles.headerInfo}>
                    <Text style={styles.headerName}>{t('ai_companion')}</Text>
                    <View style={styles.statusContainer}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>{t('ai_online')}</Text>
                    </View>
                </View>
            </View>
        </View>
    );

    const mainChatContent = (
        <View style={{ flex: 1 }}>
            <GiftedChat
                messages={messages}
                text={inputText}
                onInputTextChanged={setInputText}
                onSend={(newMessages) => onSend(newMessages)}
                user={{ _id: 1 }}
                renderBubble={renderBubble}
                renderSend={renderSend}
                renderInputToolbar={renderInputToolbar}
                renderComposer={renderComposer}
                placeholder={t('ai_placeholder')}
                isTyping={isTyping}
                renderFooter={() => isTyping ? <CustomTypingIndicator /> : null}
                renderUsernameOnMessage={false}
                showAvatarForEveryMessage={true}
                showUserAvatar={false}
                renderAvatar={renderAvatar}
                alwaysShowSend
                messagesContainerStyle={{ paddingTop: isDesktop ? 100 : (Platform.OS === 'ios' ? 125 : 120) }}
                bottomOffset={isDesktop ? 0 : 0}
            />
            {welcomeVisible && messages.length <= 1 && (
                <Animated.View
                    style={[styles.welcomeContainer, {
                        opacity: welcomeFadeAnim,
                        paddingHorizontal: isDesktop ? 40 : 24,
                        bottom: isDesktop ? 100 : 120
                    }]}
                    pointerEvents="none"
                >
                    <Ionicons name="sparkles-outline" size={48} color="rgba(52, 152, 219, 0.3)" style={{ marginBottom: 20 }} />
                    <Text style={styles.welcomeText}>
                        {t('ai_welcome_intro')}
                    </Text>
                    <Text style={[styles.welcomeText, { marginTop: 12, fontSize: 13, opacity: 0.15 }]}>
                        {t('ai_welcome_note')}
                    </Text>
                </Animated.View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0a0a0a', '#141414']}
                style={StyleSheet.absoluteFill}
            />
            <Image
                source={require('../assets/ai-chat-bk.png')}
                style={[
                    StyleSheet.absoluteFill,
                    {
                        opacity: 0.08, // Lowered opacity for low interference
                        width: '100%',
                        height: '100%',
                    }
                ]}
                resizeMode="cover"
            />
            {renderChatHeader()}
            {!isDesktop && (
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={[styles.backButton, {
                        top: Platform.OS === 'ios' ? 64 : 49,
                        [isRTL ? 'right' : 'left']: 20
                    }]}
                >
                    <Ionicons
                        name={isRTL ? "arrow-forward" : "arrow-back"}
                        size={24}
                        color="#fff"
                    />
                </TouchableOpacity>
            )}
            {!isDesktop ? (
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    {mainChatContent}
                </KeyboardAvoidingView>
            ) : mainChatContent}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    headerContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 100,
        alignItems: 'center',
    },
    headerBlur: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 36,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        ...Platform.select({
            web: {
                backdropFilter: 'blur(10px)',
            },
        }) as any,
    },
    headerAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    headerInfo: {
        justifyContent: 'center',
    },
    headerName: {
        color: '#fff',
        fontSize: 17,
        fontWeight: 'bold',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 3,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#2ecc71',
        marginRight: 7,
    },
    statusText: {
        color: '#95a5a6',
        fontSize: 12,
    },
    welcomeContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 100,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    welcomeText: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
        opacity: 0.25,
        lineHeight: 24,
        maxWidth: 400,
    },
    backButton: {
        position: 'absolute',
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 101,
        ...Platform.select({
            web: {
                backdropFilter: 'blur(10px)',
            },
        }) as any,
    },
});

export default AIAssistantScreen;
