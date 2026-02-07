import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Image,
    StyleSheet,
    StatusBar
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { videoCategories, classVideos, VideoCategory, ClassVideo } from '@src/utils/videoApi';
import { LinearGradient } from 'expo-linear-gradient';

export default function IntakeVideosScreen() {
    const router = useRouter();
    const { intakeId } = useLocalSearchParams();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [categories, setCategories] = useState<VideoCategory[]>([]);
    const [videos, setVideos] = useState<ClassVideo[]>([]);
    const [filteredVideos, setFilteredVideos] = useState<ClassVideo[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

    useEffect(() => {
        if (intakeId) {
            loadData();
        }
    }, [intakeId]);

    useEffect(() => {
        if (selectedCategory) {
            setFilteredVideos(videos.filter(v => v.category === selectedCategory));
        } else {
            setFilteredVideos(videos);
        }
    }, [selectedCategory, videos]);

    const loadData = async () => {
        try {
            setLoading(true);
            const id = parseInt(intakeId as string);

            const categoriesData = await videoCategories.listForIntake(id);
            setCategories(categoriesData);

            // Fetch videos for intake using the helper
            const videosData = await classVideos.listForIntake(id);
            setVideos(videosData);
            setFilteredVideos(videosData);

        } catch (error) {
            console.error("Error loading data", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const formatDuration = (duration: string) => {
        if (!duration) return '00:00';
        // Format "00:00:00" or similar
        return duration.split('.')[0];
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3498db" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={['#2c3e50', '#34495e']}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Intake Videos</Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                    <TouchableOpacity
                        style={[styles.categoryChip, selectedCategory === null && styles.activeCategoryChip]}
                        onPress={() => setSelectedCategory(null)}
                    >
                        <Text style={[styles.categoryText, selectedCategory === null && styles.activeCategoryText]}>All</Text>
                    </TouchableOpacity>
                    {categories.map(cat => (
                        <TouchableOpacity
                            key={cat.id}
                            style={[styles.categoryChip, selectedCategory === cat.id && styles.activeCategoryChip]}
                            onPress={() => setSelectedCategory(cat.id)}
                        >
                            <Text style={[styles.categoryText, selectedCategory === cat.id && styles.activeCategoryText]}>{cat.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </LinearGradient>

            <ScrollView
                style={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
            >
                {filteredVideos.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="videocam-off-outline" size={48} color="#7f8c8d" />
                        <Text style={styles.emptyText}>No videos found</Text>
                    </View>
                ) : (
                    filteredVideos.map(video => (
                        <TouchableOpacity
                            key={video.id}
                            style={styles.videoCard}
                            onPress={() => router.push(`/intake-videos/video/${video.id}?intakeId=${intakeId}`)}
                        >
                            <View style={styles.thumbnailContainer}>
                                {video.thumbnail_url ? (
                                    <Image source={{ uri: video.thumbnail_url }} style={styles.thumbnail} />
                                ) : (
                                    <View style={styles.placeholderThumbnail}>
                                        <Ionicons name="play-circle-outline" size={40} color="#fff" />
                                    </View>
                                )}
                                <View style={styles.durationBadge}>
                                    <Text style={styles.durationText}>{formatDuration(video.duration || '')}</Text>
                                </View>
                            </View>
                            <View style={styles.videoInfo}>
                                <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
                                <Text style={styles.videoMeta}>
                                    {video.view_count} views • {(video.file_size / (1024 * 1024)).toFixed(1)} MB
                                </Text>
                                <View style={styles.categoryBadge}>
                                    <Text style={styles.categoryBadgeText}>{video.category_name}</Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#7f8c8d" />
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a1a1a' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' },
    header: { paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20 },
    headerContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    backButton: { marginEnd: 15 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    categoryScroll: { flexDirection: 'row' },
    categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginEnd: 10 },
    activeCategoryChip: { backgroundColor: '#3498db' },
    categoryText: { color: '#bdc3c7', fontWeight: '500' },
    activeCategoryText: { color: '#fff', fontWeight: 'bold' },
    content: { flex: 1, padding: 20 },
    emptyState: { alignItems: 'center', marginTop: 100 },
    emptyText: { color: '#7f8c8d', marginTop: 10, fontSize: 16 },
    videoCard: { flexDirection: 'row', backgroundColor: '#2c2c2c', borderRadius: 12, padding: 12, marginBottom: 15, alignItems: 'center' },
    thumbnailContainer: { width: 100, height: 70, borderRadius: 8, overflow: 'hidden', marginEnd: 15, position: 'relative' },
    thumbnail: { width: '100%', height: '100%', resizeMode: 'cover' },
    placeholderThumbnail: { width: '100%', height: '100%', backgroundColor: '#34495e', justifyContent: 'center', alignItems: 'center' },
    durationBadge: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 },
    durationText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    videoInfo: { flex: 1 },
    videoTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4 },
    videoMeta: { color: '#bdc3c7', fontSize: 12, marginBottom: 4 },
    categoryBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(52, 152, 219, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    categoryBadgeText: { color: '#3498db', fontSize: 10, fontWeight: 'bold' }
});
