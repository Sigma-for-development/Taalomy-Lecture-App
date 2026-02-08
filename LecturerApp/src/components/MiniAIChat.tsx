import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { aiService, AIChatMessage } from '../utils/aiService';
import Markdown from 'react-native-markdown-display';

interface MiniAIChatProps {
    isVisible: boolean;
    onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MiniAIChat: React.FC<MiniAIChatProps> = ({ isVisible, onClose }) => {
    const [messages, setMessages] = useState<AIChatMessage[]>([
        { role: 'assistant', content: "Hello! I'm your AI Companion. How can I help you manage your classes today?" }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    const [shouldRender, setShouldRender] = useState(isVisible);
    const visibleRef = useRef(isVisible);

    useEffect(() => {
        visibleRef.current = isVisible;
        if (isVisible) setShouldRender(true);
        Animated.spring(slideAnim, {
            toValue: isVisible ? 0 : SCREEN_HEIGHT,
            useNativeDriver: true,
            tension: 50,
            friction: 8
        }).start((result) => {
            if (result.finished && !visibleRef.current) {
                setShouldRender(false);
            }
        });
    }, [isVisible]);

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const userMessage: AIChatMessage = { role: 'user', content: inputText };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInputText('');
        setIsLoading(true);

        try {
            const response = await aiService.getChatResponse(newMessages);
            setMessages([...newMessages, { role: 'assistant', content: response }]);
        } catch (error) {
            setMessages([...newMessages, { role: 'assistant', content: "I'm sorry, I'm having trouble connecting right now." }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!shouldRender) return null;

    return (
        <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
            <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerInfo}>
                        <View style={styles.onlineStatus} />
                        <Text style={styles.headerTitle}>AI Companion</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Chat Content */}
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.chatArea}
                    onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                >
                    {messages.map((msg, index) => (
                        <View key={index} style={[
                            styles.messageBubble,
                            msg.role === 'user' ? styles.userBubble : styles.botBubble
                        ]}>
                            {msg.role === 'assistant' ? (
                                <Markdown style={markdownStyles}>
                                    {msg.content}
                                </Markdown>
                            ) : (
                                <Text style={styles.messageText}>{msg.content}</Text>
                            )}
                        </View>
                    ))}
                    {isLoading && (
                        <View style={styles.loadingBubble}>
                            <ActivityIndicator size="small" color="#3498db" />
                        </View>
                    )}
                </ScrollView>

                {/* Input Area */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
                >
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder="Type a message..."
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            multiline
                            onKeyPress={(e: any) => {
                                if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                        />
                        <TouchableOpacity
                            onPress={handleSend}
                            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                            disabled={!inputText.trim() || isLoading}
                        >
                            <Ionicons name="send" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </BlurView>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 125,
        right: 30,
        width: Math.min(SCREEN_WIDTH - 40, 380),
        height: 500,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        zIndex: 1000,
    },
    blurContainer: {
        flex: 1,
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    headerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    onlineStatus: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#2ecc71',
        marginRight: 8,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
    },
    chatArea: {
        flex: 1,
        marginTop: 12,
    },
    messageBubble: {
        maxWidth: '85%',
        padding: 12,
        borderRadius: 18,
        marginBottom: 12,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: 'rgba(52, 152, 219, 0.8)',
        borderBottomRightRadius: 4,
    },
    botBubble: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        color: '#fff',
        fontSize: 14,
        lineHeight: 20,
    },
    loadingBubble: {
        alignSelf: 'flex-start',
        padding: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 18,
        marginBottom: 12,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 14,
        maxHeight: 80,
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#3498db',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    sendButtonDisabled: {
        backgroundColor: 'rgba(52, 152, 219, 0.4)',
    },
});

const markdownStyles = {
    body: {
        color: '#fff',
        fontSize: 14,
        lineHeight: 20,
    },
    heading3: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginVertical: 4,
    },
    hr: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginVertical: 8,
    },
    bullet_list: {
        marginVertical: 2,
    },
    strong: {
        fontWeight: 'bold',
        color: '#fff',
    }
} as any;

export default MiniAIChat;
