import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Platform, KeyboardAvoidingView, Animated, Easing, Text, Image } from 'react-native';
import { GiftedChat, Bubble, Send, InputToolbar, Composer, Avatar } from 'react-native-gifted-chat';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { aiService, AIChatMessage } from '../src/utils/aiService';
import { useResponsive } from '../src/hooks/useResponsive';
import { LinearGradient } from 'expo-linear-gradient';

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
    const { t } = useTranslation();
    const { isDesktop } = useResponsive();
    const [messages, setMessages] = useState<any[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [inputText, setInputText] = useState('');

    useEffect(() => {
        setMessages([
            {
                _id: 1,
                text: t('ai_greeting'),
                createdAt: new Date(),
                user: {
                    _id: 2,
                    name: 'AI Companion',
                    avatar: require('../assets/aibot.png'),
                },
            },
        ]);
    }, []);

    const onSend = useCallback(async (newMessages: any[] = []) => {
        if (newMessages.length === 0) return;

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
                    name: 'AI Companion',
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
            <View style={{ marginBottom: 5 }}>
                <Image
                    source={require('../assets/aibot.png')}
                    style={{
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        backgroundColor: 'rgba(255,255,255,0.05)'
                    }}
                    resizeMode="cover"
                />
            </View>
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
                        maxWidth: isDesktop ? '70%' : '85%',
                    },
                    left: {
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: 18,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        maxWidth: isDesktop ? '70%' : '85%',
                    },
                }}
                textStyle={{
                    right: { color: '#fff', fontSize: 16, lineHeight: 24, margin: 0, padding: 0 },
                    left: { color: '#ecf0f1', fontSize: 16, lineHeight: 24, margin: 0, padding: 0 },
                }}
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
                    fontSize: 15,
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

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0a0a0a', '#141414']}
                style={StyleSheet.absoluteFill}
            />
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
                renderAvatarOnTop={true}
                alwaysShowSend
            />
            {Platform.OS === 'android' && <KeyboardAvoidingView behavior="padding" />}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
});

export default AIAssistantScreen;
