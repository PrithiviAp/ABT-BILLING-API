import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, getMe } from './auth.controller.js';
import { protect } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authLimiter } from '../../middleware/rateLimiter.middleware.js';

const router = Router();

router.post('/register', validate([
  body('name').notEmpty().withMessage('Name is required'),
  body('mobile')
    .matches(/^\+91[6-9]\d{9}$/)
    .withMessage('Valid Indian mobile number required (+91 followed by 10 digits)'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 characters'),
]), register);

router.post('/login', authLimiter, validate([
  body('mobile')
    .matches(/^\+91[6-9]\d{9}$/)
    .withMessage('Valid Indian mobile number required'),
  body('password').notEmpty().withMessage('Password required'),
]), login);

router.get('/me', protect, getMe);

export default router;