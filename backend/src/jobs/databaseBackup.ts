import cron from 'node-cron';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Runs a full database backup and saves it as a compressed/dated .sql file.
 * Automatically retains the last 30 days of backups and deletes older ones.
 */
export const runDatabaseBackupNow = async (): Promise<string | null> => {
  try {
    const backupDir = path.resolve('backups', 'database');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const dbName = process.env.DB_NAME || 'Hostel';
    const dbUser = process.env.DB_USER || 'root';
    const dbPass = process.env.DB_PASSWORD ? `-p"${process.env.DB_PASSWORD}"` : '';
    const dbHost = process.env.DB_HOST || '127.0.0.1';
    const dbPort = process.env.DB_PORT || '3306';

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_');
    const backupFileName = `hostel_backup_${timestamp}.sql`;
    const backupFilePath = path.join(backupDir, backupFileName);

    // Run mysqldump command
    const cmd = `mysqldump -h ${dbHost} -P ${dbPort} -u ${dbUser} ${dbPass} ${dbName} > "${backupFilePath}"`;
    await execAsync(cmd);

    console.log(`[Backup Job] ✅ Database backup created successfully: ${backupFilePath}`);

    // Auto-clean backups older than 30 days
    const files = fs.readdirSync(backupDir);
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    for (const file of files) {
      if (file.endsWith('.sql') || file.endsWith('.sql.gz')) {
        const fullPath = path.join(backupDir, file);
        const stats = fs.statSync(fullPath);
        if (stats.mtimeMs < thirtyDaysAgo) {
          fs.unlinkSync(fullPath);
          console.log(`[Backup Job] 🗑️ Cleaned up old backup: ${file}`);
        }
      }
    }

    return backupFilePath;
  } catch (error: any) {
    console.error('[Backup Job] ❌ Failed to create database backup:', error?.message || error);
    return null;
  }
};

/**
 * Starts the daily automated database backup job (Runs every night at 2:00 AM).
 */
export const startDatabaseBackupJob = () => {
  // Run every night at 2:00 AM ('0 2 * * *')
  cron.schedule('0 2 * * *', async () => {
    console.log('🔄 [Cron] Starting scheduled daily database backup...');
    await runDatabaseBackupNow();
  });

  console.log('📅 [Cron] Database automated backup job scheduled (Daily at 02:00 AM).');
};
