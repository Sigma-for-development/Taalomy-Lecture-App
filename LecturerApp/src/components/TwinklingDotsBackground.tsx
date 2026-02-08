import React, { useState, useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

interface TwinklingDotsBackgroundProps {
    spacing?: number;
    margin?: number;
    maxAlpha?: number;
    minAlpha?: number;
    accentChance?: number;
    accentColor?: string;
    dotColor?: string;
}

export const TwinklingDotsBackground: React.FC<TwinklingDotsBackgroundProps> = ({
    spacing = 18,
    margin = 24,
    maxAlpha = 0.2,
    minAlpha = 0.01,
    accentChance = 0.05,
    accentColor = 'rgba(52, 152, 219, 1)',
    dotColor = 'rgba(255, 255, 255, 1)',
}) => {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const dotsGridRef = useRef<any[]>([]);
    const [dotsGrid, setDotsGrid] = useState<any[]>([]);

    // Measure container dimensions
    const handleLayout = (event: any) => {
        const { width, height } = event.nativeEvent.layout;
        setDimensions({ width, height });
    };

    // Build twinkling dots grid when dimensions change
    useEffect(() => {
        if (dimensions.width === 0 || dimensions.height === 0) return;

        const { width, height } = dimensions;
        const cols = Math.ceil((width - margin * 2) / spacing);
        const rows = Math.ceil((height - margin * 2) / spacing);
        const cx = width / 2;
        const cy = height / 2;
        const maxDist = Math.hypot(cx, cy);

        const newDots: any[] = [];

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const px = margin + x * spacing;
                const py = margin + y * spacing;

                // Vignette: farther from center → dimmer
                const dist = Math.hypot(px - cx, py - cy);
                const vignette = 1 - Math.min(1, dist / maxDist);
                const baseAlpha = minAlpha + vignette * (maxAlpha - minAlpha);

                // Occasional accent dots
                const isAccent = Math.random() < accentChance;

                newDots.push({
                    x: px,
                    y: py,
                    baseAlpha,
                    animValue: new Animated.Value(baseAlpha * (0.6 + Math.random() * 0.4)),
                    isOn: Math.random() > 0.2,
                    isAccent,
                    nextFlip: Date.now() + 400 + Math.random() * 2800,
                });
            }
        }

        dotsGridRef.current = newDots;
        setDotsGrid(newDots);
    }, [dimensions, spacing, margin, maxAlpha, minAlpha, accentChance]);

    // Twinkling animation loop
    useEffect(() => {
        if (dotsGridRef.current.length === 0) return;

        const interval = setInterval(() => {
            dotsGridRef.current.forEach((dot) => {
                const now = Date.now();

                if (now >= dot.nextFlip) {
                    // Probabilistic flip with bias to keep many stable
                    if (Math.random() < 0.25) {
                        dot.isOn = !dot.isOn;
                    }
                    dot.nextFlip = now + 600 + Math.random() * 2600;
                }

                // Animate to target alpha
                const target = dot.isOn ? dot.baseAlpha : dot.baseAlpha * 0.02;

                Animated.timing(dot.animValue, {
                    toValue: target,
                    duration: 200,
                    useNativeDriver: false,
                }).start();
            });
        }, 100); // Check every 100ms

        return () => clearInterval(interval);
    }, [dotsGrid]);

    return (
        <View
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                overflow: 'hidden',
            }}
            onLayout={handleLayout}
        >
            {dotsGrid.map((dot, index) => (
                <Animated.View
                    key={index}
                    style={{
                        position: 'absolute',
                        top: dot.y,
                        left: dot.x,
                        width: 2.2,
                        height: 2.2,
                        borderRadius: 1.1,
                        backgroundColor: dot.isAccent ? accentColor : dotColor,
                        opacity: dot.animValue,
                    } as any}
                />
            ))}
        </View>
    );
};
