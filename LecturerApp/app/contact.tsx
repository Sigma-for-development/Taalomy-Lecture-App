
import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

const ContactUs = () => {
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const isRTL = i18n.dir() === 'rtl';

    const handleEmailPress = () => {
        Linking.openURL('mailto:support@taalomy.com');
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <LinearGradient
                colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
                style={styles.backgroundGradient}
            />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('contact_us_title') || 'Contact Us'}</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.card}>
                    <View style={{ alignItems: 'center', marginBottom: 30 }}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="mail-open-outline" size={40} color="#3498db" />
                        </View>
                        <Text style={styles.mainTitle}>{t('get_in_touch') || 'Get in Touch'}</Text>
                        <Text style={styles.subTitle}>
                            {t('contact_subtitle') || 'We\'d love to hear from you. Our team is always here to chat.'}
                        </Text>
                    </View>

                    {/* Email Option */}
                    <TouchableOpacity
                        style={styles.contactOption}
                        onPress={handleEmailPress}
                        activeOpacity={0.7}
                    >
                        <View style={styles.optionIcon}>
                            <Ionicons name="mail" size={24} color="#fff" />
                        </View>
                        <View style={styles.optionTextContainer}>
                            <Text style={styles.optionTitle}>{t('email_us') || 'Email Us'}</Text>
                            <Text style={styles.optionValue}>support@taalomy.com</Text>
                        </View>
                        <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color="#7f8c8d" />
                    </TouchableOpacity>

                    {/* Support Ticket (if logged out, maybe direct to login, or just text) */}
                    <View style={styles.contactOption}>
                        <View style={[styles.optionIcon, { backgroundColor: '#e67e22' }]}>
                            <Ionicons name="help-buoy" size={24} color="#fff" />
                        </View>
                        <View style={styles.optionTextContainer}>
                            <Text style={styles.optionTitle}>{t('support_center') || 'Support Center'}</Text>
                            <Text style={styles.optionValue}>{t('support_center_desc') || 'For existing users, please log in to access the support ticket system.'}</Text>
                        </View>
                    </View>

                    {/* Location / Info */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('office_location') || 'Office'}
                        </Text>
                        <Text style={[styles.sectionContent, { textAlign: isRTL ? 'right' : 'left' }]}>
                            123 Education Street,{'\n'}
                            Tech District,{'\n'}
                            Riyadh, Saudi Arabia
                        </Text>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            {t('working_hours') || 'Working Hours: Sun - Thu, 9AM - 5PM'}
                        </Text>
                    </View>

                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    backgroundGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    header: {
        paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(52, 152, 219, 0.3)',
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    subTitle: {
        fontSize: 16,
        color: '#bdc3c7',
        textAlign: 'center',
        lineHeight: 24,
    },
    contactOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    optionIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#3498db',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    optionTextContainer: {
        flex: 1,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
    },
    optionValue: {
        fontSize: 14,
        color: '#bdc3c7',
    },
    section: {
        marginTop: 16,
        marginBottom: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    sectionContent: {
        fontSize: 15,
        color: '#bdc3c7',
        lineHeight: 24,
    },
    footer: {
        alignItems: 'center',
        marginTop: 10,
    },
    footerText: {
        color: '#7f8c8d',
        fontSize: 14,
    }
});

export default ContactUs;
