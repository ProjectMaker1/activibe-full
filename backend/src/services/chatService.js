// backend/src/services/chatService.js
import { prisma } from '../config/prisma.js';
import { openai } from '../config/openai.js';
async function searchKnowledgeChunks(query, limit = 5) {
  const embeddingRes = await openai.embeddings.create({
    model: process.env.EMBEDDING_MODEL,
    input: query,
  });

  const embedding = embeddingRes.data[0].embedding;
  const vec = `[${embedding.join(",")}]`;

  const results = await prisma.$queryRaw`
    SELECT content, source, page
    FROM "KnowledgeChunk"
    ORDER BY embedding <-> ${vec}::vector
    LIMIT ${limit}
  `;

  return results;
}


/* -------------------- Static knowledge (site + nonviolence) -------------------- */

const SITE_KNOWLEDGE_ACTIVIBE = `
ActiVibe is a digital platform created to help people protect themselves and their values through creative, peaceful and non-violent action. It is designed especially for young people who care about justice, equality, human right and social change, but may not know where to begin.

Many young people want to make a difference, yet they often face confusion, lack of guidance, or overwhelming information. Activism content online can feel too political, too serious, or difficult to navigate. At the same time, thousands of non-violent campaigns take place around the world every year, showing that change is possible without violence. ActiVibe bridges this gap.

What is ActiVibe?
ActiVibe is an interactive, youth-friendly online platform that:
- Collects and promotes verified non-violent campaigns from around the world.
- Helps users discover causes aligned with their interests, values and skills.
- Guides new activists through a simple, supportive chatbot experience.
- Encourages creativity, empathy and peaceful participation.
- Rewards users who contribute and share meaningful campaigns.

The platform combines a global campaign database with an AI-guided journey. Instead of overwhelming users with information, ActiVibe acts as a friendly guide. It asks simple questions to understand a user’s interests, experience level and goals, then suggests relevant examples of peaceful action.

ActiVibe is not about promoting conflict. It is about empowering people to act responsibly, ethically and creatively.
`.trim();

const SITE_KNOWLEDGE_NONVIOLENCE = `
Nonviolent action is a method of creating social or political change without the use of physical violence. It is based on the belief that sustainable change comes through participation, awareness, solidarity and moral pressure, not harm.

Nonviolent action can include:
- Peaceful protests and demonstrations
- Creative art actions (murals, performances, digital campaigns)
- Community organizing
- Educational initiatives
- Social media advocacy
- Petitions and open letters
- Dialogue and awareness campaigns
- Boycotts and ethical consumer action

Nonviolent activism is rooted in responsibility and respect for human dignity. It aims to challenge injustice while minimizing harm. It transforms anger into constructive energy and frustration into meaningful participation.

The Idea Behind the Platform
ActiVibe is built on a simple idea: Young people are ready to act, they just need the right tools, inspiration and guidance.

The platform does not tell users what to believe. Instead, it:
- Encourages critical thinking
- Supports peaceful engagement
- Provides real examples of campaigns
- Promotes global solidarity
- Creates a safe digital space for exploration

Core Values: nonviolence, inclusivity, youth empowerment, creativity, responsibility, global cooperation, transparency.

ActiVibe empowers a new generation of peaceful changemakers by making activism accessible, understandable and inspiring.
It transforms awareness into action, safely and creatively.
`.trim();

/* -------------------- Model + controls -------------------- */

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// რამდენი history მესიჯი მივცეთ AI-ს (ფასიც კონტროლდება)
const MAX_HISTORY_MESSAGES = 10;

// რამდენი კამპანია დავუდოთ context-ში მაქსიმუმ (ყველას ვერ ჩატევ)
const CAMPAIGN_CONTEXT_LIMIT = 20;

// პასუხები რომ არ იყოს ძალიან გრძელი
const MAX_OUTPUT_TOKENS = 260;

// ცოტა სტაბილური, მოკლე და “ადამიანური”
const TEMPERATURE = 0.5;

/* -------------------- URL helper -------------------- */

function getPublicAppUrl() {
  return (
    process.env.PUBLIC_APP_URL ||
    process.env.FRONTEND_URL ||
    'http://localhost:5173'
  );
}

/* -------------------- Off-topic detection (NOT hard block) -------------------- */
/**
 * ეს აღარ ბლოკავს AI-ს.
 * უბრალოდ ვუკეთებთ "soft" მინიშნებას prompt-ში, რომ თქვას: ეს off-topicაა და დააბრუნოს user თემატურ ჩარჩოში.
 */
