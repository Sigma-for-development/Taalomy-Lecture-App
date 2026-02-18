import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withSequence,
    withDelay,
    Easing,
    interpolate,
    Extrapolation,
    runOnJS
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';

interface LoginSuccessAnimationProps {
    onComplete: () => void;
}

export const LoginSuccessAnimation: React.FC<LoginSuccessAnimationProps> = ({ onComplete }) => {
    const { t } = useTranslation();

    // Animation Values
    const iconScale = useSharedValue(0);
    const ripple1Scale = useSharedValue(0);
    const ripple1Opacity = useSharedValue(0.8);
    const ripple2Scale = useSharedValue(0);
    const ripple2Opacity = useSharedValue(0.6);
    const contentOpacity = useSharedValue(0);
    const textTranslateY = useSharedValue(20);

    useEffect(() => {
        // 1. Entrance: Fast and snappy
        contentOpacity.value = withTiming(1, { duration: 300 });

        // Icon Pop
        iconScale.value = withSpring(1, {
            damping: 12,
            stiffness: 150,
            mass: 0.8
        });

        // Ripple Effects - Staggered
        ripple1Scale.value = withDelay(100, withTiming(2.5, { duration: 1000, easing: Easing.out(Easing.ease) }));
        ripple1Opacity.value = withDelay(100, withTiming(0, { duration: 1000 }));

        ripple2Scale.value = withDelay(250, withTiming(2.5, { duration: 1000, easing: Easing.out(Easing.ease) }));
        ripple2Opacity.value = withDelay(250, withTiming(0, { duration: 1000 }));

        // Text Slide Up
        textTranslateY.value = withDelay(200, withSpring(0, { damping: 15, stiffness: 100 }));

        // 2. Exit Strategy: Quick dissolve after ~1.2s total
        const timer = setTimeout(() => {
            runOnJS(onComplete)();
        }, 1200);

        return () => clearTimeout(timer);
    }, []);

    const iconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: iconScale.value }]
    }));

    const ripple1Style = useAnimatedStyle(() => ({
        transform: [{ scale: ripple1Scale.value }],
        opacity: ripple1Opacity.value
    }));

    const ripple2Style = useAnimatedStyle(() => ({
        transform: [{ scale: ripple2Scale.value }],
        opacity: ripple2Opacity.value
    }));

    const textStyle = useAnimatedStyle(() => ({
        opacity: contentOpacity.value,
        transform: [{ translateY: textTranslateY.value }]
    }));

    const containerStyle = useAnimatedStyle(() => ({
        opacity: contentOpacity.value
    }));

    return (
        <Animated.View style={[styles.container, containerStyle]}>
            {/* Dynamic Blur Background */}
            {Platform.OS === 'web' ? (
                <View style={[StyleSheet.absoluteFill, styles.webBlur]} />
            ) : (
                <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
            )}

            <View style={styles.centerContent}>

                {/* Icon Wrapper to center ripples on the icon */}
                <View style={styles.iconWrapper}>
                    {/* Ripples */}
                    <View style={styles.rippleContainer}>
                        <Animated.View style={[styles.ripple, ripple1Style]} />
                        <Animated.View style={[styles.ripple, ripple2Style]} />
                    </View>

                    {/* Main Icon */}
                    <Animated.View style={[styles.iconCircle, iconStyle]}>
                        <Ionicons name="checkmark-sharp" size={50} color="#fff" />
                    </Animated.View>
                </View>

                {/* Text */}
                <Animated.View style={[styles.textWrapper, textStyle]}>
                    <Text style={styles.title}>{t('welcome_back')}</Text>
                    <Text style={styles.subtitle}>{t('login_successful')}</Text>
                </Animated.View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    webBlur: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(15px)', // Web-specific styling
    } as any,
    centerContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        width: 150, // Ensure enough space for ripples
        height: 150,
    },
    rippleContainer: {
        position: 'absolute', // Position absolutely within iconWrapper
        width: 100, // Match iconCircle size
        height: 100, // Match iconCircle size
        alignItems: 'center',
        justifyContent: 'center',
        // Remove zIndex here to let it sit behind icon naturally if DOM order is correct,
        // or use negative zIndex if needed, but placing before icon in JSX is safest.
    },
    ripple: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(46, 204, 113, 0.4)',
        borderColor: 'rgba(46, 204, 113, 0.6)',
        borderWidth: 1,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#2ecc71',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#2ecc71',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 10,
        // marginBottom removed (moved to wrapper)
        zIndex: 2,
    },
    textWrapper: {
        alignItems: 'center',
        zIndex: 2,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#ffffff',
        marginBottom: 4,
        letterSpacing: -0.5,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '500',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    }
});
