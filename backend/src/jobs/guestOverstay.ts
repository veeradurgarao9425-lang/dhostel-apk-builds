import cron from 'node-cron';
import db from '../config/database.js';
import { sendNotificationToHostelOwner } from '../utils/notification.js';

/**
 * Guest overstay handling.
 *
 * A guest pays for `days` nights starting at `check_in_date`. Their last paid day is
 * `check_out_date` (if set) otherwise `check_in_date + (days - 1)`. If they are still
 * marked as `staying` AFTER that day, they have overstayed and the owner is notified once.
 *
 * Schema: we add three columns to `guests` (idempotently, so it is safe to run on every
 * boot and on existing databases):
 *   - status           : 'staying' | 'checked_out'  (default 'staying')
 *   - checked_out_at    : DATE       (set when the owner checks the guest out)
 *   - overstay_notified : TINYINT(1) (1 once the owner has been told about the overstay)
 */

const addColumnIfMissing = async (table: string, column: string, definition: string) => {
  try {
    const exists = await db.raw(
      `SELECT COUNT(*) as count FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
      [table, column]
    );
    const count = exists?.[0]?.[0]?.count ?? 0;
    if (count === 0) {
      await db.raw(`ALTER TABLE ?? ADD COLUMN ${definition}`, [table]);
      console.log(`[guestOverstay] Added column ${table}.${column}`);
    }
  } catch (err: any) {
    if (err?.message?.includes('Duplicate column')) return; // already there, fine
    console.error(`[guestOverstay] Failed ensuring column ${table}.${column}:`, err?.message);
  }
};

export const ensureGuestSchema = async () => {
  await addColumnIfMissing('guests', 'status', `status VARCHAR(20) NOT NULL DEFAULT 'staying'`);
  await addColumnIfMissing('guests', 'checked_out_at', `checked_out_at DATE NULL`);
  await addColumnIfMissing('guests', 'overstay_notified', `overstay_notified TINYINT(1) NOT NULL DEFAULT 0`);
};

// Last paid day for a guest row (the date they are expected to leave by end of).
export const expectedLastDay = (guest: { check_in_date?: any; check_out_date?: any; days?: any }): Date | null => {
  if (guest.check_out_date) {
    const d = new Date(guest.check_out_date);
    d.setHours(0, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }
  if (!guest.check_in_date) return null;
  const start = new Date(guest.check_in_date);
  if (isNaN(start.getTime())) return null;
  const days = Math.max(1, Number(guest.days || 1));
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + (days - 1));
  return start;
};

// True if a guest who is still "staying" is now past their last paid day.
export const isOverstaying = (guest: any): boolean => {
  if ((guest.status || 'staying') !== 'staying') return false;
  const last = expectedLastDay(guest);
  if (!last) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today > last;
};

export const checkGuestOverstays = async () => {
  try {
    await ensureGuestSchema();

    // Only staying guests we haven't already notified about.
    const guests = await db('guests')
      .where('status', 'staying')
      .where('overstay_notified', 0);

    let notified = 0;
    for (const guest of guests) {
      if (!isOverstaying(guest)) continue;

      const last = expectedLastDay(guest);
      const lastStr = last ? last.toISOString().split('T')[0] : 'their booked date';

      await sendNotificationToHostelOwner(
        guest.hostel_id,
        'General',
        'Guest Overstay',
        `${guest.full_name || 'A guest'} was booked until ${lastStr} but is still checked in. Collect extra payment or check them out.`,
        'High',
        { guest_id: guest.guest_id }
      ).catch((err) => console.error('[guestOverstay] notify failed:', err?.message));

      await db('guests').where('guest_id', guest.guest_id).update({ overstay_notified: 1, updated_at: new Date() });
      notified++;
    }

    if (notified > 0) console.log(`[guestOverstay] Notified owners about ${notified} overstaying guest(s)`);
    return { success: true, notified };
  } catch (error: any) {
    console.error('[guestOverstay] Error:', error?.message);
    return { success: false, error: error?.message };
  }
};

export const startGuestOverstayJob = () => {
  // Run schema-ensure once at boot so the columns always exist.
  ensureGuestSchema().catch((e) => console.error('[guestOverstay] ensureGuestSchema failed:', e?.message));

  // Production: every day at 09:00. Development: every hour at minute 10.
  const pattern = process.env.NODE_ENV === 'production' ? '0 9 * * *' : '10 * * * *';
  const job = cron.schedule(pattern, () => {
    checkGuestOverstays().catch((e) => console.error('[guestOverstay] cron run failed:', e?.message));
  });

  console.log(`✓ Guest overstay job scheduled (${process.env.NODE_ENV === 'production' ? 'daily 09:00' : 'hourly :10'})`);
  return job;
};
