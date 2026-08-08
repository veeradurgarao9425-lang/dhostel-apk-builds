import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';

class WhatsAppClientService {
  private client: any = null;
  private isReady: boolean = false;
  private qrCodeDataUrl: string | null = null;
  private isInitializing: boolean = false;

  constructor() {
    // Lazy initialization on first usage or startup
  }

  public init() {
    if (this.client || this.isInitializing) return;
    this.isInitializing = true;

    console.log('📱 Initializing 100% FREE Direct WhatsApp Service (whatsapp-web.js)...');

    try {
      this.client = new Client({
        authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        }
      });

      this.client.on('qr', async (qr: string) => {
        console.log('\n==================================================');
        console.log('📲 SCAN THIS QR CODE WITH YOUR HOSTEL WHATSAPP (Linked Devices):');
        qrcodeTerminal.generate(qr, { small: true });
        console.log('==================================================\n');

        try {
          this.qrCodeDataUrl = await QRCode.toDataURL(qr);
        } catch (err) {
          console.error('Failed to generate QR data URL:', err);
        }
      });

      this.client.on('ready', () => {
        this.isReady = true;
        this.qrCodeDataUrl = null;
        this.isInitializing = false;
        console.log('✅ DIRECT WHATSAPP BOT IS READY & LINKED SUCCESSFULLY!');
      });

      this.client.on('authenticated', () => {
        console.log('🔑 WhatsApp Client Authenticated.');
      });

      this.client.on('auth_failure', (msg: string) => {
        console.error('❌ WhatsApp Authentication Failure:', msg);
        this.isReady = false;
        this.isInitializing = false;
      });

      this.client.on('disconnected', (reason: string) => {
        console.warn('⚠️ WhatsApp Client Disconnected:', reason);
        this.isReady = false;
        this.qrCodeDataUrl = null;
        this.isInitializing = false;
        this.client = null;
      });

      this.client.initialize().catch((err: any) => {
        console.error('❌ Error launching WhatsApp Puppeteer client:', err?.message || err);
        this.isInitializing = false;
      });
    } catch (error) {
      console.error('❌ Failed to construct WhatsApp Client:', error);
      this.isInitializing = false;
    }
  }

  public getStatus() {
    return {
      isReady: this.isReady,
      isInitializing: this.isInitializing,
      qrCodeDataUrl: this.qrCodeDataUrl
    };
  }

  public async sendDirectMessage(phoneNumber: string, messageText: string): Promise<boolean> {
    if (!this.client || !this.isReady) {
      console.log('📱 Auto-initializing WhatsApp client...');
      this.init();
      throw new Error('WhatsApp service is connecting. Please scan the QR code if not already linked.');
    }

    // Clean phone number
    const cleanNum = phoneNumber.replace(/\D/g, '');
    const tenDigit = cleanNum.slice(-10);

    if (tenDigit.length !== 10) {
      throw new Error(`Invalid 10-digit mobile number: ${phoneNumber}`);
    }

    const chatId = `91${tenDigit}@c.us`;

    console.log(`💬 Sending direct WhatsApp message to ${chatId}...`);
    await this.client.sendMessage(chatId, messageText);
    console.log(`✅ Direct WhatsApp message sent to ${tenDigit}!`);
    return true;
  }
}

export const whatsappService = new WhatsAppClientService();
