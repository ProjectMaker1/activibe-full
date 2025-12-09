// backend/src/routes/campaignRoutes.js
import express from 'express';
import { authRequired, requireAdmin } from '../middleware/authMiddleware.js';
import {
  getPublicCampaigns,
  getAllCampaigns,
  createNewCampaign,
  updateCampaignStatus,
  deleteCampaign,
  getPublicCategories,
} from '../controllers/campaignController.js';

const router = express.Router();

// public campaigns
router.get('/campaigns', getPublicCampaigns);

// create campaign (any logged-in user)
router.post('/campaigns', authRequired, createNewCampaign);
router.get('/categories', getPublicCategories);

// admin routes
router.get('/admin/campaigns', authRequired, requireAdmin, getAllCampaigns);
router.patch(
  '/admin/campaigns/:id/status',
  authRequired,
  requireAdmin,
  updateCampaignStatus
);
router.delete('/admin/campaigns/:id', authRequired, requireAdmin, deleteCampaign);

export default router;
