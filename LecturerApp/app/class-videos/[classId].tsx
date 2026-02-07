import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { videoCategories, classVideos, VideoCategory, ClassVideo } from '@src/utils/videoApi';

export default function ClassVideosScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [videos, setVideos] = useState<ClassVideo[]>([]);
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadVideos(),
        loadCategories(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const loadVideos = async () => {
    try {
      const filters: any = {};
      if (selectedCategory) filters.category = Number(selectedCategory);
      if (showActiveOnly) filters.is_active = true;

      const data = await classVideos.list(Number(classId), filters);
      setVideos(data);
    } catch (error) {
      console.error('Error loading videos:', error);
      throw error;
    }
  };

  const loadCategories = async () => {
    try {
      const data = await videoCategories.list(Number(classId));
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      throw error;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleFilterChange = () => {
    loadVideos();
  };

  const handleToggleActive = async (video: ClassVideo) => {
    try {
      const result = await classVideos.toggleActive(Number(classId), video.id);
      Alert.alert('Success', result.message);

      // Update local state
      setVideos(prev => prev.map(v =>
        v.id === video.id ? { ...v, is_active: !v.is_active } : v
      ));
    } catch (error) {
      console.error('Error toggling video status:', error);
      Alert.alert('Error', 'Failed to update video status');
    }
  };

  const handleDeleteVideo = (video: ClassVideo) => {
    Alert.alert(
      'Delete Video',
      `Are you sure you want to delete \"${video.title}\"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await classVideos.delete(Number(classId), video.id);
              setVideos(prev => prev.filter(v => v.id !== video.id));
              Alert.alert('Success', 'Video deleted successfully');
            } catch (error) {
              console.error('Error deleting video:', error);
              Alert.alert('Error', 'Failed to delete video');
            }
          },
        },
      ]
    );
  };

  const handleViewAnalytics = (video: ClassVideo) => {
    router.push({
      pathname: '/video-analytics/[videoId]' as any,
      params: { videoId: video.id, classId, videoTitle: video.title },
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (duration: string | undefined) => {
    if (!duration) return 'Unknown';
    // Assuming duration is in format "HH:MM:SS" or similar
    return duration;
  };

  const renderVideoItem = ({ item }: { item: ClassVideo }) => (
    <View style={styles.videoCard}>
      <View style={styles.videoHeader}>
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.videoCategory}>{item.category_name}</Text>
          <View style={styles.videoMeta}>
            <Text style={styles.metaText}>
              📊 {item.view_count} views • 📁 {formatFileSize(item.file_size)}
            </Text>
            {item.duration && (
              <Text style={styles.metaText}>⏱️ {formatDuration(item.duration)}</Text>
            )}
          </View>
        </View>

        {item.thumbnail_url ? (
          <Image source={{ uri: item.thumbnail_url }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Ionicons name="videocam" size={32} color="#ccc" />
          </View>
        )}
      </View>

      {item.description ? (
        <Text style={styles.videoDescription} numberOfLines={3}>
          {item.description}
        </Text>
      ) : null}

      <View style={styles.videoActions}>
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: item.is_active ? '#4CAF50' : '#FF9800' }
          ]}>
            <Text style={styles.statusText}>
              {item.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleViewAnalytics(item)}
          >
            <Ionicons name="analytics" size={20} color="#007AFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleToggleActive(item)}
          >
            <Ionicons
              name={item.is_active ? "pause" : "play"}
              size={20}
              color={item.is_active ? "#FF9800" : "#4CAF50"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push({
              pathname: '/edit-video/[videoId]' as any,
              params: { videoId: item.id, classId },
            })}
          >
            <Ionicons name="pencil" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteVideo(item)}
          >
            <Ionicons name="trash" size={20} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading videos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Class Videos</Text>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => router.push({
            pathname: '/upload-video/[classId]',
            params: { classId },
          })}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Category:</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedCategory}
              onValueChange={(value) => {
                setSelectedCategory(value);
                setTimeout(handleFilterChange, 100);
              }}
              style={styles.picker}
            >
              <Picker.Item label="All Categories" value="" />
              {categories.map((category) => (
                <Picker.Item
                  key={category.id}
                  label={category.name}
                  value={category.id.toString()}
                />
              ))}
            </Picker>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.filterToggle, showActiveOnly && styles.filterToggleActive]}
          onPress={() => {
            setShowActiveOnly(!showActiveOnly);
            setTimeout(handleFilterChange, 100);
          }}
        >
          <Text style={[
            styles.filterToggleText,
            showActiveOnly && styles.filterToggleTextActive
          ]}>
            Active Only
          </Text>
        </TouchableOpacity>
      </View>

      {/* Videos List */}
      <FlatList
        data={videos}
        renderItem={renderVideoItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="videocam-off" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No videos found</Text>
            <Text style={styles.emptySubtext}>
              {selectedCategory || !showActiveOnly
                ? 'Try adjusting your filters'
                : 'Upload your first video to get started'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  filterGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 14,
    color: '#666',
    marginEnd: 8,
  },
  pickerWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 40,
  },
  filterToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginStart: 12,
  },
  filterToggleActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterToggleText: {
    fontSize: 14,
    color: '#666',
  },
  filterToggleTextActive: {
    color: 'white',
  },
  listContainer: {
    padding: 16,
  },
  videoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  videoHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  videoInfo: {
    flex: 1,
    marginEnd: 12,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  videoCategory: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 8,
  },
  videoMeta: {
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
  },
  thumbnail: {
    width: 80,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  thumbnailPlaceholder: {
    width: 80,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  videoActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusContainer: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});