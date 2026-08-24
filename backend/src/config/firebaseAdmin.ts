import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let firebaseApp: App | null = null;
let firebaseMessagingInstance: Messaging | null = null;

try {
  let serviceAccount: any = null;

  // 1. Try from environment variable JSON string
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch {
      // Try base64 decoding if encoded
      try {
        const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8');
        serviceAccount = JSON.parse(decoded);
      } catch {}
    }
  }

  // 2. Try from separate environment variables
  if (!serviceAccount && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    serviceAccount = {
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  // 3. Try from local JSON file
  if (!serviceAccount) {
    const serviceAccountPath = join(__dirname, 'firebaseServiceAccount.json');
    if (existsSync(serviceAccountPath)) {
      serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    }
  }

  if (serviceAccount) {
    if (!getApps().length) {
      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || 'hostix-mobile',
      });
    } else {
      firebaseApp = getApps()[0];
    }
    firebaseMessagingInstance = getMessaging(firebaseApp);
    console.log('✅ Firebase Admin SDK initialized successfully for project:', serviceAccount.project_id);
  } else {
    console.warn('⚠️ Firebase credentials not found in env or file. Firebase direct push messaging will be disabled.');
  }
} catch (error: any) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', error?.message || error);
}

export const isFirebaseReady = () => Boolean(firebaseMessagingInstance);
export const firebaseMessaging = firebaseMessagingInstance;
export { firebaseApp };
