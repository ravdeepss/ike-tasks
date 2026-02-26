import React, { useState, useMemo, useCallback } from 'react';
import { TaskFormModal, DueDateDisplay } from './TaskTable';
import InlineTagEditor from './InlineTagEditor';

// ============================================================
// Constants (mirrored from TaskTable)
// ============================================================
const STATUS_OPTIONS = ['PENDING', 'INPROGRESS', 'COMPLETED', 'CANCELLED', 'NOT_DOING'];
const STATUS_LABELS  = { PENDING: 'Pending', INPROGRESS: 'In Progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled', NOT_DOING: 'Not Doing' };
const STATUS_CSS     = { PENDING: 'status-pending', INPROGRESS: 'status-inprogress', COMPLETED: 'status-completed', CANCELLED: 'status-cancelled', NOT_DOING: 'status-not-doing' };

const PRIORITY_OPTIONS = ['HIGH', 'MEDIUM', 'LOW'];
const PRIORITY_LABELS  = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };
const PRIORITY_CSS     = { HIGH: 'priority-high', MEDIUM: 'priority-medium', LOW: 'priority-low' };

// ============================================================
// Helpers
// ============================================================
function codeColor(code) {
  const palette = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4',
    '#22c55e', '#f97316', '#eab308', '#ef4444',
    '#14b8a6', '#a855f7', '#0ea5e9', '#84cc16',
  ];
  let h = 0;
  for (const ch of (code || '')) h = (h * 31 + ch.charCodeAt(0)) & 0xffff;
  return palette[h % palette.length];
}

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

