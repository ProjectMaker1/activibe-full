// src/routes/chatRoutes.js
import express from 'express';
import {
  getMySessions,
  createSession,
  getSessionMessages,
  addUserMessage,
  deleteSession,
} from '../controllers/chatController.js';
import { authRequired } from '../middleware/authMiddleware.js';

const router = express.Router();

// ყველა ჩატი ავტორიზებული იუზერისთვის
router.get('/chat/sessions', authRequired, getMySessions);

// ახალი ჩატი (questionnaire-ის დასრულებისას ან Direct to AI დროს)
router.post('/chat/sessions', authRequired, createSession);

// კონკრეტული ჩატის მესიჯები (თუ დაგჭირდება)
router.get(
  '/chat/sessions/:id/messages',
  authRequired,
  getSessionMessages
);

// იუზერის მესიჯის დამატება
router.post(
  '/chat/sessions/:id/messages',
  authRequired,
  addUserMessage
);

// ჩატის წაშლა
router.delete('/chat/sessions/:id', authRequired, deleteSession);

export default router;
