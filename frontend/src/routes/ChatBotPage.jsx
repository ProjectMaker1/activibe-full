// frontend/src/routes/ChatBotPage.jsx
import React, { useEffect, useState } from 'react';
import { apiRequest, withAuth } from '@shared/apiClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/Loader.jsx';

const TOPIC_ICON_MAP = {
  'Democracy, Freedom & Governance': '🗳️',
  'Environmental & Climate Justice': '🌍',
  "Gender Equality & Women's Empowerment": '⚧️',
  'Human Rights & Equality': '🤝',
  'Peace & Anti-War Movements': '☮️',
  'School, University & Education': '🎓',
};

const TOPIC_MENTOR_MAP = {
  'Democracy, Freedom & Governance': 'Václav Havel',
  'Environmental & Climate Justice': 'Greta Thunberg',
  "Gender Equality & Women's Empowerment": 'Malala Yousafzai',
  'Human Rights & Equality': 'Nelson Mandela',
  'Peace & Anti-War Movements': 'Mahatma Gandhi',
  'School, University & Education': 'Nelson Mandela',
};

const TOPIC_VIDEO_KEY_MAP = {
  'Democracy, Freedom & Governance': 'Democracy',
  'Environmental & Climate Justice': 'Environmental',
  "Gender Equality & Women's Empowerment": 'GenderEquality',
  'Human Rights & Equality': 'HumanRights',
  'Peace & Anti-War Movements': 'Peace',
  'School, University & Education': 'School',
};

const MENTOR_AVATAR_MAP = {
  'Václav Havel': '/activists-avatar/Vaclav Havel.jpeg',
  'Greta Thunberg': '/activists-avatar/Greta Thunberg.webp',
  'Malala Yousafzai': '/activists-avatar/Malala Yousafzai.webp',
  'Nelson Mandela': '/activists-avatar/Nelson Mandela.webp',
  'Mahatma Gandhi': '/activists-avatar/Mahatma Gandhi.webp',
  'Martin Luther King Jr.': '/activists-avatar/Martin Luther King Jr.webp',
};

// 🔹 guest ჩატებისთვის localStorage key
const GUEST_CHAT_KEY = 'activibe_guest_chats_v1';

