// backend/src/services/adminMailService.js
import { prisma } from '../config/prisma.js';
import { resend } from '../config/resend.js';

const FROM_EMAIL = process.env.MAIL_FROM || 'support@activibe.net';
const FROM_FULL = `ActiVibe <${FROM_EMAIL}>`;

// --- Helpers ---

function normEmail(v) {
  return String(v || '').trim().toLowerCase();
}

function safeText(v) {
  return String(v || '').trim();
}

// Resend attachments format: [{ filename, content }]
function mapAttachments(files) {
  if (!Array.isArray(files) || files.length === 0) return undefined;

  return files.map((f) => ({
    filename: f.originalname || 'attachment',
    // Resend supports base64 string for content
    content: Buffer.from(f.buffer).toString('base64'),
  }));
}

function mapResendError(err) {
  // Resend SDK error shape can vary; we normalize user-facing message.
  const msg =
    err?.message ||
    err?.error?.message ||
    err?.response?.data?.message ||
    'Failed to send email';

  // If attachment too large / payload too large → show professional message
  const lower = String(msg).toLowerCase();
  if (
    lower.includes('payload too large') ||
    lower.includes('too large') ||
    lower.includes('attachment') ||
    lower.includes('attachments')
  ) {
    const e = new Error(
      'Attachment too large. Please use a smaller file or remove some attachments.'
    );
    e.status = 413;
    throw e;
  }

  const e = new Error(msg);
  e.status = 400;
  throw e;
}

// --- Queries ---

export async function listMailThreads() {
  const threads = await prisma.mailThread.findMany({
    orderBy: { lastMessageAt: 'desc' },
    include: {
      user: { select: { id: true, email: true, username: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { subject: true, text: true, createdAt: true },
      },
    },
  });

  return threads.map((t) => {
    const last = t.messages?.[0] || null;
    return {
      id: t.id,
      userId: t.userId,
      userEmail: t.userEmail,
      username: t.user?.username || null,
      lastMessageAt: t.lastMessageAt,
      lastSubject: last?.subject || null,
      lastSnippet: last?.text ? String(last.text).slice(0, 120) : null,
      lastSentAt: last?.createdAt || null,
    };
  });
}

export async function getMailThreadById(threadId) {
  const id = Number(threadId);
  if (!id || Number.isNaN(id)) {
    const e = new Error('Invalid thread id');
    e.status = 400;
    throw e;
  }

  const thread = await prisma.mailThread.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, username: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          fromEmail: true,
          toEmail: true,
          subject: true,
          text: true,
          provider: true,
          providerMessageId: true,
          createdAt: true,
          sentByAdminId: true,
        },
      },
    },
  });

  if (!thread) {
    const e = new Error('Thread not found');
    e.status = 404;
    throw e;
  }

  return {
    id: thread.id,
    userId: thread.userId,
    userEmail: thread.userEmail,
    username: thread.user?.username || null,
    lastMessageAt: thread.lastMessageAt,
    createdAt: thread.createdAt,
    messages: thread.messages || [],
  };
}

export async function deleteMailThread(threadId) {
  const id = Number(threadId);
  if (!id || Number.isNaN(id)) {
    const e = new Error('Invalid thread id');
    e.status = 400;
    throw e;
  }

  // Cascade delete will delete MailMessage rows too (DB + prisma relation has onDelete: Cascade)
  await prisma.mailThread.delete({ where: { id } });
  return { success: true };
}

export async function sendAdminMail({ to, subject, text, files, adminUserId, threadId }) {
  const toEmail = normEmail(to);
  const subj = safeText(subject);
  const bodyText = safeText(text);

  if (!toEmail || !subj || !bodyText) {
    const e = new Error('to, subject and text are required');
    e.status = 400;
    throw e;
  }

  // We only allow sending to existing platform users (customers)
  const user = await prisma.user.findUnique({ where: { email: toEmail } });
  if (!user) {
    const e = new Error('User not found with this email');
    e.status = 404;
    throw e;
  }

  // Thread resolution:
  // - if threadId provided -> must exist and match same user
  // - else -> upsert by userId (unique)
  let thread = null;

  if (threadId) {
    const tid = Number(threadId);
    if (!tid || Number.isNaN(tid)) {
      const e = new Error('Invalid threadId');
      e.status = 400;
      throw e;
    }

    thread = await prisma.mailThread.findUnique({ where: { id: tid } });
    if (!thread) {
      const e = new Error('Thread not found');
      e.status = 404;
      throw e;
    }
    if (thread.userId !== user.id) {
      const e = new Error('Thread does not belong to this user');
      e.status = 400;
      throw e;
    }
  } else {
    thread = await prisma.mailThread.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        userEmail: user.email,
        lastMessageAt: new Date(),
      },
      update: {
        userEmail: user.email,
        lastMessageAt: new Date(),
      },
    });
  }

  // Build attachments for Resend
  const attachments = mapAttachments(files);

  // Send via Resend
  let providerId = null;
  try {
    const result = await resend.emails.send({
      from: FROM_FULL,
      to: [toEmail],
      subject: subj,
      text: bodyText,
      ...(attachments ? { attachments } : {}),
    });

    providerId = result?.data?.id ?? null;
  } catch (err) {
    mapResendError(err); // throws normalized error
  }

  // Log to DB (no attachments saved)
  const message = await prisma.mailMessage.create({
    data: {
      threadId: thread.id,
      fromEmail: FROM_EMAIL,
      toEmail,
      subject: subj,
      text: bodyText,
      provider: 'RESEND',
      providerMessageId: providerId,
      sentByAdminId: adminUserId ?? null,
    },
  });

  // Update thread lastMessageAt
  await prisma.mailThread.update({
    where: { id: thread.id },
    data: { lastMessageAt: message.createdAt },
  });

  return {
    success: true,
    threadId: thread.id,
    messageId: message.id,
    providerMessageId: providerId,
  };
}