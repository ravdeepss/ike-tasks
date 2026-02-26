import React, { useState, useMemo, useCallback, useEffect } from 'react';
import NaturalDateInput from './NaturalDateInput';
import InlineTagEditor from './InlineTagEditor';

// ============================================================
// Constants
// ============================================================
const STATUS_OPTIONS = ['PENDING', 'INPROGRESS', 'COMPLETED', 'CANCELLED', 'NOT_DOING'];
const STATUS_LABELS  = { PENDING: 'Pending', INPROGRESS: 'In Progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled', NOT_DOING: 'Not Doing' };
const STATUS_CSS     = { PENDING: 'status-pending', INPROGRESS: 'status-inprogress', COMPLETED: 'status-completed', CANCELLED: 'status-cancelled', NOT_DOING: 'status-not-doing' };

const PRIORITY_OPTIONS = ['HIGH', 'MEDIUM', 'LOW'];
const PRIORITY_LABELS  = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };
const PRIORITY_CSS     = { HIGH: 'priority-high', MEDIUM: 'priority-medium', LOW: 'priority-low' };

const QUADRANT_OPTIONS = ['DO FIRST', 'SCHEDULE', 'DELEGATE', 'ELIMINATE'];

const EMPTY_FORM = {
  title: '', due_date: '', assigned_to: '',
  status: 'PENDING', priority: 'MEDIUM', quadrant: 'DO FIRST',
  progress: 0, comments: '',
};

