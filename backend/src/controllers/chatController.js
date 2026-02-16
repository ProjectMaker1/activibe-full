// backend/src/controllers/chatController.js
import {
  getUserSessions,
  createSession as createSessionService,
  getSessionWithMessages,
  addUserMessageAndBotReply,
  deleteSession as deleteSessionService,
  generateGuestBotReply, // ✅ NEW
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
      from: m.from === 'USER' ? 'user' : 'bot',
      text: m.text,
      ts: m.createdAt,
    })),
  };
}

// GET /chat/sessions (auth)
export async function getMySessions(req, res, next) {
  try {
    const userId = req.user.id;
    const sessions = await getUserSessions(userId);
    res.json({ sessions: sessions.map(mapSessionToDto) });
  } catch (err) {
    next(err);
  }
}

// POST /chat/sessions (auth)
export async function createSession(req, res, next) {
  try {
    const userId = req.user.id;
    const { topicName, mentorName, toolName, subToolName, withWelcome } =
      req.body || {};

    const session = await createSessionService(userId, {
      topicName: topicName ?? null,
      mentorName: mentorName ?? null,
      toolName: toolName ?? null,
      subToolName: subToolName ?? null,
      withWelcome: !!withWelcome,
    });

    res.status(201).json({ session: mapSessionToDto(session) });
  } catch (err) {
    next(err);
  }
}

// GET /chat/sessions/:id/messages (auth)
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

// POST /chat/sessions/:id/messages (auth)  -> { userMessage, botMessage }
export async function addUserMessage(req, res, next) {
  try {
    const userId = req.user.id;
    const sessionId = Number(req.params.id);
    const { text } = req.body || {};

    if (!text || !String(text).trim()) {
      return res.status(400).json({ message: 'Message text is required' });
    }

    const { userMessage, botMessage } = await addUserMessageAndBotReply(
      userId,
      sessionId,
      String(text).trim()
    );

    res.status(201).json({
      userMessage: {
        id: userMessage.id,
        from: 'user',
        text: userMessage.text,
        ts: userMessage.createdAt,
      },
      botMessage: {
        id: botMessage.id,
        from: 'bot',
        text: botMessage.text,
        ts: botMessage.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /chat/sessions/:id (auth)
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

/**
 * ✅ NEW: POST /chat/guest/reply  (NO AUTH)
 * body: { text, sessionMeta, history }
 * returns: { botMessage }
 *
 * ⚠️ Guest delete არ გვჭირდება backend-ზე — localStorage-ით აკეთებ.
 */
export async function guestReply(req, res) {
  try {
    const { text, sessionMeta, history } = req.body || {};

    if (!text || !String(text).trim()) {
      return res.status(400).json({ message: 'Message text is required' });
    }

    const botText = await generateGuestBotReply({
      sessionMeta: sessionMeta || {},
      userText: String(text).trim(),
      history: Array.isArray(history) ? history : [],
    });

    return res.json({
      botMessage: {
        id: `g-b-${Date.now()}`,
        from: 'bot',
        text: botText,
        ts: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.error('guestReply error:', e);
    return res
      .status(500)
      .json({ message: "Sorry — I’m having trouble answering right now." });
  }
}