function isLikelyOffTopic(text) {
  const t = String(text || '').toLowerCase();

  // obvious coding / dev requests
  const off = [
    'python',
    'javascript',
    'react',
    'node',
    'coding',
    'programming',
    'java',
    'c++',
    'sql',
    'algorithm',
    'leetcode',
    'bug',
    'stack trace',
    'css',
    'html',
  ];
  if (off.some((k) => t.includes(k))) return true;

  // generic "teach me X" not activism-related
  if (/\bteach me\b/.test(t) && !t.includes('nonviolent') && !t.includes('activism')) {
    return true;
  }

  return false;
}

/* -------------------- Campaign context helpers -------------------- */

// user ტექსტიდან campaign ID ამოიღე (მაგ: "#12", "campaign 12", "id:12")
function extractCampaignId(text) {
  const t = String(text || '');
  const m =
    t.match(/#\s*(\d{1,10})\b/) ||
    t.match(/\bcampaign\s+(\d{1,10})\b/i) ||
    t.match(/\bid\s*:\s*(\d{1,10})\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

async function getCampaignByIdForContext(id) {
  const base = getPublicAppUrl().replace(/\/$/, '');
  const c = await prisma.campaign.findFirst({
    where: { id, status: 'APPROVED' },
select: {
  id: true,
  title: true,
  description: true,
  country: true,
  createdAt: true,
  topics: true,
  subtopics: true,
  tools: true,
  subTools: true,
  startDate: true,
  endDate: true,
  isOngoing: true,
},

  });
  if (!c) return [];
  return [{ ...c, url: `${base}/campaigns/${c.id}` }];
}

async function getLatestApprovedCampaigns(limit) {
  const base = getPublicAppUrl().replace(/\/$/, '');
  const campaigns = await prisma.campaign.findMany({
    where: { status: 'APPROVED' },
    orderBy: { createdAt: 'desc' },
    take: limit,
select: {
  id: true,
  title: true,
  description: true,
  country: true,
  createdAt: true,
  topics: true,
  subtopics: true,
  tools: true,
  subTools: true,
  startDate: true,
  endDate: true,
  isOngoing: true,
},

  });
  return campaigns.map((c) => ({ ...c, url: `${base}/campaigns/${c.id}` }));
}

async function searchApprovedCampaignsForContext(
  userText,
  limit = CAMPAIGN_CONTEXT_LIMIT
) {
  const q = (userText || '').trim();
  const wantsLatest = /\b(latest|newest|recent|last)\b/i.test(q);
  const wantsAll = /\b(all campaigns|all approved campaigns|list campaigns|show campaigns)\b/i.test(q);

  // 1) თუ user-მ ID ახსენა → ზუსტად ის კამპანია
  const id = extractCampaignId(q);
  if (id) {
    const byId = await getCampaignByIdForContext(id);
    if (byId.length) return byId;
  }

  // 2) "latest" ან ძალიან მოკლე query → latest
  if (wantsLatest || q.length < 3) {
    return getLatestApprovedCampaigns(limit);
  }

  // 3) "all campaigns" → context-ში მაინც top N
  if (wantsAll) {
    return getLatestApprovedCampaigns(limit);
  }

  // 4) Relevant search (contains, insensitive)
  const base = getPublicAppUrl().replace(/\/$/, '');
  const campaigns = await prisma.campaign.findMany({
    where: {
      status: 'APPROVED',
OR: [
  { title: { contains: q, mode: 'insensitive' } },
  { description: { contains: q, mode: 'insensitive' } },
  { country: { contains: q, mode: 'insensitive' } },
],

    },
    orderBy: { createdAt: 'desc' },
    take: limit,
select: {
  id: true,
  title: true,
  description: true,
  country: true,
  createdAt: true,
  topics: true,
  subtopics: true,
  tools: true,
  subTools: true,
  startDate: true,
  endDate: true,
  isOngoing: true,
},

  });

  if (!campaigns.length) {
    return getLatestApprovedCampaigns(Math.min(6, limit));
  }

  return campaigns.map((c) => ({ ...c, url: `${base}/campaigns/${c.id}` }));
}

function buildCampaignsContextText(campaigns) {
  if (!campaigns.length) return 'No approved campaigns found.';
  return campaigns
    .map((c) => {
      const parts = [
        `#${c.id}: ${c.title}`,
c.topics ? `topics: ${JSON.stringify(c.topics)}` : null,
c.subtopics ? `subtopics: ${JSON.stringify(c.subtopics)}` : null,
c.tools ? `tools: ${JSON.stringify(c.tools)}` : null,
c.subTools ? `subTools: ${JSON.stringify(c.subTools)}` : null,
c.startDate ? `startDate: ${new Date(c.startDate).toISOString().slice(0, 10)}` : null,
c.endDate ? `endDate: ${new Date(c.endDate).toISOString().slice(0, 10)}` : null,
c.isOngoing ? `isOngoing: true` : null,

        `url: ${c.url}`,
      ].filter(Boolean);

      const desc = (c.description || '').trim();
      const shortDesc = desc.length > 220 ? `${desc.slice(0, 220)}…` : desc;

      return `${parts.join(' | ')}${shortDesc ? `\n  - ${shortDesc}` : ''}`;
    })
    .join('\n');
}

/* -------------------- Persona + system prompt -------------------- */

function buildPersonaBlock(session) {
  const mentorName =
    session?.mentorName && session.mentorName !== 'ActiVibe Assistant'
      ? session.mentorName
      : null;

  const topicName = session?.topicName || null;
  const toolName = session?.toolName || null;
  const subToolName = session?.subToolName || null;

  const topicStatus = topicName
    ? `Topic selected: ${topicName}`
    : `No specific topic selected`;

  const toolStatus =
    toolName && subToolName
      ? `Tool selected: ${toolName} → ${subToolName}`
      : toolName
      ? `Tool selected: ${toolName}`
      : `Tool selection: user clicked "I don't know" or skipped`;

  const personaIntro = mentorName
    ? `
Persona:
- You speak as "${mentorName}" (virtual mentor simulation).
- Sound human, grounded and experienced.
- Do NOT repeatedly introduce yourself.
`
    : `
Persona:
- You are the ActiVibe Assistant.
- Friendly, sharp, practical, and emotionally intelligent.
`;

  return `
${personaIntro}

Session awareness:
- ${topicStatus}
- ${toolStatus}

Advanced behavior rules:
- Always subtly demonstrate awareness of the selected topic/tool.
- Never mechanically repeat the selections.
- If user clicked "I don't know", switch into Guidance Mode.
- If user sounds uncertain, overwhelmed, or vague → lead confidently.
- Ask at most ONE thoughtful question at a time.
- When clarity increases → switch into Planning Mode.

Guidance Mode:
- Ask what personally matters to them.
- Ask what they are strong at (writing, organizing, speaking, research, online work).
- Ask how much time they realistically have.
- Offer 2–3 structured options.

Planning Mode:
When appropriate, provide a short structured action plan:

1. Clear Goal
2. Why it matters
3. Suggested Tool (aligned with session context)
4. First safe step (very small and realistic)
5. Optional next level step

Tone:
- Calm, intelligent, empowering.
- Never preachy.
- Never robotic.
- Never overly long.
- Speak like a thoughtful mentor, not a chatbot.

`.trim();
}


function buildSystemPrompt(session) {
  return `
You are the ActiVibe Assistant inside the ActiVibe web app.

Truth about the website:
${SITE_KNOWLEDGE_ACTIVIBE}

Truth about nonviolent action:
${SITE_KNOWLEDGE_NONVIOLENCE}

Primary mission:
Help young people transform confusion into safe, non-violent action.

Core intelligence principles:
- Always be context-aware.
- Use the session selections (topic/tool/sub-tool) intelligently.
- If tool selection is unknown → guide instead of waiting.
- If user is motivated → structure next steps.
- If user is lost → gently lead.

Conversation leadership:
- Do not just answer.
- Direct the conversation when needed.
- Help the user think clearly.
- Simplify complexity.
- Offer structure.

When user is unsure:
- Ask about:
  • What bothers them most.
  • What kind of impact they want (local, online, community, global).
  • What they feel confident doing.
- Then propose 2–3 tailored directions.

When user is ready:
Provide structured mini action plans.

Action plan format:
1. Goal
2. Tool (aligned with session context)
3. First safe step (small, doable)
4. Optional next step

Campaign usage rules:
- Only use campaigns from provided context.
- Always use Markdown links when referencing campaigns.
- Never output plain URLs.
- If listing campaigns, limit to 3–5 relevant ones.

Safety:
- Promote legal, non-violent civic participation.
- Refuse violent or harmful instructions.

Style rules:
- 2–6 short paragraphs maximum.
- Clear structure.
- Confident tone.
- No filler.
- No repeated boilerplate.
- Sound human and intelligent.

${buildPersonaBlock(session)}
`.trim();
}


/* -------------------- OpenAI call -------------------- */

function toChatMessage(role, content) {
  return { role, content: String(content || '') };
}

async function generateBotReply({ session, userText, campaigns, offTopicHint }) {
  const campaignsText = buildCampaignsContextText(campaigns);
// 🔎 RAG: retrieve from PDF knowledge base
let pdfContext = '';
try {
  const chunks = await searchKnowledgeChunks(userText, 5);
  pdfContext = chunks
    .map(
      (c) =>
        `[${c.source} – page ${c.page}]\n${c.content}`
    )
    .join('\n\n');
} catch (e) {
  console.error('RAG search error:', e);
}

  const history = (session.messages || [])
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({
      role: m.from === 'USER' ? 'user' : 'assistant',
      content: m.text,
    }));

  const messages = [
    toChatMessage('system', buildSystemPrompt(session)),
    toChatMessage(
      'system',
      `Approved campaigns context (most recent first). Use ONLY these for campaign facts:\n${campaignsText}`
    ),
    ...(pdfContext
  ? [
      toChatMessage(
        'system',
        `Knowledge base context from uploaded PDFs. Use this for factual information:\n${pdfContext}`
      ),
    ]
  : []),

    ...(offTopicHint
      ? [
          toChatMessage(
            'system',
            `Note: The user's last message looks off-topic for ActiVibe. Respond briefly, then redirect to what ActiVibe can help with (topics/campaigns/non-violent actions). Do not use a repeated canned sentence.`
          ),
        ]
      : []),
    ...history,
    toChatMessage('user', userText),
  ];

  const resp = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages,
    temperature: TEMPERATURE,
  });

  const text = (resp.choices?.[0]?.message?.content || '').trim();
  return text || "Sorry — I couldn't generate a response right now.";
}

