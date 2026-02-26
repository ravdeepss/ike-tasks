import React, { useState, useEffect, useCallback } from 'react';

export default function SubtasksChecklist({ taskId, onClose }) {
  const [subtasks, setSubtasks] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [draggedId, setDraggedId] = useState(null);

  // Fetch subtasks
  const fetchSubtasks = useCallback(async () => {
    if (!taskId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/tasks/${taskId}/subtasks`);
      if (res.ok) {
        const data = await res.json();
        setSubtasks(data.subtasks || []);
        setStats(data.stats || { total: 0, completed: 0 });
      }
    } catch (e) {
      console.error('Failed to fetch subtasks:', e);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchSubtasks();
  }, [fetchSubtasks]);

  // Add subtask
  const handleAdd = async (e) => {
    e?.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setSubtasks(prev => [...prev, data.subtask]);
        setStats(prev => ({ ...prev, total: prev.total + 1 }));
        setNewTitle('');
      }
    } catch (e) {
      console.error('Failed to add subtask:', e);
    }
  };

  // Toggle subtask completion
  const handleToggle = async (subtaskId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}/toggle`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setSubtasks(prev =>
          prev.map(st => (st.id === subtaskId ? { ...st, is_completed: data.isCompleted } : st))
        );
        setStats(data.stats || stats);
      }
    } catch (e) {
      console.error('Failed to toggle subtask:', e);
    }
  };

  // Update subtask title
  const handleUpdateTitle = async (subtaskId) => {
    if (!editingTitle.trim()) {
      setEditingId(null);
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTitle.trim() }),
      });
      if (res.ok) {
        setSubtasks(prev =>
          prev.map(st => (st.id === subtaskId ? { ...st, title: editingTitle.trim() } : st))
        );
        setEditingId(null);
        setEditingTitle('');
      }
    } catch (e) {
      console.error('Failed to update subtask:', e);
    }
  };

  // Delete subtask
  const handleDelete = async (subtaskId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        setSubtasks(prev => prev.filter(st => st.id !== subtaskId));
        setStats(data.stats || stats);
      }
    } catch (e) {
      console.error('Failed to delete subtask:', e);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, subtaskId) => {
    setDraggedId(subtaskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetId) => {
    e.preventDefault();
    if (draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    // Reorder locally first
    const draggedIndex = subtasks.findIndex(st => st.id === draggedId);
    const targetIndex = subtasks.findIndex(st => st.id === targetId);
    const newSubtasks = [...subtasks];
    const [draggedItem] = newSubtasks.splice(draggedIndex, 1);
    newSubtasks.splice(targetIndex, 0, draggedItem);
    setSubtasks(newSubtasks);

    // Send reorder to backend
    try {
      const subtaskOrders = newSubtasks.map((st, idx) => ({ id: st.id, sortOrder: idx }));
      await fetch(`/api/tasks/${taskId}/subtasks/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtaskOrders }),
      });
    } catch (e) {
      console.error('Failed to reorder subtasks:', e);
    }

    setDraggedId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  // Progress percentage
  const progressPercent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="subtasks-checklist">
      <div className="subtasks-header">
        <h3 className="subtasks-title">
          Subtasks
          {stats.total > 0 && (
            <span className="subtasks-count">{stats.completed}/{stats.total}</span>
          )}
        </h3>
        {onClose && (
          <button className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
        )}
      </div>

      {/* Progress bar */}
      {stats.total > 0 && (
        <div className="subtasks-progress">
          <div className="subtasks-progress-track">
            <div
              className="subtasks-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="subtasks-progress-text">{progressPercent}%</span>
        </div>
      )}

      {/* Subtask list */}
      <div className="subtasks-list">
        {loading ? (
          <div className="subtasks-loading">Loading...</div>
        ) : subtasks.length === 0 ? (
          <div className="subtasks-empty">No subtasks yet. Add one below!</div>
        ) : (
          subtasks.map(subtask => (
            <div
              key={subtask.id}
              className={`subtask-item ${subtask.is_completed ? 'subtask-done' : ''} ${draggedId === subtask.id ? 'subtask-dragging' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, subtask.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, subtask.id)}
              onDragEnd={handleDragEnd}
            >
              <span className="subtask-drag-handle" title="Drag to reorder">⋮⋮</span>
              <input
                type="checkbox"
                className="subtask-checkbox"
                checked={!!subtask.is_completed}
                onChange={() => handleToggle(subtask.id)}
              />
              {editingId === subtask.id ? (
                <input
                  type="text"
                  className="form-input subtask-edit-input"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={() => handleUpdateTitle(subtask.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateTitle(subtask.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  autoFocus
                />
              ) : (
                <span
                  className="subtask-title"
                  onClick={() => {
                    setEditingId(subtask.id);
                    setEditingTitle(subtask.title);
                  }}
                >
                  {subtask.title}
                </span>
              )}
              <button
                className="btn-icon subtask-delete"
                onClick={() => handleDelete(subtask.id)}
                title="Delete"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add subtask form */}
      <form className="subtask-add-form" onSubmit={handleAdd}>
        <input
          type="text"
          className="form-input subtask-add-input"
          placeholder="Add a subtask..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={!newTitle.trim()}>
          Add
        </button>
      </form>
    </div>
  );
}