import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authController, updateTenantProfile } from '../controllers/authController.js';
import { authMiddleware, isAdmin } from '../middleware/auth.js';

const router = Router();

// Storage for tenant self-registration KYC photos (profile photo + ID proof front/back)
const tenantRegisterUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `tenant-register-${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

// Public routes
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/check-phone', authController.checkPhone);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-reset-token', authController.verifyResetToken);
router.post('/verify-reset-otp', authController.verifyResetOtp);

// Tenant routes
router.post('/tenant/verify-hostel', authController.verifyHostelKey);
router.post('/tenant/send-otp', authController.tenantSendOtp);
router.post('/tenant/verify-otp', authController.tenantVerifyOtp);
router.post('/tenant/register', tenantRegisterUpload.fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'id_proof_front', maxCount: 1 },
  { name: 'id_proof_back', maxCount: 1 },
]), authController.tenantRegister);
router.get('/tenant/me', authMiddleware, authController.tenantMe);
router.put('/tenant/profile', authMiddleware, updateTenantProfile);

// Protected routes
router.get('/me', authMiddleware, authController.me);
router.post('/change-password', authMiddleware, authController.changePassword);
router.put('/active-hostel', authMiddleware, authController.switchActiveHostel);

// Admin only routes
router.post('/register-owner', authMiddleware, isAdmin, authController.registerOwner);

export default router;
