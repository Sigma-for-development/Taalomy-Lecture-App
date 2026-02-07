import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { tokenStorage } from '../utils/tokenStorage';
const AsyncStorage = tokenStorage;
import api from '../src/config/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

interface ChatRoom {
  id: number;
  name: string;
  chat_type: string;
  class_obj?: {
    id: number;
    name: string;
  };
  group_obj?: {
    id: number;
    name: string;
  };
  participants?: Array<{
    id: number;
    first_name: string;
    last_name: string;
    user_type: string;
    profile_picture_url?: string;
    username?: string;
  }>;
  last_message: {
    id: number;
    content: string;
    sender: {
      id: number;
      first_name: string;
      last_name: string;
      user_type: string;
    };
    created_at: string;
    profile_picture_url?: string;
  } | null;
  unread_count: number;
  updated_at: string;
}

type FilterType = 'all' | 'class' | 'group' | 'direct';

const MessagesScreen = () => {
  const { t, i18n } = useTranslation();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const loadChatRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      // Removed manual token check - api interceptor handles it

      // Get current user ID
      const userDataString = await AsyncStorage.getItem('user_data');
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        setCurrentUserId(userData.id);
      }

      // Use api instance with relative path. Interceptor handles baseURL and Authorization.
      const response = await api.get('rooms/');

      console.log('Received chat rooms:', response.data);

      // Sort chat rooms by last updated time (newest first)
      const sortedRooms = response.data.sort((a: ChatRoom, b: ChatRoom) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      setChatRooms(sortedRooms);
    } catch (error: any) {
      console.error('Error loading chat rooms:', error);
      if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
        setError(t('error_network_failed'));
      } else if (error.response?.status === 404) {
        // Handle 404 specifically - lecturer may not have chat rooms
        setError(t('error_no_chats_yet'));
      } else {
        setError(error.response?.data?.error || t('error_load_failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChatRooms();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadChatRooms();
  }, []);

  // Add focus effect to refresh when user returns to this screen
  useFocusEffect(
    useCallback(() => {
      // Add a small delay to ensure the server has processed the mark_read event
      const timer = setTimeout(() => {
        loadChatRooms();
      }, 1000);

      return () => clearTimeout(timer);
    }, [])
  );

  const filteredChatRooms = useMemo(() => {
    if (activeFilter === 'all') return chatRooms;
    return chatRooms.filter(room => room.chat_type === activeFilter);
  }, [chatRooms, activeFilter]);

  const handleChatRoomPress = (room: ChatRoom) => {
    if (room.chat_type === 'class' && room.class_obj && room.class_obj.id) {
      router.push(`/class-chat/${room.class_obj.id}`);
    } else if (room.chat_type === 'group' && room.group_obj && room.group_obj.id) {
      // Assuming group-chat exists in Lecturer App as well
      router.push(`/group-chat/${room.group_obj.id}`);
    } else if (room.chat_type === 'direct' && room.participants && currentUserId) {
      // For direct messages, we need to determine the other participant
      // and navigate to the direct message screen
      const otherParticipant = room.participants.find(p => p.id !== currentUserId);

      if (otherParticipant) {
        router.push(`/direct-message/${otherParticipant.id}`);
      } else if (room.participants.length > 0 && room.participants.some(p => p.id === currentUserId)) {
        // Handle Self-Chat (Note to Self) - participants only contains current user
        router.push(`/direct-message/${currentUserId}`);
      } else {
        Alert.alert(t('error_title'), t('error_participant_not_found'));
      }
    } else {
      Alert.alert(t('unsupported_chat_type_title'), t('error_unsupported_chat_type'));
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return t('yesterday_label');
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getChatName = (room: ChatRoom) => {
    if (room.chat_type === 'direct' && room.participants && currentUserId) {
      // For direct messages, show the name of the other participant
      const otherParticipant = room.participants.find(p => p.id !== currentUserId);
      if (otherParticipant) {
        const name = `${otherParticipant.first_name} ${otherParticipant.last_name}`.trim();
        if (!name || otherParticipant.username === 'admin') return "Taalomy Support";
        return name;
      } else if (room.participants.length > 0 && room.participants.some(p => p.id === currentUserId)) {
        // Self-chat
        const me = room.participants.find(p => p.id === currentUserId);
        return me ? `${me.first_name} ${me.last_name} (Me)` : room.name;
      }
    }
    return room.name;
  };

  const getAvatarIcon = (chatType: string) => {
    switch (chatType) {
      case 'group':
        return 'people-outline';
      case 'direct':
        return 'person-outline';
      default:
        return 'school-outline';
    }
  };

  const renderFilterItem = (label: string, value: FilterType) => (
    <TouchableOpacity
      style={[
        styles.filterItem,
        activeFilter === value && styles.filterItemActive
      ]}
      onPress={() => setActiveFilter(value)}
    >
      <Text
        style={[
          styles.filterText,
          activeFilter === value && styles.filterTextActive
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderChatRoom = ({ item }: { item: ChatRoom }) => {
    const lastMessage = item.last_message;
    const unreadCount = item.unread_count;
    const chatName = getChatName(item);
    const avatarIcon = getAvatarIcon(item.chat_type);

    return (
      <TouchableOpacity
        style={styles.chatRoomItem}
        onPress={() => handleChatRoomPress(item)}
      >
        <View style={styles.avatarContainer}>
          {item.chat_type === 'direct' && item.participants && currentUserId ? (
            (() => {
              const other = item.participants.find(p => p.id !== currentUserId);
              const isSupport = chatName === 'Taalomy Support';

              if (isSupport) {
                return (
                  <Image
                    source={require('../assets/taalomy-dark-back.png')}
                    style={[styles.avatarImage, { backgroundColor: '#000' }]}
                    resizeMode="cover"
                  />
                );
              }

              if (other?.profile_picture_url) {
                return (
                  <Image
                    source={{ uri: other.profile_picture_url }}
                    style={styles.avatarImage}
                  />
                );
              }

              return (
                <View style={styles.avatar}>
                  <Ionicons name={avatarIcon} size={24} color="#007AFF" />
                </View>
              );
            })()
          ) : (
            <View style={styles.avatar}>
              <Ionicons
                name={avatarIcon}
                size={24}
                color="#007AFF"
              />
            </View>
          )}

          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>
              {chatName}
            </Text>
            {lastMessage && (
              <Text style={styles.chatTime}>
                {formatTime(lastMessage.created_at)}
              </Text>
            )}
          </View>

          <View style={styles.chatPreview}>
            {lastMessage ? (
              <>
                <Text style={styles.senderName}>
                  {(() => {
                    const senderName = `${lastMessage.sender.first_name} ${lastMessage.sender.last_name}`.trim();
                    return senderName || "Taalomy Support";
                  })()}:
                </Text>
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {lastMessage.content}
                </Text>
              </>
            ) : (
              <Text style={styles.noMessages}>{t('no_messages_yet')}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const retryLoad = () => {
    loadChatRooms();
  };

  if (loading) {
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
          <Text style={styles.headerTitle}>{t('messages_header')}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>{t('loading_messages')}</Text>
        </View>
      </View>
    );
  }

  if (error) {
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
          <Text style={styles.headerTitle}>{t('messages_header')}</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={48} color="#e74c3c" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retryLoad}>
            <Text style={styles.retryButtonText}>{t('retry_button')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
        style={styles.backgroundGradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('messages_header')}</Text>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {renderFilterItem(t('filter_all'), 'all')}
          {renderFilterItem(t('filter_direct'), 'direct')}
          {renderFilterItem(t('filter_class'), 'class')}
          {renderFilterItem(t('filter_group'), 'group')}
        </ScrollView>
      </View>

      {/* Chat Rooms List */}
      <FlatList
        data={filteredChatRooms}
        renderItem={renderChatRoom}
        keyExtractor={(item) => item.id.toString()}
        style={styles.chatList}
        contentContainerStyle={styles.chatListContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3498db"
            colors={['#3498db']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#7f8c8d" />
            <Text style={styles.emptyText}>{t('no_messages_found')}</Text>
            <Text style={styles.emptySubtext}>
              {activeFilter === 'all'
                ? t('no_chats_found_all')
                : t('no_chats_found_filtered', { filter: activeFilter })}
            </Text>
          </View>
        }
      />
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60, // Adjust for status bar
    paddingBottom: 16,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    marginEnd: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  filterContainer: {
    marginBottom: 10,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterItem: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginEnd: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  filterItemActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  filterText: {
    color: '#bdc3c7',
    fontSize: 14,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#bdc3c7',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginVertical: 20,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  chatRoomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarContainer: {
    position: 'relative',
    marginEnd: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#0a0a0a',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ecf0f1',
    flex: 1,
    marginEnd: 8,
  },
  chatTime: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  chatPreview: {
    flexDirection: 'row',
  },
  senderName: {
    fontSize: 14,
    color: '#bdc3c7',
    fontWeight: '600',
    marginEnd: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#95a5a6',
    flex: 1,
  },
  noMessages: {
    fontSize: 14,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ecf0f1',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default MessagesScreen;