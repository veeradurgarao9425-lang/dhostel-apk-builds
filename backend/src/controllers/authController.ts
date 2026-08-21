import { Request, Response } from 'express';
import db from '../config/database.js';
import { processFileUpload } from '../utils/fileUpload.js';
import { hashPassword, comparePassword } from '../utils/bcrypt.js';
import { generateToken } from '../utils/jwt.js';
import { AuthRequest } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';
import { sendPasswordResetEmail, sendOtpEmail, sendEmail, sendNewJoinerOwnerAlertEmail, sendNewJoinerStudentEmail } from '../utils/email.js';
import { sendNotificationToHostelOwner, sendNotificationToStudent } from '../utils/notification.js';
import crypto from 'crypto';
import { checkHostelUniqueIdentifiers } from '../utils/validation.js';
import { sendDailyOwnerReportEmail } from '../utils/excelReport.js';
import { generateDeveloperToken, logDeveloperAction } from '../middleware/developerAuth.js';
import { notifyNewOwnerRegistered } from '../services/developerNotificationService.js';

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

      // Check Developer Users first
      const devUser = await db('developer_users')
        .where('username', identifier)
        .orWhere('email', identifier)
        .first();

      if (devUser && devUser.status === 'ACTIVE') {
        const isValidDevPass = await comparePassword(password, devUser.password_hash);
        if (isValidDevPass) {
          await db('developer_users').where('id', devUser.id).update({ last_login_at: new Date() });
          const devToken = generateDeveloperToken({
            developer_id: devUser.id,
            username: devUser.username,
            email: devUser.email,
            is_developer: true,
            role: 'DEVELOPER',
          });

          await logDeveloperAction({
            developer_id: devUser.id,
            developer_username: devUser.username,
            action: 'DEVELOPER_LOGIN',
            target_type: 'AUTH',
            target_id: devUser.id,
            metadata: { login_flow: 'owner_login_auto_detect', login_time: new Date() },
            req,
          });

          return res.json({
            success: true,
            is_developer: true,
            data: {
              user: {
                user_id: devUser.id,
                email: devUser.email,
                full_name: devUser.full_name,
                role: 'DEVELOPER',
                role_id: 0,
                is_developer: true,
                role_title: devUser.role_title,
              },
              token: devToken,
            },
          });
        }
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
        .leftJoin('user_roles', 'users.role_id', 'user_roles.role_id')
        .where('users.email', identifier)
        .where('users.is_active', true)
        .first();

      if (!user) {
        return res.status(401).json({
          success: false,
          // Generic message — do not reveal whether the email exists or the password is wrong
          error: 'Invalid email or password.',
        });
      }

      // Verify password
      const isValidPassword = await comparePassword(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password.',
        });
      }

      // If owner has no hostel_id set, check if they own an active hostel
      let activeHostelId = user.hostel_id;
      if (!activeHostelId && (user.role_id === 2 || user.role_id === 1)) {
        try {
          const firstHostel = await db('hostel_master')
            .where({ owner_id: user.user_id, is_active: 1 })
            .first('hostel_id');
          if (firstHostel?.hostel_id) {
            activeHostelId = firstHostel.hostel_id;
            await db('users').where('user_id', user.user_id).update({ hostel_id: activeHostelId }).catch(() => {});
          }
        } catch (e) {
          console.warn('Auto-link hostel on login warning:', e);
        }
      }

      // Update last login
      await db('users')
        .where('user_id', user.user_id)
        .update({ last_login: db.fn.now() });

      // Generate token
      const token = generateToken({
        user_id: user.user_id,
        email: user.email,
        role_id: user.role_id,
        hostel_id: activeHostelId, // Include hostel_id in JWT token
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
        password: password_hash,
        password_hash,
        role: 'OWNER',
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
      const { full_name, email, phone, password, hostel_name, address, total_floors, admission_fee, default_refundable_deposit } = req.body;

      // Validate required fields (all are mandatory now)
      if (!full_name || !password || !email || !phone || !hostel_name || !address || !total_floors) {
        return res.status(400).json({
          success: false,
          error: 'All fields (Full Name, Email, Mobile Number, PG Name, Floors, Address, and Password) are mandatory.',
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
      if (String(address).trim().length < 5) {
        return res.status(400).json({
          success: false,
          error: 'Address must be at least 5 characters.',
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

      // Create user account + hostel atomically — if either insert fails, both roll back.
      let user_id!: number;
      let hostel_id: number | null = null;

      await db.transaction(async (trx) => {
        // Create the owner account (role 2 = Hostel Owner)
        [user_id] = await trx('users').insert({
          username: resolvedEmail,
          email: resolvedEmail,
          phone: phone || null,
          full_name,
          password: password_hash,
          password_hash,
          role: 'OWNER',
          role_id: 2,
          is_active: true,
        });

        // Optionally create their first hostel and set it as active
        const trimmedHostelInner = (hostel_name || '').trim();
        if (trimmedHostelInner.length >= 3) {
          const trialDays = parseInt(process.env.TRIAL_DAYS || '30', 10);
          const trialStart = new Date();
          const trialEnd = new Date(trialStart.getTime() + trialDays * 24 * 60 * 60 * 1000);
          [hostel_id] = await trx('hostel_master').insert({
            hostel_name: trimmedHostelInner,
            hostel_code: crypto.randomBytes(3).toString('hex'),
            owner_id: user_id,
            hostel_type_id: 1,
            subscription_status: 1,
            subscription_status_id: 1,
            address: String(address).trim(),
            total_floors: parseInt(total_floors, 10) || 1,
            admission_fee: admission_fee ? parseFloat(admission_fee) : 0,
            default_refundable_deposit: default_refundable_deposit ? parseFloat(default_refundable_deposit) : 0,
            is_active: 1,
            trial_start_date: trialStart,
            trial_end_date: trialEnd,
            created_at: new Date(),
          });
          await trx('users').where('user_id', user_id).update({ hostel_id });
        }
      });

      // Email confirmed and consumed — clear any OTP rows for it
      if (email) {
        try { await db('otps').where('email', email).del(); } catch { /* non-fatal */ }
      }

      // Issue a token so the app can log the user in immediately
      const trimmedHostel = (hostel_name || '').trim();
      const token = generateToken({
        user_id,
        email: resolvedEmail,
        role_id: 2,
        hostel_id,
      });

      // Tell the developer/master admin: one in-app notification row (read by the
      // Developer Notification Centre) plus exactly one email to SUPER_ADMIN_EMAIL.
      // Deliberately NOT awaited — SMTP can take seconds and must not delay the
      // signup response, and a mail failure must not fail the registration.
      notifyNewOwnerRegistered({
        userId: user_id,
        fullName: full_name,
        email: resolvedEmail,
        phone: phone || null,
        hostelName: trimmedHostel || null,
        hostelId: hostel_id,
        address: address ? String(address).trim() : null,
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
      return res.status(500).json({ success: false, error: error?.message || 'Internal server error' });
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
        .leftJoin('user_roles', 'users.role_id', 'user_roles.role_id')
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

      const cleanEmail = email.trim().toLowerCase();

      // Find user by email (case-insensitive)
      const user = await db('users')
        .whereRaw('LOWER(email) = ?', [cleanEmail])
        .where('is_active', true)
        .first();

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'No account found with this email address. Please check your spelling and try again.',
        });
      }

      // Generate password reset token (valid for 1 hour)
      const resetToken = jwt.sign(
        { user_id: user.user_id, email: user.email },
        process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
        { expiresIn: process.env.PASSWORD_RESET_EXPIRES_IN || '1h' } as any
      );

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Save reset token and OTP to database with expiry
      const resetExpiresAt = new Date();
      resetExpiresAt.setHours(resetExpiresAt.getHours() + 1);

      await db('users')
        .where('user_id', user.user_id)
        .update({
          password_reset_token: resetToken,
          password_reset_otp: otp,
          password_reset_expires_at: resetExpiresAt,
        });

      // Send email (passing otp as well)
      try {
        await sendPasswordResetEmail(user.email, resetToken, user.full_name, otp);
      } catch (emailError: any) {
        console.error('❌ Failed to send password reset email:', emailError.message);
      }

      // In development mode, log the reset link to console
      if (process.env.NODE_ENV === 'development') {
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        console.log('\n' + '='.repeat(80));
        console.log('🔐 PASSWORD RESET LINK (Development Mode)');
        console.log('='.repeat(80));
        console.log(`User Email: ${user.email}`);
        console.log(`Reset Link: ${resetLink}`);
        console.log(`OTP: ${otp}`);
        console.log(`Expires at: ${resetExpiresAt}`);
        console.log('='.repeat(80) + '\n');
      }

      return res.status(200).json({
        success: true,
        message: 'If email exists, a password reset link has been sent',
        dev_otp: otp,
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
        password_reset_otp: null,
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

  // Verify Reset OTP
  async verifyResetOtp(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          error: 'Email and OTP are required',
        });
      }

      const cleanEmail = email.trim().toLowerCase();

      // Find user by email
      const user = await db('users')
        .whereRaw('LOWER(email) = ?', [cleanEmail])
        .where('is_active', true)
        .first();

      if (!user) {
        return res.status(400).json({
          success: false,
          error: 'No account found with this email address.',
        });
      }

      // Strictly verify OTP generated for this account
      if (user.password_reset_otp !== otp) {
        return res.status(400).json({
          success: false,
          error: 'Invalid OTP code',
        });
      }

      // Check if OTP has expired
      if (
        user.password_reset_expires_at &&
        new Date(user.password_reset_expires_at) < new Date()
      ) {
        return res.status(400).json({
          success: false,
          error: 'OTP code has expired',
        });
      }

      let resetToken = user.password_reset_token;
      if (!resetToken) {
        resetToken = jwt.sign(
          { user_id: user.user_id, email: user.email },
          process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
          { expiresIn: '1h' } as any
        );
        await db('users').where('user_id', user.user_id).update({
          password_reset_token: resetToken,
        });
      }

      return res.json({
        success: true,
        message: 'OTP verified successfully',
        token: resetToken,
      });
    } catch (error: any) {
      console.error('Verify reset OTP error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify OTP',
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

      // Send the OTP via email asynchronously (don't block HTTP response if SMTP is slow/failing)
      sendOtpEmail(email, otp).catch((emailErr) => {
        console.warn('⚠️ Failed to deliver OTP email, but OTP was saved in DB:', emailErr?.message || emailErr);
      });

      return res.status(200).json({
        success: true,
        message: 'Verification OTP sent to your email',
        dev_otp: otp,
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
          city: hostel.city,
          state: hostel.state,
          address: hostel.address,
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

      // If identifier is a phone number: SMS OTP is not yet integrated.
      // Return a clear error instead of silently generating an OTP that
      // is never delivered, then returning success: true misleadingly.
      if (!identifier.includes('@')) {
        return res.status(501).json({
          success: false,
          error: 'SMS OTP delivery is not supported yet. Please use your email address to log in.'
        });
      }

      // Send the OTP via email asynchronously (don't block HTTP response if SMTP is slow/failing)
      sendOtpEmail(identifier, otp).catch((emailErr) => {
        console.warn('⚠️ Failed to deliver tenant OTP email, but OTP was saved in DB:', emailErr?.message || emailErr);
      });

      return res.json({ 
        success: true, 
        message: 'OTP sent successfully',
        dev_otp: otp,
      });
    } catch (error: any) {
      console.error('tenantSendOtp error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
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
        .select(
          'students.*', 
          'rooms.room_number', 
          'rooms.is_available as room_active',
          'hostel_master.is_active as hostel_active'
        )
        .leftJoin('rooms', 'rooms.room_id', 'students.room_id')
        .leftJoin('hostel_master', 'hostel_master.hostel_id', 'students.hostel_id')
        .where('students.hostel_id', hostel_id)
        .andWhere(function() {
          this.where('students.email', identifier).orWhere('students.phone', identifier);
        })
        .first();

      if (!tenant) {
        return res.json({
          success: true,
          isNewUser: true,
          data: { identifier, hostel_id }
        });
      }

      // --- STRICT LOGIN VALIDATIONS ---
      
      // 1. Check if Hostel is Active
      if (!tenant.hostel_active) {
        return res.status(403).json({ success: false, error: 'This hostel is currently inactive. Contact administration.' });
      }

      // 2. Reject registrations the owner has explicitly rejected or deactivated.
      if (Number(tenant.status) === 4) {
        return res.status(403).json({ success: false, error: 'Your registration was not approved. Contact hostel administration.' });
      }
      if (Number(tenant.status) === 0) {
        return res.status(403).json({ success: false, error: 'Your account is inactive. Contact hostel administration.' });
      }

      // A pending mobile self-registration (status = 3) has no room yet by definition —
      // let them back in so the app can show the "waiting for room allocation" screen,
      // same as tenantRegister/tenantMe. Only an allocated tenant (status = 1) needs the
      // room-assignment checks below.
      const isPendingRegistration = Number(tenant.status) === 3;

      if (!isPendingRegistration) {
        // 3. Check Room Assignment
        if (!tenant.room_id) {
          return res.status(403).json({ success: false, error: 'You are not assigned to any room. Contact hostel administration.' });
        }

        // 4. Check if Room is Active
        // Assuming is_available serves as the room active flag or simply if room was deleted.
        if (tenant.room_active === 0 || tenant.room_active === false) {
          return res.status(403).json({ success: false, error: 'Your assigned room is currently inactive.' });
        }
      }

      await db('otps').where('email', identifier).del();

      const token = generateToken({
        user_id: tenant.student_id,
        email: tenant.email,
        role_id: 3, // Tenant Role
        hostel_id: tenant.hostel_id,
      });

      // In-app only (no push) — just gives the notification list a "you logged in" entry.
      db('notifications').insert({
        student_id: tenant.student_id,
        hostel_id: tenant.hostel_id,
        notification_type: 'General',
        title: 'Welcome Back!',
        message: `Hi ${tenant.first_name}, you've logged in successfully.`,
        priority: 'Low',
        is_read: 0,
        created_at: new Date()
      }).catch((err: any) => console.error('Failed to save login notification:', err));

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
            room_id: tenant.room_id || null,
            hostel_id: tenant.hostel_id,
            status: Number(tenant.status),
            is_allocated: tenant.room_id != null && Number(tenant.status) === 1 && tenant.room_active !== 0
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
      const { identifier, hostel_id, first_name, last_name, phone, email, gender, date_of_birth, guardian_name, guardian_phone, guardian_relation, current_address, permanent_address, id_proof_type, id_proof_number } = req.body;

      const files = req.files as { [field: string]: Express.Multer.File[] } | undefined;
      const profilePhotoUrl = files?.profile_photo?.[0] ? await processFileUpload(files.profile_photo[0], 'avatars').catch(() => null) : null;
      const idProofFrontUrl = files?.id_proof_front?.[0] ? await processFileUpload(files.id_proof_front[0], 'id_proofs').catch(() => null) : null;
      const idProofBackUrl = files?.id_proof_back?.[0] ? await processFileUpload(files.id_proof_back[0], 'id_proofs').catch(() => null) : null;

      if (!identifier || !hostel_id || !first_name || !gender) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      const finalPhone = phone || (identifier.includes('@') ? null : identifier);
      if (!finalPhone) {
        return res.status(400).json({ success: false, error: 'Phone number is required.' });
      }

      // ── Hostel-specific uniqueness checks (phone, email, ID proof number) ──
      const finalEmail = email || (identifier.includes('@') ? identifier : null);
      const uniqueness = await checkHostelUniqueIdentifiers(hostel_id, {
        phone: finalPhone,
        email: finalEmail,
        id_number: id_proof_number || null,
      });
      if (!uniqueness.isUnique) {
        if (uniqueness.conflictField === 'phone') {
          return res.status(400).json({ success: false, error: 'This phone number is already registered in this hostel. Please login instead.' });
        }
        if (uniqueness.conflictField === 'email') {
          return res.status(400).json({ success: false, error: 'This email address is already registered in this hostel. Please login instead.' });
        }
        return res.status(400).json({ success: false, error: `This ${uniqueness.conflictField} is already registered to another ${uniqueness.conflictEntity} in this hostel.` });
      }
      // ──────────────────────────────────────────────────────────────────────

      // Format current date for admission_date
      const today = new Date();
      const admission_date = today.toISOString().split('T')[0];

      // Insert into students with status = 3 (QR Register / Pending)
      const [student_id] = await db('students').insert({
        hostel_id,
        first_name,
        last_name: last_name || null,
        phone: finalPhone,
        email: finalEmail || null,
        gender,
        guardian_name: guardian_name || null,
        guardian_phone: guardian_phone || null,
        guardian_relation: guardian_relation || null,
        current_address: current_address || null,
        permanent_address: permanent_address || null,
        id_proof_number: id_proof_number || null,
        id_proof_front_url: idProofFrontUrl,
        id_proof_back_url: idProofBackUrl,
        profile_photo_url: profilePhotoUrl,
        date_of_birth: date_of_birth || null,
        admission_date,
        status: 3, // QR Register / Pending Status
        created_at: new Date()
      });

      // Clear OTP just in case
      await db('otps').where('email', identifier).del();

      sendNotificationToHostelOwner(
        hostel_id,
        'General',
        'New Registration Awaiting Approval',
        `${first_name}${last_name ? ' ' + last_name : ''} registered via QR code and is awaiting room allocation.`,
        'Medium',
        { id: student_id }
      ).catch(err => console.error('Failed to send tenant registration notification:', err));

      sendNotificationToStudent(
        student_id,
        'General',
        'Registration Submitted',
        'Your registration is pending owner approval. We will notify you as soon as a room is allocated.',
        'Medium',
        { id: student_id }
      ).catch(err => console.error('Failed to send registration-pending notification to tenant:', err));

      // Dispatch Email Alert to Hostel Owner
      (async () => {
        try {
          const hostel = await db('hostel_master').where({ hostel_id }).first();
          const owner = hostel?.owner_id ? await db('users').where({ user_id: hostel.owner_id }).first() : null;
          if (owner?.email && String(owner.email).includes('@')) {
            await sendNewJoinerOwnerAlertEmail({
              ownerEmail: String(owner.email).trim(),
              ownerName: owner.full_name || 'Hostel Owner',
              studentName: `${first_name} ${last_name || ''}`.trim(),
              studentPhone: finalPhone,
              studentEmail: finalEmail || null,
              hostelName: hostel?.hostel_name || 'Your Hostel',
              admissionDate: admission_date || new Date().toISOString().split('T')[0],
            });
          }
        } catch (err: any) {
          console.error('[tenantRegister] Failed to send owner alert email:', err.message);
        }
      })();

      // Issue JWT token immediately so they can log in
      const { generateToken } = await import('../utils/jwt.js');
      const token = generateToken({
        user_id: student_id,
        email: finalEmail || identifier,
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
            email: finalEmail || identifier,
            phone: finalPhone,
            room: 'Pending',
            room_id: null,
            hostel_id,
            status: 3,
            is_allocated: false
          }
        }
      });
    } catch (error: any) {
      console.error('tenantRegister error:', error);
      // A concurrent registration can race past the pre-insert uniqueness check
      // above and hit the DB's unique index instead — surface the same friendly
      // message rather than a raw SQL error naming the index.
      if (error?.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ success: false, error: 'This phone, email, or ID proof number is already registered in this hostel. Please login instead.' });
      }
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
        .select(
          'students.*', 
          'rooms.room_number', 
          'rooms.rent_per_bed',
          'rooms.is_available as room_active',
          'hostel_master.is_active as hostel_active'
        )
        .leftJoin('rooms', 'rooms.room_id', 'students.room_id')
        .leftJoin('hostel_master', 'hostel_master.hostel_id', 'students.hostel_id')
        .where('students.student_id', studentId)
        .first();

      if (!tenant) {
        return res.status(404).json({ success: false, error: 'Tenant not found' });
      }

      // --- STRICT LOGIN VALIDATIONS ---
      if (!tenant.hostel_active) {
        return res.status(403).json({ success: false, error: 'This hostel is currently inactive. Contact administration.' });
      }
      // Instead of returning 403, just return a normal response with is_allocated: false
      // so the frontend can display the 'Pending Approval' or 'Not Allocated' UI
      // without spamming the console with 403 network errors during polling.

      const status = Number(tenant.status);
      // Allocated only once the owner has set a room AND marked the tenant active
      const isAllocated = tenant.room_id != null && status === 1 && tenant.room_active !== 0;

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
          room_id: tenant.room_id || null,
          room_number: tenant.room_number || null,
          bed_number: tenant.bed_number || null,
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

// ============================================
// STANDALONE TENANT PROFILE UPDATE
// ============================================

export const updateTenantProfile = async (req: AuthRequest, res: Response) => {
  try {
    const student_id = req.user?.user_id;
    const { name, phone, email } = req.body;
    if (!student_id) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const updates: any = {};
    if (name) {
      updates.first_name = name.split(' ')[0];
      updates.last_name = name.split(' ').slice(1).join(' ') || null;
    }
    if (phone) updates.phone = phone;
    if (email) updates.email = email;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    await db('students').where('student_id', student_id).update(updates);
    const updated = await db('students').where('student_id', student_id).first();

    res.json({
      success: true,
      data: {
        name: `${updated.first_name} ${updated.last_name || ''}`.trim(),
        phone: updated.phone,
        email: updated.email,
      },
    });
  } catch (error: any) {
    console.error('Error updating tenant profile:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

