// backend/src/routes/adminRoutes.js
import { Router } from 'express';
import {
  getAllCampaigns,
  getCampaign,
  updateCampaign,
  approveCampaign,
  rejectCampaign,
  removeCampaign,
  getUsersWithStats,
  blockUser,
  unblockUser,
  deleteUser,
  // 👇 ახალი კონტროლერები
  getCategories,
  createTopic,
  deleteTopic,
  createSubtopic,
  deleteSubtopic,
  getTools,
  createTool,
  deleteTool,
  createSubTool,
  deleteSubTool,
  reorderTopics,
  reorderSubtopics,
  reorderTools,
  reorderSubTools,
} from '../controllers/adminController.js';

import { authRequired, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// ყველა admin route → დაცულია auth + admin-ით
router.use(authRequired, requireAdmin);

// campaigns
router.get('/campaigns', getAllCampaigns);
router.get('/campaigns/:id', getCampaign);
router.put('/campaigns/:id', updateCampaign);
router.post('/campaigns/:id/approve', approveCampaign);
router.post('/campaigns/:id/reject', rejectCampaign);
router.delete('/campaigns/:id', removeCampaign);

// users stats
router.get('/users', getUsersWithStats);

// 🧑‍💼 user actions
router.post('/users/:id/block', blockUser);
router.post('/users/:id/unblock', unblockUser);
router.delete('/users/:id', deleteUser);

// ---------- CATEGORIES (Topics / SubTopics / Tools) ----------

// all topics + subtopics + tools
router.get('/categories', getCategories);

// topics
router.post('/topics', createTopic);
router.delete('/topics/:id', deleteTopic);

// subtopics
router.post('/topics/:topicId/subtopics', createSubtopic);
router.delete('/subtopics/:id', deleteSubtopic);

// tools
router.get('/tools', getTools);
router.post('/tools', createTool);
router.delete('/tools/:id', deleteTool);

router.post('/tools/:toolId/subtools', createSubTool);
router.delete('/subtools/:id', deleteSubTool);


router.patch('/topics/reorder', reorderTopics);
router.patch('/subtopics/reorder', reorderSubtopics);
router.patch('/tools/reorder', reorderTools);
router.patch('/subtools/reorder', reorderSubTools);

export default router;
