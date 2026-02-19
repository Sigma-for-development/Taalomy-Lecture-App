
import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity, I18nManager } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

const PrivacyPolicy = () => {
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const isRTL = i18n.dir() === 'rtl';

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
                <Text style={styles.headerTitle}>{t('privacy_policy_title') || 'Privacy Policy'}</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.card}>
                    <Text style={[styles.introText, { textAlign: isRTL ? 'right' : 'left' }]}>
                        {t('privacy_policy_intro') || 'Your privacy is important to us. It is Taalomy\'s policy to respect your privacy regarding any information we may collect from you across our website and other sites we own and operate.'}
                    </Text>

                    {/* Section 1 */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('privacy_section_1_title') || '1. Information We Collect'}
                        </Text>
                        <Text style={[styles.sectionContent, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('privacy_section_1_content') || 'We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we’re collecting it and how it will be used.'}
                        </Text>
                    </View>

                    {/* Section 2 */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('privacy_section_2_title') || '2. How We Use Information'}
                        </Text>
                        <Text style={[styles.sectionContent, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('privacy_section_2_content') || 'We use the information we collect in various ways, including to provide, operate, and maintain our website, improve, personalize, and expand our website, understand and analyze how you use our website, and develop new products, services, features, and functionality.'}
                        </Text>
                    </View>

                    {/* Section 3 */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('privacy_section_3_title') || '3. Log Files'}
                        </Text>
                        <Text style={[styles.sectionContent, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('privacy_section_3_content') || 'Taalomy follows a standard procedure of using log files. These files log visitors when they visit websites. All hosting companies do this and a part of hosting services\' analytics. The information collected by log files include internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks.'}
                        </Text>
                    </View>

                    {/* Section 4 */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('privacy_section_4_title') || '4. Cookies and Web Beacons'}
                        </Text>
                        <Text style={[styles.sectionContent, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('privacy_section_4_content') || 'Like any other website, Taalomy uses \'cookies\'. These cookies are used to store information including visitors\' preferences, and the pages on the website that the visitor accessed or visited. The information is used to optimize the users\' experience by customizing our web page content based on visitors\' browser type and/or other information.'}
                        </Text>
                    </View>

                    {/* Section 5 - Security (Highlighted) */}
                    <View style={[styles.section, styles.highlightedSection]}>
                        <View style={[styles.warningHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            <Ionicons name="shield-checkmark-outline" size={24} color="#3498db" />
                            <Text style={[styles.sectionTitle, { color: '#3498db', marginStart: isRTL ? 0 : 10, marginEnd: isRTL ? 10 : 0 }]}>
                                {t('privacy_section_5_title') || '5. Data Security'}
                            </Text>
                        </View>
                        <Text style={[styles.sectionContent, { textAlign: isRTL ? 'right' : 'left', fontWeight: '500' }]}>
                            {t('privacy_section_5_content') || 'We value your trust in providing us your Personal Information, thus we are striving to use commercially acceptable means of protecting it. But remember that no method of transmission over the internet, or method of electronic storage is 100% secure and reliable, and we cannot guarantee its absolute security.'}
                        </Text>
                    </View>


                    <View style={styles.footer}>
                        <Ionicons name="lock-closed-outline" size={40} color="#3498db" style={{ marginBottom: 10 }} />
                        <Text style={styles.footerText}>{t('privacy_footer_text') || 'Your data is safe with us.'}</Text>
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
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    introText: {
        fontSize: 16,
        color: '#ecf0f1',
        lineHeight: 24,
        marginBottom: 25,
    },
    section: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
    },
    sectionContent: {
        fontSize: 15,
        color: '#bdc3c7',
        lineHeight: 24,
    },
    highlightedSection: {
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        padding: 15,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(52, 152, 219, 0.3)',
    },
    warningHeader: {
        alignItems: 'center',
        marginBottom: 8,
    },
    footer: {
        alignItems: 'center',
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    footerText: {
        color: '#3498db',
        fontSize: 14,
        fontWeight: '600',
    }

});

export default PrivacyPolicy;
