import fs from 'fs';
import { uploadToR2 } from '../services/r2Service.js';

/**
 * Upload a Multer file to Cloudflare R2 if configured, or return local relative path
 */
export async function processFileUpload(
  file: Express.Multer.File,
  folder: string = 'media'
): Promise<string> {
  if (!file) return '';

  try {
    // Read file buffer from disk if diskStorage was used
    let buffer: Buffer;
    if (file.buffer) {
      buffer = file.buffer;
    } else if (file.path && fs.existsSync(file.path)) {
      buffer = fs.readFileSync(file.path);
    } else {
      return `/uploads/${file.filename}`;
    }

    const contentType = file.mimetype || 'image/jpeg';
    const originalName = file.originalname || file.filename || 'image.jpg';

    // Upload directly to Cloudflare R2 bucket with 3.5s timeout fallback
    const uploadPromise = uploadToR2(buffer, originalName, contentType, folder);
    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('R2 upload timed out (3.5s limit)')), 3500)
    );

    const r2Url = await Promise.race([uploadPromise, timeoutPromise]);

    // Clean up local temp file asynchronously if created by Multer diskStorage
    if (file.path && fs.existsSync(file.path)) {
      fs.unlink(file.path, () => {});
    }

    return r2Url;
  } catch (error: any) {
    console.warn('[processFileUpload] Cloudflare R2 fallback to local upload:', error.message);
    return `/uploads/${file.filename || 'image.jpg'}`;
  }
}
