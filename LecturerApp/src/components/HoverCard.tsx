import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Pressable, ViewStyle, StyleProp } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    interpolateColor,
    interpolate
} from 'react-native-reanimated';

interface HoverCardProps {
    children: React.ReactNode;
    onPress?: () => void;
    style?: StyleProp<ViewStyle> | any;
    activeScale?: number;
    hoverBorderColor?: string;
    baseBorderColor?: string;
    disabled?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const HoverCard: React.FC<HoverCardProps> = ({
    children,
    onPress,
    style,
    activeScale = 1.02,
    hoverBorderColor = '#3498db',
    baseBorderColor = 'rgba(255, 255, 255, 0.1)',
    disabled = false
}) => {
    const isWeb = Platform.OS === 'web';
    const scale = useSharedValue(1);
    const hover = useSharedValue(0);
    const pressed = useSharedValue(0);

    const handleHoverIn = () => {
        if (disabled) return;
        hover.value = withTiming(1, { duration: 200 });
        // Critically damped spring for professional feel (no bounce)
        scale.value = withSpring(activeScale, { damping: 50, stiffness: 400 });
    };

    const handleHoverOut = () => {
        if (disabled) return;
        hover.value = withTiming(0, { duration: 200 });
        scale.value = withSpring(1, { damping: 50, stiffness: 400 });
    };

    const handlePressIn = () => {
        pressed.value = withTiming(1, { duration: 100 });
        scale.value = withSpring(0.98, { damping: 50, stiffness: 400 });
    };

    const handlePressOut = () => {
        pressed.value = withTiming(0, { duration: 100 });
        // If on web and still hovering, return to active scale, else 1
        if (isWeb && hover.value === 1) {
            scale.value = withSpring(activeScale, { damping: 50, stiffness: 400 });
        } else {
            scale.value = withSpring(1, { damping: 50, stiffness: 400 });
        }
    };

    const animatedStyle = useAnimatedStyle(() => {
        const borderColor = interpolateColor(
            hover.value,
            [0, 1],
            [baseBorderColor, hoverBorderColor]
        );

        const shadowOpacity = interpolate(hover.value, [0, 1], [0, 0.3]);
        const shadowRadius = interpolate(hover.value, [0, 1], [0, 20]);
        const elevation = interpolate(hover.value, [0, 1], [0, 10]);

        return {
            transform: [{ scale: scale.value }],
            borderColor,
            shadowColor: hoverBorderColor,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity,
            shadowRadius,
            elevation,
            zIndex: hover.value === 1 ? 10 : 1, // Bring to front on hover
        };
    });

    return (
        <AnimatedPressable
            onPress={onPress}
            onHoverIn={isWeb ? handleHoverIn : undefined}
            onHoverOut={isWeb ? handleHoverOut : undefined}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
            style={[
                styles.container,
                style,
                animatedStyle
            ]}
        >
            {children}
        </AnimatedPressable>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        borderWidth: 1,
        overflow: Platform.OS === 'web' ? 'visible' : 'hidden', // Visible for shadows on web
        cursor: Platform.OS === 'web' ? 'pointer' : 'auto',
    } as any,
});
