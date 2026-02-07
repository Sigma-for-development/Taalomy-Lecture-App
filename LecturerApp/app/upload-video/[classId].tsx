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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { videoCategories, classVideos, VideoCategory, VideoUploadData } from '@src/utils/videoApi';

export default function UploadVideoScreen() {
  const { classId } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    video_file: null as any,
    thumbnail: null as any,
  });

  // New category modal state
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const data = await videoCategories.list(Number(classId));
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
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/mp4', 'video/mov', 'video/avi', 'video/quicktime'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setFormData(prev => ({
          ...prev,
          video_file: {
            uri: asset.uri,
            type: asset.mimeType || 'video/mp4',
            name: asset.name || 'video.mp4',
            size: asset.size,
          }
        }));
      }
    } catch (error) {
      console.error('Error picking video:', error);
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
        setFormData(prev => ({
          ...prev,
          thumbnail: {
            uri: asset.uri,
            type: 'image/jpeg',
            name: 'thumbnail.jpg',
          }
        }));
      }
    } catch (error) {
      console.error('Error picking thumbnail:', error);
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
      const newCategory = await videoCategories.create(Number(classId), {
        name: newCategoryName,
        description: newCategoryDescription,
      });

      setCategories(prev => [...prev, newCategory]);
      setFormData(prev => ({ ...prev, category: newCategory.id.toString() }));
      setNewCategoryName('');
      setNewCategoryDescription('');
      setShowNewCategory(false);

      Alert.alert('Success', 'Category created successfully');
    } catch (error) {
      console.error('Error creating category:', error);
      Alert.alert('Error', 'Failed to create category');
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleUpload = async () => {
    // Validation
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a video title');
      return;
    }

    if (!formData.category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    if (!formData.video_file) {
      Alert.alert('Error', 'Please select a video file');
      return;
    }

    try {
      setLoading(true);

      const uploadData: VideoUploadData = {
        title: formData.title,
        description: formData.description,
        category: Number(formData.category),
        video_file: formData.video_file,
        thumbnail: formData.thumbnail,
      };

      await classVideos.upload(Number(classId), uploadData);

      Alert.alert(
        'Success',
        'Video uploaded successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error uploading video:', error);
      Alert.alert('Error', 'Failed to upload video. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingCategories) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Upload Video</Text>

        {/* Video Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Video Title *</Text>
          <TextInput
            style={styles.input}
            value={formData.title}
            onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
            placeholder="Enter video title"
            maxLength={200}
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            placeholder="Enter video description"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Category Selection */}
        <View style={styles.inputGroup}>
          <View style={styles.categoryHeader}>
            <Text style={styles.label}>Category *</Text>
            <TouchableOpacity
              style={styles.addCategoryButton}
              onPress={() => setShowNewCategory(!showNewCategory)}
            >
              <Ionicons name="add" size={20} color="#007AFF" />
              <Text style={styles.addCategoryText}>New Category</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              style={styles.picker}
            >
              <Picker.Item label="Select a category" value="" />
              {categories.map((category) => (
                <Picker.Item
                  key={category.id}
                  label={`${category.name} (${category.videos_count} videos)`}
                  value={category.id.toString()}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* New Category Form */}
        {showNewCategory && (
          <View style={styles.newCategoryForm}>
            <Text style={styles.sectionTitle}>Create New Category</Text>
            <TextInput
              style={styles.input}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="Category name"
              maxLength={100}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              value={newCategoryDescription}
              onChangeText={setNewCategoryDescription}
              placeholder="Category description (optional)"
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
            <View style={styles.categoryActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowNewCategory(false);
                  setNewCategoryName('');
                  setNewCategoryDescription('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateCategory}
                disabled={creatingCategory}
              >
                {creatingCategory ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.createButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Video File Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Video File *</Text>
          <TouchableOpacity style={styles.fileButton} onPress={handleVideoPick}>
            <Ionicons name="videocam" size={24} color="#007AFF" />
            <Text style={styles.fileButtonText}>
              {formData.video_file ? formData.video_file.name : 'Select Video File'}
            </Text>
          </TouchableOpacity>
          {formData.video_file && (
            <Text style={styles.fileInfo}>
              Size: {(formData.video_file.size / (1024 * 1024)).toFixed(2)} MB
            </Text>
          )}
        </View>

        {/* Thumbnail Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Thumbnail (Optional)</Text>
          <TouchableOpacity style={styles.fileButton} onPress={handleThumbnailPick}>
            <Ionicons name="image" size={24} color="#007AFF" />
            <Text style={styles.fileButtonText}>
              {formData.thumbnail ? 'Thumbnail Selected' : 'Select Thumbnail'}
            </Text>
          </TouchableOpacity>
          {formData.thumbnail && (
            <Image source={{ uri: formData.thumbnail.uri }} style={styles.thumbnailPreview} />
          )}
        </View>

        {/* Upload Button */}
        <TouchableOpacity
          style={[styles.uploadButton, loading && styles.uploadButtonDisabled]}
          onPress={handleUpload}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={24} color="white" />
              <Text style={styles.uploadButtonText}>Upload Video</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 100,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addCategoryText: {
    color: '#007AFF',
    marginStart: 4,
    fontSize: 14,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  picker: {
    height: 50,
  },
  newCategoryForm: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  categoryActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    minWidth: 60,
    alignItems: 'center',
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#f8f9ff',
  },
  fileButtonText: {
    marginStart: 12,
    fontSize: 16,
    color: '#007AFF',
  },
  fileInfo: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },
  thumbnailPreview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 8,
    resizeMode: 'cover',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  uploadButtonDisabled: {
    backgroundColor: '#ccc',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginStart: 8,
  },
});