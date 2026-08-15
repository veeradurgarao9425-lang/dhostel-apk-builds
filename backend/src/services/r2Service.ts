import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '542b16605d0389dfcb4f6df0535001e2';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '30e79e7816b9dbcac874bf81f5c01a23';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '52d67eb0ea0f58c5cd9fca3c4108cfcab140c66f2fb76bf34fc1049e191686a0';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'hostix-media';
const R2_ENDPOINT = process.env.R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || 'http://143.244.131.69:8081/api/media';

export const s3Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload a file buffer to Cloudflare R2 bucket
 */
export async function uploadToR2(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
  folder: string = 'general'
): Promise<string> {
  const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `${cleanFolder}/${Date.now()}_${cleanFileName}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  // Return public accessibility URL via backend media proxy
  const publicUrl = `${R2_PUBLIC_DOMAIN.replace(/\/+$/, '')}/${key}`;

  console.log(`[R2 Service] Successfully uploaded file to Cloudflare R2: ${publicUrl}`);
  return publicUrl;
}

/**
 * Stream an object directly from Cloudflare R2 to HTTP Response
 */
export async function streamFromR2(key: string, res: any): Promise<boolean> {
  try {
    const cleanKey = key.replace(/^\/+/, '');
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: cleanKey,
    });

    const response = await s3Client.send(command);
    if (response.ContentType) {
      res.setHeader('Content-Type', response.ContentType);
    }
    if (response.ContentLength) {
      res.setHeader('Content-Length', response.ContentLength);
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    const stream = response.Body as any;
    if (stream && typeof stream.pipe === 'function') {
      stream.pipe(res);
      return true;
    }
    return false;
  } catch (error: any) {
    console.error(`[R2 Service] Stream error for key "${key}":`, error.message);
    return false;
  }
}

/**
 * Delete an object from Cloudflare R2 bucket
 */
export async function deleteFromR2(fileUrl: string): Promise<boolean> {
  try {
    const urlParts = fileUrl.split(`${R2_BUCKET_NAME}/`);
    if (urlParts.length < 2) return false;

    const key = urlParts[1];
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    console.log(`[R2 Service] Successfully deleted object from R2: ${key}`);
    return true;
  } catch (error: any) {
    console.error('[R2 Service] Delete object error:', error.message);
    return false;
  }
}
