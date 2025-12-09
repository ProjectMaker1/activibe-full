import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { apiRequest, withAuth } from '@shared/apiClient.js';
import Loader from '../components/Loader.jsx';

function CategoriesManager() {
  const { tokens } = useAuth();

  const [topics, setTopics] = useState([]);
  const [tools, setTools] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // TOPICS
  const [newTopicName, setNewTopicName] = useState('');
  const [newSubTopicName, setNewSubTopicName] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState(null);

  // TOOLS
  const [newToolName, setNewToolName] = useState('');
  const [selectedToolId, setSelectedToolId] = useState(null);
  const [newSubToolName, setNewSubToolName] = useState('');

  // confirm delete
  // type: 'topic' | 'subtopic' | 'tool' | 'subtool'
  const [confirmDelete, setConfirmDelete] = useState(null);

  const accessToken = tokens?.accessToken;

  const loadCategories = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest(
        '/admin/categories',
        withAuth(accessToken)
      );

      setTopics(res.topics || []);
      setTools(res.tools || []);

      if (!selectedTopicId && res.topics && res.topics.length > 0) {
        setSelectedTopicId(res.topics[0].id);
      }
      if (!selectedToolId && res.tools && res.tools.length > 0) {
        setSelectedToolId(res.tools[0].id);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  /* ---------- TOPICS ---------- */

  const handleAddTopic = async (e) => {
    e.preventDefault();
    if (!newTopicName.trim() || !accessToken) return;

    try {
      const res = await apiRequest(
        '/admin/topics',
        withAuth(accessToken, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: { name: newTopicName.trim() },
        })
      );

      const topicWithSubtopics = {
        ...res.topic,
        subtopics: [],
      };

      setTopics((prev) =>
        [...prev, topicWithSubtopics].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );

      setNewTopicName('');
      if (!selectedTopicId) setSelectedTopicId(topicWithSubtopics.id);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to add topic');
    }
  };

  const handleAddSubTopic = async (e) => {
    e.preventDefault();
    if (!newSubTopicName.trim() || !selectedTopicId || !accessToken) return;

    try {
      const res = await apiRequest(
        `/admin/topics/${selectedTopicId}/subtopics`,
        withAuth(accessToken, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: { name: newSubTopicName.trim() },
        })
      );

      setTopics((prev) =>
        prev.map((t) =>
          t.id === selectedTopicId
            ? {
                ...t,
                subtopics: [...t.subtopics, res.subtopic].sort((a, b) =>
                  a.name.localeCompare(b.name)
                ),
              }
            : t
        )
      );
      setNewSubTopicName('');
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to add sub-topic');
    }
  };

  /* ---------- TOOLS ---------- */

  const handleAddTool = async (e) => {
    e.preventDefault();
    if (!newToolName.trim() || !accessToken) return;

    try {
      const res = await apiRequest(
        '/admin/tools',
        withAuth(accessToken, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: { name: newToolName.trim() },
        })
      );

      const toolWithSubTools = {
        ...res.tool,
        subTools: [],
      };

      setTools((prev) =>
        [...prev, toolWithSubTools].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
      setNewToolName('');

      if (!selectedToolId) setSelectedToolId(toolWithSubTools.id);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to add tool');
    }
  };

  const handleAddSubTool = async (e) => {
    e.preventDefault();
    if (!newSubToolName.trim() || !selectedToolId || !accessToken) return;

    try {
      const res = await apiRequest(
        `/admin/tools/${selectedToolId}/subtools`,
        withAuth(accessToken, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: { name: newSubToolName.trim() },
        })
      );

      setTools((prev) =>
        prev.map((t) =>
          t.id === selectedToolId
            ? {
                ...t,
                subTools: [...(t.subTools || []), res.subTool].sort((a, b) =>
                  a.name.localeCompare(b.name)
                ),
              }
            : t
        )
      );

      setNewSubToolName('');
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to add sub-tool');
    }
  };

  /* ---------- DELETE ---------- */

  const requestDelete = (type, item) => {
    setConfirmDelete({
      type, // 'topic' | 'subtopic' | 'tool' | 'subtool'
      id: item.id,
      label: item.name,
    });
  };

  const confirmDeleteItem = async () => {
    if (!confirmDelete || !accessToken) return;

    const { type, id } = confirmDelete;

    try {
      if (type === 'topic') {
        await apiRequest(
          `/admin/topics/${id}`,
          withAuth(accessToken, { method: 'DELETE' })
        );
        setTopics((prev) => prev.filter((t) => t.id !== id));

        if (selectedTopicId === id) {
          const remaining = topics.filter((t) => t.id !== id);
          setSelectedTopicId(remaining.length ? remaining[0].id : null);
        }
      } else if (type === 'subtopic') {
        await apiRequest(
          `/admin/subtopics/${id}`,
          withAuth(accessToken, { method: 'DELETE' })
        );
        setTopics((prev) =>
          prev.map((t) => ({
            ...t,
            subtopics: t.subtopics.filter((s) => s.id !== id),
          }))
        );
      } else if (type === 'tool') {
        await apiRequest(
          `/admin/tools/${id}`,
          withAuth(accessToken, { method: 'DELETE' })
        );
        setTools((prev) => prev.filter((tool) => tool.id !== id));

        if (selectedToolId === id) {
          const remaining = tools.filter((t) => t.id !== id);
          setSelectedToolId(remaining.length ? remaining[0].id : null);
        }
      } else if (type === 'subtool') {
        await apiRequest(
          `/admin/subtools/${id}`,
          withAuth(accessToken, { method: 'DELETE' })
        );
        setTools((prev) =>
          prev.map((t) => ({
            ...t,
            subTools: (t.subTools || []).filter((s) => s.id !== id),
          }))
        );
      }

      setConfirmDelete(null);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to delete item');
    }
  };

  const selectedTopic =
    topics.find((t) => t.id === selectedTopicId) || null;
  const selectedTool =
    tools.find((t) => t.id === selectedToolId) || null;

  return (
    <div className="categories-page">
      <h1>Categories</h1>
      <p>
        Manage topics, sub-topics and tools used in the campaign upload form.
      </p>

      {loading && <Loader />}
      {error && <p className="status-error">{error}</p>}

      {!loading && !error && (
        <div className="categories-grid">
          {/* --------- TOPICS --------- */}
          <div className="categories-card">
            <h2>Topics</h2>

            <form onSubmit={handleAddTopic} className="categories-form-row">
              <input
                type="text"
                placeholder="New topic name..."
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
              />
              <button type="submit" className="btn-small">
                +
              </button>
            </form>

            {topics.length === 0 && <p>No topics yet.</p>}

            {topics.length > 0 && (
              <ul className="categories-list">
                {topics.map((topic) => (
                  <li
                    key={topic.id}
                    className={
                      topic.id === selectedTopicId
                        ? 'categories-list-item active'
                        : 'categories-list-item'
                    }
                  >
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => setSelectedTopicId(topic.id)}
                    >
                      {topic.name}
                    </button>
                    <button
                      type="button"
                      className="btn-icon-danger"
                      onClick={() => requestDelete('topic', topic)}
                      title="Delete topic"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* --------- SUB-TOPICS --------- */}
          <div className="categories-card">
            <h2>Sub-topics</h2>

            {selectedTopic ? (
              <>
                <p className="categories-subtitle">
                  Selected topic: <strong>{selectedTopic.name}</strong>
                </p>

                <form
                  onSubmit={handleAddSubTopic}
                  className="categories-form-row"
                >
                  <input
                    type="text"
                    placeholder="New sub-topic name..."
                    value={newSubTopicName}
                    onChange={(e) => setNewSubTopicName(e.target.value)}
                  />
                  <button type="submit" className="btn-small">
                    +
                  </button>
                </form>

                {selectedTopic.subtopics.length === 0 && (
                  <p>No sub-topics for this topic yet.</p>
                )}

                {selectedTopic.subtopics.length > 0 && (
                  <ul className="categories-list">
                    {selectedTopic.subtopics.map((s) => (
                      <li key={s.id} className="categories-list-item">
                        <span>{s.name}</span>
                        <button
                          type="button"
                          className="btn-icon-danger"
                          onClick={() => requestDelete('subtopic', s)}
                          title="Delete sub-topic"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p>Please create and select a topic first.</p>
            )}
          </div>

          {/* --------- TOOLS + SUB-TOOLS --------- */}
          <div className="categories-card">
            <h2>Tools</h2>

            {/* TOOLS LIST */}
            <form onSubmit={handleAddTool} className="categories-form-row">
              <input
                type="text"
                placeholder="New tool name..."
                value={newToolName}
                onChange={(e) => setNewToolName(e.target.value)}
              />
              <button type="submit" className="btn-small">
                +
              </button>
            </form>

            {tools.length === 0 && <p>No tools yet.</p>}

            {tools.length > 0 && (
              <>
                <p className="categories-subtitle" style={{ marginTop: 8 }}>
                  Tools
                </p>
                <ul className="categories-list">
                  {tools.map((tool) => (
                    <li
                      key={tool.id}
                      className={
                        tool.id === selectedToolId
                          ? 'categories-list-item active'
                          : 'categories-list-item'
                      }
                    >
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => setSelectedToolId(tool.id)}
                      >
                        {tool.name}
                      </button>
                      <button
                        type="button"
                        className="btn-icon-danger"
                        onClick={() => requestDelete('tool', tool)}
                        title="Delete tool"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* SUB-TOOLS FOR SELECTED TOOL */}
            <h2 style={{ marginTop: 24 }}>Sub-tools</h2>
            <div style={{ marginTop: 8 }}>
              {selectedTool ? (

                <>
                  <p className="categories-subtitle">
                    Selected tool: <strong>{selectedTool.name}</strong>
                  </p>

                  <form
                    onSubmit={handleAddSubTool}
                    className="categories-form-row"
                  >
                    <input
                      type="text"
                      placeholder="New sub-tool name..."
                      value={newSubToolName}
                      onChange={(e) => setNewSubToolName(e.target.value)}
                    />
                    <button type="submit" className="btn-small">
                      +
                    </button>
                  </form>

                  {(!selectedTool.subTools ||
                    selectedTool.subTools.length === 0) && (
                    <p>No sub-tools for this tool yet.</p>
                  )}

                  {selectedTool.subTools &&
                    selectedTool.subTools.length > 0 && (
                      <ul className="categories-list">
                        {selectedTool.subTools.map((s) => (
                          <li key={s.id} className="categories-list-item">
                            <span>{s.name}</span>
                            <button
                              type="button"
                              className="btn-icon-danger"
                              onClick={() => requestDelete('subtool', s)}
                              title="Delete sub-tool"
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                </>
              ) : (
                <p style={{ marginTop: 8 }}>
                  Please create and select a tool to manage its sub-tools.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* confirm delete modal */}
      {confirmDelete && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <h3>
              {confirmDelete.type === 'topic' && 'Delete topic'}
              {confirmDelete.type === 'subtopic' && 'Delete sub-topic'}
              {confirmDelete.type === 'tool' && 'Delete tool'}
              {confirmDelete.type === 'subtool' && 'Delete sub-tool'}
            </h3>

            <p>
              Are you sure you want to delete{' '}
              <strong>{confirmDelete.label}</strong>?
            </p>
            {confirmDelete.type === 'topic' && (
              <p>This will also delete all its sub-topics.</p>
            )}

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-small-danger"
                onClick={confirmDeleteItem}
                style={{ marginLeft: 8 }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CategoriesManager;
