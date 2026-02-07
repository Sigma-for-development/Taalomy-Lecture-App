import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    TouchableOpacity,
    StatusBar,
    Animated,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { tokenStorage } from '../utils/tokenStorage';
const AsyncStorage = tokenStorage;

const { width, height } = Dimensions.get('window');

const SLIDES = [
    {
        id: 'welcome',
        icon: 'school',
        iconColor: '#3498db',
        gradient: ['rgba(52, 152, 219, 0.2)', 'rgba(52, 152, 219, 0.05)'] as const,
    },
    {
        id: 'manage',
        icon: 'calendar',
        iconColor: '#2ecc71',
        gradient: ['rgba(46, 204, 113, 0.2)', 'rgba(46, 204, 113, 0.05)'] as const,
    },
    {
        id: 'connect',
        icon: 'chatbubbles',
        iconColor: '#9b59b6',
        gradient: ['rgba(155, 89, 182, 0.2)', 'rgba(155, 89, 182, 0.05)'] as const,
    },
    {
        id: 'earn',
        icon: 'wallet',
        iconColor: '#f1c40f',
        gradient: ['rgba(241, 196, 15, 0.2)', 'rgba(241, 196, 15, 0.05)'] as const,
    },
];

const OnboardingScreen = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollRef = useRef<ScrollView>(null);

    const handleScroll = (event: any) => {
        const slideSize = event.nativeEvent.layoutMeasurement.width;
        const index = event.nativeEvent.contentOffset.x / slideSize;
        const roundIndex = Math.round(index);
        setActiveIndex(roundIndex);
    };

    const completeOnboarding = async () => {
        try {
            await AsyncStorage.setItem('has_seen_onboarding', 'true');
            router.replace('/dashboard');
        } catch (error) {
            console.error('Error saving onboarding status:', error);
            router.replace('/dashboard');
        }
    };

    const handleNext = () => {
        if (activeIndex < SLIDES.length - 1) {
            scrollRef.current?.scrollTo({ x: width * (activeIndex + 1), animated: true });
        } else {
            completeOnboarding();
        }
    };

    const renderDot = (index: number) => {
        const isActive = index === activeIndex;
        return (
            <View
                key={index}
                style={[
                    styles.dot,
                    isActive && styles.activeDot,
                    { backgroundColor: isActive ? '#3498db' : 'rgba(255, 255, 255, 0.3)' }
                ]}
            />
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <LinearGradient
                colors={['#0a0a0a', '#1a1a1a', '#0a0a0a']}
                style={StyleSheet.absoluteFill}
            />

            {/* Skip Button */}
            <View style={styles.header}>
                <TouchableOpacity onPress={completeOnboarding} style={styles.skipButton}>
                    <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                style={styles.scrollView}
            >
                {SLIDES.map((slide) => (
                    <View key={slide.id} style={styles.slide}>
                        <LinearGradient
                            colors={slide.gradient}
                            style={styles.illustrationContainer}
                        >
                            <Ionicons name={slide.icon as any} size={100} color={slide.iconColor} />
                        </LinearGradient>

                        <View style={styles.textContainer}>
                            <Text style={styles.title}>
                                {t(`onboarding.${slide.id}_title`)}
                            </Text>
                            <Text style={styles.description}>
                                {t(`onboarding.${slide.id}_desc`)}
                            </Text>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.footer}>
                {/* Pagination Dots */}
                <View style={styles.pagination}>
                    {SLIDES.map((_, index) => renderDot(index))}
                </View>

                {/* Action Button */}
                <TouchableOpacity
                    onPress={handleNext}
                    style={styles.button}
                >
                    <LinearGradient
                        colors={['#3498db', '#2980b9']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.buttonGradient}
                    >
                        <Text style={styles.buttonText}>
                            {activeIndex === SLIDES.length - 1 ? t('onboarding.get_started') : t('onboarding.next')}
                        </Text>
                        {activeIndex !== SLIDES.length - 1 && (
                            <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 24,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        zIndex: 10,
    },
    skipButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    skipText: {
        color: '#bdc3c7',
        fontSize: 14,
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    slide: {
        width: width,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    illustrationContainer: {
        width: width * 0.8,
        height: width * 0.8,
        borderRadius: (width * 0.8) / 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 60,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    textContainer: {
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 16,
        letterSpacing: 0.5,
    },
    description: {
        fontSize: 16,
        color: '#bdc3c7',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: Platform.OS === 'ios' ? 50 : 30,
        paddingTop: 20,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 30,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    activeDot: {
        width: 24,
        backgroundColor: '#3498db',
    },
    button: {
        width: '100%',
        shadowColor: '#3498db',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: 16,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default OnboardingScreen;
