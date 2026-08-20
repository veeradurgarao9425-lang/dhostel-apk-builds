import express from 'express';
import {
  getIdProofTypes,
  getIdProofTypeById,
  createIdProofType,
  updateIdProofType,
  deleteIdProofType
} from '../controllers/idProofTypesController.js';
import { authMiddleware, isAdmin } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscriptionAuth.js';

const router = express.Router();

/**
 * GET /api/id-proof-types
 * Get all active ID proof types (public endpoint)
 * Used in dropdowns for student forms
 */
router.get('/', getIdProofTypes);

/**
 * GET /api/id-proof-types/:proofTypeId
 * Get a specific ID proof type
 */
router.get('/:proofTypeId', getIdProofTypeById);

/**
 * POST /api/id-proof-types
 * Create a new ID proof type (Super Admin only)
 */
router.post('/', authMiddleware, isAdmin, createIdProofType);

/**
 * PUT /api/id-proof-types/:proofTypeId
 * Update an ID proof type (Super Admin only)
 */
router.put('/:proofTypeId', authMiddleware, isAdmin, updateIdProofType);

/**
 * DELETE /api/id-proof-types/:proofTypeId
 * Delete an ID proof type (Super Admin only)
 */
router.delete('/:proofTypeId', authMiddleware, isAdmin, deleteIdProofType);

export default router;
