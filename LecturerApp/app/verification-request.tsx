import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    Alert,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import api from '../src/services/api';
import { API_CONFIG } from '../src/config/api';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';

interface VerificationRequest {
    id: number;
    document_type: string;
    document_image: string;
    status: 'pending' | 'approved' | 'rejected';
    rejection_reason?: string;
    submitted_at: string;
}

const VerificationRequestScreen = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const [documentType, setDocumentType] = useState('degree');
    const [image, setImage] = useState<string | null>(null);
    const [requests, setRequests] = useState<VerificationRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const response = await api.get(API_CONFIG.ENDPOINTS.VERIFICATION_REQUEST);
            setRequests(response.data);
        } catch (error) {
            console.error('Error fetching requests:', error);
            Toast.show({
                type: 'error',
                text1: t('verification_request.error_load'),
                text2: t('verification_request.error_load_msg'),
            });
        } finally {
            setIsLoading(false);
        }
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(t('verification_request.permission_needed'), t('verification_request.permission_msg'));
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const submitRequest = async () => {
        if (!image) {
            Alert.alert(t('verification_request.error_select_image'), t('verification_request.error_select_image_msg'));
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('document_type', documentType);

            const filename = image.split('/').pop();
            const match = /\.(\w+)$/.exec(filename || '');
            const type = match ? `image/${match[1]}` : 'image/jpeg';

            formData.append('document_image', {
                uri: Platform.OS === 'ios' ? image.replace('file://', '') : image,
                name: filename || 'document.jpg',
                type,
            } as any);

            await api.post(
                API_CONFIG.ENDPOINTS.VERIFICATION_REQUEST,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            Toast.show({
                type: 'success',
                text1: t('verification_request.success_submit'),
                text2: t('verification_request.success_submit_msg'),
            });
            setImage(null);
            fetchRequests();
        } catch (error) {
            console.error('Error submitting request:', error);
            Toast.show({
                type: 'error',
                text1: t('verification_request.error_submit'),
                text2: t('verification_request.error_submit_msg'),
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return '#2ecc71';
            case 'rejected': return '#e74c3c';
            default: return '#f39c12';
        }
    };

    const getDocumentTypeName = (type: string) => {
        switch (type) {
            case 'degree': return t('verification_request.doc_degree');
            case 'id': return t('verification_request.doc_id');
            case 'certification': return t('verification_request.doc_certification');
            case 'other': return t('verification_request.doc_other');
            default: return type;
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
                style={styles.backgroundGradient}
            />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>{t('verification_request.header_title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.infoCard}>
                    <Ionicons name="shield-checkmark" size={40} color="#3498db" style={{ marginBottom: 10 }} />
                    <Text style={styles.infoTitle}>{t('verification_request.why_verified')}</Text>
                    <Text style={styles.infoText}>
                        {t('verification_request.why_verified_desc')}
                    </Text>
                    <Text style={[styles.infoText, { marginTop: 10, color: '#f1c40f' }]}>
                        {t('verification_request.note')}
                    </Text>
                </View>

                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>{t('verification_request.submit_new_request')}</Text>

                    <Text style={styles.label}>{t('verification_request.document_type')}</Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={documentType}
                            onValueChange={(itemValue) => setDocumentType(itemValue)}
                            style={styles.picker}
                            itemStyle={{ color: '#fff' }}
                        >
                            <Picker.Item label={t('verification_request.doc_degree')} value="degree" />
                            <Picker.Item label={t('verification_request.doc_id')} value="id" />
                            <Picker.Item label={t('verification_request.doc_certification')} value="certification" />
                            <Picker.Item label={t('verification_request.doc_other')} value="other" />
                        </Picker>
                    </View>

                    <Text style={styles.label}>{t('verification_request.document_image')}</Text>
                    <TouchableOpacity onPress={pickImage} style={styles.uploadButton}>
                        {image ? (
                            <Image source={{ uri: image }} style={styles.previewImage} />
                        ) : (
                            <View style={styles.uploadPlaceholder}>
                                <Ionicons name="camera-outline" size={32} color="#bdc3c7" />
                                <Text style={styles.uploadText}>{t('verification_request.tap_upload')}</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={submitRequest}
                        style={[styles.submitButton, isSubmitting && styles.disabledButton]}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitButtonText}>{t('verification_request.submit_request')}</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {requests.length > 0 && (
                    <View style={styles.historySection}>
                        <Text style={styles.sectionTitle}>{t('verification_request.request_history')}</Text>
                        {requests.map((request) => (
                            <View key={request.id} style={styles.requestCard}>
                                <View style={styles.requestHeader}>
                                    <Text style={styles.requestType}>{getDocumentTypeName(request.document_type)}</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
                                        <Text style={styles.statusText}>
                                            {t(`verification_request.status_${request.status.toLowerCase()}`, { defaultValue: request.status.toUpperCase() })}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.dateText}>{t('verification_request.submitted_at')} {new Date(request.submitted_at).toLocaleDateString()}</Text>
                                {request.status === 'rejected' && request.rejection_reason && (
                                    <View style={styles.rejectionBox}>
                                        <Text style={styles.rejectionLabel}>{t('verification_request.rejection_reason')}</Text>
                                        <Text style={styles.rejectionText}>{request.rejection_reason}</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View >
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
        opacity: 0.8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    infoCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 15,
        padding: 20,
        alignItems: 'center',
        marginBottom: 20,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    infoText: {
        color: '#bdc3c7',
        textAlign: 'center',
        lineHeight: 20,
    },
    formCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 15,
    },
    label: {
        color: '#bdc3c7',
        marginBottom: 8,
        fontSize: 14,
    },
    pickerContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 10,
        marginBottom: 15,
        overflow: 'hidden',
    },
    picker: {
        color: '#fff',
    },
    uploadButton: {
        height: 200,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderStyle: 'dashed',
    },
    uploadPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadText: {
        color: '#bdc3c7',
        marginTop: 10,
    },
    previewImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    submitButton: {
        backgroundColor: '#3498db',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    disabledButton: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    historySection: {
        marginBottom: 40,
    },
    requestCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    requestType: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    dateText: {
        color: '#7f8c8d',
        fontSize: 12,
    },
    rejectionBox: {
        marginTop: 10,
        padding: 10,
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        borderRadius: 5,
    },
    rejectionLabel: {
        color: '#e74c3c',
        fontWeight: 'bold',
        fontSize: 12,
        marginBottom: 2,
    },
    rejectionText: {
        color: '#e74c3c',
        fontSize: 12,
    },
});

export default VerificationRequestScreen;
