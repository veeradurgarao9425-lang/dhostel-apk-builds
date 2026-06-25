import { Request, Response } from 'express';
import db from '../config/database.js';
import { hashPassword, comparePassword } from '../utils/bcrypt.js';
import { generateToken } from '../utils/jwt.js';
import { AuthRequest } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';
import { sendPasswordResetEmail, sendOtpEmail } from '../utils/email.js';

export const authController = {
  // Login
  async login(req: Request, res: Response) {
    try {
      const { identifier, password } = req.body;

      if (!identifier || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required',
        });
      }

      // Find user by email only
      const user = await db('users')
        .select(
          'users.user_id',
          'users.email',
          'users.password_hash',
          'users.full_name',
          'users.phone',
          'users.role_id',
          'users.hostel_id',
          'users.is_active',
          'user_roles.role_name'
        )
        .join('user_roles', 'users.role_id', 'user_roles.role_id')
        .where('users.email', identifier)
        .where('users.is_active', true)
        .first();

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Email is not registered.',
        });
      }

      // Verify password
      const isValidPassword = await comparePassword(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Incorrect password.',
        });
      }

      // Debug: Log hostel_id to verify it's being retrieved
      console.log(`Login - User ID: ${user.user_id}, Email: ${user.email}, Hostel ID: ${user.hostel_id}`);

      // Update last login
      await db('users')
        .where('user_id', user.user_id)
        .update({ last_login: db.fn.now() });

      // Generate token
      const token = generateToken({
        user_id: user.user_id,
        email: user.email,
        role_id: user.role_id,
        hostel_id: user.hostel_id, // Include hostel_id in JWT token
      });

      // Return response
      return res.json({
        success: true,
        data: {
          user: {
            user_id: user.user_id,
            email: user.email,
            full_name: user.full_name,
            role: user.role_name,
            role_id: user.role_id,
            phone: user.phone,
            hostel_id: user.hostel_id,
          },
          token,
        },
      });
    } catch (error: any) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  },

  // Register Owner (Admin only)
  async registerOwner(req: Request, res: Response) {
    try {
      const { email, phone, full_name, password } = req.body;

      // Validate required fields
      if (!full_name || !password) {
        return res.status(400).json({
          success: false,
          error: 'Full name and password are required',
        });
      }

      // Validate email format if provided
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format',
        });
      }

      // Generate fallback fields to satisfy NOT NULL constraints
      const resolvedEmail = email || `${phone || Date.now()}@dhostel.com`;
      const resolvedUsername = email || phone || `user_${Date.now()}`;

      // Check if user already exists (by email, phone, or username)
      const existingUser = await db('users')
        .where('email', resolvedEmail)
        .orWhere('username', resolvedUsername)
        .orWhere(function() {
          if (phone) {
            this.where('phone', phone);
          }
        })
        .first();

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'User with this email or phone number already exists',
        });
      }

      // Hash password
      const password_hash = await hashPassword(password);

      // Insert user
      const [user_id] = await db('users').insert({
        username: resolvedUsername,
        email: resolvedEmail,
        phone: phone || null,
        full_name,
        password_hash,
        role_id: 2, // Hostel Owner role
        is_active: true,
      });

      return res.status(201).json({
        success: true,
        data: {
          user_id,
          message: 'Owner registered successfully',
        },
      });
    } catch (error: any) {
      console.error('Register owner error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  },

  // Public self-registration for new hostel owners (sign up from the app)
  async register(req: Request, res: Response) {
    try {
      const { full_name, email, phone, password, hostel_name } = req.body;

      // Validate required fields (all are mandatory now)
      if (!full_name || !password || !email || !phone || !hostel_name) {
        return res.status(400).json({
          success: false,
          error: 'All fields (Full Name, Email, Mobile Number, PG Name, and Password) are mandatory.',
        });
      }
      if (String(password).length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters.',
        });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, error: 'Invalid email format.' });
      }
      if (!/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Mobile number must be a valid 10-digit Indian number starting with 6, 7, 8, or 9.' 
        });
      }
      if (String(hostel_name).trim().length < 3) {
        return res.status(400).json({
          success: false,
          error: 'PG Name must be at least 3 characters.',
        });
      }

      // Check if email OTP verified status has not expired
      try {
        const verified = await db('otps').where({ email, verified: 1 }).first();
        if (!verified) {
          return res.status(400).json({
            success: false,
            error: 'Please verify your email with the OTP before creating an account.',
          });
        }
        
        // Expiry check (10 minutes)
        const expiresAt = new Date(verified.expires_at).getTime();
        const now = new Date().getTime();
        if (expiresAt < now) {
          return res.status(400).json({
            success: false,
            error: 'Verification code has expired. Please verify your email again.',
          });
        }
      } catch (e) {
        // otps table/column missing on older DBs — don't hard-block, just proceed.
        console.warn('OTP verification check skipped:', (e as any)?.message);
      }

      const resolvedEmail = email;
      const resolvedUsername = email;

      // Reject duplicates by email or phone individually with precise errors
      const existingEmail = await db('users').where('email', resolvedEmail).first();
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          error: 'An account with this email already exists.',
        });
      }

      const existingPhone = await db('users').where('phone', phone).first();
      if (existingPhone) {
        return res.status(409).json({
          success: false,
          error: 'An account with this mobile number already exists.',
        });
      }

      const password_hash = await hashPassword(password);

      // Create the owner account (role 2 = Hostel Owner)
      const [user_id] = await db('users').insert({
        username: resolvedUsername,
        email: resolvedEmail,
        phone: phone || null,
        full_name,
        password_hash,
        role_id: 2,
        is_active: true,
      });

      // Email confirmed and consumed — clear any OTP rows for it
      if (email) {
        try { await db('otps').where('email', email).del(); } catch { /* non-fatal */ }
      }

      // Optionally create their first hostel and set it as active
      let hostel_id: number | null = null;
      const trimmedHostel = (hostel_name || '').trim();
      if (trimmedHostel.length >= 3) {
        [hostel_id] = await db('hostel_master').insert({
          hostel_name: trimmedHostel,
          owner_id: user_id,
          // hostel_type is NOT NULL in the schema; default to 'Boys' so the row is
          // valid and can be edited later without a 500. The owner can change it in Edit Hostel.
          hostel_type: 'Boys',
          address: '',
          is_active: 1,
          created_at: new Date(),
        });
        await db('users').where('user_id', user_id).update({ hostel_id });
      }

      // Issue a token so the app can log the user in immediately
      const token = generateToken({
        user_id,
        email: resolvedEmail,
        role_id: 2,
        hostel_id,
      });

      return res.status(201).json({
        success: true,
        data: {
          token,
          user: {
            user_id,
            email: resolvedEmail,
            full_name,
            phone: phone || null,
            role: 'Hostel Owner',
            role_id: 2,
            hostel_id,
            hostel_name: trimmedHostel || null,
          },
        },
      });
    } catch (error: any) {
      console.error('Register error:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  // Get current user
  async me(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.user_id;

      const user = await db('users')
        .select(
          'users.user_id',
          'users.email',
          'users.full_name',
          'users.phone',
          'users.role_id',
          'users.hostel_id',
          'user_roles.role_name as role'
        )
        .join('user_roles', 'users.role_id', 'user_roles.role_id')
        .where('users.user_id', userId)
        .first();

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      return res.json({
        success: true,
        data: user,
      });
    } catch (error: any) {
      console.error('Get user error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  },

  // Change password
  async changePassword(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.user_id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current and new password are required',
        });
      }

      // Get user
      const user = await db('users')
        .select('password_hash')
        .where('user_id', userId)
        .first();

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      // Verify current password
      const isValid = await comparePassword(currentPassword, user.password_hash);

      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect',
        });
      }

      // Hash new password
      const password_hash = await hashPassword(newPassword);

      // Update password
      await db('users').where('user_id', userId).update({ password_hash });

      return res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error: any) {
      console.error('Change password error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  },

  // Logout
  async logout(req: Request, res: Response) {
    return res.json({
      success: true,
      message: 'Logged out successfully',
    });
  },

  // Forgot Password
  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required',
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format',
        });
      }

      // Find user by email
      const user = await db('users')
        .where('email', email)
        .where('is_active', true)
        .first();

      if (!user) {
        // Don't reveal if email exists for security
        return res.status(200).json({
          success: true,
          message: 'If email exists, a password reset link has been sent',
        });
      }

      // Generate password reset token (valid for 1 hour)
      const resetToken = jwt.sign(
        { user_id: user.user_id, email: user.email },
        process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
        { expiresIn: process.env.PASSWORD_RESET_EXPIRES_IN || '1h' } as any
      );

      // Save reset token to database with expiry
      const resetExpiresAt = new Date();
      resetExpiresAt.setHours(resetExpiresAt.getHours() + 1);

      await db('users')
        .where('user_id', user.user_id)
        .update({
          password_reset_token: resetToken,
          password_reset_expires_at: resetExpiresAt,
        });

      // Send email
      await sendPasswordResetEmail(user.email, resetToken, user.full_name);

      // In development mode, log the reset link to console
      if (process.env.NODE_ENV === 'development') {
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        console.log('\n' + '='.repeat(80));
        console.log('🔐 PASSWORD RESET LINK (Development Mode)');
        console.log('='.repeat(80));
        console.log(`User Email: ${user.email}`);
        console.log(`Reset Link: ${resetLink}`);
        console.log(`Expires at: ${resetExpiresAt}`);
        console.log('='.repeat(80) + '\n');
      }

      return res.status(200).json({
        success: true,
        message: 'If email exists, a password reset link has been sent',
      });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to process password reset request',
      });
    }
  },

  // Reset Password
  async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword, confirmPassword } = req.body;

      if (!token || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          error: 'Token, new password, and confirmation are required',
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          error: 'Passwords do not match',
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters',
        });
      }

      // Verify token
      let decoded: any;
      try {
        decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
        );
      } catch (error) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired reset token',
        });
      }

      // Find user
      const user = await db('users')
        .where('user_id', decoded.user_id)
        .where('password_reset_token', token)
        .first();

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid reset token',
        });
      }

      // Check if token has expired
      if (
        user.password_reset_expires_at &&
        new Date(user.password_reset_expires_at) < new Date()
      ) {
        return res.status(401).json({
          success: false,
          error: 'Reset token has expired',
        });
      }

      // Hash new password
      const password_hash = await hashPassword(newPassword);

      // Update password and clear reset token
      await db('users').where('user_id', user.user_id).update({
        password_hash,
        password_reset_token: null,
        password_reset_expires_at: null,
      });

      return res.json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error: any) {
      console.error('Reset password error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to reset password',
      });
    }
  },

  // Verify Reset Token
  async verifyResetToken(req: Request, res: Response) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Token is required',
        });
      }

      // Verify token
      let decoded: any;
      try {
        decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
        );
      } catch (error) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token',
        });
      }

      // Find user
      const user = await db('users')
        .where('user_id', decoded.user_id)
        .where('password_reset_token', token)
        .first();

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
        });
      }

      // Check if token has expired
      if (
        user.password_reset_expires_at &&
        new Date(user.password_reset_expires_at) < new Date()
      ) {
        return res.status(401).json({
          success: false,
          error: 'Token has expired',
        });
      }

      return res.json({
        success: true,
        data: {
          email: user.email,
          message: 'Token is valid',
        },
      });
    } catch (error: any) {
      console.error('Verify reset token error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify token',
      });
    }
  },

  // Switch active hostel
  async switchActiveHostel(req: AuthRequest, res: Response) {
    try {
      const { hostel_id } = req.body;
      const user = req.user;

      if (!hostel_id) {
        return res.status(400).json({
          success: false,
          error: 'Hostel ID is required',
        });
      }

      // Verify that the user owns the hostel or is admin
      if (user?.role_id === 2) {
        const hostel = await db('hostel_master')
          .where({ hostel_id, owner_id: user.user_id, is_active: 1 })
          .first();

        if (!hostel) {
          return res.status(403).json({
            success: false,
            error: 'Access denied to this hostel',
          });
        }
      }

      // Update user's active hostel_id in database
      await db('users')
        .where('user_id', user.user_id)
        .update({ hostel_id });

      const hostelDetails = await db('hostel_master')
        .where('hostel_id', hostel_id)
        .first();

      // Re-generate JWT token with the new hostel_id
      const token = generateToken({
        user_id: user.user_id,
        email: user.email,
        role_id: user.role_id,
        hostel_id,
      });

      return res.json({
        success: true,
        message: 'Active hostel switched successfully',
        data: {
          hostel_id,
          hostel_name: hostelDetails?.hostel_name || 'My Hostel',
          token,
        },
      });
    } catch (error: any) {
      console.error('Switch active hostel error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  },

  // Send OTP to email
  async sendOtp(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required',
        });
      }

      // Check if email format is valid
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format',
        });
      }

      // Check if user already exists
      const existingUser = await db('users').where('email', email).first();
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'An account with this email already exists',
        });
      }

      // Generate a 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Expiry time (10 minutes from now)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // Delete old OTPs for this email, then insert fresh one
      await db('otps').where('email', email).del();
      await db('otps').insert({
        email,
        otp,
        expires_at: expiresAt,
      });

      console.log(`\n${'='.repeat(60)}`);
      console.log(`📧 OTP GENERATION — ${email}`);
      console.log(`   OTP: ${otp}  |  Expires: ${expiresAt.toISOString()}`);
      console.log(`   EMAIL_USER env: ${process.env.EMAIL_USER || '⚠️  NOT SET'}`);
      console.log(`${'='.repeat(60)}\n`);

      // Send the OTP via email
      await sendOtpEmail(email, otp);

      return res.status(200).json({
        success: true,
        message: 'Verification OTP sent to your email',
        ...(process.env.NODE_ENV === 'development' && { dev_otp: otp }),
      });
    } catch (error: any) {
      console.error('❌ Send OTP error:', error?.message || error);
      return res.status(500).json({
        success: false,
        error: `Failed to send OTP email: ${error?.message || 'Unknown error'}. Check server logs.`,
      });
    }
  },

  // Verify OTP
  async verifyOtp(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          error: 'Email and OTP are required',
        });
      }

      // Find the latest active OTP for this email
      const record = await db('otps')
        .where('email', email)
        .where('otp', otp)
        .first();

      if (!record) {
        return res.status(400).json({
          success: false,
          error: 'Invalid verification code',
        });
      }

      // Check expiry timezone-independently
      const expiresTime = new Date(record.expires_at).getTime();
      const currentTime = new Date().getTime();
      if (expiresTime < currentTime) {
        return res.status(400).json({
          success: false,
          error: 'Verification code has expired',
        });
      }

      // Mark this email as verified (kept briefly so register() can confirm it).
      // The row is cleared once the account is created.
      await db('otps').where('id', record.id).update({ verified: 1 });

      return res.status(200).json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify OTP',
      });
    }
  },

  // Check if phone exists
  async checkPhone(req: Request, res: Response) {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({
          success: false,
          error: 'Phone number is required',
        });
      }

      // Check format
      if (!/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          error: 'Phone number must be a valid 10-digit Indian number starting with 6, 7, 8, or 9.',
        });
      }

      const existingUser = await db('users').where('phone', phone).first();

      return res.json({
        success: true,
        exists: !!existingUser,
      });
    } catch (error: any) {
      console.error('Check phone error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  },

  // ============================================
  // TENANT AUTHENTICATION (Mobile App)
  // ============================================

  async verifyHostelKey(req: Request, res: Response) {
    try {
      const { hostel_code } = req.body;
      if (!hostel_code) {
        return res.status(400).json({ success: false, error: 'Hostel Code is required' });
      }

      const hostel = await db('hostel_master')
        .where('hostel_code', hostel_code)
        .where('is_active', 1)
        .first();

      if (!hostel) {
        return res.status(404).json({ success: false, error: 'Invalid Hostel Code' });
      }

      return res.json({
        success: true,
        data: {
          hostel_id: hostel.hostel_id,
          hostel_name: hostel.hostel_name,
        }
      });
    } catch (error) {
      console.error('verifyHostelKey error:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async tenantSendOtp(req: Request, res: Response) {
    try {
      const { identifier, hostel_id } = req.body; // phone or email
      if (!identifier || !hostel_id) {
        return res.status(400).json({ success: false, error: 'Identifier and hostel_id are required' });
      }

      // Check if tenant exists in this hostel
      const tenant = await db('students')
        .where('hostel_id', hostel_id)
        .andWhere(function() {
          this.where('email', identifier).orWhere('phone', identifier);
        })
        .first();

      // If tenant doesn't exist, we still send the OTP so they can register as a new user.
      const isNewUser = !tenant;

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await db('otps').where('email', identifier).del();
      await db('otps').insert({ email: identifier, otp, expires_at: expiresAt });

      console.log(`[TENANT OTP] ${identifier} -> ${otp}`);
      // Send OTP via email if it's an email (or integrate SMS later if phone)
      if (identifier.includes('@')) {
        await sendOtpEmail(identifier, otp);
      }

      return res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
      console.error('tenantSendOtp error:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async tenantVerifyOtp(req: Request, res: Response) {
    try {
      const { identifier, otp, hostel_id } = req.body;
      if (!identifier || !otp || !hostel_id) {
        return res.status(400).json({ success: false, error: 'Identifier, otp, and hostel_id are required' });
      }

      const record = await db('otps').where('email', identifier).where('otp', otp).first();
      if (!record) {
        return res.status(400).json({ success: false, error: 'Invalid OTP' });
      }

      if (new Date(record.expires_at) < new Date()) {
        return res.status(400).json({ success: false, error: 'OTP has expired' });
      }

      const tenant = await db('students')
        .select('students.*', 'rooms.room_number')
        .leftJoin('rooms', 'rooms.room_id', 'students.room_id')
        .where('students.hostel_id', hostel_id)
        .andWhere(function() {
          this.where('students.email', identifier).orWhere('students.phone', identifier);
        })
        .first();

      if (!tenant) {
        return res.json({
          success: true,
          isNewUser: true,
          data: {
            identifier,
            hostel_id
          }
        });
      }

      await db('otps').where('email', identifier).del();

      const token = generateToken({
        user_id: tenant.student_id,
        email: tenant.email,
        role_id: 3, // Tenant Role
        hostel_id: tenant.hostel_id,
      });

      return res.json({
        success: true,
        data: {
          token,
          tenant: {
            id: tenant.student_id,
            name: tenant.first_name + (tenant.last_name ? ' ' + tenant.last_name : ''),
            email: tenant.email,
            phone: tenant.phone,
            room: tenant.room_number || 'N/A',
            hostel_id: tenant.hostel_id
          }
        }
      });
    } catch (error) {
      console.error('tenantVerifyOtp error:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async tenantRegister(req: Request, res: Response) {
    try {
      const { identifier, hostel_id, first_name, last_name, phone, email, gender, guardian_name, guardian_phone, guardian_relation, permanent_address, id_proof_type, id_proof_number } = req.body;
      
      if (!identifier || !hostel_id || !first_name || !gender) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      const finalPhone = phone || (identifier.includes('@') ? null : identifier);
      if (!finalPhone) {
        return res.status(400).json({ success: false, error: 'Phone number is required.' });
      }

      // Check if tenant already exists (shouldn't happen but just in case)
      const existing = await db('students')
        .where('hostel_id', hostel_id)
        .andWhere(function() {
          if (email) this.orWhere('email', email);
          if (phone) this.orWhere('phone', phone);
          this.orWhere('email', identifier).orWhere('phone', identifier);
        })
        .first();

      if (existing) {
        return res.status(400).json({ success: false, error: 'A tenant with these details already exists in this hostel.' });
      }

      // Format current date for admission_date
      const today = new Date();
      const admission_date = today.toISOString().split('T')[0];

      // Insert into students with status = 3 (QR Register / Pending)
      const [student_id] = await db('students').insert({
        hostel_id,
        first_name,
        last_name: last_name || null,
        phone: finalPhone,
        email: email || (identifier.includes('@') ? identifier : null),
        gender,
        guardian_name: guardian_name || null,
        guardian_phone: guardian_phone || null,
        guardian_relation: guardian_relation || null,
        permanent_address: permanent_address || null,
        id_proof_type: id_proof_type || null,
        id_proof_number: id_proof_number || null,
        admission_date,
        status: 3, // QR Register / Pending Status
        created_at: new Date()
      });

      // Clear OTP just in case
      await db('otps').where('email', identifier).del();

      // Issue JWT token immediately so they can log in
      const { generateToken } = await import('../utils/jwt.js');
      const token = generateToken({
        user_id: student_id,
        email: email || identifier,
        role_id: 3, // Tenant
        hostel_id,
      });

      return res.status(201).json({
        success: true,
        message: 'Registration successful! Awaiting owner approval.',
        data: {
          token,
          tenant: {
            id: student_id,
            name: first_name + (last_name ? ' ' + last_name : ''),
            email: email || identifier,
            phone: phone || identifier,
            room: 'Pending',
            hostel_id
          }
        }
      });
    } catch (error: any) {
      console.error('tenantRegister error:', error);
      return res.status(500).json({ success: false, error: error?.sqlMessage || 'Internal server error' });
    }
  },

  // Returns the logged-in tenant's own live profile, allocation and dues.
  // The mobile dashboard polls this on focus / pull-to-refresh so it updates
  // automatically once the owner allocates a room.
  async tenantMe(req: AuthRequest, res: Response) {
    try {
      const studentId = req.user?.user_id;
      if (!studentId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const tenant = await db('students')
        .select('students.*', 'rooms.room_number', 'rooms.rent_per_bed')
        .leftJoin('rooms', 'rooms.room_id', 'students.room_id')
        .where('students.student_id', studentId)
        .first();

      if (!tenant) {
        return res.status(404).json({ success: false, error: 'Tenant not found' });
      }

      const status = Number(tenant.status);
      // Allocated only once the owner has set a room AND marked the tenant active
      // (status 3 = pending mobile registration awaiting owner action).
      const isAllocated = tenant.room_id != null && status === 1;

      const dueRow = await db('monthly_fees')
        .where('student_id', studentId)
        .whereIn('fee_status', ['Pending', 'Partially Paid', 'Overdue'])
        .sum({ total_balance: 'balance' })
        .first();

      const nextDue = await db('monthly_fees')
        .where('student_id', studentId)
        .whereIn('fee_status', ['Pending', 'Partially Paid', 'Overdue'])
        .whereNotNull('due_date')
        .orderBy('due_date', 'asc')
        .first();

      return res.json({
        success: true,
        data: {
          id: tenant.student_id,
          name: tenant.first_name + (tenant.last_name ? ' ' + tenant.last_name : ''),
          email: tenant.email,
          phone: tenant.phone,
          gender: tenant.gender,
          status,
          is_allocated: isAllocated,
          room_number: tenant.room_number || null,
          monthly_rent: tenant.monthly_rent ?? tenant.rent_per_bed ?? null,
          outstanding_due: Number(dueRow?.total_balance || 0),
          next_due_date: nextDue?.due_date || null,
          hostel_id: tenant.hostel_id,
        },
      });
    } catch (error) {
      console.error('tenantMe error:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },
};

