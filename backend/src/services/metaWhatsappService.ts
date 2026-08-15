import axios from 'axios';
import db from '../config/database.js';

interface TemplateComponentParameter {
  type: 'text' | 'image' | 'document';
  text?: string;
  image?: { link: string };
  document?: { link: string; filename: string };
}

interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  sub_type?: string;
  index?: string;
  parameters: TemplateComponentParameter[];
}

export interface SendWhatsAppMessagePayload {
  studentId: number;
  phoneNumber: string;
  studentName: string;
  templateName: string;
  languageCode?: string;
  parameters: {
    studentName?: string;
    amount?: string | number;
    dueDate?: string;
    hostelName?: string;
    roomNumber?: string;
    status?: string;
    customMessage?: string;
  };
}

export interface WhatsAppSendResult {
  studentId: number;
  studentName: string;
  phoneNumber: string;
  status: 'SENT' | 'FAILED';
  messageId?: string;
  error?: string;
  sentAt: string;
}

class MetaWhatsAppService {
  private get credentials() {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const version = process.env.WHATSAPP_API_VERSION || 'v18.0';

    return { token, phoneId, version };
  }

  /**
   * Format 10-digit Indian phone numbers to E.164 standard without '+' prefix (e.g. 919876543210)
   */
  private formatPhoneNumber(phone: string): string {
    const clean = phone.replace(/\D/g, '');
    const tenDigit = clean.slice(-10);
    if (tenDigit.length !== 10) {
      throw new Error(`Invalid phone number: ${phone}`);
    }
    return `91${tenDigit}`;
  }

  /**
   * Ensure database table for tracking WhatsApp logs exists
   */
  public async ensureLogTableExists(): Promise<void> {
    try {
      const exists = await db.schema.hasTable('whatsapp_message_logs');
      if (!exists) {
        await db.schema.createTable('whatsapp_message_logs', (table) => {
          table.increments('id').primary();
          table.integer('student_id').nullable();
          table.string('phone_number', 20).notNullable();
          table.string('template_name', 100).notNullable();
          table.string('message_id', 255).nullable();
          table.enum('status', ['SENT', 'FAILED']).notNullable();
          table.text('error_message').nullable();
          table.json('payload').nullable();
          table.timestamp('sent_at').defaultTo(db.fn.now());
        });
        console.log('✅ Created whatsapp_message_logs table');
      }
    } catch (err) {
      console.error('Error ensuring whatsapp_message_logs table:', err);
    }
  }

  /**
   * Send Meta WhatsApp Cloud API Template Message to a single recipient
   */
  public async sendMessage(payload: SendWhatsAppMessagePayload): Promise<WhatsAppSendResult> {
    const { token, phoneId, version } = this.credentials;
    const sentAt = new Date().toISOString();

    if (!token || !phoneId) {
      const errorMsg = 'Meta WhatsApp API Credentials missing in server environment variables (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID)';
      await this.logToDatabase({
        studentId: payload.studentId,
        phoneNumber: payload.phoneNumber,
        templateName: payload.templateName,
        status: 'FAILED',
        error: errorMsg,
        payload
      });
      return {
        studentId: payload.studentId,
        studentName: payload.studentName,
        phoneNumber: payload.phoneNumber,
        status: 'FAILED',
        error: errorMsg,
        sentAt
      };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(payload.phoneNumber);
      const language = payload.languageCode || 'en_US';

      // Build parameters based on template requirements
      const bodyParameters: TemplateComponentParameter[] = [];

      if (payload.templateName === 'fee_reminder') {
        // Parameters: 1: Student Name, 2: Amount, 3: Due Date, 4: Hostel Name
        bodyParameters.push({ type: 'text', text: payload.parameters.studentName || payload.studentName });
        bodyParameters.push({ type: 'text', text: String(payload.parameters.amount || '0') });
        bodyParameters.push({ type: 'text', text: payload.parameters.dueDate || 'Today' });
        bodyParameters.push({ type: 'text', text: payload.parameters.hostelName || 'Tenet Hostel' });
      } else if (payload.templateName === 'welcome_notice') {
        // Parameters: 1: Student Name, 2: Room Number, 3: Hostel Name
        bodyParameters.push({ type: 'text', text: payload.parameters.studentName || payload.studentName });
        bodyParameters.push({ type: 'text', text: String(payload.parameters.roomNumber || 'N/A') });
        bodyParameters.push({ type: 'text', text: payload.parameters.hostelName || 'Tenet Hostel' });
      } else if (payload.templateName === 'kyc_reminder') {
        // Parameters: 1: Student Name, 2: Hostel Name
        bodyParameters.push({ type: 'text', text: payload.parameters.studentName || payload.studentName });
        bodyParameters.push({ type: 'text', text: payload.parameters.hostelName || 'Tenet Hostel' });
      } else {
        // Default generic template parameters
        if (payload.parameters.studentName) bodyParameters.push({ type: 'text', text: payload.parameters.studentName });
        if (payload.parameters.amount) bodyParameters.push({ type: 'text', text: String(payload.parameters.amount) });
        if (payload.parameters.hostelName) bodyParameters.push({ type: 'text', text: payload.parameters.hostelName });
      }

      const components: TemplateComponent[] = [];
      if (bodyParameters.length > 0) {
        components.push({
          type: 'body',
          parameters: bodyParameters
        });
      }

      const metaUrl = `https://graph.facebook.com/${version}/${phoneId}/messages`;
      const metaPayload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: payload.templateName,
          language: { code: language },
          components
        }
      };

      const response = await axios.post(metaUrl, metaPayload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      const messageId = response.data?.messages?.[0]?.id || 'WAMID_SUCCESS';

      await this.logToDatabase({
        studentId: payload.studentId,
        phoneNumber: formattedPhone,
        templateName: payload.templateName,
        messageId,
        status: 'SENT',
        payload
      });

      return {
        studentId: payload.studentId,
        studentName: payload.studentName,
        phoneNumber: formattedPhone,
        status: 'SENT',
        messageId,
        sentAt
      };
    } catch (error: any) {
      const errorDetails = error.response?.data?.error?.message || error?.message || 'Meta API Connection Error';
      console.error(`❌ Meta WhatsApp API Error for Student ${payload.studentId}:`, errorDetails);

      await this.logToDatabase({
        studentId: payload.studentId,
        phoneNumber: payload.phoneNumber,
        templateName: payload.templateName,
        status: 'FAILED',
        error: errorDetails,
        payload
      });

      return {
        studentId: payload.studentId,
        studentName: payload.studentName,
        phoneNumber: payload.phoneNumber,
        status: 'FAILED',
        error: errorDetails,
        sentAt
      };
    }
  }

  /**
   * Log transaction to database
   */
  private async logToDatabase(data: {
    studentId?: number;
    phoneNumber: string;
    templateName: string;
    messageId?: string;
    status: 'SENT' | 'FAILED';
    error?: string;
    payload?: any;
  }) {
    try {
      await this.ensureLogTableExists();
      await db('whatsapp_message_logs').insert({
        student_id: data.studentId || null,
        phone_number: data.phoneNumber,
        template_name: data.templateName,
        message_id: data.messageId || null,
        status: data.status,
        error_message: data.error || null,
        payload: JSON.stringify(data.payload || {}),
        sent_at: new Date()
      });
    } catch (err) {
      console.error('Failed to log WhatsApp transaction to DB:', err);
    }
  }
}

export const metaWhatsAppService = new MetaWhatsAppService();
