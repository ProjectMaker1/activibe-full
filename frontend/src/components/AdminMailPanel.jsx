// frontend/src/components/AdminMailPanel.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { apiRequest, withAuth } from '@shared/apiClient.js';
import Loader from './Loader.jsx';
import './adminMailPanel.css';

function fmtDateTime(d) {
  try {
    const dt = new Date(d);
    return dt.toLocaleString();
  } catch {
    return '';
  }
}

function fileSize(n) {
  const num = Number(n || 0);
  if (num < 1024) return `${num} B`;
  const kb = num / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export default function AdminMailPanel() {
  const { tokens } = useAuth();

  const [threads, setThreads] = useState([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [threadsError, setThreadsError] = useState(null);

  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [thread, setThread] = useState(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState(null);

  const [composerOpen, setComposerOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [sendOk, setSendOk] = useState(null);

  const [query, setQuery] = useState('');

  const fileInputRef = useRef(null);

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
  }, []);

  const [mobileView, setMobileView] = useState('list'); // 'list' | 'thread'

  // Load threads (left list)
  useEffect(() => {
    const load = async () => {
      if (!tokens?.accessToken) return;
      setThreadsLoading(true);
      setThreadsError(null);
      try {
        const res = await apiRequest('/admin/mail/threads', withAuth(tokens.accessToken));
        setThreads(res?.threads || []);
      } catch (err) {
        console.error(err);
        setThreadsError(err.message || 'Failed to load mail threads');
      } finally {
        setThreadsLoading(false);
      }
    };
    load();
  }, [tokens?.accessToken]);

  // Load selected thread
  useEffect(() => {
    const loadThread = async () => {
      if (!tokens?.accessToken) return;
      if (!selectedThreadId) {
        setThread(null);
        return;
      }
      setThreadLoading(true);
      setThreadError(null);
      try {
        const res = await apiRequest(
          `/admin/mail/threads/${selectedThreadId}`,
          withAuth(tokens.accessToken)
        );
        setThread(res?.thread || null);
      } catch (err) {
        console.error(err);
        setThreadError(err.message || 'Failed to load thread');
      } finally {
        setThreadLoading(false);
      }
    };
    loadThread();
  }, [tokens?.accessToken, selectedThreadId]);

  const filteredThreads = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return threads;

    return threads.filter((t) => {
      const a = `${t.username || ''} ${t.userEmail || ''} ${t.lastSubject || ''} ${t.lastSnippet || ''}`.toLowerCase();
      return a.includes(q);
    });
  }, [threads, query]);

  const selectedUserEmail = thread?.userEmail || null;
  const fixedFrom = 'ActiVibe <support@activibe.net>';

  const openThread = (id) => {
    setSelectedThreadId(id);
    setComposerOpen(false);
    setSendError(null);
    setSendOk(null);
    if (isMobile) setMobileView('thread');
  };

  const backToListMobile = () => {
    setMobileView('list');
  };

  const startNewMail = () => {
    setComposerOpen(true);
    setSendError(null);
    setSendOk(null);
    setSubject('');
    setText('');
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onPickFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;

    // append (do not replace)
    setFiles((prev) => {
      const merged = [...prev, ...picked];
      // avoid exact duplicates by name+size+lastModified
      const seen = new Set();
      const uniq = [];
      for (const f of merged) {
        const key = `${f.name}__${f.size}__${f.lastModified}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniq.push(f);
        }
      }
      return uniq;
    });
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setSendError(null);
    setSendOk(null);
  };

  const refreshThreads = async () => {
    if (!tokens?.accessToken) return;
    try {
      const res = await apiRequest('/admin/mail/threads', withAuth(tokens.accessToken));
      setThreads(res?.threads || []);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshThread = async () => {
    if (!tokens?.accessToken || !selectedThreadId) return;
    try {
      const res = await apiRequest(
        `/admin/mail/threads/${selectedThreadId}`,
        withAuth(tokens.accessToken)
      );
      setThread(res?.thread || null);
    } catch (err) {
      console.error(err);
    }
  };

  const sendMail = async () => {
    if (!tokens?.accessToken) return;
    if (!selectedUserEmail) {
      setSendError('Select a customer first.');
      return;
    }
    if (!String(subject || '').trim() || !String(text || '').trim()) {
      setSendError('Subject and message are required.');
      return;
    }

    setSending(true);
    setSendError(null);
    setSendOk(null);

    const fd = new FormData();
    fd.append('to', selectedUserEmail);
    fd.append('subject', subject.trim());
    fd.append('text', text.trim());
    if (selectedThreadId) fd.append('threadId', String(selectedThreadId));

    for (const f of files) {
      fd.append('attachments', f); // IMPORTANT: must match backend upload.array('attachments')
    }

    try {
      await apiRequest('/admin/mail/send', withAuth(tokens.accessToken, { method: 'POST', body: fd }));

      setSendOk('Email sent successfully.');
      setComposerOpen(false);
      setSubject('');
      setText('');
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';

      await Promise.all([refreshThread(), refreshThreads()]);
    } catch (err) {
      console.error(err);

      // Professional attachment size message already comes as 413 from backend
      if (err?.status === 413) {
        setSendError(err.message || 'Attachment too large. Please use a smaller file or remove some attachments.');
      } else {
        setSendError(err.message || 'Failed to send email.');
      }
    } finally {
      setSending(false);
    }
  };

  const deleteHistory = async () => {
    if (!tokens?.accessToken || !selectedThreadId) return;

    const ok = window.confirm('Delete full email history for this customer? This cannot be undone.');
    if (!ok) return;

    try {
      await apiRequest(
        `/admin/mail/threads/${selectedThreadId}`,
        withAuth(tokens.accessToken, { method: 'DELETE' })
      );

      setSelectedThreadId(null);
      setThread(null);
      setComposerOpen(false);
      setSendError(null);
      setSendOk('History deleted.');

      await refreshThreads();
      if (isMobile) setMobileView('list');
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to delete history');
    }
  };

  return (
    <div className="av-mail">
      <div className="av-mail-header">
        <div>
          <h2 className="av-mail-title">Mail</h2>
          <p className="av-mail-subtitle">Send professional emails from the admin panel and keep history per customer.</p>
        </div>

        <div className="av-mail-search">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers..."
            className="av-mail-search-input"
          />
        </div>
      </div>

      <div className={`av-mail-layout ${isMobile ? 'is-mobile' : ''}`}>
        {/* LEFT: Threads list */}
        <aside className={`av-mail-left ${isMobile && mobileView !== 'list' ? 'hide-mobile' : ''}`}>
          <div className="av-mail-left-header">
            <div className="av-mail-left-title">Customers</div>
            <button
              type="button"
              className="av-mail-refresh"
              onClick={refreshThreads}
              disabled={threadsLoading}
              title="Refresh"
            >
              ↻
            </button>
          </div>

          {threadsLoading && (
            <div className="av-mail-pad">
              <Loader />
            </div>
          )}

          {!threadsLoading && threadsError && (
            <div className="av-mail-pad">
              <p className="status-error">{threadsError}</p>
            </div>
          )}

          {!threadsLoading && !threadsError && filteredThreads.length === 0 && (
            <div className="av-mail-empty">
              <div className="av-mail-empty-title">No email history yet</div>
              <div className="av-mail-empty-text">
                Customers will appear here after you send at least one email.
              </div>
            </div>
          )}

          {!threadsLoading && !threadsError && filteredThreads.length > 0 && (
            <div className="av-mail-thread-list">
              {filteredThreads.map((t) => {
                const active = t.id === selectedThreadId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`av-mail-thread-item ${active ? 'active' : ''}`}
                    onClick={() => openThread(t.id)}
                  >
                    <div className="av-mail-thread-top">
                      <div className="av-mail-thread-name">
                        {t.username || t.userEmail}
                      </div>
                      <div className="av-mail-thread-time">
                        {t.lastSentAt ? fmtDateTime(t.lastSentAt) : ''}
                      </div>
                    </div>

                    <div className="av-mail-thread-email">{t.userEmail}</div>

                    <div className="av-mail-thread-snippet">
                      {t.lastSubject ? <b>{t.lastSubject}</b> : ''}
                      {t.lastSnippet ? ` — ${t.lastSnippet}` : ''}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        {/* RIGHT: Thread + Composer */}
        <section className={`av-mail-right ${isMobile && mobileView !== 'thread' ? 'hide-mobile' : ''}`}>
          <div className="av-mail-right-header">
            {isMobile && mobileView === 'thread' && (
              <button type="button" className="av-mail-back" onClick={backToListMobile}>
                ← Back
              </button>
            )}

            <div className="av-mail-right-title">
              {thread?.username ? thread.username : thread?.userEmail ? thread.userEmail : 'Select a customer'}
            </div>

            <div className="av-mail-right-actions">
              {!!selectedThreadId && (
                <button type="button" className="av-mail-danger" onClick={deleteHistory}>
                  Delete history
                </button>
              )}
              {!!selectedThreadId && (
                <button type="button" className="av-mail-primary" onClick={startNewMail}>
                  New mail
                </button>
              )}
            </div>
          </div>

          {threadLoading && (
            <div className="av-mail-pad">
              <Loader />
            </div>
          )}

          {!threadLoading && threadError && (
            <div className="av-mail-pad">
              <p className="status-error">{threadError}</p>
            </div>
          )}

          {!threadLoading && !threadError && !thread && (
            <div className="av-mail-empty">
              <div className="av-mail-empty-title">Choose a customer</div>
              <div className="av-mail-empty-text">
                Select a customer from the list to see message history and send a new email.
              </div>
            </div>
          )}

          {!threadLoading && !threadError && thread && (
            <>
              {sendOk && (
                <div className="av-mail-toast ok">
                  {sendOk}
                </div>
              )}
              {sendError && (
                <div className="av-mail-toast err">
                  {sendError}
                </div>
              )}

              <div className="av-mail-messages">
                {(thread.messages || []).map((m) => (
                  <div key={m.id} className="av-mail-message">
                    <div className="av-mail-message-meta">
                      <div className="av-mail-message-subject">{m.subject}</div>
                      <div className="av-mail-message-time">{fmtDateTime(m.createdAt)}</div>
                    </div>

                    <div className="av-mail-message-addr">
                      <span className="pill">From: {m.fromEmail}</span>
                      <span className="pill">To: {m.toEmail}</span>
                    </div>

                    <div className="av-mail-message-body">
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              {!composerOpen && (
                <div className="av-mail-compose-cta">
                  <button type="button" className="av-mail-primary wide" onClick={startNewMail}>
                    New mail to this customer
                  </button>
                </div>
              )}

              {composerOpen && (
                <div className="av-mail-composer">
                  <div className="av-mail-composer-row">
                    <label>From</label>
                    <div className="av-mail-readonly">{fixedFrom}</div>
                  </div>

                  <div className="av-mail-composer-row">
                    <label>To</label>
                    <div className="av-mail-readonly">{selectedUserEmail}</div>
                  </div>

                  <div className="av-mail-composer-row">
                    <label>Subject</label>
                    <input
                      className="av-mail-input"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Subject"
                      maxLength={180}
                    />
                  </div>

                  <div className="av-mail-composer-row">
                    <label>Message</label>
                    <textarea
                      className="av-mail-textarea"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Write your message..."
                      rows={7}
                    />
                  </div>

                  <div className="av-mail-composer-row">
                    <label>Attachments</label>
                    <div className="av-mail-attach">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={onPickFiles}
                      />
                      <div className="av-mail-attach-hint">
                        If an attachment is too large, you’ll see a message after sending.
                      </div>

                      {files.length > 0 && (
                        <div className="av-mail-file-list">
                          {files.map((f, idx) => (
                            <div key={`${f.name}-${f.size}-${f.lastModified}`} className="av-mail-file">
                              <div className="av-mail-file-name">{f.name}</div>
                              <div className="av-mail-file-size">{fileSize(f.size)}</div>
                              <button
                                type="button"
                                className="av-mail-file-remove"
                                onClick={() => removeFile(idx)}
                                title="Remove"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="av-mail-composer-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setComposerOpen(false)}
                      disabled={sending}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="av-mail-primary"
                      onClick={sendMail}
                      disabled={sending}
                    >
                      {sending ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}