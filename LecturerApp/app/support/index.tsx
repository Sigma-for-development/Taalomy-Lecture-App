
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    StatusBar,
    RefreshControl,
    TextInput,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { tokenStorage } from '../../utils/tokenStorage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { API_CONFIG } from '../../src/config/api';
import { useTranslation } from 'react-i18next';
import { formatGregorianDate, formatGregorianDateTime } from '../../src/utils/dateFormatter';
const AsyncStorage = tokenStorage;

interface SupportMessage {
    id: number;
    sender: {
        id: number;
        email: string;
        is_staff: boolean;
    };
    message: string;
    created_at: string;
    is_staff: boolean;
}

interface SupportTicket {
    id: number;
    ticket_id: string;
    category: string;
    subject: string;
    message: string;
    status: 'pending' | 'in_progress' | 'resolved' | 'closed';
    created_at: string;
    messages: SupportMessage[];
    has_unread_admin_message: boolean;
}

const SupportScreen = () => {
    const { t } = useTranslation();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [replyMessage, setReplyMessage] = useState('');

    // Form State
    const [category, setCategory] = useState('technical');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        loadTickets();
    }, []);

    const loadTickets = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('access_token');
            if (!token) return;

            const response = await axios.get(`${API_CONFIG.ACCOUNTS_BASE_URL}support-tickets/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setTickets(response.data);
        } catch (error) {
            console.error('Error loading tickets:', error);
            Alert.alert(t('error_title'), t('error_load_tickets'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const createTicket = async () => {
        if (!subject.trim() || !message.trim()) {
            Alert.alert(t('error_title'), t('error_fill_all_fields'));
            return;
        }

        try {
            setSubmitting(true);
            const token = await AsyncStorage.getItem('access_token');

            await axios.post(
                `${API_CONFIG.ACCOUNTS_BASE_URL}support-tickets/`,
                { category, subject, message },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            setCreateModalVisible(false);
            setSubject('');
            setMessage('');
            setCategory('technical');
            loadTickets();
            Alert.alert(t('success_title'), t('success_ticket_created'));
        } catch (error) {
            console.error('Error creating ticket:', error);
            Alert.alert(t('error_title'), t('error_create_ticket'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleReply = async () => {
        if (!selectedTicket || !replyMessage.trim()) return;

        try {
            setSubmitting(true);
            const token = await AsyncStorage.getItem('access_token');

            await axios.post(
                `${API_CONFIG.ACCOUNTS_BASE_URL}support-tickets/${selectedTicket.id}/reply/`,
                { message: replyMessage },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            setReplyMessage('');
            // Refresh details
            const response = await axios.get(`${API_CONFIG.ACCOUNTS_BASE_URL}support-tickets/${selectedTicket.id}/`, { // Assuming logic to refresh or list again
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Actually, list endpoint usually returns all. Let's just reload list and find it.
            // A better way is to update local state or fetch single if endpoint exists.
            // Since we're using ViewSet, retrieve (GET /id/) should work.

            // Refresh list to update ticket status/messages
            loadTickets();

            // Hack: close modal for now or try to update selectedTicket.
            // Ideally we fetch the single ticket. For now let's just close.
            setDetailModalVisible(false);
            Alert.alert(t('success_title'), t('success_reply_sent'));

        } catch (error) {
            console.error('Error sending reply:', error);
            Alert.alert(t('error_title'), t('error_send_reply'));
        } finally {
            setSubmitting(false);
        }
    };

    // Helper to open detail
    const openTicketDetail = async (ticket: SupportTicket) => {
        setSelectedTicket(ticket);
        setDetailModalVisible(true);
    };


    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open':
            case 'pending': return '#f1c40f';
            case 'in_progress': return '#3498db';
            case 'resolved': return '#2ecc71';
            case 'closed': return '#e74c3c';
            default: return '#bdc3c7';
        }
    };

    const getStatusLabel = (status: string) => {
        return t(`support_status_${status}`);
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
                style={{ position: 'absolute', width: '100%', height: '100%' }}
            />

            {/* Header */}
            <View style={{
                paddingTop: 60,
                paddingHorizontal: 24,
                paddingBottom: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(255,255,255,0.1)'
            }}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff' }}>{t('support_center_title')}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                contentContainerStyle={{ padding: 24 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTickets(); }} tintColor="#3498db" />
                }
            >
                {loading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                        <ActivityIndicator size="large" color="#3498db" />
                    </View>
                ) : tickets.length === 0 ? (
                    <View style={{ alignItems: 'center', marginTop: 60 }}>
                        <Ionicons name="help-buoy-outline" size={64} color="#3498db" style={{ opacity: 0.5 }} />
                        <Text style={{ color: '#bdc3c7', marginTop: 16, fontSize: 16 }}>{t('support_no_tickets')}</Text>
                        <Text style={{ color: '#7f8c8d', marginTop: 8 }}>{t('support_create_hint')}</Text>
                    </View>
                ) : (
                    tickets.map((ticket) => (
                        <TouchableOpacity
                            key={ticket.id}
                            onPress={() => openTicketDetail(ticket)}
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                borderRadius: 12,
                                padding: 16,
                                marginBottom: 16,
                                borderLeftWidth: 4,
                                borderLeftColor: getStatusColor(ticket.status)
                            }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Text style={{ color: '#bdc3c7', fontSize: 12 }}>{ticket.ticket_id}</Text>
                                    {ticket.has_unread_admin_message && (
                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#e74c3c' }} />
                                    )}
                                </View>
                                <View style={{ backgroundColor: `${getStatusColor(ticket.status)}20`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                                    <Text style={{ color: getStatusColor(ticket.status), fontSize: 12, fontWeight: 'bold' }}>
                                        {getStatusLabel(ticket.status)}
                                    </Text>
                                </View>
                            </View>
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>{ticket.subject}</Text>
                            <Text style={{ color: '#bdc3c7', fontSize: 14 }}>{t(`support_cat_${ticket.category}`).toUpperCase()}</Text>
                            <Text style={{ color: '#7f8c8d', fontSize: 12, marginTop: 8 }}>{formatGregorianDate(ticket.created_at)}</Text>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity
                onPress={() => setCreateModalVisible(true)}
                style={{
                    position: 'absolute',
                    bottom: 30,
                    right: 30,
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: '#3498db',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 8,
                }}
            >
                <Ionicons name="add" size={30} color="#fff" />
            </TouchableOpacity>

            {/* Create Ticket Modal */}
            <Modal
                visible={createModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setCreateModalVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: '#1a1a1a', borderTopStartRadius: 24, borderTopEndRadius: 24, padding: 24, height: '80%' }}>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>{t('support_new_ticket_title')}</Text>
                            <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#bdc3c7" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            <Text style={{ color: '#bdc3c7', marginBottom: 8 }}>{t('support_category_label')}</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                                {['technical', 'account', 'payment', 'other'].map((cat) => (
                                    <TouchableOpacity
                                        key={cat}
                                        onPress={() => setCategory(cat)}
                                        style={{
                                            paddingHorizontal: 16,
                                            paddingVertical: 8,
                                            borderRadius: 20,
                                            backgroundColor: category === cat ? '#3498db' : 'rgba(255,255,255,0.1)',
                                        }}
                                    >
                                        <Text style={{ color: '#fff', textTransform: 'capitalize' }}>{t(`support_cat_${cat}`)}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={{ color: '#bdc3c7', marginBottom: 8 }}>{t('support_subject_label')}</Text>
                            <TextInput
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    borderRadius: 12,
                                    padding: 16,
                                    color: '#fff',
                                    marginBottom: 20
                                }}
                                placeholder={t('placeholder_support_subject')}
                                placeholderTextColor="#7f8c8d"
                                value={subject}
                                onChangeText={setSubject}
                            />

                            <Text style={{ color: '#bdc3c7', marginBottom: 8 }}>{t('support_description_label')}</Text>
                            <TextInput
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    borderRadius: 12,
                                    padding: 16,
                                    color: '#fff',
                                    height: 150,
                                    textAlignVertical: 'top',
                                    marginBottom: 30
                                }}
                                placeholder={t('placeholder_support_description')}
                                placeholderTextColor="#7f8c8d"
                                value={message}
                                onChangeText={setMessage}
                                multiline
                            />

                            <TouchableOpacity
                                onPress={createTicket}
                                disabled={submitting}
                                style={{
                                    backgroundColor: '#3498db',
                                    borderRadius: 12,
                                    padding: 16,
                                    alignItems: 'center',
                                    opacity: submitting ? 0.7 : 1
                                }}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{t('button_submit_ticket')}</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Detail/Chat Modal */}
            <Modal
                visible={detailModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setDetailModalVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: '#000' }}>
                    <View style={{
                        paddingTop: 60,
                        paddingHorizontal: 24,
                        paddingBottom: 20,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottomWidth: 1,
                        borderBottomColor: 'rgba(255,255,255,0.1)',
                        backgroundColor: '#1a1a1a'
                    }}>
                        <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff' }}>
                            {selectedTicket?.ticket_id}
                        </Text>
                        <View style={{ width: 24 }} />
                    </View>

                    <ScrollView style={{ flex: 1, padding: 20 }}>
                        {selectedTicket && (
                            <>
                                <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 8 }}>
                                    {selectedTicket.subject}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                                    <View style={{ backgroundColor: `${getStatusColor(selectedTicket.status)}20`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginEnd: 10 }}>
                                        <Text style={{ color: getStatusColor(selectedTicket.status), fontSize: 12, fontWeight: 'bold' }}>
                                            {getStatusLabel(selectedTicket.status)}
                                        </Text>
                                    </View>
                                    <Text style={{ color: '#bdc3c7', fontSize: 12 }}>{formatGregorianDateTime(selectedTicket.created_at)}</Text>
                                </View>

                                <Text style={{ color: '#bdc3c7', marginBottom: 20 }}>{t('label_messages_history')}</Text>

                                {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                                    selectedTicket.messages.map((msg) => (
                                        <View key={msg.id} style={{
                                            marginBottom: 16,
                                            alignSelf: msg.is_staff ? 'flex-start' : 'flex-end',
                                            maxWidth: '85%'
                                        }}>
                                            <View style={{
                                                backgroundColor: msg.is_staff ? '#2c3e50' : '#2980b9',
                                                borderRadius: 16,
                                                padding: 12,
                                                borderBottomStartRadius: msg.is_staff ? 0 : 16,
                                                borderBottomEndRadius: msg.is_staff ? 16 : 0
                                            }}>
                                                <Text style={{ color: '#fff' }}>{msg.message}</Text>
                                            </View>
                                            <Text style={{
                                                color: '#7f8c8d',
                                                fontSize: 10,
                                                marginTop: 4,
                                                textAlign: msg.is_staff ? (t('direction') === 'rtl' ? 'right' : 'left') : (t('direction') === 'rtl' ? 'left' : 'right')
                                            }}>
                                                {msg.is_staff ? t('sender_staff') : t('sender_you')} • {formatGregorianDateTime(msg.created_at)}
                                            </Text>
                                        </View>
                                    ))
                                ) : (
                                    <Text style={{ color: '#7f8c8d', fontStyle: 'italic' }}>{t('label_no_messages')}</Text>
                                )}
                            </>
                        )}
                    </ScrollView>

                    {/* Reply Input */}
                    <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', backgroundColor: '#1a1a1a' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TextInput
                                style={{
                                    flex: 1,
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    borderRadius: 20,
                                    paddingHorizontal: 16,
                                    paddingVertical: 10,
                                    color: '#fff',
                                    marginEnd: 12,
                                    maxHeight: 100
                                }}
                                placeholder={t('placeholder_reply')}
                                placeholderTextColor="#7f8c8d"
                                value={replyMessage}
                                onChangeText={setReplyMessage}
                                multiline
                            />
                            <TouchableOpacity
                                onPress={handleReply}
                                disabled={submitting || !replyMessage.trim()}
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 22,
                                    backgroundColor: '#3498db',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: (!replyMessage.trim() || submitting) ? 0.5 : 1
                                }}
                            >
                                {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={20} color="#fff" />}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default SupportScreen;
