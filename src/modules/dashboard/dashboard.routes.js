import { Router } from 'express';
import { getStats } from './dashboard.controller.js';
import { protect } from '../../middleware/auth.middleware.js';

const router = Router();
router.get('/stats', protect, getStats);
export default router;