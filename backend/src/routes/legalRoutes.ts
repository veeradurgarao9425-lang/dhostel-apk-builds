import express from 'express';
import {
  renderLegalPage,
  handleDataDeletionRequest,
  getLegalMetadata
} from '../controllers/legalController.js';

const router = express.Router();

// HTML Views (Public endpoints for Google Play Console and web browsers)
router.get('/privacy-policy', renderLegalPage('privacy'));
router.get('/privacy', renderLegalPage('privacy'));
router.get('/terms', renderLegalPage('terms'));
router.get('/terms-and-conditions', renderLegalPage('terms'));
router.get('/data-deletion', renderLegalPage('deletion'));
router.get('/delete-account', renderLegalPage('deletion'));

// API endpoints
router.get('/api/legal/info', getLegalMetadata);
router.post('/api/legal/data-deletion-request', handleDataDeletionRequest);

// Also alias under /api/ for flexible URL access
router.get('/api/privacy-policy', renderLegalPage('privacy'));
router.get('/api/terms', renderLegalPage('terms'));
router.get('/api/data-deletion', renderLegalPage('deletion'));

export default router;
