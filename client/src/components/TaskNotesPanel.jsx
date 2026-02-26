import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';

export default function TaskNotesPanel({ taskId, taskTitle, onClose }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Fetch notes
  const fetchNotes = useCallback(async () => {
    if (!taskId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/tasks/${taskId}/notes`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch (e) {
      console.error('Failed to fetch notes:', e);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Add note
  const handleAdd = async () => {
    if (!newContent.trim()) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setNotes(prev => [data.note, ...prev]);
        setNewContent('');
        setAddingNote(false);
      }
    } catch (e) {
      console.error('Failed to add note:', e);
    }
  };

  // Update note
  const handleUpdate = async (noteId) => {
    if (!editingContent.trim()) {
      setEditingId(null);
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${taskId}/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editingContent.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setNotes(prev =>
          prev.map(n => (n.id === noteId ? data.note : n))
        );
        setEditingId(null);
        setEditingContent('');
      }
    } catch (e) {
      console.error('Failed to update note:', e);
    }
  };

  // Delete note
  const handleDelete = async (noteId) => {
    if (!window.confirm('Delete this note?')) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}/notes/${noteId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setNotes(prev => prev.filter(n => n.id !== noteId));
      }
    } catch (e) {
      console.error('Failed to delete note:', e);
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="task-notes-panel">
      <div className="notes-panel-header">
        <div className="notes-panel-title-wrap">
          <h3 className="notes-panel-title">Notes</h3>
          {taskTitle && (
            <span className="notes-panel-task truncate">{taskTitle}</span>
          )}
        </div>
        {onClose && (
          <button className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
        )}
      </div>

      {/* Add note section */}
      {addingNote ? (
        <div className="note-add-form">
          <textarea
            className="form-textarea note-add-textarea"
            placeholder="Write your note... (Markdown supported)"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            autoFocus
            rows={4}
          />
          <div className="note-add-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => { setAddingNote(false); setNewContent(''); }}>
              Cancel
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={!newContent.trim()}>
              Add Note
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-secondary btn-sm note-add-btn" onClick={() => setAddingNote(true)}>
          + Add Note
        </button>
      )}

      {/* Notes list */}
      <div className="notes-panel-list">
        {loading ? (
          <div className="notes-loading">Loading...</div>
        ) : notes.length === 0 ? (
          <div className="notes-empty">No notes yet. Add your first note above!</div>
        ) : (
          notes.map(note => (
            <div key={note.id} className="note-card">
              {editingId === note.id ? (
                <div className="note-edit-form">
                  <textarea
                    className="form-textarea note-edit-textarea"
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    autoFocus
                    rows={4}
                  />
                  <div className="note-edit-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => handleUpdate(note.id)}>
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="note-card-content">
                    <ReactMarkdown>{note.content}</ReactMarkdown>
                  </div>
                  <div className="note-card-footer">
                    <span className="note-card-time">{formatTime(note.created_at)}</span>
                    <div className="note-card-actions">
                      <button
                        className="btn-icon note-action"
                        onClick={() => {
                          setEditingId(note.id);
                          setEditingContent(note.content);
                        }}
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        className="btn-icon note-action note-action-danger"
                        onClick={() => handleDelete(note.id)}
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}