import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { router, useLocalSearchParams } from 'expo-router';
import { tokenStorage } from '../../utils/tokenStorage';
import { API_CONFIG } from '../../src/config/api';
import Toast from 'react-native-toast-message';

import { useTranslation } from 'react-i18next';

export default function OTPVerificationScreen() {
    const { t } = useTranslation();
    const { email, autoSend } = useLocalSearchParams<{ email: string, autoSend: string }>();

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState(autoSend === 'true' ? 0 : 30);
    const [canResend, setCanResend] = useState(autoSend === 'true');

    // Refs for text inputs to handle auto-focus
    const inputRefs = useRef<(TextInput | null)[]>([]);

    useEffect(() => {
        if (autoSend === 'true' && canResend) {
            handleResend();
        }
    }, [autoSend]);

    useEffect(() => {
        let interval: any;
        if (timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else {
            setCanResend(true);
        }
        return () => clearInterval(interval);
    }, [timeLeft]);

    const handleOtpChange = (value: string, index: number) => {
        // Allow only number
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto move to next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleBackspace = (key: string, index: number) => {
        if (key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerify = async () => {
        const otpCode = otp.join('');
        if (otpCode.length !== 6) {
            Alert.alert(t('error'), t('otp_incomplete_code'));
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(`${API_CONFIG.ACCOUNTS_BASE_URL}auth/verify-otp/`, {
                email,
                otp_code: otpCode
            });

            // Store tokens
            const { access, refresh, user } = response.data;
            await tokenStorage.setItem('access_token', access);
            await tokenStorage.setItem('refresh_token', refresh);
            await tokenStorage.setItem('user_data', JSON.stringify(user));

            Alert.alert(t('success'), t('otp_verified_success'), [
                {
                    text: 'OK',
                    onPress: () => {
                        router.replace('/onboarding');
                    }
                }
            ]);
        } catch (error: any) {
            const msg = error.response?.data?.error || t('verification_failed');
            Alert.alert(t('otp_verification_failed'), msg);
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!canResend) return;

        setLoading(true);
        try {
            const response = await axios.post(`${API_CONFIG.ACCOUNTS_BASE_URL}auth/send-otp/`, { email });
            Alert.alert(t('success'), response.data.message || t('otp_resend_success'));
            setTimeLeft(30);
            setCanResend(false);
            // Clear input fields
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } catch (error: any) {
            const msg = error.response?.data?.error || t('failed_to_resend_otp') || 'Failed to resend OTP';
            Alert.alert(t('error'), msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ionicons name="shield-checkmark" size={48} color="#4F46E5" />
                </View>

                <Text style={styles.title}>{t('otp_verification_title')}</Text>
                <Text style={styles.subtitle}>
                    {t('otp_enter_code')}{'\n'}
                    <Text style={styles.emailText}>{email}</Text>
                </Text>

                <View style={styles.otpContainer}>
                    {otp.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={(ref) => { inputRefs.current[index] = ref; }}
                            style={[
                                styles.otpInput,
                                digit ? styles.otpInputFilled : null
                            ]}
                            value={digit}
                            onChangeText={(val) => handleOtpChange(val, index)}
                            onKeyPress={({ nativeEvent }) => handleBackspace(nativeEvent.key, index)}
                            keyboardType="number-pad"
                            maxLength={1}
                            selectTextOnFocus
                            placeholderTextColor="#666"
                        />
                    ))}
                </View>

                <TouchableOpacity
                    style={styles.verifyButton}
                    onPress={handleVerify}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.verifyButtonText}>{t('otp_verify_btn')}</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.resendContainer}>
                    <Text style={styles.resendText}>{t('otp_resend_question')} </Text>
                    {canResend ? (
                        <TouchableOpacity onPress={handleResend}>
                            <Text style={styles.resendLink}>{t('otp_resend_action')}</Text>
                        </TouchableOpacity>
                    ) : (
                        <Text style={styles.timerText}>{t('otp_resend_timer', { time: timeLeft })}</Text>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
}
// Keep styles unchanged as they are below
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    backButton: {
        padding: 16,
    },
    content: {
        flex: 1,
        padding: 24,
        alignItems: 'center',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        marginTop: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 40,
    },
    emailText: {
        color: '#fff',
        fontWeight: '600',
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 40,
    },
    otpInput: {
        width: 45,
        height: 55,
        borderRadius: 12,
        backgroundColor: '#111',
        borderWidth: 1,
        borderColor: '#333',
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    otpInputFilled: {
        borderColor: '#4F46E5',
        backgroundColor: 'rgba(79, 70, 229, 0.05)',
    },
    verifyButton: {
        width: '100%',
        height: 56,
        backgroundColor: '#4F46E5',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    verifyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    resendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    resendText: {
        color: '#9CA3AF',
        fontSize: 14,
    },
    resendLink: {
        color: '#4F46E5',
        fontSize: 14,
        fontWeight: '600',
    },
    timerText: {
        color: '#666',
        fontSize: 14,
    },
});
