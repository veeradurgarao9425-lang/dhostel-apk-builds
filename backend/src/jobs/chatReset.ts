import cron from 'node-cron';
import db from '../config/database.js';
import fs from 'fs';
import path from 'path';

export const startChatResetJob = () => {
  // Run every Sunday at 12:00 AM ('0 0 * * 0')
  cron.schedule('0 0 * * 0', async () => {
    console.log('🔄 [Cron] Running Weekly Chat Reset...');
    
    try {
      // 1. Fetch all media URLs from messages before deleting
      const messagesWithMedia = await db('chat_messages')
        .whereNotNull('media_url')
        .select('media_url', 'thumbnail');

      // 2. Fetch all raw uploads before deleting
      const uploads = await db('chat_uploads').select('filename');

      // 3. Clear database tables
      await db('chat_reads').del();
      await db('chat_reactions').del();
      await db('chat_messages').del();
      await db('chat_uploads').del();

      console.log('✅ [Cron] Cleared chat database tables.');

      // 4. Delete physical files
      let deletedFiles = 0;
      const uploadDir = path.resolve('uploads', 'chat');

      // Delete from messages (just in case they point somewhere else or have thumbnails)
      for (const msg of messagesWithMedia) {
        if (msg.media_url) {
          const fileName = msg.media_url.split('/').pop();
          if (fileName) {
            const filePath = path.join(uploadDir, fileName);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              deletedFiles++;
            }
          }
        }
        if (msg.thumbnail) {
          const fileName = msg.thumbnail.split('/').pop();
          if (fileName) {
            const filePath = path.join(uploadDir, fileName);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              deletedFiles++;
            }
          }
        }
      }

      // Delete raw uploads directly from directory to catch orphans
      if (fs.existsSync(uploadDir)) {
        const files = fs.readdirSync(uploadDir);
        for (const file of files) {
          const filePath = path.join(uploadDir, file);
          fs.unlinkSync(filePath);
          deletedFiles++;
        }
      }

      console.log(`✅ [Cron] Deleted ${deletedFiles} chat media files.`);
      console.log('✅ [Cron] Weekly Chat Reset completed.');
    } catch (error) {
      console.error('❌ [Cron] Error during Weekly Chat Reset:', error);
    }
  });
};
