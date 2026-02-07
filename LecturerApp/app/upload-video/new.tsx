import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    StyleSheet,
    ActivityIndicator,
    Image,
    StatusBar,
    Platform,
    Modal,
    FlatList,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    Keyboard
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { videoCategories, classVideos, VideoCategory, VideoUploadData } from '@src/utils/videoApi';
import { lecturerAPI } from '../../src/utils/api';
import { BlurView } from 'expo-blur'; // Would be nice, but using simulate glass for now

interface SelectionItem {
    id: number;
    name: string;
}

export default function NewVideoUploadScreen() {
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Context Selection
    const [isIntakeUpload, setIsIntakeUpload] = useState(false);
    const [items, setItems] = useState<SelectionItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<SelectionItem | null>(null);
    const [loadingItems, setLoadingItems] = useState(true);

    // Categories
    const [categories, setCategories] = useState<VideoCategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<VideoCategory | null>(null);
    const [loadingCategories, setLoadingCategories] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [videoFile, setVideoFile] = useState<any>(null);
    const [thumbnail, setThumbnail] = useState<any>(null);

    // Modals
    const [showContextModal, setShowContextModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);

    // New Category Form
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryDescription, setNewCategoryDescription] = useState('');
    const [creatingCategory, setCreatingCategory] = useState(false);

    useEffect(() => {
        loadContextItems();
    }, [isIntakeUpload]);

    useEffect(() => {
        if (selectedItem) {
            loadCategories();
        } else {
            setCategories([]);
            setSelectedCategory(null);
        }
    }, [selectedItem]);

    const loadContextItems = async () => {
        try {
            setLoadingItems(true);
            setSelectedItem(null); // Reset selection on toggle
            const response = await (isIntakeUpload ? lecturerAPI.getIntakes() : lecturerAPI.getClasses());

            setItems(response.data);
            if (response.data.length > 0) {
                setSelectedItem(response.data[0]);
            }
        } catch (error) {
            console.error('Error loading items:', error);
            Alert.alert('Error', 'Failed to load list. Please try again.');
        } finally {
            setLoadingItems(false);
        }
    };

    const loadCategories = async () => {
        if (!selectedItem) return;

        try {
            setLoadingCategories(true);
            const id = selectedItem.id;
            const data = isIntakeUpload
                ? await videoCategories.listForIntake(id)
                : await videoCategories.list(id);
            setCategories(data);
        } catch (error) {
            console.error('Error loading categories:', error);
            Alert.alert('Error', 'Failed to load video categories');
        } finally {
            setLoadingCategories(false);
        }
    };

    const handleVideoPick = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: true,
                quality: 1,
                videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                if (asset.fileSize && asset.fileSize > 200 * 1024 * 1024) {
                    Alert.alert('File too large', 'Please select a video smaller than 200MB.');
                    return;
                }
                setVideoFile({
                    uri: asset.uri,
                    type: 'video/mp4',
                    name: asset.fileName || 'video.mp4',
                    size: asset.fileSize,
                });
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to select video file');
        }
    };

    const handleThumbnailPick = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                setThumbnail({
                    uri: asset.uri,
                    type: 'image/jpeg',
                    name: 'thumbnail.jpg',
                });
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to select thumbnail');
        }
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) {
            Alert.alert('Error', 'Please enter a category name');
            return;
        }

        try {
            setCreatingCategory(true);
            const id = selectedItem?.id;
            if (!id) {
                Alert.alert('Error', 'No class or intake selected');
                setCreatingCategory(false);
                return;
            }

            const data = {
                name: newCategoryName,
                description: newCategoryDescription,
            };

            const newCategory = isIntakeUpload
                ? await videoCategories.createForIntake(id, data)
                : await videoCategories.create(id, data);

            setCategories(prev => [...prev, newCategory]);
            setSelectedCategory(newCategory);

            setNewCategoryName('');
            setNewCategoryDescription('');
            setShowNewCategoryModal(false);

            Alert.alert('Success', 'Category created successfully');
        } catch (error) {
            console.error('Error creating category:', error);
            Alert.alert('Error', 'Failed to create category');
        } finally {
            setCreatingCategory(false);
        }
    };

    const handleUpload = async () => {
        if (!selectedItem) {
            Alert.alert('Error', isIntakeUpload ? 'Please create an Intake first' : 'Please create a Class first');
            return;
        }
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a video title');
            return;
        }
        if (!selectedCategory) {
            Alert.alert('Error', 'Please select a category');
            return;
        }
        if (!videoFile) {
            Alert.alert('Error', 'Please select a video file');
            return;
        }

        try {
            setLoading(true);
            setUploadProgress(0);

            const uploadData: VideoUploadData = {
                title,
                description,
                category: selectedCategory.id,
                video_file: videoFile,
                thumbnail: thumbnail,
            };

            const id = selectedItem.id;
            if (isIntakeUpload) {
                await classVideos.uploadToIntake(id, uploadData, (progress) => setUploadProgress(progress));
            } else {
                await classVideos.upload(id, uploadData, (progress) => setUploadProgress(progress));
            }

            Alert.alert('Success', 'Video uploaded successfully!', [{ text: 'OK', onPress: () => router.back() }]);
        } catch (error) {
            console.error('Error uploading video:', error);
            Alert.alert('Error', 'Failed to upload video. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Components
    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.glassBackButton}>
                <Ionicons name="arrow-back" size={24} color="#ecf0f1" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Upload Video</Text>
            <View style={{ width: 40, alignItems: 'center' }}>
                {loading && <ActivityIndicator size="small" color="#3498db" />}
            </View>
        </View>
    );

    const renderSegmentedControl = () => (
        <View style={styles.segmentedControl}>
            <TouchableOpacity
                style={[styles.segmentBtn, !isIntakeUpload && styles.segmentBtnActive]}
                onPress={() => setIsIntakeUpload(false)}
            >
                <Text style={[styles.segmentText, !isIntakeUpload && styles.segmentTextActive]}>Class</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.segmentBtn, isIntakeUpload && styles.segmentBtnActive]}
                onPress={() => setIsIntakeUpload(true)}
            >
                <Text style={[styles.segmentText, isIntakeUpload && styles.segmentTextActive]}>Intake</Text>
            </TouchableOpacity>
        </View>
    );

    const renderSelectionItem = ({ item }: { item: SelectionItem }) => (
        <TouchableOpacity
            style={styles.modalItem}
            onPress={() => {
                setSelectedItem(item);
                setShowContextModal(false);
            }}
        >
            <Text style={[styles.modalItemText, selectedItem?.id === item.id && styles.modalItemTextSelected]}>
                {item.name}
            </Text>
            {selectedItem?.id === item.id && <Ionicons name="checkmark" size={24} color="#0A84FF" />}
        </TouchableOpacity>
    );

    const renderCategoryItem = ({ item }: { item: VideoCategory }) => (
        <TouchableOpacity
            style={styles.modalItem}
            onPress={() => {
                setSelectedCategory(item);
                setShowCategoryModal(false);
            }}
        >
            <Text style={[styles.modalItemText, selectedCategory?.id === item.id && styles.modalItemTextSelected]}>
                {item.name}
            </Text>
            {selectedCategory?.id === item.id && <Ionicons name="checkmark" size={24} color="#0A84FF" />}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Dark Gradient Background */}
            <LinearGradient
                colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {renderHeader()}

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>

                    {/* SECTION 1: CONTEXT */}
                    <View style={styles.sectionContainer}>
                        {renderSegmentedControl()}

                        <View style={styles.glassCard}>
                            <TouchableOpacity
                                style={[styles.row, styles.lastRow]}
                                onPress={() => setShowContextModal(true)}
                            >
                                <Text style={styles.rowLabel}>{isIntakeUpload ? 'Target Intake' : 'Target Class'}</Text>
                                <View style={styles.rowValueContainer}>
                                    {loadingItems ? (
                                        <ActivityIndicator size="small" color="#bdc3c7" />
                                    ) : (
                                        <Text style={styles.rowValue} numberOfLines={1}>
                                            {selectedItem ? selectedItem.name : 'Select...'}
                                        </Text>
                                    )}
                                    <Ionicons name="chevron-forward" size={20} color="#bdc3c7" style={{ marginLeft: 4 }} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* SECTION 2: DETAILS */}
                    <Text style={styles.sectionHeader}>DETAILS</Text>
                    <View style={styles.sectionContainer}>
                        <View style={styles.glassCard}>
                            <TouchableOpacity
                                style={styles.row}
                                onPress={() => setShowCategoryModal(true)}
                                disabled={!selectedItem}
                            >
                                <Text style={styles.rowLabel}>Category</Text>
                                <View style={styles.rowValueContainer}>
                                    <Text style={[styles.rowValue, !selectedItem && { color: '#666' }]} numberOfLines={1}>
                                        {selectedCategory ? selectedCategory.name : 'Choose Category'}
                                    </Text>
                                    <Ionicons name="chevron-forward" size={20} color="#bdc3c7" style={{ marginLeft: 4 }} />
                                </View>
                            </TouchableOpacity>

                            <View style={styles.inputRow}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Title"
                                    placeholderTextColor="#666"
                                    value={title}
                                    onChangeText={setTitle}
                                />
                            </View>

                            <View style={[styles.inputRow, styles.lastRow]}>
                                <TextInput
                                    style={[styles.textInput, styles.textArea]}
                                    placeholder="Description (Optional)"
                                    placeholderTextColor="#666"
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                    textAlignVertical="top"
                                />
                            </View>
                        </View>
                    </View>

                    {/* SECTION 3: MEDIA */}
                    <Text style={styles.sectionHeader}>MEDIA</Text>
                    <View style={styles.sectionContainer}>
                        <View style={styles.glassCard}>
                            <TouchableOpacity style={styles.row} onPress={handleVideoPick}>
                                <View style={styles.rowIconLabel}>
                                    <View style={[styles.iconContainer, { backgroundColor: 'rgba(52, 152, 219, 0.2)' }]}>
                                        <Ionicons name="videocam" size={20} color="#3498db" />
                                    </View>
                                    <Text style={styles.rowLabel}>Video</Text>
                                </View>
                                <View style={styles.rowValueContainer}>
                                    <Text style={[styles.rowValue, videoFile ? { color: '#2ecc71' } : {}]} numberOfLines={1}>
                                        {videoFile ? videoFile.name : 'Required'}
                                    </Text>
                                    <Ionicons name="chevron-forward" size={20} color="#bdc3c7" style={{ marginLeft: 4 }} />
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.row, styles.lastRow]} onPress={handleThumbnailPick}>
                                <View style={styles.rowIconLabel}>
                                    <View style={[styles.iconContainer, { backgroundColor: 'rgba(243, 156, 18, 0.2)' }]}>
                                        <Ionicons name="image" size={20} color="#f39c12" />
                                    </View>
                                    <Text style={styles.rowLabel}>Thumbnail</Text>
                                </View>
                                <View style={styles.rowValueContainer}>
                                    <Text style={[styles.rowValue, thumbnail ? { color: '#2ecc71' } : {}]} numberOfLines={1}>
                                        {thumbnail ? 'Selected' : 'Optional'}
                                    </Text>
                                    <Ionicons name="chevron-forward" size={20} color="#bdc3c7" style={{ marginLeft: 4 }} />
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Thumbnail Preview */}
                        {thumbnail && (
                            <View style={[styles.glassCard, styles.previewContainer]}>
                                <Image source={{ uri: thumbnail.uri }} style={styles.thumbnailPreview} />
                            </View>
                        )}
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Sticky Footer */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.uploadBtn, loading && styles.uploadBtnDisabled]}
                    onPress={handleUpload}
                    disabled={loading}
                >
                    <LinearGradient
                        colors={['#3498db', '#2980b9']}
                        style={styles.gradient}
                    >
                        {loading ? (
                            <Text style={styles.uploadBtnText}>Uploading {Math.round(uploadProgress)}%...</Text>
                        ) : (
                            <Text style={styles.uploadBtnText}>Upload Video</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* ---- MODALS ---- */}

            {/* Context Modal */}
            <Modal visible={showContextModal} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select {isIntakeUpload ? 'Intake' : 'Class'}</Text>
                        <TouchableOpacity onPress={() => setShowContextModal(false)}>
                            <Text style={styles.modalCloseText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={items}
                        renderItem={renderSelectionItem}
                        keyExtractor={item => item.id.toString()}
                        contentContainerStyle={styles.modalList}
                    />
                </View>
            </Modal>

            {/* Category Modal */}
            <Modal visible={showCategoryModal} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => {
                            setShowCategoryModal(false);
                            setTimeout(() => setShowNewCategoryModal(true), 300);
                        }}>
                            <Ionicons name="add" size={28} color="#0A84FF" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Select Category</Text>
                        <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                            <Text style={styles.modalCloseText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={categories}
                        renderItem={renderCategoryItem}
                        keyExtractor={item => item.id.toString()}
                        contentContainerStyle={styles.modalList}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No categories found.</Text>
                                <TouchableOpacity onPress={() => {
                                    setShowCategoryModal(false);
                                    setTimeout(() => setShowNewCategoryModal(true), 300);
                                }}>
                                    <Text style={styles.emptyAction}>Create New Category</Text>
                                </TouchableOpacity>
                            </View>
                        }
                    />
                </View>
            </Modal>

            {/* New Category Modal */}
            <Modal visible={showNewCategoryModal} animationType="fade" transparent>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.alertBackdrop}>
                        {/* Using a Gradient Border wrapper or similiar effect */}
                        <LinearGradient
                            colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                            style={styles.premiumAlertWrapper}
                        >
                            <View style={styles.premiumAlertContent}>
                                <View style={styles.alertHeader}>
                                    <Text style={styles.alertTitle}>New Category</Text>
                                    <Text style={styles.alertMessage}>Create a new category for your videos.</Text>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>NAME</Text>
                                    <TextInput
                                        style={styles.premiumInput}
                                        placeholder="e.g. Tutorial Series 1"
                                        placeholderTextColor="#666"
                                        value={newCategoryName}
                                        onChangeText={setNewCategoryName}
                                        autoFocus
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>DESCRIPTION</Text>
                                    <TextInput
                                        style={styles.premiumInput}
                                        placeholder="Optional description..."
                                        placeholderTextColor="#666"
                                        value={newCategoryDescription}
                                        onChangeText={setNewCategoryDescription}
                                    />
                                </View>

                                <View style={styles.alertActions}>
                                    <TouchableOpacity
                                        style={styles.alertBtn}
                                        onPress={() => setShowNewCategoryModal(false)}
                                    >
                                        <Text style={styles.alertBtnCancel}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.alertBtn, styles.alertBtnBorder]}
                                        onPress={handleCreateCategory}
                                        disabled={creatingCategory}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            {creatingCategory && <ActivityIndicator size="small" color="#3498db" style={{ marginRight: 8 }} />}
                                            <Text style={styles.alertBtnCreate}>Create</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </LinearGradient>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: 20,
    },
    glassBackButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    headerTitle: {
        color: '#ecf0f1',
        fontSize: 18,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    scrollContent: {
        paddingTop: 10,
    },
    sectionContainer: {
        marginBottom: 32, // Increased spacing
    },
    sectionHeader: {
        color: '#bdc3c7',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 12,
        marginLeft: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    // Glass Cards
    glassCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20, // More rounded
        marginHorizontal: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    inputRow: {
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    lastRow: {
        borderBottomWidth: 0,
    },
    rowLabel: {
        color: '#ecf0f1',
        fontSize: 16,
        fontWeight: '500',
    },
    rowValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'flex-end',
        marginLeft: 16,
    },
    rowValue: {
        color: '#bdc3c7',
        fontSize: 16,
        textAlign: 'right',
    },
    rowIconLabel: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    // Segmented Control
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        marginHorizontal: 16,
        marginBottom: 24,
        borderRadius: 16,
        padding: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
    },
    segmentBtnActive: {
        backgroundColor: 'rgba(52, 152, 219, 0.2)', // Blue tint
        borderWidth: 1,
        borderColor: 'rgba(52, 152, 219, 0.3)',
    },
    segmentText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#bdc3c7',
    },
    segmentTextActive: {
        fontWeight: '600',
        color: '#3498db',
    },
    // Inputs
    textInput: {
        color: '#ecf0f1',
        fontSize: 16,
        paddingVertical: 16,
        height: 54,
    },
    textArea: {
        height: 100,
        paddingTop: 16,
    },
    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    uploadBtn: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#3498db',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    uploadBtnDisabled: {
        opacity: 0.5,
    },
    gradient: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    previewContainer: {
        marginTop: 16,
        height: 200,
    },
    thumbnailPreview: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#1a1a1a', // Keep dark for modal
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        backgroundColor: '#1a1a1a',
    },
    modalTitle: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
    },
    modalCloseText: {
        color: '#0A84FF',
        fontSize: 17,
        fontWeight: '600',
    },
    modalList: {
        paddingVertical: 20,
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    modalItemText: {
        color: '#fff',
        fontSize: 17,
    },
    modalItemTextSelected: {
        color: '#0A84FF',
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        color: '#8E8E93',
        marginBottom: 16,
    },
    emptyAction: {
        color: '#0A84FF',
        fontSize: 17,
    },
    // Premium Glass Alert
    alertBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 150, // Raise the modal higher
    },
    premiumAlertWrapper: {
        width: '85%',
        borderRadius: 24,
        padding: 1, // Border width
    },
    premiumAlertContent: {
        backgroundColor: '#1e1e1e',
        borderRadius: 24,
        paddingTop: 24,
        overflow: 'hidden',
    },
    alertHeader: {
        alignItems: 'center',
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    alertTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
    },
    alertMessage: {
        color: '#bdc3c7',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    inputGroup: {
        marginBottom: 16,
        paddingHorizontal: 20,
    },
    inputLabel: {
        color: '#666',
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 8,
        letterSpacing: 1,
    },
    premiumInput: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        color: '#fff',
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    alertActions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        marginTop: 8,
    },
    alertBtn: {
        flex: 1,
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    alertBtnBorder: {
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(255,255,255,0.1)',
    },
    alertBtnCancel: {
        color: '#bdc3c7',
        fontSize: 16,
        fontWeight: '600',
    },
    alertBtnCreate: {
        color: '#3498db',
        fontSize: 16,
        fontWeight: '700',
    },
});
