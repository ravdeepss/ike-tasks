import React, { useState, useEffect, useRef } from 'react';
import NaturalDateInput from './NaturalDateInput';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'INPROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
];

const PRIORITY_OPTIONS = [
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

export default function QuickAddTaskModal({ onClose, onCreateTask, projects }) {
  const [title, setTitle] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('PENDING');
  const [priority, setPriority] = useState('MEDIUM');
  const [assignedTo, setAssignedTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  // Sort projects: active first, then by name
  const sortedProjects = React.useMemo(() => {
    if (!projects) return [];
    return [...projects]
      .filter(p => p.status !== 'Archived')
      .sort((a, b) => {
        const aName = a.name?.toLowerCase() || '';
        const bName = b.name?.toLowerCase() || '';
        return aName.localeCompare(bName);
      });
  }, [projects]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Set default project
  useEffect(() => {
    if (sortedProjects.length > 0 && !projectCode) {
      setProjectCode(sortedProjects[0].code);
    }
  }, [sortedProjects, projectCode]);

  // Handle escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Handle form submit
  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!projectCode) {
      setError('Please select a project');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const taskData = {
        title: title.trim(),
        due_date: dueDate || null,
        status,
        priority,
        assigned_to: assignedTo.trim() || null,
      };

      const res = await fetch(`/api/projects/${projectCode}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create task');
      }

      const data = await res.json();
      if (onCreateTask) onCreateTask(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal quick-add-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚡ Quick Add Task</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              ref={inputRef}
              type="text"
              className="form-input"
              placeholder="Task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Project selector */}
          <div className="form-group">
            <label className="form-label">Project *</label>
            <select
              className="form-select"
              value={projectCode}
              onChange={(e) => setProjectCode(e.target.value)}
              disabled={loading}
            >
              <option value="">Select project...</option>
              {sortedProjects.map(p => (
                <option key={p.code} value={p.code}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          {/* Due date */}
          <div className="form-group">
            <label className="form-label">Due Date</label>
            <NaturalDateInput
              value={dueDate}
              onChange={setDueDate}
              placeholder="tomorrow, next week, etc."
            />
          </div>

          {/* Status and Priority row */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={loading}
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select
                className="form-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={loading}
              >
                {PRIORITY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Assigned to */}
          <div className="form-group">
            <label className="form-label">Assigned To</label>
            <input
              type="text"
              className="form-input"
              placeholder="Name or @username"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Actions */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !title.trim() || !projectCode}>
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}