import express from 'express';
import { authMiddleware, isTenantOnly } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscriptionAuth.js';
import {
  getDashboard,
  getPaths,
  getPathLevels,
  getLevelDetail,
  completeLevel,
  saveVocabulary,
  getSavedVocabulary,
  getStats,
} from '../controllers/growthController.js';

const router = express.Router();

router.use(authMiddleware, requireActiveSubscription, isTenantOnly);

router.get('/dashboard', getDashboard);
router.get('/stats', getStats);

router.get('/paths', getPaths);
router.get('/paths/:pathKey/levels', getPathLevels);

router.get('/levels/:levelId', getLevelDetail);
router.post('/levels/:levelId/complete', completeLevel);

router.get('/vocabulary/saved', getSavedVocabulary);
router.post('/vocabulary/:vocabId/save', saveVocabulary);

export default router;
