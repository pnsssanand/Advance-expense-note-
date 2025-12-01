const CLOUD_NAME = 'dlvjvskje';
const UPLOAD_PRESET = 'theadvanceexpensenote';

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  resource_type: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
}

export async function uploadToCloudinary(file: File): Promise<string> {
  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error('File size exceeds 10MB limit');
  }

  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only images and videos are allowed.');
  }

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const data: CloudinaryUploadResponse = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload file. Please try again.');
  }
}

export function getCloudinaryThumbnail(url: string, width: number = 200): string {
  // Transform Cloudinary URL to get thumbnail
  if (!url.includes('cloudinary.com')) return url;
  
  const parts = url.split('/upload/');
  if (parts.length !== 2) return url;
  
  return `${parts[0]}/upload/w_${width},c_fill,q_auto,f_auto/${parts[1]}`;
}