function BulkMoveModal({ selectedCount, allProjects, onMove, onClose }) {
  const [target, setTarget] = useState('');
  const [saving, setSaving] = useState(false);
  const active = (allProjects || []).filter(p => p.status !== 'Archived');

  const handleMove = async () => {
    if (!target) return;
    setSaving(true);
    try { await onMove(target); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2>Move {selectedCount} Task{selectedCount !== 1 ? 's' : ''}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="form-group">
          <label className="form-label">Move to project</label>
          <select className="form-select" value={target} onChange={e => setTarget(e.target.value)}>
            <option value="">— Select project —</option>
            {active.map(p => (
              <option key={p.code} value={p.code}>[{p.code}] {p.name}</option>
            ))}
          </select>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleMove} disabled={!target || saving}>
            {saving ? 'Moving…' : 'Move'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main AllTasksView
// ============================================================
export default function AllTasksView({ projects, allTags, allProjects, handlers, onFocusTask }) {
  // Flatten all tasks from all filtered projects
  const allTasks = useMemo(() => {
    return projects.flatMap(p =>
      (p.tasks || []).map(t => ({ ...t, projectCode: p.code, projectName: p.name }))
    );
  }, [projects]);

  const [sortCol,          setSortCol]          = useState(null);
  const [sortDir,          setSortDir]          = useState('asc');
  const [selectedIds,      setSelectedIds]      = useState(new Set());
  const [editingStatus,    setEditingStatus]    = useState(null); // taskId
  const [editingPriority,  setEditingPriority]  = useState(null); // taskId
  const [editingTagsFor,   setEditingTagsFor]   = useState(null); // taskId
  const [editTask,         setEditTask]         = useState(null);
  const [deleteConfirm,    setDeleteConfirm]    = useState(null);
  const [showBulkMove,     setShowBulkMove]     = useState(false);
  const [bulkStatus,       setBulkStatus]       = useState('');
  const [bulkApplying,     setBulkApplying]     = useState(false);
  const [draggedId,        setDraggedId]        = useState(null);
  const [dragOverId,       setDragOverId]       = useState(null);

  const handleSort = useCallback((col) => {
    setSortCol(prev => {
      if (prev === col) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return col; }
      setSortDir('asc');
      return col;
    });
  }, []);

  const sortedTasks = useMemo(() => {
    const arr = [...allTasks];
    arr.sort((a, b) => {
      const ap = a.pinned ? 1 : 0, bp = b.pinned ? 1 : 0;
      if (ap !== bp) return bp - ap;
      if (sortCol) {
        let av = a[sortCol] ?? '', bv = b[sortCol] ?? '';
        if (sortCol === 'progress') { av = Number(av); bv = Number(bv); }
        else { av = String(av).toLowerCase(); bv = String(bv).toLowerCase(); }
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ?  1 : -1;
      }
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
    return arr;
  }, [allTasks, sortCol, sortDir]);

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  const getRowClass = (task) => {
    let cls = 'task-row';
    if (task.pinned) cls += ' task-row-pinned';
    const done = ['COMPLETED', 'CANCELLED', 'NOT_DOING'].includes(task.status);
    if (done) cls += ' task-row-done';
    if (!done && task.due_date) {
      const due = new Date(task.due_date + 'T00:00:00'); due.setHours(0, 0, 0, 0);
      if (due < today) cls += ' task-row-overdue';
    }
    if (draggedId  === task.id) cls += ' task-row-dragging';
    if (dragOverId === task.id) cls += ' task-row-dragover';
    return cls;
  };

  // ---- Bulk selection ----
  const allSelected  = sortedTasks.length > 0 && sortedTasks.every(t => selectedIds.has(t.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(sortedTasks.map(t => t.id)));
  };
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ---- Drag-and-drop (global reorder) ----
  const onDragStart = (e, taskId) => { setDraggedId(taskId); e.dataTransfer.effectAllowed = 'move'; };
  const onDragOver  = (e, taskId) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    if (dragOverId !== taskId) setDragOverId(taskId);
  };
  const onDrop = async (e, targetId) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) { setDraggedId(null); setDragOverId(null); return; }
    const ids     = sortedTasks.map(t => t.id);
    const fromIdx = ids.indexOf(draggedId);
    const toIdx   = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) { setDraggedId(null); setDragOverId(null); return; }
    const newOrder = [...ids];
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, draggedId);
    const taskOrders = newOrder.map((id, idx) => ({ id, sort_order: idx }));
    setDraggedId(null); setDragOverId(null);
    await handlers.onReorderAllTasks(taskOrders);
  };
  const onDragEnd = () => { setDraggedId(null); setDragOverId(null); };

  // ---- Bulk actions ----
  const handleBulkStatus = async () => {
    if (!bulkStatus || bulkApplying) return;
    setBulkApplying(true);
    try {
      for (const id of selectedIds) await handlers.onUpdateTask(id, { status: bulkStatus });
      setSelectedIds(new Set()); setBulkStatus('');
    } finally { setBulkApplying(false); }
  };

  const handleBulkMove = async (targetProjectCode) => {
    setBulkApplying(true);
    try {
      for (const id of selectedIds) await handlers.onMoveTask(id, targetProjectCode);
      setSelectedIds(new Set()); setShowBulkMove(false);
    } finally { setBulkApplying(false); }
  };

  if (allTasks.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <h3 className="empty-state-title">No tasks</h3>
        <p className="empty-state-desc">No tasks match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="atv-container">

      {/* ---- Bulk toolbar ---- */}
      {someSelected && (
        <div className="bulk-toolbar">
          <span className="bulk-count">{selectedIds.size} selected</span>
          <select
            className="form-select form-select-sm"
            value={bulkStatus}
            onChange={e => setBulkStatus(e.target.value)}
          >
            <option value="">Change status…</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleBulkStatus}
            disabled={!bulkStatus || bulkApplying}
          >
            {bulkApplying ? '…' : 'Apply'}
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowBulkMove(true)}
            disabled={bulkApplying}
          >
            Move to…
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelectedIds(new Set())}>
            Clear
          </button>
        </div>
      )}

      {/* ---- Table ---- */}
      <div className="task-table-scroll">
        <table className="task-table" aria-label="All tasks">
          <thead>
            <tr className="task-table-head-row">
              <th className="task-table-th th-drag"  aria-label="Drag handle" />
              <th className="task-table-th th-check">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  aria-label="Select all tasks"
                />
              </th>
              <th className="task-table-th th-pin"   aria-label="Pin" />
              <th className="task-table-th th-num">#</th>
              <SortTh col="projectCode" label="Project"  sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <SortTh col="title"       label="Title"    sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <SortTh col="due_date"    label="Due"      sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <SortTh col="status"      label="Status"   sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <SortTh col="priority"    label="Priority" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <SortTh col="progress"    label="Progress" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <th className="task-table-th th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map(task => {
              const tagList   = task.tags  || [];
              const pct       = task.progress || 0;
              const barColor  = pct === 100 ? '#4ade80' : pct >= 50 ? '#38bdf8' : '#818cf8';

              return (
                <tr
                  key={task.id}
                  className={getRowClass(task)}
                  draggable
                  onDragStart={e => onDragStart(e, task.id)}
                  onDragOver={e  => onDragOver(e, task.id)}
                  onDrop={e      => onDrop(e, task.id)}
                  onDragEnd={onDragEnd}
                >
                  <td className="task-table-td td-drag">
                    <span className="drag-handle" title="Drag to reorder" aria-hidden="true">⠿</span>
                  </td>
                  <td className="task-table-td td-check">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(task.id)}
                      onChange={() => toggleSelect(task.id)}
                      aria-label={`Select task: ${task.title}`}
                    />
                  </td>
                  <td className="task-table-td td-pin">
                    <button
                      className={`btn-icon pin-btn${task.pinned ? ' pinned' : ''}`}
                      onClick={() => handlers.onTogglePin(task.id)}
                      title={task.pinned ? 'Unpin' : 'Pin'}
                      aria-label={task.pinned ? 'Unpin task' : 'Pin task'}
                    >
                      {task.pinned ? '📌' : '📍'}
                    </button>
                  </td>
                  <td className="task-table-td td-num">{task.task_number}</td>

                  {/* Project badge */}
                  <td className="task-table-td td-project">
                    <span
                      className="project-code-badge"
                      style={{ background: codeColor(task.projectCode) }}
                      title={task.projectName}
                    >
                      {task.projectCode}
                    </span>
                  </td>

                  {/* Title + inline tags */}
                  <td className="task-table-td td-title">
                    <div className="task-title-cell">
                      <span className={`task-title-text${['COMPLETED','CANCELLED','NOT_DOING'].includes(task.status) ? ' task-title-done' : ''}`}>
                        {task.title}
                      </span>
                      {tagList.length > 0 && (
                        <span className="atv-tags-inline">
                          {tagList.slice(0, 2).map(tag => (
                            <span
                              key={tag.id}
                              className="tag-pill"
                              style={{ background: tag.color + '33', color: tag.color, borderColor: tag.color + '66' }}
                            >
                              {tag.name}
                            </span>
                          ))}
                          {tagList.length > 2 && <span className="tag-more">+{tagList.length - 2}</span>}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="task-table-td td-due">
                    <DueDateDisplay dueDate={task.due_date} />
                  </td>

                  {/* Status — inline select */}
                  <td className="task-table-td td-status" style={{ position: 'relative' }}>
                    <span
                      className={`status-badge ${STATUS_CSS[task.status] || ''}`}
                      onClick={() => setEditingStatus(editingStatus === task.id ? null : task.id)}
                      role="button" tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && setEditingStatus(editingStatus === task.id ? null : task.id)}
                      aria-label={`Status: ${STATUS_LABELS[task.status]}`}
                    >
                      {STATUS_LABELS[task.status] || task.status}
                    </span>
                    {editingStatus === task.id && (
                      <InlineSelect
                        value={task.status} options={STATUS_OPTIONS} labels={STATUS_LABELS} cssMap={STATUS_CSS}
                        onSave={async v => { setEditingStatus(null); await handlers.onUpdateTask(task.id, { status: v }); }}
                        onCancel={() => setEditingStatus(null)}
                      />
                    )}
                  </td>

                  {/* Priority — inline select */}
                  <td className="task-table-td td-priority" style={{ position: 'relative' }}>
                    {task.priority ? (
                      <span
                        className={`priority-badge ${PRIORITY_CSS[task.priority] || ''}`}
                        onClick={() => setEditingPriority(editingPriority === task.id ? null : task.id)}
                        role="button" tabIndex={0}
                        aria-label={`Priority: ${PRIORITY_LABELS[task.priority]}`}
                      >
                        {PRIORITY_LABELS[task.priority]}
                      </span>
                    ) : (
                      <span
                        className="priority-badge-none"
                        onClick={() => setEditingPriority(editingPriority === task.id ? null : task.id)}
                      >—</span>
                    )}
                    {editingPriority === task.id && (
                      <InlineSelect
                        value={task.priority || ''} options={PRIORITY_OPTIONS} labels={PRIORITY_LABELS} cssMap={PRIORITY_CSS}
                        onSave={async v => { setEditingPriority(null); await handlers.onUpdateTask(task.id, { priority: v || null }); }}
                        onCancel={() => setEditingPriority(null)}
                      />
                    )}
                  </td>

                  {/* Progress bar */}
                  <td className="task-table-td td-progress">
                    <div className="progress-bar-track" title={`${pct}%`}>
                      <div className="progress-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                      <span className="progress-bar-text">{pct}%</span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="task-table-td td-actions">
                    <div className="task-actions">
                      <button
                        className="btn-icon action-btn"
                        onClick={() => onFocusTask && onFocusTask(task)}
                        title="Focus mode" aria-label="Focus mode"
                      >◎</button>
                      <button
                        className="btn-icon action-btn"
                        onClick={() => setEditTask(task)}
                        title="Edit task" aria-label="Edit task"
                      >✎</button>
                      <button
                        className="btn-icon action-btn action-btn-danger"
                        onClick={() => setDeleteConfirm(task)}
                        title="Delete task" aria-label="Delete task"
                      >✕</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ---- Modals ---- */}
      {editTask && (
        <TaskFormModal
          mode="edit"
          initial={editTask}
          onSubmit={data => handlers.onUpdateTask(editTask.id, data)}
          onClose={() => setEditTask(null)}
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
              Delete <strong>"{deleteConfirm.title}"</strong>? You can undo from the toast.
            </p>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={async () => {
                const t = deleteConfirm; setDeleteConfirm(null);
                await handlers.onDeleteTask(t.id, false);
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {showBulkMove && (
        <BulkMoveModal
          selectedCount={selectedIds.size}
          allProjects={allProjects}
          onMove={handleBulkMove}
          onClose={() => setShowBulkMove(false)}
        />
      )}
    </div>
  );
}
