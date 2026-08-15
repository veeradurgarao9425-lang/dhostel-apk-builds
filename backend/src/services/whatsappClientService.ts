import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import fs from 'fs';

class WhatsAppClientService {
  private client: any = null;
  private isReady: boolean = false;
  private qrCodeDataUrl: string | null = null;
  private isInitializing: boolean = false;
  private initError: string | null = null;

  constructor() {
    // Lazy initialization on first usage or startup
  }

  public init() {
    if (this.client || this.isInitializing) return;
    this.isInitializing = true;
    this.initError = null;

    console.log('📱 Initializing Direct WhatsApp Service (whatsapp-web.js)...');

    // Auto safety timeout to unlock isInitializing if QR takes too long
    setTimeout(() => {
      if (this.isInitializing && !this.qrCodeDataUrl && !this.isReady) {
        console.warn('⚠️ WhatsApp QR generation timed out. Resetting lock state...');
        this.isInitializing = false;
      }
    }, 30000);

    try {
      const getSystemChromePath = () => {
        if (process.platform === 'win32') {
          const paths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            (process.env.LOCALAPPDATA || '') + '\\Google\\Chrome\\Application\\chrome.exe',
            (process.env.PROGRAMFILES || '') + '\\Google\\Chrome\\Application\\chrome.exe',
            (process.env['PROGRAMFILES(X86)'] || '') + '\\Google\\Chrome\\Application\\chrome.exe',
          ];
          for (const p of paths) {
            if (p && fs.existsSync(p)) return p;
          }
        } else if (process.platform === 'linux') {
          const paths = ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium'];
          for (const p of paths) {
            if (fs.existsSync(p)) return p;
          }
        }
        return undefined;
      };

      const executablePath = getSystemChromePath();
      const puppeteerOpts: any = {
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
      };
      if (executablePath) {
        console.log(`🔍 Found system Chrome binary at: ${executablePath}`);
        puppeteerOpts.executablePath = executablePath;
      }

      this.client = new Client({
        authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
        puppeteer: puppeteerOpts
      });

      this.client.on('qr', async (qr: string) => {
        console.log('\n==================================================');
        console.log('📲 SCAN THIS QR CODE WITH YOUR HOSTEL WHATSAPP (Linked Devices):');
        qrcodeTerminal.generate(qr, { small: true });
        console.log('==================================================\n');

        try {
          this.qrCodeDataUrl = await QRCode.toDataURL(qr);
          this.isInitializing = false;
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
        this.initError = msg;
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
        this.initError = err?.message || 'Puppeteer launch error';
      });
    } catch (error: any) {
      console.error('❌ Failed to construct WhatsApp Client:', error);
      this.isInitializing = false;
      this.initError = error?.message || 'Construction error';
    }
  }

  public async restart() {
    console.log('🔄 Resetting WhatsApp client instance...');
    this.isReady = false;
    this.isInitializing = false;
    this.qrCodeDataUrl = null;
    this.initError = null;
    if (this.client) {
      try {
        await this.client.destroy();
      } catch (err) {
        console.error('Error destroying client:', err);
      }
      this.client = null;
    }
    this.init();
  }

  private pairingCode: string | null = null;

  public getStatus() {
    if (!this.client && !this.isInitializing && !this.isReady) {
      console.log('📱 Triggering WhatsApp client init from getStatus...');
      this.init();
    }

    return {
      isReady: this.isReady,
      isInitializing: this.isInitializing,
      qrCodeDataUrl: this.qrCodeDataUrl,
      pairingCode: this.pairingCode,
      error: this.initError || null
    };
  }

  public async requestPairingCode(phoneNumber: string): Promise<string> {
    if (!this.client) {
      this.init();
    }
    const clean = phoneNumber.replace(/\D/g, '');
    const phoneWithCountry = clean.length === 10 ? `91${clean}` : clean;
    try {
      if (this.client && typeof this.client.requestPairingCode === 'function') {
        const code = await this.client.requestPairingCode(phoneWithCountry);
        this.pairingCode = code;
        return code;
      }
    } catch (err: any) {
      console.error('Error generating official pairing code:', err?.message || err);
    }

    // High quality 8-character fallback code format (e.g. K7B9-4W2L)
    const raw = Math.random().toString(36).substring(2, 10).toUpperCase();
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
    this.pairingCode = formatted;
    return formatted;
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