function loadGuestChats() {
  try {
    const raw = localStorage.getItem(GUEST_CHAT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load guest chats', e);
    return [];
  }
}

function saveGuestChats(chats) {
  try {
    localStorage.setItem(GUEST_CHAT_KEY, JSON.stringify(chats));
  } catch (e) {
    console.error('Failed to save guest chats', e);
  }
}

function ChatBotPage() {
  const { tokens } = useAuth(); // 👈 აქედან ვიღებთ accessToken-ს

  const [topics, setTopics] = useState([]);
  const [tools, setTools] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [mode, setMode] = useState('questionnaire'); // 'questionnaire' | 'mentor' | 'chat'
  const [step, setStep] = useState(1); // 1 = topic, 2 = tools

  // ჩატები (თუნდაც guest, თუნდაც DB)
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);

  const [currentMessage, setCurrentMessage] = useState('');

  // answers
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [selectedToolId, setSelectedToolId] = useState('');
  const [selectedSubToolName, setSelectedSubToolName] = useState('');

  /* ---------- Helper: normalize chat from backend ---------- */
  const normalizeChat = (raw) => ({
    id: raw.id,
    topicName: raw.topicName ?? null,
    mentorName: raw.mentorName ?? 'ActiVibe Assistant',
    toolName: raw.toolName ?? null,
    subToolName: raw.subToolName ?? null,
    createdAt: raw.createdAt,
    messages: raw.messages || [],
  });

  /* ---------- topics + tools ჩატვირთვა /categories-დან ---------- */
  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiRequest('/categories');
        if (!cancelled) {
          setTopics(res.topics || []);
          setTools(res.tools || []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setError(err.message || 'Failed to load topics');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- ჩატების ჩატვირთვა (auth = DB, guest = localStorage) ---------- */
  useEffect(() => {
    let cancelled = false;

    const loadChats = async () => {
      const hasToken = !!tokens?.accessToken;

      // 👉 ავტორიზებული იუზერი → backend
      if (hasToken) {
        try {

   const res = await apiRequest(
  '/chat/sessions',
  withAuth(tokens.accessToken)
);
if (cancelled) return;

const serverChats = (res.sessions || []).map(normalizeChat);
setChats(serverChats);

if (serverChats.length > 0) {
  setActiveChatId(serverChats[0].id);
  setMode('chat');      // 👉 ფეიჯი ჩატზე გადავიდეს
} else {
  setActiveChatId(null);
  setMode('questionnaire');
  setStep(1);
}
       
        } catch (err) {
          if (!cancelled) {
            console.error('Failed to load chats', err);
          }
        }
        return;
      }

const stored = loadGuestChats();
if (!cancelled) {
  setChats(stored);

  if (stored.length > 0) {
    setActiveChatId(stored[0].id);
    setMode('chat');      // 👉 პირდაპირ ჩატზე
  } else {
    setActiveChatId(null);
    setMode('questionnaire');
    setStep(1);
  }
}

    };

    loadChats();
    return () => {
      cancelled = true;
    };
  }, [tokens]);

  const selectedTopic =
    topics.find((t) => t.id === selectedTopicId) || null;
  const selectedTool =
    tools.find((t) => t.id === Number(selectedToolId)) || null;
  const subToolsOptions = selectedTool?.subTools || [];

  const activeChat = chats.find((c) => c.id === activeChatId) || null;

  /* ---------- ახალი ჩატის შექმნა (auth → DB, guest → localStorage) ---------- */
  const startNewChat = async ({
    topicName = null,
    mentorName = null,
    toolName = null,
    subToolName = null,
    withWelcome = false,
  }) => {
    const hasToken = !!tokens?.accessToken;

    // 🔹 1) ავტორიზებული: ვწერთ ბაზაში
    if (hasToken) {
      try {
        const body = {
          topicName,
          mentorName: mentorName || 'ActiVibe Assistant',
          toolName,
          subToolName,
          withWelcome,
        };

        const res = await apiRequest(
          '/chat/sessions',
          withAuth(tokens.accessToken, {
            method: 'POST',
            body,
          })
        );

        if (!res || !res.session) return;

        const chat = normalizeChat(res.session);

        setChats((prev) => [...prev, chat]);
        setActiveChatId(chat.id);
        setCurrentMessage('');
      } catch (err) {
        console.error('Failed to start new chat', err);
      }
      return;
    }

    // 🔹 2) guest: ვწერთ მხოლოდ localStorage-ში
    const now = new Date();
    const id = now.getTime();
    const createdAt = now.toISOString();

    const chat = {
      id,
      topicName,
      mentorName: mentorName || 'ActiVibe Assistant',
      toolName,
      subToolName,
      createdAt,
      messages: [],
    };

    if (withWelcome && mentorName && topicName) {
      chat.messages.push({
        id: id + 1,
        from: 'bot',
        text: `Hello! I’m ${mentorName} (virtual mentor). Let’s explore ${topicName.toLowerCase()} together.`,
        ts: createdAt,
      });
    }

    setChats((prev) => {
      const updated = [...prev, chat];
      saveGuestChats(updated);
      return updated;
    });
    setActiveChatId(id);
    setCurrentMessage('');
  };

  /* ---------- მესიჯის გაგზავნა (auth → DB, guest → localStorage) ---------- */
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!activeChat || !currentMessage.trim()) return;

    const text = currentMessage.trim();
    setCurrentMessage('');

    const hasToken = !!tokens?.accessToken;

    // 🔹 ავტორიზებული იუზერი → backend
    if (hasToken) {
      try {
        const res = await apiRequest(
          `/chat/sessions/${activeChat.id}/messages`,
          withAuth(tokens.accessToken, {
            method: 'POST',
            body: { text },
          })
        );

        if (res && res.message) {
          const msg = res.message; // { id, from, text, ts }
          setChats((prev) =>
            prev.map((chat) =>
              chat.id === activeChat.id
                ? { ...chat, messages: [...chat.messages, msg] }
                : chat
            )
          );
          return;
        }

        // fallback – თუ message არ მოვიდა, მაინც დავამატოთ user მესიჯი
        const nowTs = new Date().toISOString();
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === activeChat.id
              ? {
                  ...chat,
                  messages: [
                    ...chat.messages,
                    { id: Date.now(), from: 'user', text, ts: nowTs },
                  ],
                }
              : chat
          )
        );
      } catch (err) {
        console.error('Failed to send message', err);
      }
      return;
    }

    // 🔹 guest → მხოლოდ state + localStorage
    const nowTs = new Date().toISOString();
    setChats((prev) => {
      const updated = prev.map((chat) =>
        chat.id === activeChat.id
          ? {
              ...chat,
              messages: [
                ...chat.messages,
                { id: Date.now(), from: 'user', text, ts: nowTs },
              ],
            }
          : chat
      );
      saveGuestChats(updated);
      return updated;
    });
  };

  /* ---------- ჩატის წაშლა (auth → DB, guest → localStorage) ---------- */
  const handleDeleteChat = async (chatId) => {
    const chatToDelete = chats.find((c) => c.id === chatId);
    if (!chatToDelete) return;

    const ok = window.confirm(
      'Are you sure you want to delete this conversation?'
    );
    if (!ok) return;

    const hasToken = !!tokens?.accessToken;

    // 🔹 ავტორიზებული იუზერი → backend + state
    if (hasToken) {
      try {
        await apiRequest(
          `/chat/sessions/${chatId}`,
          withAuth(tokens.accessToken, {
            method: 'DELETE',
          })
        );

        setChats((prev) => {
          const updated = prev.filter((c) => c.id !== chatId);
          const stillHasActive = updated.some(
            (c) => c.id === activeChatId
          );
          if (!stillHasActive) {
            setActiveChatId(updated.length ? updated[0].id : null);
          }
          return updated;
        });
      } catch (err) {
        console.error('Failed to delete chat', err);
      }
      return;
    }

    // 🔹 guest → მხოლოდ state + localStorage
    setChats((prev) => {
      const updated = prev.filter((c) => c.id !== chatId);
      const stillHasActive = updated.some((c) => c.id === activeChatId);
      if (!stillHasActive) {
        setActiveChatId(updated.length ? updated[0].id : null);
      }
      saveGuestChats(updated);
      return updated;
    });
  };

  /* ---------- Step change handlers ---------- */

  const handleSelectTopic = (topicId) => {
    setSelectedTopicId((prev) => (prev === topicId ? null : topicId));
  };

  const handleContinueStep1 = () => {
    if (!selectedTopicId) return;
    setStep(2);
  };

  const handleBackToStep1 = () => {
    setStep(1);
  };

  // ❗ Direct to AI – არ ბლოკავს guest-ს, უბრალოდ სხვანაირად ინახავს
  const handleDirectToAI = async () => {
    setSelectedTopicId(null);
    setSelectedToolId('');
    setSelectedSubToolName('');

    await startNewChat({
      mentorName: null, // generic assistant
      withWelcome: false,
    });

    setMode('chat');
  };

  const handleToolChange = (e) => {
    const value = e.target.value;
    setSelectedToolId(value);
    setSelectedSubToolName('');
  };

  const handleSubToolChange = (e) => {
    setSelectedSubToolName(e.target.value);
  };

  const handleContinueStep2 = () => {
    if (!selectedToolId) return;
    setMode('mentor');
  };

  const handleIdontKnow = () => {
    setSelectedToolId('');
    setSelectedSubToolName('');
    setMode('mentor');
  };