// ============================================================
// Due-date display
// ============================================================
export function DueDateDisplay({ dueDate }) {
  if (!dueDate) return <span className="due-date-none">—</span>;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due   = new Date(dueDate + 'T00:00:00'); due.setHours(0, 0, 0, 0);
  const diff  = Math.round((due - today) / 86400000);

  let cls, label;
  if (diff < 0)      { cls = 'due-date-overdue'; label = `${Math.abs(diff)}d overdue`; }
  else if (diff === 0) { cls = 'due-date-today';   label = 'Today'; }
  else if (diff === 1) { cls = 'due-date-soon';    label = 'Tomorrow'; }
  else if (diff <= 7)  { cls = 'due-date-soon';    label = `In ${diff}d`; }
  else {
    cls = 'due-date-normal';
    label = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return <span className={`due-date ${cls}`} title={dueDate}>{label}</span>;
}

// ============================================================
// Inline select popup (status / priority)
// ============================================================
function InlineSelect({ value, options, labels, cssMap, onSave, onCancel }) {
  return (
    <>
      <div className="tt-backdrop" onClick={onCancel} />
      <div className="inline-select-popup" role="listbox">
        {options.map(opt => (
          <div
            key={opt}
            className={`inline-select-option ${cssMap[opt] || ''}${value === opt ? ' current' : ''}`}
            role="option"
            aria-selected={value === opt}
            onClick={() => onSave(opt)}
          >
            {labels[opt] || opt}
          </div>
        ))}
      </div>
    </>
  );
}

// ============================================================
// Progress bar — click to edit
// ============================================================
function ProgressBar({ value, taskId, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [val,     setVal]     = useState(value);

  useEffect(() => { setVal(value); }, [value]);

  const save = async (newVal) => {
    await onUpdate(taskId, { progress: newVal });
    setEditing(false);
  };

  const pct = value || 0;
  const barColor = pct === 100 ? '#4ade80' : pct >= 50 ? '#38bdf8' : '#818cf8';

  return (
    <div className="progress-bar-wrapper">
      <div
        className="progress-bar-track"
        onClick={() => setEditing(v => !v)}
        title={`${pct}% — click to edit`}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setEditing(v => !v)}
        aria-label={`Progress: ${pct}%`}
      >
        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
        <span className="progress-bar-text">{pct}%</span>
      </div>
      {editing && (
        <>
          <div className="tt-backdrop" onClick={() => setEditing(false)} />
          <div className="progress-edit-popup">
            <input
              type="range"
              min={0} max={100} step={5}
              value={val}
              onChange={e => setVal(parseInt(e.target.value, 10))}
              onMouseUp={e => save(parseInt(e.target.value, 10))}
              onTouchEnd={e => save(parseInt(e.target.value, 10))}
              className="form-range"
              autoFocus
            />
            <span className="progress-edit-val">{val}%</span>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// Task Form Modal (create / edit)
// ============================================================
export function TaskFormModal({ mode, initial = {}, onSubmit, onClose }) {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    ...(isEdit ? { ...initial, progress: initial.progress ?? 0 } : {}),
  });
  const [error,  setError]  = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSubmit({ ...form, title: form.title.trim() });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save task.');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal modal-lg"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Task' : 'Add Task'}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              className="form-input"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Task title"
              autoFocus
              required
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <NaturalDateInput
                value={form.due_date}
                onChange={v => set('due_date', v)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Assigned To</label>
              <input
                className="form-input"
                value={form.assigned_to}
                onChange={e => set('assigned_to', e.target.value)}
                placeholder="Name or email"
              />
            </div>
          </div>

          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={form.priority || ''} onChange={e => set('priority', e.target.value)}>
                <option value="">— None —</option>
                {PRIORITY_OPTIONS.map(p => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quadrant</label>
              <select className="form-select" value={form.quadrant || ''} onChange={e => set('quadrant', e.target.value)}>
                <option value="">— None —</option>
                {QUADRANT_OPTIONS.map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Progress: {form.progress}%</label>
            <input
              type="range"
              min={0} max={100} step={5}
              value={form.progress}
              onChange={e => set('progress', parseInt(e.target.value, 10))}
              className="form-range"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Comments / Notes</label>
            <textarea
              className="form-textarea"
              value={form.comments}
              onChange={e => set('comments', e.target.value)}
              placeholder="Markdown supported: notes, links, checklists…"
              rows={5}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// Move Task Modal
// ============================================================
function MoveTaskModal({ task, allProjects, currentProjectCode, onMove, onClose }) {
  const [target,  setTarget]  = useState('');
  const [saving,  setSaving]  = useState(false);

  const others = (allProjects || []).filter(
    p => p.code !== currentProjectCode && p.status !== 'Archived'
  );

  const handleMove = async () => {
    if (!target) return;
    setSaving(true);
    try { await onMove(task.id, target); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2>Move Task</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="modal-desc">
          Move <strong>"{task.title}"</strong> to:
        </p>
        {others.length === 0 ? (
          <p className="modal-desc text-muted">No other active projects available.</p>
        ) : (
          <div className="form-group">
            <select className="form-select" value={target} onChange={e => setTarget(e.target.value)}>
              <option value="">— Select project —</option>
              {others.map(p => (
                <option key={p.code} value={p.code}>[{p.code}] {p.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleMove}
            disabled={!target || saving}
          >
            {saving ? 'Moving…' : 'Move Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Inline Subtasks Panel
// ============================================================
function InlineSubtasksPanel({ taskId, onClose }) {
  const [subtasks, setSubtasks] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [adding,   setAdding]   = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`);
      if (res.ok) setSubtasks((await res.json()).subtasks || []);
    } finally { setLoading(false); }
  }, [taskId]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (stId) => {
    await fetch(`/api/tasks/${taskId}/subtasks/${stId}/toggle`, { method: 'POST' });
    await load();
  };

  const add = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      setNewTitle('');
      await load();
    } finally { setAdding(false); }
  };

  const del = async (stId) => {
    await fetch(`/api/tasks/${taskId}/subtasks/${stId}`, { method: 'DELETE' });
    await load();
  };

  const done  = subtasks.filter(s => s.is_completed).length;
  const total = subtasks.length;

  return (
    <div className="inline-panel">
      <div className="inline-panel-header">
        <span className="inline-panel-title">
          Subtasks
          {total > 0 && <span className="inline-panel-count">{done}/{total}</span>}
        </span>
        {total > 0 && (
          <div className="inline-panel-prog-track">
            <div
              className="inline-panel-prog-fill"
              style={{ width: `${Math.round((done / total) * 100)}%` }}
            />
          </div>
        )}
        <button className="btn-icon" onClick={onClose} aria-label="Close subtasks">✕</button>
      </div>

      {loading ? (
        <p className="inline-panel-loading">Loading…</p>
      ) : (
        <ul className="subtask-list">
          {subtasks.length === 0 && (
            <li className="subtask-empty">No subtasks yet. Add one below.</li>
          )}
          {subtasks.map(st => (
            <li key={st.id} className={`subtask-item${st.is_completed ? ' subtask-done' : ''}`}>
              <input
                type="checkbox"
                checked={!!st.is_completed}
                onChange={() => toggle(st.id)}
                className="subtask-checkbox"
                aria-label={`Mark "${st.title}" complete`}
              />
              <span className="subtask-title">{st.title}</span>
              <button
                className="btn-icon subtask-del"
                onClick={() => del(st.id)}
                aria-label="Delete subtask"
              >✕</button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="subtask-add-form">
        <input
          className="form-input subtask-add-input"
          placeholder="Add subtask…"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
        />
        <button type="submit" className="btn btn-secondary btn-sm" disabled={!newTitle.trim() || adding}>
          {adding ? '…' : 'Add'}
        </button>
      </form>
    </div>
  );
}

// ============================================================
// Inline Notes Panel
// ============================================================
function InlineNotesPanel({ taskId, onClose }) {
  const [notes,       setNotes]      = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [content,     setContent]    = useState('');
  const [saving,      setSaving]     = useState(false);
  const [editId,      setEditId]     = useState(null);
  const [editContent, setEditContent]= useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/notes`);
      if (res.ok) setNotes((await res.json()).notes || []);
    } finally { setLoading(false); }
  }, [taskId]);

  useEffect(() => { load(); }, [load]);

  const addNote = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/tasks/${taskId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });
      setContent('');
      await load();
    } finally { setSaving(false); }
  };

  const saveEdit = async (noteId) => {
    if (!editContent.trim()) return;
    await fetch(`/api/tasks/${taskId}/notes/${noteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent.trim() }),
    });
    setEditId(null);
    await load();
  };

  const delNote = async (noteId) => {
    await fetch(`/api/tasks/${taskId}/notes/${noteId}`, { method: 'DELETE' });
    await load();
  };

  const fmt = (ts) => {
    if (!ts) return '';
    try { return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return ts; }
  };

  return (
    <div className="inline-panel inline-notes-panel">
      <div className="inline-panel-header">
        <span className="inline-panel-title">
          Notes
          {notes.length > 0 && <span className="inline-panel-count">{notes.length}</span>}
        </span>
        <button className="btn-icon" onClick={onClose} aria-label="Close notes">✕</button>
      </div>

      {loading ? (
        <p className="inline-panel-loading">Loading…</p>
      ) : (
        <div className="notes-list">
          {notes.length === 0 && <p className="notes-empty">No notes yet.</p>}
          {notes.map(note => (
            <div key={note.id} className="note-item">
              {editId === note.id ? (
                <div className="note-edit">
                  <textarea
                    className="form-textarea"
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={3}
                    autoFocus
                  />
                  <div className="note-edit-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => saveEdit(note.id)}>Save</button>
                    <button className="btn btn-ghost btn-sm"   onClick={() => setEditId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="note-content">{note.content}</p>
                  <div className="note-meta">
                    <span className="note-time">{fmt(note.created_at)}</span>
                    <button
                      className="btn-icon note-action"
                      onClick={() => { setEditId(note.id); setEditContent(note.content); }}
                      aria-label="Edit note"
                    >✎</button>
                    <button
                      className="btn-icon note-action"
                      onClick={() => delNote(note.id)}
                      aria-label="Delete note"
                    >✕</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={addNote} className="note-add-form">
        <textarea
          className="form-textarea note-add-input"
          placeholder="Add a note…"
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={2}
        />
        <button type="submit" className="btn btn-secondary btn-sm" disabled={!content.trim() || saving}>
          {saving ? '…' : 'Add Note'}
        </button>
      </form>
    </div>
  );
}

// ============================================================
// Sortable column header
// ============================================================
function SortTh({ col, label, sortCol, sortDir, onSort }) {
  const active = sortCol === col;
  return (
    <th
      className={`task-table-th sortable${active ? ' sorted' : ''}`}
      onClick={() => onSort(col)}
      aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {label}{active && <span className="sort-arrow" aria-hidden="true">{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>}
    </th>
  );
}

// ============================================================
// Main TaskTable
// ============================================================
export default function TaskTable({ tasks, projectCode, allTags, allProjects, handlers, onFocusTask }) {
  const [sortCol,          setSortCol]          = useState(null);
  const [sortDir,          setSortDir]          = useState('asc');
  const [editingStatus,    setEditingStatus]    = useState(null); // taskId
  const [editingPriority,  setEditingPriority]  = useState(null); // taskId
  const [editingTagsFor,   setEditingTagsFor]   = useState(null); // taskId
  const [expandedSubtasks, setExpandedSubtasks] = useState(null); // taskId
  const [expandedNotes,    setExpandedNotes]    = useState(null); // taskId
  const [showAddForm,      setShowAddForm]      = useState(false);
  const [editTask,         setEditTask]         = useState(null);
  const [moveTask,         setMoveTask]         = useState(null);
  const [deleteConfirm,    setDeleteConfirm]    = useState(null);
  const [draggedId,        setDraggedId]        = useState(null);
  const [dragOverId,       setDragOverId]       = useState(null);

  // ---- Sorting ----
  const handleSort = useCallback((col) => {
    setSortCol(prev => {
      if (prev === col) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return col; }
      setSortDir('asc');
      return col;
    });
  }, []);

  const sortedTasks = useMemo(() => {
    const arr = [...tasks];
    arr.sort((a, b) => {
      // Pinned always first
      const ap = a.pinned ? 1 : 0;
      const bp = b.pinned ? 1 : 0;
      if (ap !== bp) return bp - ap;

      if (sortCol) {
        let av = a[sortCol] ?? '';
        let bv = b[sortCol] ?? '';
        if (sortCol === 'progress') { av = Number(av); bv = Number(bv); }
        else { av = String(av).toLowerCase(); bv = String(bv).toLowerCase(); }
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ?  1 : -1;
      }
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
    return arr;
  }, [tasks, sortCol, sortDir]);

  // ---- Today for row highlighting ----
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  const getRowClass = (task) => {
    let cls = 'task-row';
    if (task.pinned) cls += ' task-row-pinned';
    const done = task.status === 'COMPLETED' || task.status === 'CANCELLED' || task.status === 'NOT_DOING';
    if (done) cls += ' task-row-done';
    if (!done && task.due_date) {
      const due = new Date(task.due_date + 'T00:00:00'); due.setHours(0,0,0,0);
      if (due < today) cls += ' task-row-overdue';
    }
    if (draggedId  === task.id) cls += ' task-row-dragging';
    if (dragOverId === task.id) cls += ' task-row-dragover';
    return cls;
  };

  // ---- Drag & drop ----
  const onDragStart = (e, taskId) => {
    setDraggedId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (e, taskId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverId !== taskId) setDragOverId(taskId);
  };
  const onDrop = async (e, targetId) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) { setDraggedId(null); setDragOverId(null); return; }
    const ids      = sortedTasks.map(t => t.id);
    const fromIdx  = ids.indexOf(draggedId);
    const toIdx    = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) { setDraggedId(null); setDragOverId(null); return; }
    const newOrder = [...ids];
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, draggedId);
    const taskOrders = newOrder.map((id, idx) => ({ id, sort_order: idx }));
    setDraggedId(null); setDragOverId(null);
    await handlers.onReorderTasks(projectCode, taskOrders);
  };
  const onDragEnd = () => { setDraggedId(null); setDragOverId(null); };

  // ---- CRUD wrappers ----
  const createTask    = data         => handlers.onCreateTask(projectCode, data);
  const updateTask    = (id, data)   => handlers.onUpdateTask(id, data);
  const duplicateTask = async (task) => {
    // eslint-disable-next-line no-unused-vars
    const { id, task_number, created_on, sort_order, tags, subtaskStats, noteCount, pinned, ...rest } = task;
    await handlers.onCreateTask(projectCode, { ...rest, title: `${task.title} (copy)` });
  };

  // ---- Collapsed column count (for expanded rows) ----
  const COL_COUNT = 10;

  if (tasks.length === 0 && !showAddForm) {
    return (
      <div className="task-table-empty">
        <p className="task-table-empty-text">No tasks yet.</p>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowAddForm(true)}>
          + Add first task
        </button>

        {showAddForm && (
          <TaskFormModal mode="create" onSubmit={createTask} onClose={() => setShowAddForm(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="task-table-container">
      <div className="task-table-scroll">
        <table className="task-table" aria-label="Tasks">
          <thead>
            <tr className="task-table-head-row">
              <th className="task-table-th th-drag"    aria-label="Drag handle" />
              <th className="task-table-th th-pin"     aria-label="Pin" />
              <th className="task-table-th th-num"     aria-label="Task number">#</th>
              <SortTh col="title"    label="Title"    sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <SortTh col="due_date" label="Due"      sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <SortTh col="status"   label="Status"   sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <SortTh col="priority" label="Priority" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <SortTh col="progress" label="Progress" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <th className="task-table-th th-tags">Tags</th>
              <th className="task-table-th th-actions">Actions</th>
            </tr>
          </thead>

          <tbody>
            {sortedTasks.map((task) => {
              const subtaskStats = task.subtaskStats || { total: 0, completed: 0 };
              const noteCount    = task.noteCount    || 0;

              return (
                <React.Fragment key={task.id}>
                  {/* ---- Main task row ---- */}
                  <tr
                    className={getRowClass(task)}
                    draggable
                    onDragStart={e => onDragStart(e, task.id)}
                    onDragOver={e  => onDragOver(e, task.id)}
                    onDrop={e      => onDrop(e, task.id)}
                    onDragEnd={onDragEnd}
                  >
                    {/* Drag handle */}
                    <td className="task-td td-drag">
                      <span className="drag-handle" title="Drag to reorder" aria-hidden="true">⠿</span>
                    </td>

                    {/* Pin */}
                    <td className="task-td td-pin">
                      <button
                        className={`btn-icon pin-btn${task.pinned ? ' pinned' : ''}`}
                        onClick={() => handlers.onTogglePin(task.id)}
                        title={task.pinned ? 'Unpin' : 'Pin to top'}
                        aria-label={task.pinned ? 'Unpin task' : 'Pin task'}
                      >
                        {task.pinned ? '📌' : '⊙'}
                      </button>
                    </td>

                    {/* Task number */}
                    <td className="task-td td-num">
                      <span className="task-number">#{task.task_number}</span>
                    </td>

                    {/* Title */}
                    <td className="task-td td-title">
                      <div className="task-title-cell">
                        <span
                          className={`task-title${
                            task.status === 'COMPLETED' || task.status === 'NOT_DOING'
                              ? ' task-title-done' : ''
                          }`}
                          title={task.title}
                        >
                          {task.title}
                        </span>
                        {task.assigned_to && (
                          <span className="task-assignee">@{task.assigned_to}</span>
                        )}
                        {task.quadrant && (
                          <span className="task-quadrant-badge">{task.quadrant}</span>
                        )}
                      </div>
                    </td>

                    {/* Due date */}
                    <td className="task-td td-due">
                      <DueDateDisplay dueDate={task.due_date} />
                    </td>

                    {/* Status — inline select */}
                    <td className="task-td td-status">
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <span
                          className={`status-badge ${STATUS_CSS[task.status] || ''} clickable-badge`}
                          onClick={() => setEditingStatus(editingStatus === task.id ? null : task.id)}
                          role="button"
                          tabIndex={0}
                          title="Click to change status"
                          onKeyDown={e => e.key === 'Enter' && setEditingStatus(
                            editingStatus === task.id ? null : task.id
                          )}
                        >
                          {STATUS_LABELS[task.status] || task.status}
                        </span>
                        {editingStatus === task.id && (
                          <InlineSelect
                            value={task.status}
                            options={STATUS_OPTIONS}
                            labels={STATUS_LABELS}
                            cssMap={STATUS_CSS}
                            onSave={async v => { setEditingStatus(null); await updateTask(task.id, { status: v }); }}
                            onCancel={() => setEditingStatus(null)}
                          />
                        )}
                      </div>
                    </td>

                    {/* Priority — inline select */}
                    <td className="task-td td-priority">
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <span
                          className={`priority-badge ${PRIORITY_CSS[task.priority] || 'priority-none'} clickable-badge`}
                          onClick={() => setEditingPriority(editingPriority === task.id ? null : task.id)}
                          role="button"
                          tabIndex={0}
                          title="Click to change priority"
                          onKeyDown={e => e.key === 'Enter' && setEditingPriority(
                            editingPriority === task.id ? null : task.id
                          )}
                        >
                          {PRIORITY_LABELS[task.priority] || '—'}
                        </span>
                        {editingPriority === task.id && (
                          <InlineSelect
                            value={task.priority || ''}
                            options={PRIORITY_OPTIONS}
                            labels={PRIORITY_LABELS}
                            cssMap={PRIORITY_CSS}
                            onSave={async v => { setEditingPriority(null); await updateTask(task.id, { priority: v }); }}
                            onCancel={() => setEditingPriority(null)}
                          />
                        )}
                      </div>
                    </td>

                    {/* Progress */}
                    <td className="task-td td-progress">
                      <ProgressBar
                        value={task.progress || 0}
                        taskId={task.id}
                        onUpdate={updateTask}
                      />
                    </td>

                    {/* Tags */}
                    <td className="task-td td-tags">
                      <div className="tag-pills-wrapper" style={{ position: 'relative' }}>
                        <div className="tag-pills">
                          {(task.tags || []).slice(0, 3).map(tag => (
                            <span
                              key={tag.id}
                              className="tag-pill"
                              style={{ borderColor: tag.color, color: tag.color }}
                              title={tag.name}
                            >
                              {tag.name}
                            </span>
                          ))}
                          {(task.tags || []).length > 3 && (
                            <span className="tag-pill tag-pill-more" title={`${task.tags.length - 3} more tags`}>
                              +{task.tags.length - 3}
                            </span>
                          )}
                          <button
                            className="btn-icon tag-edit-btn"
                            onClick={() => setEditingTagsFor(editingTagsFor === task.id ? null : task.id)}
                            title="Edit tags"
                            aria-label="Edit tags"
                          >
                            +
                          </button>
                        </div>
                        {editingTagsFor === task.id && (
                          <div className="tag-editor-anchor">
                            <InlineTagEditor
                              task={task}
                              allTags={allTags}
                              onUpdateTags={handlers.onUpdateTags}
                              onClose={() => setEditingTagsFor(null)}
                            />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="task-td td-actions">
                      <div className="task-action-btns">
                        {onFocusTask && (
                          <button
                            className="btn-icon action-btn"
                            onClick={() => onFocusTask(task)}
                            title="Focus mode"
                            aria-label="Open focus mode"
                          >◎</button>
                        )}

                        <button
                          className={`btn-icon action-btn${expandedSubtasks === task.id ? ' action-btn-active' : ''}`}
                          onClick={() => setExpandedSubtasks(
                            expandedSubtasks === task.id ? null : task.id
                          )}
                          title={`Subtasks (${subtaskStats.completed}/${subtaskStats.total})`}
                          aria-label="Toggle subtasks"
                        >
                          ☑
                          {subtaskStats.total > 0 && (
                            <span className="action-count-badge">
                              {subtaskStats.completed}/{subtaskStats.total}
                            </span>
                          )}
                        </button>

                        <button
                          className={`btn-icon action-btn${expandedNotes === task.id ? ' action-btn-active' : ''}`}
                          onClick={() => setExpandedNotes(
                            expandedNotes === task.id ? null : task.id
                          )}
                          title={`Notes${noteCount > 0 ? ` (${noteCount})` : ''}`}
                          aria-label="Toggle notes"
                        >
                          ✍
                          {noteCount > 0 && (
                            <span className="action-count-badge">{noteCount}</span>
                          )}
                        </button>

                        <button
                          className="btn-icon action-btn"
                          onClick={() => setEditTask(task)}
                          title="Edit task"
                          aria-label="Edit task"
                        >✎</button>

                        <button
                          className="btn-icon action-btn"
                          onClick={() => duplicateTask(task)}
                          title="Duplicate task"
                          aria-label="Duplicate task"
                        >⧉</button>

                        <button
                          className="btn-icon action-btn"
                          onClick={() => setMoveTask(task)}
                          title="Move to another project"
                          aria-label="Move task"
                        >↷</button>

                        <button
                          className="btn-icon action-btn action-btn-danger"
                          onClick={() => setDeleteConfirm(task)}
                          title="Delete task"
                          aria-label="Delete task"
                        >✕</button>
                      </div>
                    </td>
                  </tr>

                  {/* ---- Expanded subtasks row ---- */}
                  {expandedSubtasks === task.id && (
                    <tr className="task-row-expanded">
                      <td colSpan={COL_COUNT} className="task-expanded-td">
                        <InlineSubtasksPanel
                          taskId={task.id}
                          onClose={() => setExpandedSubtasks(null)}
                        />
                      </td>
                    </tr>
                  )}

                  {/* ---- Expanded notes row ---- */}
                  {expandedNotes === task.id && (
                    <tr className="task-row-expanded">
                      <td colSpan={COL_COUNT} className="task-expanded-td">
                        <InlineNotesPanel
                          taskId={task.id}
                          onClose={() => setExpandedNotes(null)}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ---- Add task footer ---- */}
      <div className="task-table-footer">
        <button className="btn btn-ghost btn-sm task-add-btn" onClick={() => setShowAddForm(true)}>
          + Add Task
        </button>
      </div>

      {/* ---- Modals ---- */}
      {showAddForm && (
        <TaskFormModal
          mode="create"
          onSubmit={createTask}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {editTask && (
        <TaskFormModal
          mode="edit"
          initial={editTask}
          onSubmit={data => updateTask(editTask.id, data)}
          onClose={() => setEditTask(null)}
        />
      )}

      {moveTask && (
        <MoveTaskModal
          task={moveTask}
          allProjects={allProjects}
          currentProjectCode={projectCode}
          onMove={handlers.onMoveTask}
          onClose={() => setMoveTask(null)}
        />
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()} role="alertdialog" aria-modal="true">
            <div className="modal-header">
              <h2>Delete Task</h2>
              <button className="btn-icon" onClick={() => setDeleteConfirm(null)} aria-label="Close">✕</button>
            </div>
            <p className="confirm-dialog-message">
              Delete <strong>"{deleteConfirm.title}"</strong>? You can undo this from the toast.
            </p>
            <div className="modal-footer">
              <button className="btn btn-ghost"  onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button
                className="btn btn-danger"
                onClick={async () => {
                  const t = deleteConfirm;
                  setDeleteConfirm(null);
                  await handlers.onDeleteTask(t.id, false);
                }}
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
