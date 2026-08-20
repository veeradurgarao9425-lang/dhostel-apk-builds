/**
 * developerNotificationService
 *
 * Single entry point for "the platform owner needs to know about this" events —
 * a new owner signing up, a new hostel appearing, a platform instalment landing
 * or going overdue.
 *
 * It writes one row to `developer_notifications` (read by the in-app Developer
 * Notification Centre) and, when `email` is set, sends exactly ONE mail through
 * the existing `utils/email.ts` transporter. Callers must not also send their
 * own admin mail for the same event — that is what caused duplicates before.
 *
 * Every function swallows its own errors: a notification failing must never
 * fail the registration / payment request that triggered it.
 */
import db from '../config/database.js';
import { sendEmail } from '../utils/email.js';

export type DeveloperNotificationType =
  | 'NEW_OWNER'
  | 'NEW_HOSTEL'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_OVERDUE'
  | 'PAYMENT_DUE_SOON'
  | 'SYSTEM'
  | 'GENERAL';

export type DeveloperNotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

interface NotifyParams {
  type: DeveloperNotificationType;
  title: string;
  message?: string;
  priority?: DeveloperNotificationPriority;
  relatedEntity?: 'HOSTEL' | 'OWNER' | 'STUDENT' | 'BILLING' | 'EXPENSE' | 'SYSTEM';
  relatedEntityId?: string | number | null;
  metadata?: Record<string, any>;
  /** Rows to render as a "label: value" table in the email body. */
  emailRows?: Array<[string, string]>;
  /** Send an email to SUPER_ADMIN_EMAIL as well as the in-app row. */
  email?: boolean;
}

const superAdminEmail = () => process.env.SUPER_ADMIN_EMAIL || 'hostixhelp@gmail.com';

const ACCENT: Record<DeveloperNotificationType, string> = {
  NEW_OWNER: '#EA580C',
  NEW_HOSTEL: '#EA580C',
  PAYMENT_RECEIVED: '#059669',
  PAYMENT_OVERDUE: '#DC2626',
  PAYMENT_DUE_SOON: '#D97706',
  SYSTEM: '#2563EB',
  GENERAL: '#475569',
};

const escapeHtml = (value: string) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function buildEmailHtml(params: NotifyParams): string {
  const accent = ACCENT[params.type] || ACCENT.GENERAL;
  const rows = (params.emailRows || [])
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-size: 13px; width: 42%;">${escapeHtml(label)}</td>
          <td style="padding: 6px 0; color: #0F172A; font-size: 13px; font-weight: 700;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F1F5F9; margin: 0; padding: 24px;">
      <div style="max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border-radius: 14px; border: 1px solid #E2E8F0; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1F2A44 0%, #28364F 100%); padding: 22px 24px; border-bottom: 3px solid ${accent};">
          <p style="color: ${accent}; font-size: 11px; font-weight: 800; letter-spacing: 1px; margin: 0 0 4px 0;">HOSTIX PLATFORM ALERT</p>
          <h1 style="color: #FFFFFF; margin: 0; font-size: 18px; font-weight: 800;">${escapeHtml(params.title)}</h1>
        </div>
        <div style="padding: 22px 24px;">
          ${params.message ? `<p style="color: #475569; font-size: 14px; line-height: 22px; margin: 0 0 18px 0;">${escapeHtml(params.message)}</p>` : ''}
          ${rows ? `<table style="width: 100%; border-collapse: collapse; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 8px;">${rows}</table>` : ''}
        </div>
        <div style="background-color: #F1F5F9; padding: 12px 24px; text-align: center; border-top: 1px solid #E2E8F0;">
          <p style="color: #94A3B8; font-size: 11px; margin: 0;">Hostix Master Admin &bull; automated platform notification</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Record a developer notification (and optionally email it). Never throws.
 * Fire-and-forget from request handlers — do not await on the hot path.
 */
export async function notifyDeveloper(params: NotifyParams): Promise<void> {
  try {
    await db('developer_notifications').insert({
      type: params.type,
      title: params.title,
      message: params.message || null,
      priority: params.priority || 'NORMAL',
      related_entity: params.relatedEntity || null,
      related_entity_id:
        params.relatedEntityId === undefined || params.relatedEntityId === null
          ? null
          : String(params.relatedEntityId),
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      is_read: 0,
    });
  } catch (err: any) {
    console.error('[developerNotify] failed to persist notification:', err?.message);
  }

  if (!params.email) return;

  try {
    await sendEmail({
      to: superAdminEmail(),
      subject: `${params.title} — Hostix Platform`,
      html: buildEmailHtml(params),
      emailType: `DEV_${params.type}`,
    });
  } catch (err: any) {
    // SMTP is best-effort; the in-app row above is the durable record.
    console.error('[developerNotify] failed to send admin email:', err?.message);
  }
}

/** New hostel owner signed up (optionally with their first hostel). */
export function notifyNewOwnerRegistered(params: {
  userId: number;
  fullName: string;
  email: string;
  phone?: string | null;
  hostelName?: string | null;
  hostelId?: number | null;
  address?: string | null;
}): void {
  const when = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  void notifyDeveloper({
    type: 'NEW_OWNER',
    title: 'New Owner Registered',
    message: `${params.fullName} created a Hostix owner account${
      params.hostelName ? ` for "${params.hostelName}"` : ''
    }.`,
    priority: 'HIGH',
    relatedEntity: 'OWNER',
    relatedEntityId: params.userId,
    metadata: {
      owner_id: params.userId,
      hostel_id: params.hostelId ?? null,
      hostel_name: params.hostelName ?? null,
      email: params.email,
      phone: params.phone ?? null,
    },
    emailRows: [
      ['Owner', params.fullName],
      ['Email', params.email],
      ['Phone', params.phone || 'N/A'],
      ['Hostel', params.hostelName || 'Not created yet'],
      ['Address', params.address || 'N/A'],
      ['Registered', when],
    ],
    email: true,
  });
}

/** An existing owner added another hostel to the network. */
export function notifyNewHostelRegistered(params: {
  hostelId: number;
  hostelName: string;
  ownerId?: number | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  city?: string | null;
}): void {
  const when = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  void notifyDeveloper({
    type: 'NEW_HOSTEL',
    title: 'New Hostel Registered',
    message: `"${params.hostelName}" joined the network${
      params.ownerName ? ` under ${params.ownerName}` : ''
    }. Set its platform billing amount to start tracking revenue.`,
    priority: 'HIGH',
    relatedEntity: 'HOSTEL',
    relatedEntityId: params.hostelId,
    metadata: {
      hostel_id: params.hostelId,
      hostel_name: params.hostelName,
      owner_id: params.ownerId ?? null,
    },
    emailRows: [
      ['Hostel', params.hostelName],
      ['Owner', params.ownerName || 'N/A'],
      ['Owner Email', params.ownerEmail || 'N/A'],
      ['City', params.city || 'N/A'],
      ['Registered', when],
    ],
    email: true,
  });
}

export default { notifyDeveloper, notifyNewOwnerRegistered, notifyNewHostelRegistered };
