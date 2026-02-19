import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { appEventEmitter } from '../utils/eventEmitter';
import { API_CONFIG } from '../config/api';

interface ProfilePictureProps {
  imageUrl?: string | null;
  firstName?: string;
  lastName?: string;
  size?: number;
  onPress?: () => void;
  showEditIcon?: boolean;
}

const ProfilePicture: React.FC<ProfilePictureProps> = ({
  imageUrl,
  firstName = '',
  lastName = '',
  size = 50,
  onPress,
  showEditIcon = false,
}) => {
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null | undefined>(imageUrl);
  const [key, setKey] = useState<number>(Date.now());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Update image URL when props change
  useEffect(() => {
    setCurrentImageUrl(imageUrl);
    setKey(Date.now());
    if (imageUrl && (imageUrl.startsWith('http') || imageUrl.startsWith('/media/'))) {
      setLoading(true);
      setError(false);
    } else {
      setLoading(false);
      setError(false);
    }
  }, [imageUrl]);

  // Listen for profile updates across the app
  useEffect(() => {
    const handleProfileUpdate = (updatedUserData: any) => {
      const newImageUrl = updatedUserData.profile_picture_url || null;
      if (newImageUrl !== currentImageUrl) {
        setCurrentImageUrl(newImageUrl);
        setKey(Date.now());
        if (newImageUrl) {
          setLoading(true);
          setError(false);
        }
      }
    };

    // Add event listener
    appEventEmitter.on('userProfileUpdated', handleProfileUpdate);

    // Cleanup
    return () => {
      appEventEmitter.off('userProfileUpdated', handleProfileUpdate);
    };
  }, [currentImageUrl]);

  const styles = StyleSheet.create({
    container: {
      position: 'relative',
      width: size,
      height: size,
    },
    image: {
      width: size,
      height: size,
      borderRadius: size / 2,
    },
    stockContainer: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: 'rgba(255, 255, 255, 0.1)', // Glass effect base
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      overflow: 'hidden',
    },
    editIcon: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: '#3498db',
      borderRadius: 12,
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#1a1a1a', // Match app background for "cutout" look
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: size / 2,
      backgroundColor: 'rgba(0,0,0,0.3)',
    }
  });

  // Check if we have a valid image URL
  const hasValidImageUrl = currentImageUrl &&
    typeof currentImageUrl === 'string' &&
    currentImageUrl.trim() !== '' &&
    (currentImageUrl.startsWith('http') || currentImageUrl.startsWith('/media/'));

  const renderContent = () => {
    // If we have a URL and it's not errored, try to show image
    if (hasValidImageUrl && !error) {
      return (
        <View style={styles.container}>
          {/* Show stock profile BEHIND image in case of loading frame delay/transparency */}
          <View style={[styles.stockContainer, StyleSheet.absoluteFill]}>
            <Ionicons name="person" size={size * 0.5} color="rgba(255, 255, 255, 0.3)" />
          </View>

          <Image
            key={key}
            source={{
              uri: hasValidImageUrl
                ? (currentImageUrl!.startsWith('http')
                  ? currentImageUrl!
                  : `${API_CONFIG.ROOT_URL}${currentImageUrl!.startsWith('/') ? '' : '/'}${currentImageUrl}`)
                : undefined
            }}
            style={styles.image}
            resizeMode="cover"
            onError={(e) => {
              console.log('ProfilePicture: Image loading error:', e.nativeEvent.error);
              setError(true);
              setLoading(false);
            }}
            onLoadEnd={() => setLoading(false)}
          />

          {/* Loading indicator overlay */}
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          )}
        </View>
      );
    }

    // Fallback: Stock Profile Picture (Glass Theme)
    return (
      <View style={styles.stockContainer}>
        <Ionicons name="person" size={size * 0.5} color="rgba(255, 255, 255, 0.5)" />
      </View>
    );
  };

  const content = (
    <View style={styles.container}>
      {renderContent()}
      {showEditIcon && (
        <View style={styles.editIcon}>
          <Ionicons name="camera" size={12} color="#fff" />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

export default ProfilePicture;