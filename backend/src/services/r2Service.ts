import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const R2_ACCOUNT_ID = (process.env.R2_ACCOUNT_ID || '').trim();
const R2_ACCESS_KEY_ID = (process.env.R2_ACCESS_KEY_ID || '').trim();
const R2_SECRET_ACCESS_KEY = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
const R2_BUCKET_NAME = (process.env.R2_BUCKET_NAME || 'hostix-media').trim();
const R2_ENDPOINT = (process.env.R2_ENDPOINT || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '')).trim();
const R2_PUBLIC_DOMAIN = (process.env.R2_PUBLIC_DOMAIN || '').trim();

const isR2Configured = Boolean(R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_ENDPOINT);

export const s3Client = isR2Configured
  ? new S3Client({
      region: 'auto',
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })
  : null;

/**
 * Upload a file buffer to Cloudflare R2 bucket
 */
export async function uploadToR2(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
  folder: string = 'general'
): Promise<string> {
  if (!s3Client || !isR2Configured) {
    throw new Error('Cloudflare R2 storage credentials are not configured in environment variables');
  }

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
  const baseDomain = R2_PUBLIC_DOMAIN ? R2_PUBLIC_DOMAIN.replace(/\/+$/, '') : '/api/media';
  const publicUrl = `${baseDomain}/${key}`;

  console.log(`[R2 Service] Successfully uploaded file to Cloudflare R2: ${publicUrl}`);
  return publicUrl;
}

/**
 * Stream an object directly from Cloudflare R2 to HTTP Response
 */
export async function streamFromR2(key: string, res: any): Promise<boolean> {
  if (!s3Client || !isR2Configured) {
    console.warn('[R2 Service] R2 credentials not configured for media streaming');
    return false;
  }

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
  if (!s3Client || !isR2Configured) {
    console.warn('[R2 Service] R2 credentials not configured for media deletion');
    return false;
  }

  try {
    let key = fileUrl;
    if (key.includes(`${R2_BUCKET_NAME}/`)) {
      key = key.split(`${R2_BUCKET_NAME}/`)[1];
    } else if (key.includes('/api/media/')) {
      key = key.split('/api/media/')[1];
    }
    key = key.replace(/^\/+/, '');

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


