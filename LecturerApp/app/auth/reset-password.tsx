import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_CONFIG } from '../../src/config/api';
import Toast from 'react-native-toast-message';

export default function ResetPasswordScreen() {
    const { t, i18n } = useTranslation();
    const { email } = useLocalSearchParams<{ email: string }>();

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const inputRefs = useRef<Array<TextInput | null>>([]);

    const handleOtpChange = (value: string, index: number) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleBackspace = (key: string, index: number) => {
        if (key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleResetPassword = async () => {
        const otpCode = otp.join('');
        if (otpCode.length !== 6) {
            Toast.show({ type: 'error', text1: t('error'), text2: t('otp_incomplete_code') });
            return;
        }
        if (!newPassword || !confirmPassword) {
            Toast.show({ type: 'error', text1: t('error'), text2: t('all_fields_required') });
            return;
        }
        if (newPassword !== confirmPassword) {
            Toast.show({ type: 'error', text1: t('error'), text2: t('password_mismatch_msg') });
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_CONFIG.ACCOUNTS_BASE_URL}auth/password-reset/confirm/`, {
                email,
                otp_code: otpCode,
                new_password: newPassword
            });

            Alert.alert(t('success'), t('password_reset_success'), [
                { text: 'OK', onPress: () => router.replace('/login') }
            ]);
        } catch (error: any) {
            const msg = error.response?.data?.error || t('reset_failed');
            Toast.show({ type: 'error', text1: t('error'), text2: msg });
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
                <Text style={styles.title}>{t('reset_password_title')}</Text>
                <Text style={styles.subtitle}>{t('reset_password_subtitle')}</Text>

                <View style={styles.otpContainer}>
                    {otp.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={(ref) => { inputRefs.current[index] = ref; }}
                            style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
                            value={digit}
                            onChangeText={(val) => handleOtpChange(val, index)}
                            onKeyPress={({ nativeEvent }) => handleBackspace(nativeEvent.key, index)}
                            keyboardType="number-pad"
                            maxLength={1}
                            placeholderTextColor="#666"
                        />
                    ))}
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>{t('new_password')}</Text>
                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={[styles.passwordInput, { textAlign: i18n.language === 'ar' ? 'right' : 'left' }]}
                            placeholder={t('min_password_chars')}
                            placeholderTextColor="#666"
                            value={newPassword}
                            onChangeText={setNewPassword}
                            secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#999" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>{t('confirm_new_password')}</Text>
                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={[styles.passwordInput, { textAlign: i18n.language === 'ar' ? 'right' : 'left' }]}
                            placeholder={t('confirm_password_placeholder')}
                            placeholderTextColor="#666"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={!showPassword}
                        />
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleResetPassword}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>{t('reset_password_btn')}</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    backButton: { padding: 16 },
    content: { flex: 1, padding: 24 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
    subtitle: { fontSize: 14, color: '#9CA3AF', marginBottom: 32 },
    otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
    otpInput: { width: 45, height: 55, borderRadius: 12, backgroundColor: '#111', borderWidth: 1, borderColor: '#333', color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
    otpInputFilled: { borderColor: '#4F46E5', backgroundColor: 'rgba(79, 70, 229, 0.05)' },
    inputContainer: { marginBottom: 24 },
    label: { color: '#bdc3c7', fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
    passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 12, borderWidth: 1, borderColor: '#333' },
    passwordInput: { flex: 1, padding: 16, color: '#fff', fontSize: 16 },
    eyeIcon: { padding: 16 },
    button: { backgroundColor: '#4F46E5', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 16 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});