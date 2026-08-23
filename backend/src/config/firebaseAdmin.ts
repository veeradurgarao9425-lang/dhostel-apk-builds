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
  const serviceAccountPath = join(__dirname, 'firebaseServiceAccount.json');
  if (existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    
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
    console.warn('⚠️ firebaseServiceAccount.json not found. Firebase direct push messaging will be disabled.');
  }
} catch (error: any) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', error?.message || error);
}

export const isFirebaseReady = () => Boolean(firebaseMessagingInstance);
export const firebaseMessaging = firebaseMessagingInstance;
export { firebaseApp };
