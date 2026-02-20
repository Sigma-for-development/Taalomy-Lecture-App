import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

export const GlassToast = ({ text1, text2, type, hide }: any) => {
    const isSuccess = type === 'success';
    const isError = type === 'error';
    const isInfo = type === 'info';

    const mainColor = isSuccess ? '#2ecc71' : isError ? '#e74c3c' : '#3498db';
    const iconName = isSuccess ? 'checkmark-circle' : isError ? 'alert-circle' : 'information-circle' as any;

    const Container = Platform.OS === 'web' ? View : BlurView;

    return (
        <View style={styles.outerContainer}>
            <Container
                {...(Platform.OS === 'web' ? {} : { intensity: 40, tint: 'dark' })}
                style={styles.container}
            >
                {/* Accent line */}
                <View style={[styles.accent, { backgroundColor: mainColor }]} />

                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        <View style={[styles.iconCircle, { backgroundColor: `${mainColor}20` }]}>
                            <Ionicons name={iconName} size={22} color={mainColor} />
                        </View>
                    </View>

                    <View style={styles.textContainer}>
                        {text1 && <Text style={styles.text1} numberOfLines={1}>{text1}</Text>}
                        {text2 && <Text style={styles.text2} numberOfLines={2}>{text2}</Text>}
                    </View>

                    <TouchableOpacity onPress={hide} style={styles.closeButton} activeOpacity={0.7}>
                        <Ionicons name="close" size={18} color="rgba(255, 255, 255, 0.4)" />
                    </TouchableOpacity>
                </View>
            </Container>
        </View>
    );
};

const styles = StyleSheet.create({
    outerContainer: {
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: Platform.OS === 'ios' ? 0 : 10,
    },
    container: {
        width: '100%',
        maxWidth: 450,
        minHeight: 64,
        borderRadius: 16,
        overflow: 'hidden',
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        backgroundColor: Platform.OS === 'web' ? 'rgba(30, 30, 30, 0.75)' : 'rgba(20, 20, 20, 0.4)',
        ...(Platform.OS === 'web' ? {
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        } : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 10,
        }),
    } as any,
    accent: {
        width: 4,
        height: '100%',
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    iconContainer: {
        marginRight: 12,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingRight: 8,
    },
    text1: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 1,
        letterSpacing: -0.3,
    },
    text2: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 13,
        fontWeight: '400',
        lineHeight: 16,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    }
});
