import dotenv from 'dotenv';
dotenv.config();

import db from '../src/config/database.js';
import { getFirebaseMessaging, isFirebaseReady } from '../src/config/firebaseAdmin.js';

async function main() {
  console.log('=== Checking Database Push Tokens ===');
  try {
    const tokens = await db('user_push_tokens').select('*').orderBy('updated_at', 'desc').limit(20);
    console.log(`Found ${tokens.length} token record(s) in user_push_tokens:`);
    tokens.forEach((t, i) => {
      console.log(`[#${i + 1}] UserID: ${t.user_id}, StudentID: ${t.student_id}, Platform: ${t.platform}, Device: ${t.device_name}, Updated: ${t.updated_at}`);
      console.log(`     Token: ${t.push_token}`);
    });

    console.log('\n=== Checking Firebase Admin Status ===');
    const isReady = isFirebaseReady();
    const messaging = getFirebaseMessaging();
    console.log(`Firebase Ready: ${isReady}, Messaging Instance: ${!!messaging}`);

    if (isReady && messaging && tokens.length > 0) {
      const fcmTokens = tokens
        .map(t => String(t.push_token).trim())
        .filter(t => !t.startsWith('ExponentPushToken[') && !t.startsWith('ExpoPushToken[') && t.length > 20);

      console.log(`\nTesting FCM Multicast send to ${fcmTokens.length} native token(s)...`);
      if (fcmTokens.length > 0) {
        const response = await messaging.sendEachForMulticast({
          tokens: fcmTokens,
          notification: {
            title: '🔥 Live FCM Test Alert',
            body: 'Hostix Firebase Push is working perfectly on your device!',
          },
          data: {
            screen: 'Notifications',
            test: 'true',
          },
          android: {
            priority: 'high',
            notification: {
              channelId: 'default',
              sound: 'default',
              priority: 'high',
              color: '#6D4AFF',
            },
          },
        });
        console.log(`\nResult: Success=${response.successCount}, Failure=${response.failureCount}`);
        response.responses.forEach((r, idx) => {
          if (r.success) {
            console.log(`✅ Token #${idx + 1} (${fcmTokens[idx].slice(0, 25)}...): Message ID = ${r.messageId}`);
          } else {
            console.log(`❌ Token #${idx + 1} (${fcmTokens[idx].slice(0, 25)}...): Error = ${r.error?.code} - ${r.error?.message}`);
          }
        });
      }
    }
  } catch (err: any) {
    console.error('Error:', err?.message || err);
  } finally {
    process.exit(0);
  }
}

main();
