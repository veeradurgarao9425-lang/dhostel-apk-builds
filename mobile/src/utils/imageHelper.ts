import { Platform } from 'react-native';

const API_FALLBACK_URL = 'http://143.244.131.69:8081';

/**
 * Resolves any raw photo/document URL to a fully-qualified, renderable URL.
 * Handles Cloudflare R2 URLs, local server uploads (/uploads/...), full URLs, and base64 strings.
 */
export function getResolvedImageUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const clean = rawUrl.trim();
  if (!clean) return null;

  // Data URLs or local file uris
  if (clean.startsWith('data:') || clean.startsWith('file://') || clean.startsWith('content://') || clean.startsWith('ph://')) {
    return clean;
  }

  // Cloudflare R2 hostix-media bucket mapping
  if (clean.includes('r2.cloudflarestorage.com/hostix-media/')) {
    const key = clean.split('hostix-media/')[1];
    return `${API_FALLBACK_URL}/api/media/${key}`;
  }

  // Full HTTP / HTTPS URLs
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }

  // Relative upload paths
  const cleanPath = clean.startsWith('/') ? clean : `/${clean}`;
  return `${API_FALLBACK_URL}${cleanPath}`;
}

/**
 * Helper to check if a URI is a local device file (ready to upload)
 */
export function isLocalDeviceUri(uri: string | null | undefined): boolean {
  if (!uri || typeof uri !== 'string') return false;
  const clean = uri.trim();
  if (!clean) return false;
  return (
    !clean.startsWith('http://') &&
    !clean.startsWith('https://') &&
    !clean.startsWith('/uploads') &&
    !clean.startsWith('uploads/')
  );
}

/**
 * Appends an image file to FormData for multipart upload with proper mime type & filename
 */
export function appendImageFileToFormData(
  formData: FormData,
  fieldName: string,
  uri: string,
  fallbackName = 'photo.jpg'
) {
  if (!uri || typeof uri !== 'string') return;
  const cleanUri = uri.trim();
  if (!cleanUri) return;

  let filename = cleanUri.split('/').pop() || fallbackName;
  filename = filename.split('?')[0];

  const match = /\.(\w+)$/.exec(filename);
  const ext = match ? match[1].toLowerCase() : 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const finalName = !/\.(jpg|jpeg|png|webp|gif)$/i.test(filename) ? `${filename}.${ext}` : filename;

  let finalUri = cleanUri;
  if (Platform.OS === 'android') {
    finalUri = cleanUri.startsWith('file://') || cleanUri.startsWith('content://') ? cleanUri : `file://${cleanUri}`;
  } else {
    finalUri = cleanUri.replace('file://', '');
  }

  formData.append(fieldName, {
    uri: finalUri,
    name: finalName,
    type: mimeType,
  } as any);
}
