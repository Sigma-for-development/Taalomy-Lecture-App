import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_CONFIG } from '../../../src/config/api';
import { tokenStorage } from '../../../utils/tokenStorage';
const AsyncStorage = tokenStorage;

export default function ChannelListScreen() {
    const { classId } = useLocalSearchParams();
    const { t } = useTranslation();
    const router = useRouter();

    const [channels, setChannels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Create Channel Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadChannels();
    }, [classId]);

    const loadChannels = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('access_token');
            if (!token) return;

            const id = Array.isArray(classId) ? classId[0] : classId;
            const response = await axios.get(`${API_CONFIG.CHAT_BASE_URL}classes/${id}/chat/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setChannels(response.data);
        } catch (err: any) {
            console.error('Error loading channels:', err);
            setError(t('error_loading_channels') || 'Failed to load channels');
        } finally {
            setLoading(false);
        }
    };

    const createChannel = async () => {
        if (!newChannelName.trim()) return;

        try {
            setCreating(true);
            const token = await AsyncStorage.getItem('access_token');
            const id = Array.isArray(classId) ? classId[0] : classId;

            await axios.post(`${API_CONFIG.CHAT_BASE_URL}classes/${id}/chat/`, {
                name: newChannelName,
                chat_type: 'class',
                channel_type: 'custom'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setModalVisible(false);
            setNewChannelName('');
            loadChannels();
        } catch (err: any) {
            Alert.alert(t('error'), t('error_creating_channel') || 'Failed to create channel');
        } finally {
            setCreating(false);
        }
    };

    const getChannelIcon = (type: string) => {
        switch (type) {
            case 'general': return 'chatbubbles-outline';
            case 'materials': return 'file-tray-full-outline';
            case 'updates': return 'megaphone-outline';
            case 'practice-quizzes': return 'clipboard-outline';
            default: return 'filter-outline'; // Generic hash icon look-alike
        }
    };

    const getChannelName = (channel: any) => {
        // If name is "Class Name - Type", try to simplify
        if (channel.channel_type !== 'custom') {
            const typeKey = `channel_${channel.channel_type}`;
            // Verify if translation key exists, else fallback to channel type capitalized
            return t(typeKey as any, { defaultValue: channel.channel_type.charAt(0).toUpperCase() + channel.channel_type.slice(1) });
        }
        return channel.name;
    };

    const renderChannelItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.channelItem}
            onPress={() => router.push(`/class-chat/channel/${item.id}`)}
        >
            <View style={styles.iconContainer}>
                <Ionicons name={getChannelIcon(item.channel_type) as any} size={24} color="#bdc3c7" />
            </View>
            <View style={styles.channelInfo}>
                <Text style={styles.channelName}>{getChannelName(item)}</Text>
                {item.last_message && (
                    <Text style={styles.lastMessage} numberOfLines={1}>
                        {item.last_message.sender.first_name}: {item.last_message.content || t('image')}
                    </Text>
                )}
            </View>
            {item.unread_count > 0 && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unread_count}</Text>
                </View>
            )}
            <Ionicons name="chevron-forward" size={20} color="#7f8c8d" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
                style={styles.backgroundGradient}
            />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('class_channels_title') || 'Class Channels'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3498db" />
                </View>
            ) : (
                <FlatList
                    data={channels}
                    renderItem={renderChannelItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshing={loading}
                    onRefresh={loadChannels}
                    ListEmptyComponent={
                        <View style={styles.centerContainer}>
                            <Text style={styles.emptyText}>{t('no_channels') || 'No channels found'}</Text>
                        </View>
                    }
                />
            )}

            {/* Create Channel Modal */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('create_channel') || 'Create New Channel'}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t('channel_name_placeholder') || 'Channel Name'}
                            placeholderTextColor="#7f8c8d"
                            value={newChannelName}
                            onChangeText={setNewChannelName}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.buttonText}>{t('cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.createButton]}
                                onPress={createChannel}
                                disabled={creating}
                            >
                                {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('create')}</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    addButton: {
        padding: 8,
        backgroundColor: 'rgba(52, 152, 219, 0.2)',
        borderRadius: 20,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
    },
    channelItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    channelInfo: {
        flex: 1,
    },
    channelName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
    },
    lastMessage: {
        fontSize: 12,
        color: '#7f8c8d',
    },
    badge: {
        backgroundColor: '#e74c3c',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        marginRight: 8,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    emptyText: {
        color: '#7f8c8d',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 16,
        textAlign: 'center',
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 8,
        padding: 12,
        color: '#fff',
        marginBottom: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    createButton: {
        backgroundColor: '#3498db',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
    },
});
