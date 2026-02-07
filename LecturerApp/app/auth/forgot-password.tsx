import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_CONFIG } from '../../src/config/api';
import Toast from 'react-native-toast-message';

export default function ForgotPasswordScreen() {
    const { t, i18n } = useTranslation();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRequestReset = async () => {
        if (!email) {
            Toast.show({
                type: 'error',
                text1: t('error'),
                text2: t('email_required')
            });
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_CONFIG.ACCOUNTS_BASE_URL}auth/password-reset/request/`, { email });
            Toast.show({
                type: 'success',
                text1: t('success'),
                text2: t('otp_sent_success')
            });
            router.push({ pathname: '/auth/reset-password', params: { email } });
        } catch (error: any) {
            const msg = error.response?.data?.error || t('request_failed');
            Toast.show({
                type: 'error',
                text1: t('error'),
                text2: msg
            });
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
                <View style={styles.header}>
                    <Text style={styles.title}>{t('forgot_password_title')}</Text>
                    <Text style={styles.subtitle}>{t('forgot_password_subtitle')}</Text>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>{t('email_label')}</Text>
                    <TextInput
                        style={[styles.input, { textAlign: i18n.language === 'ar' ? 'right' : 'left' }]}
                        placeholder={t('enter_institutional_email')}
                        placeholderTextColor="#666"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                </View>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleRequestReset}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>{t('send_reset_code')}</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

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
    },
    header: {
        marginBottom: 32,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#9CA3AF',
        lineHeight: 24,
    },
    inputContainer: {
        marginBottom: 24,
    },
    label: {
        color: '#bdc3c7',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    input: {
        backgroundColor: '#111',
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        fontSize: 16,
    },
    button: {
        backgroundColor: '#4F46E5',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});