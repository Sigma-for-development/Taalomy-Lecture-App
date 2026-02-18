import React from 'react';
import { StyleSheet, Platform, Pressable, ViewStyle } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    interpolateColor
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface HoverIconProps {
    name: keyof typeof Ionicons.glyphMap;
    size?: number;
    color?: string;
    onPress?: () => void;
    style?: ViewStyle;
    hoverColor?: string;
    baseBackgroundColor?: string;
    hoverBackgroundColor?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const HoverIcon: React.FC<HoverIconProps> = ({
    name,
    size = 24,
    color = '#ecf0f1',
    onPress,
    style,
    hoverColor,
    baseBackgroundColor = 'rgba(255, 255, 255, 0.1)',
    hoverBackgroundColor = 'rgba(255, 255, 255, 0.2)',
}) => {
    const isWeb = Platform.OS === 'web';
    const scale = useSharedValue(1);
    const hover = useSharedValue(0);

    const handleHoverIn = () => {
        hover.value = withTiming(1, { duration: 200 });
        scale.value = withSpring(1.1, { damping: 12, stiffness: 200 });
    };

    const handleHoverOut = () => {
        hover.value = withTiming(0, { duration: 200 });
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    };

    const animatedStyle = useAnimatedStyle(() => {
        const backgroundColor = interpolateColor(
            hover.value,
            [0, 1],
            [baseBackgroundColor, hoverBackgroundColor]
        );

        const iconColor = hoverColor
            ? interpolateColor(hover.value, [0, 1], [color, hoverColor])
            : color;

        return {
            transform: [{ scale: scale.value }],
            backgroundColor,
        };
    });

    // We can't easily animate the icon color prop directly with native reanimated style,
    // so for simplicity in this version, we'll keep icon color static or use state if needed.
    // However, we can animate opacity or other View props.
    // For strict reanimated color on props, we'd need AnimatedProps adapter.
    // Let's stick to container animation for now as it's most effective.

    return (
        <AnimatedPressable
            onPress={onPress}
            onHoverIn={isWeb ? handleHoverIn : undefined}
            onHoverOut={isWeb ? handleHoverOut : undefined}
            style={[
                styles.container,
                { width: 44, height: 44, borderRadius: 22 }, // Default size
                style,
                animatedStyle
            ]}
        >
            <Ionicons name={name} size={size} color={color} />
        </AnimatedPressable>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        cursor: Platform.OS === 'web' ? 'pointer' : 'auto',
    } as any,
});
