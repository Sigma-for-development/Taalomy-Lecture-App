import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { lecturerAPI, chatAPI } from '../../src/utils/api';
import { tokenStorage } from '../../utils/tokenStorage';
import { SeoHead } from '../../src/components/SeoHead';

export default function LecturerDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { t } = useTranslation();
    const [lecturer, setLecturer] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    useEffect(() => {
        const loadUser = async () => {
            const userData = await tokenStorage.getItem('user_data');
            if (userData) {
                try {
                    const parsed = JSON.parse(userData);
                    setCurrentUserId(parsed.id);
                } catch (e) {
                    console.error('Error parsing user data', e);
                }
            }
        };

        loadUser();

        if (id) {
            fetchLecturerDetails();
        }
    }, [id]);

    const fetchLecturerDetails = async () => {
        try {
            const response = await lecturerAPI.getLecturerDetails(Number(id));
            setLecturer(response.data);
        } catch (error) {
            console.error('Error fetching lecturer details:', error);
            Alert.alert(t('error'), t('lecturer_hub.error_loading_details'));
        } finally {
            setLoading(false);
        }
    };

    const handleMessage = async () => {
        // Allowed self-chat (Note to Self)

        try {
            // Initiate or get existing chat
            await chatAPI.createOrGetChat(lecturer.lecturer.id);
            // Navigate using the USER ID (lecturer.lecturer.id), not the Chat Room ID
            router.push(`/direct-message/${lecturer.lecturer.id}` as any);
        } catch (error: any) {
            console.error('Error starting chat:', error);
            if (error.response?.status === 400) {
                Alert.alert(t('info'), t('lecturer_hub.cannot_chat_self'));
            } else {
                Alert.alert(t('error'), t('lecturer_hub.error_starting_chat'));
            }
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3498db" />
            </View>
        );
    }

    if (!lecturer) {
        return (
            <View style={styles.loadingContainer}>
                <Text>{t('lecturer_hub.lecturer_not_found')}</Text>
            </View>
        );
    }

    const { lecturer: user, bio, experience_years, speciality, hourly_rate, rating, total_reviews, is_verified, languages, education } = lecturer;
    const isSelf = user.id === currentUserId;

    return (
        <View style={styles.container}>
            <ScrollView>
                {(user.profile_picture_url && !imageError) ? (
                    <Image
                        source={{ uri: user.profile_picture_url }}
                        style={styles.coverImage}
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <View style={[styles.coverImage, styles.fallbackCover]}>
                        <Ionicons name="person" size={100} color="rgba(255, 255, 255, 0.1)" />
                    </View>
                )}
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>

                {/* Dynamic SEO Head */}
                <SeoHead
                    title={`${user.first_name} ${user.last_name} - ${speciality}`}
                    description={bio ? bio.substring(0, 160) : `Connect with ${user.first_name}, a specialist in ${speciality} at Taalomy.`}
                    keywords={`${speciality}, ${user.first_name} ${user.last_name}, lecturer, tutor, Taalomy`}
                    path={`/lecturer-hub/${id}`}
                    schema={{
                        '@context': 'https://schema.org',
                        '@type': 'Person',
                        'name': `${user.first_name} ${user.last_name}`,
                        'jobTitle': speciality,
                        'description': bio,
                        'image': user.profile_picture_url || 'https://lecturer.taalomy.com/og.png',
                        'url': `https://lecturer.taalomy.com/lecturer-hub/${id}`,
                        'affiliation': {
                            '@type': 'Organization',
                            'name': 'Taalomy'
                        }
                    }}
                />

                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.name}>
                            {user.first_name} {user.last_name}
                            {isSelf && <Text style={{ color: '#3498db', fontSize: 18 }}>{t('lecturer_hub.me_suffix')}</Text>}
                        </Text>
                        {is_verified && <Ionicons name="checkmark-circle" size={20} color="#2ecc71" style={{ marginLeft: 6 }} />}
                    </View>
                    <Text style={styles.specialityTitle}>{speciality}</Text>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Ionicons name="star" size={20} color="#f1c40f" />
                            <Text style={styles.statValue}>{rating}</Text>
                            <Text style={styles.statLabel}>{t('lecturer_hub.reviews_count', { count: total_reviews })}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Ionicons name="briefcase-outline" size={20} color="#7f8c8d" />
                            <Text style={styles.statValue}>{experience_years}{t('lecturer_hub.years_suffix')}</Text>
                            <Text style={styles.statLabel}>{t('lecturer_hub.experience_label')}</Text>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('lecturer_hub.about_label')}</Text>
                        <Text style={styles.bio}>{bio || t('lecturer_hub.no_bio')}</Text>
                    </View>

                    {education && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('lecturer_hub.education_label')}</Text>
                            <Text style={styles.text}>{education}</Text>
                        </View>
                    )}

                    {languages && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('lecturer_hub.languages_label')}</Text>
                            <Text style={styles.text}>{languages}</Text>
                        </View>
                    )}

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('lecturer_hub.pricing_label')}</Text>
                        <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>{t('lecturer_hub.hourly_rate_label')}</Text>
                            <Text style={styles.priceValue}>{parseFloat(hourly_rate).toFixed(0)} {t('currency')}</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                {!isSelf ? (
                    <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
                        <Ionicons name="chatbubble-ellipses-outline" size={24} color="#fff" />
                        <Text style={styles.messageButtonText}>{t('lecturer_hub.message_button')}</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
                        <Ionicons name="chatbubble-ellipses-outline" size={24} color="#fff" />
                        <Text style={styles.messageButtonText}>{t('lecturer_hub.message_self_button')}</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1b1b1b',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1b1b1b',
    },
    coverImage: {
        width: '100%',
        height: 300,
        resizeMode: 'cover',
    },
    fallbackCover: {
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    backButton: {
        position: 'absolute',
        top: 60,
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        marginTop: -40,
        backgroundColor: '#1b1b1b',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        paddingBottom: 100,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ecf0f1',
    },
    specialityTitle: {
        fontSize: 16,
        color: '#bdc3c7',
        marginBottom: 20,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    statItem: {
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ecf0f1',
        marginTop: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#bdc3c7',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ecf0f1',
        marginBottom: 8,
    },
    bio: {
        fontSize: 16,
        color: '#bdc3c7',
        lineHeight: 24,
    },
    text: {
        fontSize: 16,
        color: '#bdc3c7',
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    priceLabel: {
        fontSize: 16,
        color: '#bdc3c7',
    },
    priceValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2ecc71',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1b1b1b',
        padding: 20,
        paddingBottom: 34,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    messageButton: {
        backgroundColor: '#3498db',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
    },
    messageButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 8,
    },
});
