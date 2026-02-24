// backend/src/controllers/adminMailController.js
import {
  listMailThreads,
  getMailThreadById,
  sendAdminMail,
  deleteMailThread,
} from '../services/adminMailService.js';

export async function getMailThreads(req, res, next) {
  try {
    const threads = await listMailThreads();
    res.json({ threads });
  } catch (err) {
    next(err);
  }
}

export async function getMailThread(req, res, next) {
  try {
    const thread = await getMailThreadById(req.params.id);
    res.json({ thread });
  } catch (err) {
    next(err);
  }
}

export async function sendMail(req, res, next) {
  try {
    const { to, subject, text, threadId } = req.body || {};
    const files = req.files || [];

    const result = await sendAdminMail({
      to,
      subject,
      text,
      threadId,
      files,
      adminUserId: req.user?.id,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function removeMailThread(req, res, next) {
  try {
    const result = await deleteMailThread(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}