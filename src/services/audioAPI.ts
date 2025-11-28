/**
 * Audio API Service
 * Handles uploading and deleting audio files via the backend
 */

// TODO: Replace with actual API base URL from env
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export const audioAPI = {
  /**
   * Upload an audio file to R2 via backend presigned URL or direct upload
   */
  async uploadAudio(file: File, lessonId: string, context: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('lessonId', lessonId);
    formData.append('context', context);

    // TODO: Add auth headers when auth is implemented
    const response = await fetch(`${API_BASE_URL}/v1/admin/content/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || `Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.url;
  },

  /**
   * Delete an audio file by URL (or key)
   */
  async deleteAudio(url: string): Promise<void> {
    // Extract key from URL if needed, or pass full URL
    // Assuming backend handles the parsing
    const response = await fetch(`${API_BASE_URL}/v1/admin/content/audio`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete audio');
    }
  }
};