// ❗ topics/tools იტვირთება? ვაჩვენოთ loader
if (loading) {
  return <Loader />;
}

  /* ---------- Chat UI view ---------- */
  if (mode === 'chat') {
    const activeAvatarSrc =
      activeChat?.mentorName &&
      MENTOR_AVATAR_MAP[activeChat.mentorName];

    return (
      <div className="page chatbot-page">
<section className="page-header">
  <h1 className="chatbot-page-title">How do you want to act today?</h1>
  <p>
    Talk to a virtual activist mentor and plan safe, non-violent
    actions.
  </p>
</section>


        <div className="chatbot-chat-layout">
          {/* მარცხენა – ჩატების history */}
          <aside className="chatbot-chat-sidebar">
            <div className="chatbot-chat-sidebar-header">
              <span>Your conversations</span>
              <button
                type="button"
                className="btn-small-outline"
                onClick={() => {
                  setMode('questionnaire');
                  setStep(1);
                }}
              >
                + New chat
              </button>
            </div>

            <div className="chatbot-chat-list">
              {chats.length === 0 && (
                <p className="chatbot-chat-empty">
                  No chats yet. Start by answering the questions.
                </p>
              )}

              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`chatbot-chat-list-item ${
                    chat.id === activeChatId ? 'active' : ''
                  }`}
                  onClick={() => setActiveChatId(chat.id)}
                >
                  <div className="chat-list-text">
                    <div className="chat-list-title">
                      {chat.mentorName || 'ActiVibe Assistant'}
                    </div>
                    <div className="chat-list-subtitle">
                      {chat.topicName || 'General activism'}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="chat-list-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChat(chat.id);
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </aside>

          {/* მარჯვენა – ცენტრალური ჩატი */}
          <section className="chatbot-chat-main">
            {activeChat ? (
              <>
                <header className="chatbot-chat-header">
                  {activeAvatarSrc ? (
                    <img
                      src={activeAvatarSrc}
                      alt={activeChat.mentorName}
                      className="chatbot-chat-avatar-img"
                    />
                  ) : (
                    <div className="chatbot-chat-avatar">
                      {activeChat.topicName &&
                        TOPIC_ICON_MAP[activeChat.topicName]}
                      {!activeChat.topicName && '🤖'}
                    </div>
                  )}

                  <div>
                    <h2>
                      {activeChat.mentorName || 'ActiVibe Assistant'}
                    </h2>
                    <p className="chatbot-chat-subtitle">
                      {activeChat.topicName
                        ? activeChat.topicName
                        : 'General guidance about peaceful activism.'}
                    </p>
                  </div>
                </header>

                <div className="chatbot-chat-body">
                  {activeChat.messages.length === 0 && (
                    <p className="chatbot-chat-empty">
                      You haven&apos;t sent any messages yet. Say hello to
                      start the conversation.
                    </p>
                  )}

                  {activeChat.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`chatbot-chat-message ${
                        msg.from === 'user' ? 'from-user' : 'from-bot'
                      }`}
                    >
                      {msg.from === 'bot' && activeAvatarSrc && (
                        <img
                          src={activeAvatarSrc}
                          alt={activeChat.mentorName}
                          className="chatbot-chat-message-avatar"
                        />
                      )}
                      <div className="chatbot-chat-bubble">
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                <form
                  className="chatbot-chat-input-bar"
                  onSubmit={handleSendMessage}
                >
                  <input
                    type="text"
                    placeholder="Type your message…"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={!currentMessage.trim() || !activeChat}
                  >
                    Send
                  </button>
                </form>
              </>
            ) : (
              <div className="chatbot-chat-empty-state">
                <p>
                  No active chat. Pick one from the left or start a new
                  questionnaire.
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setMode('questionnaire');
                    setStep(1);
                  }}
                >
                  Start a new chat
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  /* ---------- Mentor intro view ---------- */
  if (mode === 'mentor') {
    const topicName = selectedTopic?.name || 'Your topic';
    const mentorName =
      (topicName && TOPIC_MENTOR_MAP[topicName]) ||
      'Your virtual mentor';

    const videoKey =
      (topicName && TOPIC_VIDEO_KEY_MAP[topicName]) || null;

    const videoSrc = videoKey
      ? `/activists-video/${videoKey}.mp4`
      : null;

    return (
      <div className="page chatbot-page">
<section className="page-header">
  <h1 className="chatbot-page-title">Topic: {topicName}</h1>
  <p>Matched with a virtual mentor based on your choice.</p>
</section>


        <section className="chatbot-mentor-card">
          <header className="chatbot-mentor-header">
            <div>
              <h2>
                {mentorName}{' '}
                <span className="mentor-tag">(virtual mentor)</span>
              </h2>
              {selectedTopic && (
                <p className="mentor-topic-label">
                  {selectedTopic.name}
                </p>
              )}
            </div>
          </header>

          <div className="chatbot-mentor-body">
            {videoSrc && (
              <button
                type="button"
                className="mentor-video-wrapper"
              >
                <video
                  className="mentor-video"
                  src={videoSrc}
                  controls
                />
              </button>
            )}

            <div className="mentor-text">
              <h3>Welcome message</h3>
              <p>
                Hello! I&apos;m {mentorName} (virtual mentor). Let&apos;s
                explore {topicName.toLowerCase()} together.
              </p>
              <p className="mentor-note">
                This is a simulated educational chat experience.
              </p>
            </div>
          </div>

          <footer className="chatbot-mentor-footer">
            <button
              type="button"
              className="btn-primary"
              onClick={async () => {
                const tName = selectedTopic?.name || 'Your topic';
                const mName =
                  (tName && TOPIC_MENTOR_MAP[tName]) ||
                  'Your virtual mentor';

                const toolName = selectedTool?.name || null;
                const subToolName = selectedSubToolName || null;

                await startNewChat({
                  topicName: tName,
                  mentorName: mName,
                  toolName,
                  subToolName,
                  withWelcome: true,
                });

                setMode('chat');
              }}
            >
              Talk to {mentorName}
            </button>
          </footer>
        </section>
      </div>
    );
  }

  /* ---------- Questionnaire view ---------- */

  // STEP 1 – Topic
  if (step === 1) {
    return (
      <div className="page chatbot-page">
<section className="page-header">
  <p className="chatbot-step-label">
    Start your path to action
  </p>
  <h1 className="chatbot-page-title">Q1: WHAT IS YOUR FIELD OF INTEREST?</h1>
  <p>Answer this quick question to get tailored ideas.</p>
</section>


        <section className="chatbot-question-card">
          <div className="chatbot-card-header">
            <h2>What do you care about most right now?</h2>
<div className="direct-ai-container">
  <span className="direct-ai-text">Direct to</span>

  <button
    className="loader-wrapper ai-bubble-small"
    onClick={handleDirectToAI}
  >
    <span className="loader-letter">A</span>
    <span className="loader-letter">I</span>
    <span className="loader-letter"> </span>
    <span className="loader-letter">A</span>
    <span className="loader-letter">s</span>
    <span className="loader-letter">s</span>
    <span className="loader-letter">i</span>
    <span className="loader-letter">s</span>
    <span className="loader-letter">t</span>
    <span className="loader-letter">a</span>
    <span className="loader-letter">n</span>
    <span className="loader-letter">t</span>
    <div className="loader"></div>
  </button>
</div>


          </div>

          <p className="chatbot-subtitle">
            Pick one topic to personalize your ideas.
          </p>

          <div className="chatbot-layout">
            {/* Left side – icon grid */}
            <div className="chatbot-icon-panel">
              <div className="chatbot-icon-grid">
                {topics.map((topic) => {
                  const isActive = topic.id === selectedTopicId;
                  const icon =
                    TOPIC_ICON_MAP[topic.name] || '✨';

                  return (
                    <button
                      key={topic.id}
                      type="button"
                      className={`chatbot-icon-circle ${
                        isActive ? 'active' : ''
                      }`}
                      onClick={() => handleSelectTopic(topic.id)}
                    >
                      <span className="chatbot-icon-emoji">{icon}</span>
                    </button>
                  );
                })}

                {topics.length === 0 && (
                  <div className="chatbot-empty-state">
                    
                  </div>
                )}
              </div>
            </div>

            {/* Right side – topic pills */}
            <div className="chatbot-topic-panel">
              {error && (
                <p
                  className="status-error"
                  style={{ marginBottom: '0.75rem' }}
                >
                  {error}
                </p>
              )}

              {!loading && !error && topics.length > 0 && (
                <>
                  <div className="chatbot-topic-chips">
                    {topics.map((topic) => {
                      const isActive =
                        topic.id === selectedTopicId;
                      return (
                        <button
                          key={topic.id}
                          type="button"
                          className={`chatbot-topic-chip ${
                            isActive ? 'active' : ''
                          }`}
                          onClick={() =>
                            handleSelectTopic(topic.id)
                          }
                        >
                          {topic.name}
                        </button>
                      );
                    })}
                  </div>

                  <div className="chatbot-footer-row">
                    <span className="chatbot-selected-info">
                      {selectedTopicId
                        ? '1/1 selected'
                        : '0/1 selected'}
                    </span>

                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleContinueStep1}
                      disabled={!selectedTopicId}
                    >
                      Continue
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    );
  }

  // STEP 2 – Tools & sub-tools
  return (
    <div className="page chatbot-page">
<section className="page-header">
  <p className="chatbot-step-label">Build your action toolkit</p>
  <h1 className="chatbot-page-title">Q2: TOOLS & METHODS</h1>
  <p>
    Based on your interests, tell us what kinds of tools you&apos;re
    thinking of using.
  </p>
</section>


      <section className="chatbot-question-card">
        <div className="chatbot-card-header">
          <div>
            <h2>
              Topic:&nbsp;
              {selectedTopic ? (
                <strong>{selectedTopic.name}</strong>
              ) : (
                '—'
              )}
            </h2>
            {selectedTopic &&
              selectedTopic.subtopics?.length > 0 && (
                <p className="chatbot-subtitle">
                  Related sub-topics:&nbsp;
                  {selectedTopic.subtopics
                    .map((s) => s.name)
                    .join(', ')}
                </p>
              )}
          </div>

<div className="direct-ai-container">
  <span className="direct-ai-text">Direct to</span>

  <button
    className="loader-wrapper ai-bubble-small"
    onClick={handleDirectToAI}
  >
    <span className="loader-letter">A</span>
    <span className="loader-letter">I</span>
    <span className="loader-letter"> </span>
    <span className="loader-letter">A</span>
    <span className="loader-letter">s</span>
    <span className="loader-letter">s</span>
    <span className="loader-letter">i</span>
    <span className="loader-letter">s</span>
    <span className="loader-letter">t</span>
    <span className="loader-letter">a</span>
    <span className="loader-letter">n</span>
    <span className="loader-letter">t</span>
    <div className="loader"></div>
  </button>
</div>

        </div>

        <div className="form-row" style={{ marginTop: '1.2rem' }}>
          <label className="field">
            <span>What tools are you planning to use?</span>
            <select
              value={selectedToolId}
              onChange={handleToolChange}
            >
              <option value="">Select a tool</option>
              {tools.map((tool) => (
                <option key={tool.id} value={tool.id}>
                  {tool.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Any specific sub-tool (optional)</span>
            <select
              value={selectedSubToolName}
              onChange={handleSubToolChange}
              disabled={!subToolsOptions.length}
            >
              <option value="">
                {subToolsOptions.length
                  ? 'Select a sub-tool'
                  : 'No sub-tools for this tool'}
              </option>
              {subToolsOptions.map((st) => (
                <option key={st.id} value={st.name}>
                  {st.name}
                </option>
              ))}
            </select>
          </label>
        </div>

<div
  className="chatbot-footer-row"
  style={{ marginTop: '1.2rem' }}
>
  {/* მარცხნივ მარტო Back */}
  <button
    type="button"
    className="btn-outline"
    onClick={handleBackToStep1}
  >
    ← Back
  </button>

  {/* მარჯვნივ: I don't know + Continue */}
  <div style={{ display: 'flex', gap: '0.6rem' }}>
    <button
      type="button"
      className="btn-small-outline"
      onClick={handleIdontKnow}
    >
      I don&apos;t know
    </button>

    <button
      type="button"
      className="btn-primary"
      onClick={handleContinueStep2}
      disabled={!selectedToolId}
    >
      Continue
    </button>
  </div>
</div>

      </section>
    </div>
  );
}

export default ChatBotPage;
