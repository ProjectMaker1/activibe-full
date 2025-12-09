import express from 'express';
import {
  register,
  login,
  refresh,
  me,
  markBadgesSeen,
} from '../controllers/authController.js';
import { authRequired } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/refresh', refresh);
router.get('/auth/me', authRequired, me);
router.post('/auth/badges/seen', authRequired, markBadgesSeen);

export default router;
