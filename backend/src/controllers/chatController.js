// src/controllers/chatController.js
import {
  getUserSessions,
  createSession as createSessionService,
  getSessionWithMessages,
  addUserMessage as addUserMessageService,
  deleteSession as deleteSessionService,
} from '../services/chatService.js';

// DB მოდელი → frontend DTO
function mapSessionToDto(session) {
  return {
    id: session.id,
    topicName: session.topicName,
    mentorName: session.mentorName,
    toolName: session.toolName,
    subToolName: session.subToolName,
    createdAt: session.createdAt,
    messages: (session.messages || []).map((m) => ({
      id: m.id,
      from: m.from === 'USER' ? 'user' : 'bot', // USER → 'user', დანარჩენი → 'bot'
      text: m.text,
      ts: m.createdAt,
    })),
  };
}

// GET /chat/sessions
export async function getMySessions(req, res, next) {
  try {
    const userId = req.user.id;
    const sessions = await getUserSessions(userId);
    res.json({ sessions: sessions.map(mapSessionToDto) });
  } catch (err) {
    next(err);
  }
}

// POST /chat/sessions
export async function createSession(req, res, next) {
  try {
    const userId = req.user.id;
    const {
      topicName,
      mentorName,
      toolName,
      subToolName,
      withWelcome,
    } = req.body;

    const session = await createSessionService(userId, {
      topicName,
      mentorName,
      toolName,
      subToolName,
      withWelcome,
    });

    res.status(201).json({ session: mapSessionToDto(session) });
  } catch (err) {
    next(err);
  }
}

// GET /chat/sessions/:id/messages
export async function getSessionMessages(req, res, next) {
  try {
    const userId = req.user.id;
    const sessionId = Number(req.params.id);

    const session = await getSessionWithMessages(userId, sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    res.json({ session: mapSessionToDto(session) });
  } catch (err) {
    next(err);
  }
}

// POST /chat/sessions/:id/messages
export async function addUserMessage(req, res, next) {
  try {
    const userId = req.user.id;
    const sessionId = Number(req.params.id);
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Message text is required' });
    }

    const msg = await addUserMessageService(userId, sessionId, text.trim());

    res.status(201).json({
      message: {
        id: msg.id,
        from: 'user',
        text: msg.text,
        ts: msg.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /chat/sessions/:id
export async function deleteSession(req, res, next) {
  try {
    const userId = req.user.id;
    const sessionId = Number(req.params.id);

    await deleteSessionService(userId, sessionId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
