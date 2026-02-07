import api, { getVideosUrl } from '../config/api';

export interface VideoCategory {
  id: number;
  name: string;
  description: string;
  videos_count: number;
  class_obj?: number | null;
  intake?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ClassVideo {
  id: number;
  title: string;
  description: string;
  video_file?: any;
  thumbnail?: any;
  category: number;
  category_name: string;
  class_obj?: number | null;
  class_name?: string | null;
  intake?: number | null;
  intake_name?: string | null;
  uploaded_by: number;
  uploaded_by_name: string;
  file_size: number;
  file_size_mb: number;
  duration?: string;
  view_count: number;
  video_url?: string;
  thumbnail_url?: string;
  is_active: boolean;
  insights?: string;
  unique_viewers_count?: number;
  created_at: string;
  updated_at: string;
}

export interface VideoUploadData {
  title: string;
  description: string;
  category: number;
  video_file: any;
  thumbnail?: any;
  class_id?: number;
  intake_id?: number;
}

export interface VideoAnalytics {
  total_views: number;
  completed_views: number;
  unique_viewers: number;
  completion_rate: number;
}

// Video Categories API
export const videoCategories = {
  // Get all categories for a class
  list: async (classId: number): Promise<VideoCategory[]> => {
    const response = await api.get(getVideosUrl(`lecturer/classes/${classId}/categories/`));
    return response.data;
  },

  // Create new category
  create: async (classId: number, data: { name: string; description: string }): Promise<VideoCategory> => {
    const response = await api.post(getVideosUrl(`lecturer/classes/${classId}/categories/`), data);
    return response.data;
  },

  // Update category
  update: async (classId: number, categoryId: number, data: { name: string; description: string }): Promise<VideoCategory> => {
    const response = await api.put(getVideosUrl(`lecturer/classes/${classId}/categories/${categoryId}/`), data);
    return response.data;
  },

  // Delete category
  delete: async (classId: number, categoryId: number): Promise<void> => {
    await api.delete(getVideosUrl(`lecturer/classes/${classId}/categories/${categoryId}/`));
  },

  // Get categories for an intake
  listForIntake: async (intakeId: number): Promise<VideoCategory[]> => {
    const response = await api.get(getVideosUrl(`lecturer/intakes/${intakeId}/categories/`));
    return response.data;
  },

  // Create new category for an intake
  createForIntake: async (intakeId: number, data: { name: string; description: string }): Promise<VideoCategory> => {
    const response = await api.post(getVideosUrl(`lecturer/intakes/${intakeId}/categories/`), data);
    return response.data;
  },
};

// Class Videos API
export const classVideos = {
  // Get all videos for a class
  list: async (classId: number, filters?: { category?: number; is_active?: boolean }): Promise<ClassVideo[]> => {
    let url = getVideosUrl(`lecturer/classes/${classId}/videos/`);
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category.toString());
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());

    const response = await api.get(url, { params: filters }); // Axios handles params object too, but explicit URLSearchParams is fine
    return response.data;
  },

  // Get all videos for an intake
  listForIntake: async (intakeId: number, filters?: { category?: number; is_active?: boolean }): Promise<ClassVideo[]> => {
    let url = getVideosUrl(`lecturer/intakes/${intakeId}/videos/`);
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category.toString());
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());

    const response = await api.get(url, { params: filters });
    return response.data;
  },


  // Get video details
  get: async (classId: number, videoId: number): Promise<ClassVideo> => {
    const response = await api.get(getVideosUrl(`lecturer/classes/${classId}/videos/${videoId}/`));
    return response.data;
  },

  // Get video details for an intake
  getForIntake: async (intakeId: number, videoId: number): Promise<ClassVideo> => {
    const response = await api.get(getVideosUrl(`lecturer/intakes/${intakeId}/videos/${videoId}/`));
    return response.data;
  },

  // Upload new video
  upload: async (classId: number, data: VideoUploadData, onProgress?: (progress: number) => void): Promise<ClassVideo> => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('category', data.category.toString());
    // @ts-ignore
    formData.append('video_file', {
      uri: data.video_file.uri,
      type: data.video_file.type || 'video/mp4',
      name: data.video_file.name || 'video.mp4',
    });

    if (data.thumbnail) {
      // @ts-ignore
      formData.append('thumbnail', {
        uri: data.thumbnail.uri,
        type: 'image/jpeg',
        name: 'thumbnail.jpg',
      });
    }

    const response = await api.post(getVideosUrl(`lecturer/classes/${classId}/videos/`), formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  },

  // Upload video to Intake
  uploadToIntake: async (intakeId: number, data: VideoUploadData, onProgress?: (progress: number) => void): Promise<ClassVideo> => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description || '');
    formData.append('category', data.category.toString());

    if (data.video_file) {
      // @ts-ignore
      formData.append('video_file', {
        uri: data.video_file.uri,
        type: data.video_file.type || 'video/mp4',
        name: data.video_file.name || 'video.mp4',
      });
    }

    if (data.thumbnail) {
      // @ts-ignore
      formData.append('thumbnail', {
        uri: data.thumbnail.uri,
        type: 'image/jpeg',
        name: 'thumbnail.jpg',
      });
    }

    const response = await api.post(getVideosUrl(`lecturer/intakes/${intakeId}/videos/`), formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  },

  // Update video (including insights)
  update: async (classId: number, videoId: number, data: Partial<ClassVideo>): Promise<ClassVideo> => {
    const response = await api.patch(getVideosUrl(`lecturer/classes/${classId}/videos/${videoId}/`), data);
    return response.data;
  },

  // Update video for Intake (including insights)
  updateForIntake: async (intakeId: number, videoId: number, data: Partial<ClassVideo>): Promise<ClassVideo> => {
    const response = await api.patch(getVideosUrl(`lecturer/intakes/${intakeId}/videos/${videoId}/`), data);
    return response.data;
  },

  // Delete video
  delete: async (classId: number, videoId: number): Promise<void> => {
    await api.delete(getVideosUrl(`lecturer/classes/${classId}/videos/${videoId}/`));
  },

  // Toggle video active status
  toggleActive: async (classId: number, videoId: number): Promise<{ message: string; video: ClassVideo }> => {
    const response = await api.post(getVideosUrl(`lecturer/classes/${classId}/videos/${videoId}/toggle_active/`));
    return response.data;
  },

  // Get video analytics
  getAnalytics: async (classId: number, videoId: number): Promise<VideoAnalytics> => {
    const response = await api.get(getVideosUrl(`lecturer/classes/${classId}/videos/${videoId}/analytics/`));
    return response.data;
  },
};