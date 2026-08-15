import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '542b16605d0389dfcb4f6df0535001e2';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '30e79e7816b9dbcac874bf81f5c01a23';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '52d67eb0ea0f58c5cd9fca3c4108cfcab140c66f2fb76bf34fc1049e191686a0';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'hostix-media';
const R2_ENDPOINT = process.env.R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || `${R2_ENDPOINT}/${R2_BUCKET_NAME}`;

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

  // Return public accessibility URL
  const publicUrl = process.env.R2_PUBLIC_DOMAIN
    ? `${process.env.R2_PUBLIC_DOMAIN.replace(/\/+$/, '')}/${key}`
    : `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`;

  console.log(`[R2 Service] Successfully uploaded file to Cloudflare R2: ${publicUrl}`);
  return publicUrl;
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
