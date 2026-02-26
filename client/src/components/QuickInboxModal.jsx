import React, { useState, useEffect, useRef } from 'react';

const INBOX_PROJECT_CODE = 'INBOX';

export default function QuickInboxModal({ onClose, onCreateTask, projects }) {
  const [title, setTitle] = useState('');
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Ensure INBOX project exists
  const ensureInboxProject = async () => {
    // Check if INBOX project exists
    const inboxExists = projects?.some(p => p.code === INBOX_PROJECT_CODE);
    if (inboxExists) return true;

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: INBOX_PROJECT_CODE,
          name: 'Inbox',
          description: 'Quick capture inbox for tasks',
          status: 'In Progress',
        }),
      });
      return res.ok;
    } catch (e) {
      console.error('Failed to create INBOX project:', e);
      return false;
    }
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      await ensureInboxProject();
      
      const res = await fetch(`/api/projects/${INBOX_PROJECT_CODE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setRecentTasks(prev => [
          { id: data.taskId, title: title.trim(), taskNumber: data.taskNumber },
          ...prev.slice(0, 4),
        ]);
        setTitle('');
        if (onCreateTask) onCreateTask(data);
      }
    } catch (e) {
      console.error('Failed to add task:', e);
    } finally {
      setLoading(false);
    }
  };

  // Handle key down in input
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm quick-inbox-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📥 Quick Inbox</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="quick-inbox-form">
          <input
            ref={inputRef}
            type="text"
            className="form-input quick-inbox-input"
            placeholder="What's on your mind?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <div className="quick-inbox-hint">
            Press Enter to add to Inbox • Esc to close
          </div>
        </form>

        {recentTasks.length > 0 && (
          <div className="quick-inbox-recent">
            <div className="quick-inbox-recent-label">Recently added:</div>
            <ul className="quick-inbox-recent-list">
              {recentTasks.map((task, i) => (
                <li key={task.id || i} className="quick-inbox-recent-item">
                  <span className="quick-inbox-recent-num">#{task.taskNumber || '?'}</span>
                  <span className="quick-inbox-recent-title truncate">{task.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}