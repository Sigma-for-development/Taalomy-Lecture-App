import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    StatusBar,
    RefreshControl,
    ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { tokenStorage } from '../utils/tokenStorage';
const AsyncStorage = tokenStorage;
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_CONFIG } from '../src/config/api';
import { useTranslation } from 'react-i18next';
import ProfilePicture from '../src/components/ProfilePicture';

interface Invitation {
    id: number;
    student: number;
    student_name: string;
    invitation_type: 'intake' | 'class' | 'group';
    target_name: string;
    payment_plan: string;
    amount: number;
    message?: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
    created_at: string;
    expires_at: string;
    is_expired: boolean;
}

const InvitationsScreen = () => {
    const { t } = useTranslation();
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [filteredInvitations, setFilteredInvitations] = useState<Invitation[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');

    const baseurl = API_CONFIG.ACCOUNTS_BASE_URL;

    useEffect(() => {
        loadInvitations();
    }, []);

    useEffect(() => {
        if (filterStatus === 'all') {
            setFilteredInvitations(invitations);
        } else {
            setFilteredInvitations(invitations.filter(inv => inv.status === filterStatus));
        }
    }, [filterStatus, invitations]);

    const loadInvitations = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('access_token');
            const response = await axios.get(`${baseurl}lecturer/invitations/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setInvitations(response.data);
            setFilteredInvitations(response.data);
        } catch (error) {
            console.error('Error loading invitations:', error);
            Alert.alert(t('error'), t('error_loading_invitations'));
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadInvitations();
        setRefreshing(false);
    };

    const handleCancelInvitation = async (invitationId: number) => {
        Alert.alert(
            t('cancel_invitation'),
            t('cancel_invitation_confirmation'),
            [
                { text: t('no'), style: 'cancel' },
                {
                    text: t('yes'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('access_token');
                            await axios.post(
                                `${baseurl}lecturer/invitations/${invitationId}/cancel/`,
                                {},
                                { headers: { 'Authorization': `Bearer ${token}` } }
                            );
                            await loadInvitations();
                            Alert.alert(t('success'), t('invitation_cancelled'));
                        } catch (error) {
                            console.error('Error cancelling invitation:', error);
                            Alert.alert(t('error'), t('error_cancelling_invitation'));
                        }
                    }
                }
            ]
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return '#f39c12';
            case 'accepted': return '#27ae60';
            case 'declined': return '#e74c3c';
            case 'expired': return '#95a5a6';
            case 'cancelled': return '#95a5a6';
            default: return '#7f8c8d';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return 'time-outline';
            case 'accepted': return 'checkmark-circle';
            case 'declined': return 'close-circle';
            case 'expired': return 'hourglass-outline';
            case 'cancelled': return 'ban-outline';
            default: return 'help-circle-outline';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'intake': return 'school-outline';
            case 'class': return 'book-outline';
            case 'group': return 'people-outline';
            default: return 'folder-outline';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    const getDaysUntilExpiry = (expiresAt: string) => {
        const now = new Date();
        const expiry = new Date(expiresAt);
        const diffTime = expiry.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={{ color: '#fff', marginTop: 16 }}>{t('loading')}</Text>
            </View>
        );
    }

    const statusFilters = [
        { key: 'all', label: t('all') },
        { key: 'pending', label: t('pending') },
        { key: 'accepted', label: t('accepted') },
        { key: 'declined', label: t('declined') },
        { key: 'expired', label: t('expired') }
    ];

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
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
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
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 24, fontWeight: '700', color: '#fff' }}>
                        {t('invitations')}
                    </Text>
                </View>

                {/* Filter Buttons */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                    {statusFilters.map((filter) => (
                        <TouchableOpacity
                            key={filter.key}
                            onPress={() => setFilterStatus(filter.key)}
                            style={{
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                borderRadius: 20,
                                backgroundColor: filterStatus === filter.key ? '#3498db' : '#252525',
                                marginEnd: 8,
                                borderWidth: 1,
                                borderColor: filterStatus === filter.key ? '#3498db' : '#333'
                            }}
                        >
                            <Text style={{
                                color: filterStatus === filter.key ? '#fff' : '#7f8c8d',
                                fontWeight: filterStatus === filter.key ? '700' : '500',
                                fontSize: 14
                            }}>
                                {filter.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3498db" />
                }
            >
                <View style={{ padding: 20 }}>
                    {filteredInvitations.map((invitation) => {
                        const daysLeft = getDaysUntilExpiry(invitation.expires_at);
                        return (
                            <View
                                key={invitation.id}
                                style={{
                                    backgroundColor: '#252525',
                                    borderRadius: 16,
                                    padding: 16,
                                    marginBottom: 12,
                                    borderWidth: 1,
                                    borderColor: '#333'
                                }}
                            >
                                {/* Header: Status Badge */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 16,
                                            backgroundColor: `${getStatusColor(invitation.status)}20`,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginEnd: 8
                                        }}>
                                            <Ionicons name={getStatusIcon(invitation.status) as any} size={18} color={getStatusColor(invitation.status)} />
                                        </View>
                                        <Text style={{ color: getStatusColor(invitation.status), fontSize: 14, fontWeight: '700' }}>
                                            {t(invitation.status)}
                                        </Text>
                                    </View>

                                    {invitation.status === 'pending' && daysLeft >= 0 && (
                                        <View style={{
                                            backgroundColor: 'rgba(241, 196, 15, 0.15)',
                                            paddingHorizontal: 10,
                                            paddingVertical: 4,
                                            borderRadius: 6,
                                            borderWidth: 1,
                                            borderColor: 'rgba(241, 196, 15, 0.3)'
                                        }}>
                                            <Text style={{ color: '#f1c40f', fontSize: 11, fontWeight: '600' }}>
                                                {daysLeft === 0 ? t('expires_today') : t('expires_in_n_days', { days: daysLeft })}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Student Info */}
                                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 4 }}>
                                    {invitation.student_name}
                                </Text>

                                {/* Target Info */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                    <Ionicons name={getTypeIcon(invitation.invitation_type) as any} size={16} color="#3498db" />
                                    <Text style={{ color: '#3498db', fontSize: 14, marginStart: 6 }}>
                                        {t(invitation.invitation_type)}: {invitation.target_name}
                                    </Text>
                                </View>

                                {/* Payment Info */}
                                <View style={{
                                    backgroundColor: '#1a1a1a',
                                    borderRadius: 8,
                                    padding: 12,
                                    marginBottom: 12
                                }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: '#7f8c8d', fontSize: 13 }}>
                                            {t(invitation.payment_plan)}
                                        </Text>
                                        <Text style={{ color: '#3498db', fontSize: 18, fontWeight: '700' }}>
                                            {invitation.amount.toFixed(2)} {t('currency')}
                                        </Text>
                                    </View>
                                </View>

                                {/* Message (if exists) */}
                                {invitation.message && (
                                    <View style={{
                                        backgroundColor: '#1a1a1a',
                                        borderRadius: 8,
                                        padding: 12,
                                        marginBottom: 12,
                                        borderLeftWidth: 3,
                                        borderLeftColor: '#3498db'
                                    }}>
                                        <Text style={{ color: '#7f8c8d', fontSize: 12, marginBottom: 4 }}>
                                            {t('your_message')}:
                                        </Text>
                                        <Text style={{ color: '#bdc3c7', fontSize: 14 }}>
                                            {invitation.message}
                                        </Text>
                                    </View>
                                )}

                                {/* Date */}
                                <Text style={{ color: '#7f8c8d', fontSize: 12 }}>
                                    {t('sent_on')}: {formatDate(invitation.created_at)}
                                </Text>

                                {/* Cancel Button */}
                                {invitation.status === 'pending' && !invitation.is_expired && (
                                    <TouchableOpacity
                                        onPress={() => handleCancelInvitation(invitation.id)}
                                        style={{
                                            backgroundColor: 'rgba(231, 76, 60, 0.15)',
                                            paddingVertical: 12,
                                            borderRadius: 8,
                                            alignItems: 'center',
                                            marginTop: 12,
                                            borderWidth: 1,
                                            borderColor: 'rgba(231, 76, 60, 0.3)'
                                        }}
                                    >
                                        <Text style={{ color: '#e74c3c', fontSize: 15, fontWeight: '700' }}>
                                            {t('cancel_invitation')}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    })}

                    {filteredInvitations.length === 0 && (
                        <View style={{ alignItems: 'center', paddingVertical: 60, opacity: 0.5 }}>
                            <Ionicons name="mail-outline" size={64} color="#7f8c8d" />
                            <Text style={{ color: '#7f8c8d', marginTop: 15, fontSize: 16, textAlign: 'center' }}>
                                {t('no_invitations_found')}
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

export default InvitationsScreen;
