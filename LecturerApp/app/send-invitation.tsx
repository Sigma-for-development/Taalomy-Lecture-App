import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    StatusBar,
    TextInput,
    ActivityIndicator,
    Modal
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { tokenStorage } from '../utils/tokenStorage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_CONFIG } from '../src/config/api';
import { useTranslation } from 'react-i18next';
import ProfilePicture from '../src/components/ProfilePicture';
const AsyncStorage = tokenStorage;

interface Student {
    id: number;
    name: string;
    email: string;
    profile_picture_url?: string;
}

interface LecturerProfile {
    hourly_rate: number;
    show_hourly_rate: boolean;
    class_rate: number;
    show_class_rate: boolean;
    term_rate: number;
    show_term_rate: boolean;
    demo_price: number;
    is_demo_offered: boolean;
}

const SendInvitationScreen = () => {
    const { t } = useTranslation();
    const params = useLocalSearchParams();
    const invitationType = params.type as string; // 'intake', 'class', or 'group'
    const targetId = params.targetId as string;
    const targetName = params.targetName as string;

    const [students, setStudents] = useState<Student[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [selectedPaymentPlan, setSelectedPaymentPlan] = useState<string>('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [profile, setProfile] = useState<LecturerProfile | null>(null);
    const [showStudentPicker, setShowStudentPicker] = useState(false);

    const baseurl = API_CONFIG.ACCOUNTS_BASE_URL;

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredStudents([]);
        } else {
            // Debounce the search - only search when user stops typing
            const timeoutId = setTimeout(() => {
                searchStudentByEmail(searchQuery.trim());
            }, 500);

            return () => clearTimeout(timeoutId);
        }
    }, [searchQuery]);

    const loadData = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('access_token');

            // Load lecturer profile to get payment plan prices
            const profileResponse = await axios.get(`${baseurl}lecturer/profile/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (profileResponse.data && profileResponse.data.length > 0) {
                setProfile(profileResponse.data[0]);
            }

            // Don't load all students - they will search by email
            setStudents([]);
            setFilteredStudents([]);
        } catch (error) {
            console.error('Error loading data:', error);
            Alert.alert(t('error'), t('error_loading_data'));
        } finally {
            setLoading(false);
        }
    };

    const searchStudentByEmail = async (email: string) => {
        if (!email.includes('@') || email.length < 5) {
            setFilteredStudents([]);
            return;
        }

        try {
            const token = await AsyncStorage.getItem('access_token');
            const response = await axios.get(`${baseurl}lecturer/students/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { email: email }
            });

            const matchedStudents = response.data.filter((student: Student) =>
                student.email.toLowerCase() === email.toLowerCase()
            );

            setFilteredStudents(matchedStudents);
        } catch (error) {
            console.error('Error searching student:', error);
            setFilteredStudents([]);
        }
    };

    const getAvailablePaymentPlans = () => {
        if (!profile) return [];

        const plans = [];
        if (profile.show_hourly_rate && profile.hourly_rate != null) {
            const price = parseFloat(profile.hourly_rate as any);
            if (!isNaN(price)) {
                plans.push({ key: 'hourly', label: t('hourly_rate'), price });
            }
        }
        if (profile.is_demo_offered && profile.demo_price != null) {
            const price = parseFloat(profile.demo_price as any);
            if (!isNaN(price)) {
                plans.push({ key: 'demo', label: t('demo_session'), price });
            }
        }
        if (profile.show_class_rate && profile.class_rate != null) {
            const price = parseFloat(profile.class_rate as any);
            if (!isNaN(price)) {
                plans.push({ key: 'class', label: t('class_price'), price });
            }
        }
        if (profile.show_term_rate && profile.term_rate != null) {
            const price = parseFloat(profile.term_rate as any);
            if (!isNaN(price)) {
                plans.push({ key: 'term', label: t('term_price'), price });
            }
        }
        return plans;
    };

    const getSelectedAmount = () => {
        const plans = getAvailablePaymentPlans();
        const plan = plans.find(p => p.key === selectedPaymentPlan);
        return plan ? plan.price : 0;
    };

    const handleSendInvitation = async () => {
        if (!selectedStudent) {
            Alert.alert(t('error'), t('please_select_student'));
            return;
        }

        if (!selectedPaymentPlan) {
            Alert.alert(t('error'), t('please_select_payment_plan'));
            return;
        }

        try {
            setSending(true);
            const token = await AsyncStorage.getItem('access_token');

            // Calculate expiration date (3 days from now)
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 3);
            const expiresAtISO = expiresAt.toISOString();

            const payload = {
                student: selectedStudent.id,
                invitation_type: invitationType,
                target_id: parseInt(targetId),
                target_name: decodeURIComponent(targetName),
                payment_plan: selectedPaymentPlan,
                amount: getSelectedAmount(),
                expires_at: expiresAtISO,
                message: message.trim() || null
            };

            console.log('Sending invitation with payload:', payload);

            await axios.post(
                `${baseurl}lecturer/invitations/`,
                payload,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            Alert.alert(
                t('success'),
                t('invitation_sent_successfully'),
                [{ text: t('ok'), onPress: () => router.back() }]
            );
        } catch (error: any) {
            console.error('Error sending invitation:', error);
            console.error('Error response data:', error.response?.data);
            console.error('Error response status:', error.response?.status);
            const errorMessage = error.response?.data?.error ||
                error.response?.data?.detail ||
                JSON.stringify(error.response?.data) ||
                t('error_sending_invitation');
            Alert.alert(t('error'), errorMessage);
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={{ color: '#fff', marginTop: 16 }}>{t('loading')}</Text>
            </View>
        );
    }

    const paymentPlans = getAvailablePaymentPlans();

    return (
        <View style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={{
                paddingTop: 60,
                paddingBottom: 20,
                paddingHorizontal: 20,
                backgroundColor: '#1a1a1a',
                borderBottomWidth: 1,
                borderBottomColor: '#2c2c2c',
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: '#252525',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginEnd: 15,
                            borderWidth: 1,
                            borderColor: '#333'
                        }}
                    >
                        <Ionicons name="close" size={22} color="#fff" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 24, fontWeight: '700', color: '#fff' }}>
                            {t('send_invitation')}
                        </Text>
                        <Text style={{ fontSize: 14, color: '#7f8c8d', marginTop: 4 }}>
                            {targetName}
                        </Text>
                    </View>
                </View>
            </View>

            <ScrollView style={{ flex: 1 }}>
                <View style={{ padding: 20 }}>

                    {/* Student Selection */}
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 12 }}>
                        {t('select_student')}
                    </Text>
                    <TouchableOpacity
                        onPress={() => setShowStudentPicker(true)}
                        style={{
                            backgroundColor: '#252525',
                            borderRadius: 12,
                            padding: 16,
                            borderWidth: 1,
                            borderColor: '#333',
                            marginBottom: 24
                        }}
                    >
                        {selectedStudent ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <ProfilePicture
                                    imageUrl={selectedStudent.profile_picture_url}
                                    firstName={selectedStudent.name.split(' ')[0]}
                                    lastName={selectedStudent.name.split(' ')[1] || ''}
                                    size={48}
                                />
                                <View style={{ flex: 1, marginStart: 12 }}>
                                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                                        {selectedStudent.name}
                                    </Text>
                                    <Text style={{ color: '#7f8c8d', fontSize: 14 }}>
                                        {selectedStudent.email}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-down" size={20} color="#7f8c8d" />
                            </View>
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text style={{ color: '#7f8c8d', fontSize: 16 }}>{t('tap_to_select_student')}</Text>
                                <Ionicons name="chevron-down" size={20} color="#7f8c8d" />
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Payment Plan Selection */}
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 12 }}>
                        {t('select_payment_plan')}
                    </Text>
                    {paymentPlans.map((plan) => (
                        <TouchableOpacity
                            key={plan.key}
                            onPress={() => setSelectedPaymentPlan(plan.key)}
                            style={{
                                backgroundColor: selectedPaymentPlan === plan.key ? 'rgba(52, 152, 219, 0.15)' : '#252525',
                                borderRadius: 12,
                                padding: 16,
                                borderWidth: 2,
                                borderColor: selectedPaymentPlan === plan.key ? '#3498db' : '#333',
                                marginBottom: 12,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                                    {plan.label}
                                </Text>
                                <Text style={{ color: '#3498db', fontSize: 18, fontWeight: '700', marginTop: 4 }}>
                                    {(plan.price || 0).toFixed(2)} {t('currency')}
                                </Text>
                            </View>
                            <View style={{
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                borderWidth: 2,
                                borderColor: selectedPaymentPlan === plan.key ? '#3498db' : '#7f8c8d',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: selectedPaymentPlan === plan.key ? '#3498db' : 'transparent'
                            }}>
                                {selectedPaymentPlan === plan.key && (
                                    <Ionicons name="checkmark" size={16} color="#fff" />
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}

                    {paymentPlans.length === 0 && (
                        <View style={{
                            backgroundColor: '#252525',
                            borderRadius: 12,
                            padding: 20,
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: '#333'
                        }}>
                            <Ionicons name="alert-circle-outline" size={48} color="#7f8c8d" />
                            <Text style={{ color: '#7f8c8d', marginTop: 12, textAlign: 'center' }}>
                                {t('no_payment_plans_available')}
                            </Text>
                        </View>
                    )}

                    {/* Optional Message */}
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 24, marginBottom: 12 }}>
                        {t('message_optional')}
                    </Text>
                    <TextInput
                        style={{
                            backgroundColor: '#252525',
                            borderRadius: 12,
                            padding: 16,
                            color: '#fff',
                            fontSize: 16,
                            minHeight: 100,
                            textAlignVertical: 'top',
                            borderWidth: 1,
                            borderColor: '#333',
                            marginBottom: 24
                        }}
                        placeholder={t('invitation_message_placeholder')}
                        placeholderTextColor="#7f8c8d"
                        multiline
                        value={message}
                        onChangeText={setMessage}
                    />

                    {/* Total Amount */}
                    {selectedPaymentPlan && (
                        <View style={{
                            backgroundColor: 'rgba(52, 152, 219, 0.1)',
                            borderRadius: 12,
                            padding: 16,
                            borderWidth: 1,
                            borderColor: 'rgba(52, 152, 219, 0.3)',
                            marginBottom: 24
                        }}>
                            <Text style={{ color: '#7f8c8d', fontSize: 14, marginBottom: 4 }}>
                                {t('student_will_pay')}
                            </Text>
                            <Text style={{ color: '#3498db', fontSize: 28, fontWeight: '700' }}>
                                {getSelectedAmount().toFixed(2)} {t('currency')}
                            </Text>
                        </View>
                    )}

                    {/* Send Button */}
                    <TouchableOpacity
                        onPress={handleSendInvitation}
                        disabled={!selectedStudent || !selectedPaymentPlan || sending}
                        style={{
                            backgroundColor: (!selectedStudent || !selectedPaymentPlan || sending) ? '#333' : '#3498db',
                            paddingVertical: 16,
                            borderRadius: 12,
                            alignItems: 'center',
                            marginBottom: 40
                        }}
                    >
                        {sending ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                                {t('send_invitation')}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Student Picker Modal */}
            <Modal
                visible={showStudentPicker}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowStudentPicker(false)}
            >
                <View style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
                    <View style={{
                        paddingTop: 60,
                        paddingBottom: 20,
                        paddingHorizontal: 20,
                        backgroundColor: '#1a1a1a',
                        borderBottomWidth: 1,
                        borderBottomColor: '#2c2c2c',
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <TouchableOpacity
                                onPress={() => setShowStudentPicker(false)}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: '#252525',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginEnd: 15,
                                    borderWidth: 1,
                                    borderColor: '#333'
                                }}
                            >
                                <Ionicons name="close" size={22} color="#fff" />
                            </TouchableOpacity>
                            <Text style={{ fontSize: 24, fontWeight: '700', color: '#fff' }}>
                                {t('select_student')}
                            </Text>
                        </View>

                        {/* Search Bar */}
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#252525',
                            borderRadius: 12,
                            paddingHorizontal: 15,
                            borderWidth: 1,
                            borderColor: '#333'
                        }}>
                            <Ionicons name="search" size={20} color="#7f8c8d" />
                            <TextInput
                                style={{
                                    flex: 1,
                                    paddingVertical: 12,
                                    paddingHorizontal: 10,
                                    color: '#fff',
                                    fontSize: 16,
                                }}
                                placeholder={t('search_students')}
                                placeholderTextColor="#7f8c8d"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>
                    </View>

                    <ScrollView style={{ flex: 1 }}>
                        <View style={{ padding: 20 }}>
                            {filteredStudents.map((student) => (
                                <TouchableOpacity
                                    key={student.id}
                                    onPress={() => {
                                        setSelectedStudent(student);
                                        setShowStudentPicker(false);
                                        setSearchQuery('');
                                    }}
                                    style={{
                                        backgroundColor: '#252525',
                                        borderRadius: 12,
                                        padding: 16,
                                        marginBottom: 12,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        borderWidth: 1,
                                        borderColor: '#333'
                                    }}
                                >
                                    <ProfilePicture
                                        imageUrl={student.profile_picture_url}
                                        firstName={student.name.split(' ')[0]}
                                        lastName={student.name.split(' ')[1] || ''}
                                        size={56}
                                    />
                                    <View style={{ flex: 1, marginStart: 12 }}>
                                        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>
                                            {student.name}
                                        </Text>
                                        <Text style={{ color: '#7f8c8d', fontSize: 14, marginTop: 2 }}>
                                            {student.email}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="#7f8c8d" />
                                </TouchableOpacity>
                            ))}

                            {filteredStudents.length === 0 && (
                                <View style={{ alignItems: 'center', paddingVertical: 60, opacity: 0.5 }}>
                                    <Ionicons name={searchQuery.trim() === '' ? 'mail-outline' : 'search-outline'} size={64} color="#7f8c8d" />
                                    <Text style={{ color: '#7f8c8d', marginTop: 15, fontSize: 16, textAlign: 'center', paddingHorizontal: 20 }}>
                                        {searchQuery.trim() === ''
                                            ? t('enter_student_email_to_search')
                                            : t('no_students_found')}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
};

export default SendInvitationScreen;
