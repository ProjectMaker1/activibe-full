import express from 'express';
import {
  register,
  login,
  refresh,
  me,
  markBadgesSeen,
  markRewardsSeen,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resendForgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { authRequired } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/auth/register', register);
router.post('/auth/verify-email', verifyEmail);          // ✅ NEW
router.post('/auth/resend-code', resendVerification);    // ✅ NEW
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/forgot-password/resend', resendForgotPassword);
router.post('/auth/reset-password', resetPassword);
router.post('/auth/login', login);
router.post('/auth/refresh', refresh);
router.get('/auth/me', authRequired, me);
router.post('/auth/badges/seen', authRequired, markBadgesSeen);
router.post('/auth/rewards/seen', authRequired, markRewardsSeen);

export default router;