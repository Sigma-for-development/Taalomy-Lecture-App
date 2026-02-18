import { Platform } from 'react-native';

// Define a loose type since we don't have @react-navigation/stack types installed directly
type StackNavigationOptions = any;

/**
 * Premium Web Transitions
 * 
 * Uses React Navigation's transitionSpec and cardStyleInterpolator
 * to create physics-based, app-like transitions on the web.
 */

// 1. Standard "Premium" Transition (Fade + Scale)
// Best for top-level navigation (Dashboard <-> Intakes <-> Profile)
export const standardWebTransition: StackNavigationOptions = Platform.OS === 'web' ? {
    transitionSpec: {
        open: {
            animation: 'timing',
            config: {
                duration: 300,
                easing: (t: number) => t, // Linear for the driver, we'll interpolate
            },
        },
        close: {
            animation: 'timing',
            config: {
                duration: 250,
            },
        },
    },
    cardStyleInterpolator: ({ current, next, layouts }: any) => {
        return {
            cardStyle: {
                transform: [
                    {
                        scale: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.98, 1], // Subtle scale up
                        }),
                    },
                ],
                opacity: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1], // Fade in
                }),
            },
            overlayStyle: {
                opacity: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.5],
                }),
            },
        };
    },
} : {};

// 2. Detail "Slide" Transition (Slide Right + Fade)
// Best for drilling down (List -> Detail)
export const slideWebTransition: StackNavigationOptions = Platform.OS === 'web' ? {
    transitionSpec: {
        open: {
            animation: 'spring',
            config: {
                stiffness: 1000,
                damping: 500,
                mass: 3,
                overshootClamping: true,
                restDisplacementThreshold: 0.01,
                restSpeedThreshold: 0.01,
            },
        },
        close: {
            animation: 'spring',
            config: {
                stiffness: 1000,
                damping: 500,
                mass: 3,
                overshootClamping: true,
                restDisplacementThreshold: 0.01,
                restSpeedThreshold: 0.01,
            },
        },
    },
    cardStyleInterpolator: ({ current, next, layouts }: any) => {
        return {
            cardStyle: {
                transform: [
                    {
                        translateX: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [layouts.screen.width * 0.1, 0], // Slide in from 10% right
                        }),
                    },
                ],
                opacity: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                }),
            },
        };
    },
} : {};

// 3. Modal "Bottom Sheet" Transition
export const modalWebTransition: StackNavigationOptions = Platform.OS === 'web' ? {
    gestureDirection: 'vertical',
    transitionSpec: {
        open: {
            animation: 'spring',
            config: {
                stiffness: 1000,
                damping: 500,
                mass: 3,
                overshootClamping: true,
                restDisplacementThreshold: 0.01,
                restSpeedThreshold: 0.01,
            },
        },
        close: {
            animation: 'spring',
            config: {
                stiffness: 1000,
                damping: 500,
                mass: 3,
                overshootClamping: true,
                restDisplacementThreshold: 0.01,
                restSpeedThreshold: 0.01,
            },
        },
    },
    cardStyleInterpolator: ({ current, layouts }: any) => {
        return {
            cardStyle: {
                transform: [
                    {
                        translateY: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [layouts.screen.height, 0],
                        }),
                    },
                ],
            },
        };
    },
} : {};