/* -------------------- Public service functions (DB) -------------------- */

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

// იუზერის მესიჯის დამატება (ძველი ფუნქცია, უცვლელი — თუ სადმე გჭირდება)
export async function addUserMessage(userId, sessionId, content) {
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
      from: 'USER',
      text: content,
    },
  });

  return msg;
}

// ახალი: იუზერის მესიჯი + AI პასუხი + BOT მესიჯის შენახვა
export async function addUserMessageAndBotReply(userId, sessionId, content) {
  const session = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!session) {
    const err = new Error('Chat not found');
    err.status = 404;
    throw err;
  }

  // 1) USER მესიჯი
  const userMessage = await prisma.chatMessage.create({
    data: {
      sessionId,
      from: 'USER',
      text: content,
    },
  });

  const sessionForAi = {
    ...session,
    messages: [...(session.messages || []), userMessage],
  };

  // 2) campaign context (always fetch; it’s cheap DB query, helps redirect)
  const campaigns = await searchApprovedCampaignsForContext(
    content,
    CAMPAIGN_CONTEXT_LIMIT
  );

  // 3) AI პასუხი (off-topic হলে "soft hint" მიეცემა)
  const offTopicHint = isLikelyOffTopic(content);

  let botText = '';
  try {
    botText = await generateBotReply({
      session: sessionForAi,
      userText: content,
      campaigns,
      offTopicHint,
    });
  } catch (e) {
    console.error('OpenAI error:', e);
    botText =
      "Sorry — I’m having trouble answering right now. Please try again in a moment.";
  }

  // 4) BOT მესიჯი
  const botMessage = await prisma.chatMessage.create({
    data: {
      sessionId,
      from: 'BOT',
      text: botText,
    },
  });

  return { userMessage, botMessage };
}

