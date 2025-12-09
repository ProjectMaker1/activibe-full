// src/services/chatService.js
import { prisma } from '../config/prisma.js';

// ყველა ჩატი კონკრეტული იუზერისთვის
export async function getUserSessions(userId) {
  const sessions = await prisma.chatSession.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  return sessions;
}

// ახალი ჩატის შექმნა
export async function createSession(userId, payload) {
  const {
    topicName = null,
    mentorName = null,
    toolName = null,
    subToolName = null,
    withWelcome = false,
  } = payload;

  const baseData = {
    userId,
    topicName,
    mentorName,
    toolName,
    subToolName,
  };

  // თუ გვინდა welcome მესიჯიც
  if (withWelcome && mentorName && topicName) {
    return prisma.chatSession.create({
      data: {
        ...baseData,
        messages: {
          create: [
            {
              from: 'BOT', // ChatSender.BOT
              text: `Hello! I’m ${mentorName} (virtual mentor). Let’s explore ${topicName.toLowerCase()} together.`,
            },
          ],
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  return prisma.chatSession.create({
    data: baseData,
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

// კონკრეტული ჩატის წამოღება + მესიჯები
export async function getSessionWithMessages(userId, sessionId) {
  const session = await prisma.chatSession.findFirst({
    where: {
      id: sessionId,
      userId,
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  return session;
}

// იუზერის მესიჯის დამატება
export async function addUserMessage(userId, sessionId, content) {
  // ownership check
  const session = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId },
  });

  if (!session) {
    const err = new Error('Chat not found');
    err.status = 404;
    throw err;
  }

  const msg = await prisma.chatMessage.create({
    data: {
      sessionId,
      from: 'USER', // ChatSender.USER
      text: content,
    },
  });

  return msg;
}

// ჩატის წაშლა (მხოლოდ თავისი)
export async function deleteSession(userId, sessionId) {
  const session = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId },
  });

  if (!session) {
    const err = new Error('Chat not found');
    err.status = 404;
    throw err;
  }

  // სურვილის შემთხვევაში ეს ნაბიჯი შეიძლება გამოტოვო, Cascade უკვე გაქვს,
  // მაგრამ ისე უფრო უსაფრთხოა:
  await prisma.chatMessage.deleteMany({
    where: { sessionId },
  });

  await prisma.chatSession.delete({
    where: { id: sessionId },
  });
}