// ჩატის წაშლა
export async function deleteSession(userId, sessionId) {
  const session = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId },
  });

  if (!session) {
    const err = new Error('Chat not found');
    err.status = 404;
    throw err;
  }

  await prisma.chatMessage.deleteMany({
    where: { sessionId },
  });

  await prisma.chatSession.delete({
    where: { id: sessionId },
  });
}
// ✅ Guest: AI პასუხი auth-ის გარეშე (DB-ში არ წერს)
export async function generateGuestBotReply({ sessionMeta, userText, history = [] }) {
  // history: [{ from: 'USER'|'BOT'|'user'|'bot', text: '...' }, ...]

  const normalizedHistory = (history || [])
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({
      from: String(m.from || '').toUpperCase() === 'USER' ? 'USER' : 'BOT',
      text: String(m.text || ''),
    }));

  const fakeSessionForAi = {
    mentorName: sessionMeta?.mentorName || null,
    topicName: sessionMeta?.topicName || null,
    toolName: sessionMeta?.toolName || null,
    subToolName: sessionMeta?.subToolName || null,
    messages: normalizedHistory,
  };

  const campaigns = await searchApprovedCampaignsForContext(
    userText,
    CAMPAIGN_CONTEXT_LIMIT
  );

  const offTopicHint = isLikelyOffTopic(userText);

  const botText = await generateBotReply({
    session: fakeSessionForAi,
    userText,
    campaigns,
    offTopicHint,
  });

  return botText;
}