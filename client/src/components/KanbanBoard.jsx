import React, { useState, useMemo } from 'react';
import { TaskFormModal, DueDateDisplay } from './TaskTable';

// ============================================================
// Constants
// ============================================================
const PRIORITY_LABELS    = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };
const PRIORITY_CSS       = { HIGH: 'priority-high', MEDIUM: 'priority-medium', LOW: 'priority-low' };
const PRIORITY_ORDER_MAP = { HIGH: 0, MEDIUM: 1, LOW: 2 };

const COLUMNS = [
  { key: 'PENDING',    label: 'Pending',     color: '#fbbf24', cls: 'col-pending' },
  { key: 'INPROGRESS', label: 'In Progress', color: '#60a5fa', cls: 'col-inprogress' },
  { key: 'COMPLETED',  label: 'Completed',   color: '#4ade80', cls: 'col-completed' },
  { key: 'CANCELLED',  label: 'Cancelled',   color: '#f87171', cls: 'col-cancelled' },
];

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

// ============================================================
// Kanban task card
// ============================================================
function KanbanCard({ task, isDragging, onEdit, onFocus, onDelete, onDragStart, onDragEnd }) {
  const pct     = task.progress || 0;
  const tagList = task.tags || [];

  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const isDone   = ['COMPLETED', 'CANCELLED', 'NOT_DOING'].includes(task.status);
  let isOverdue  = false, isToday = false;
  if (!isDone && task.due_date) {
    const due = new Date(task.due_date + 'T00:00:00'); due.setHours(0, 0, 0, 0);
    isOverdue  = due < today;
    isToday    = due.getTime() === today.getTime();
  }

  return (
    <div
      className={`kanban-card${task.pinned ? ' kanban-card-pinned' : ''}${isOverdue ? ' kanban-card-overdue' : ''}${isDragging ? ' kanban-card-dragging' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      role="article"
      aria-label={`Task: ${task.title}`}
    >
      {/* Card header: project badge + priority + pin */}
      <div className="kc-header">
        <span
          className="kc-project-badge"
          style={{ background: codeColor(task.projectCode) }}
          title={task.projectName}
        >
          {task.projectCode}
        </span>
        {task.priority && (
          <span className={`priority-badge ${PRIORITY_CSS[task.priority] || ''}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
            {PRIORITY_LABELS[task.priority]}
          </span>
        )}
        {task.pinned && <span className="kc-pin" title="Pinned" aria-hidden="true">📌</span>}
      </div>

      {/* Title */}
      <div className="kc-title">{task.title}</div>

      {/* Progress bar (only if partial) */}
      {pct > 0 && pct < 100 && (
        <div className="kc-progress">
          <div className="kc-progress-track">
            <div className="kc-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="kc-progress-pct">{pct}%</span>
        </div>
      )}

      {/* Due date */}
      {task.due_date && (
        <div className={`kc-due${isOverdue ? ' kc-due-overdue' : isToday ? ' kc-due-today' : ''}`}>
          <DueDateDisplay dueDate={task.due_date} />
        </div>
      )}

      {/* Assignee */}
      {task.assigned_to && (
        <div className="kc-assignee">@{task.assigned_to}</div>
      )}

      {/* Tags (max 3 + "+N") */}
      {tagList.length > 0 && (
        <div className="kc-tags">
          {tagList.slice(0, 3).map(tag => (
            <span
              key={tag.id}
              className="tag-pill"
              style={{ background: tag.color + '33', color: tag.color, borderColor: tag.color + '66' }}
            >
              {tag.name}
            </span>
          ))}
          {tagList.length > 3 && <span className="tag-more">+{tagList.length - 3}</span>}
        </div>
      )}

      {/* Hover actions */}
      <div className="kc-actions">
        <button className="btn-icon action-btn" onClick={() => onFocus(task)}  title="Focus mode" aria-label="Focus mode">◎</button>
        <button className="btn-icon action-btn" onClick={() => onEdit(task)}   title="Edit task"  aria-label="Edit task">✎</button>
        <button className="btn-icon action-btn action-btn-danger" onClick={() => onDelete(task)} title="Delete task" aria-label="Delete task">✕</button>
      </div>
    </div>
  );
}

// ============================================================
// Main KanbanBoard
// ============================================================
export default function KanbanBoard({ projects, allTags, handlers, onFocusTask }) {
  const [editTask,      setEditTask]      = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [draggedId,     setDraggedId]     = useState(null);
  const [dragOverCol,   setDragOverCol]   = useState(null);
  const [collapsedCols, setCollapsedCols] = useState(new Set());

  // Flatten tasks from all filtered projects
  const allTasks = useMemo(() => {
    return projects.flatMap(p =>
      (p.tasks || []).map(t => ({ ...t, projectCode: p.code, projectName: p.name }))
    );
  }, [projects]);

  // Group tasks by status + sort within each column
  const tasksByStatus = useMemo(() => {
    const map = {};
    for (const col of COLUMNS) map[col.key] = [];
    for (const task of allTasks) {
      if (map[task.status]) map[task.status].push(task);
    }
    for (const col of COLUMNS) {
      map[col.key].sort((a, b) => {
        // Pinned first
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        // Then priority (HIGH > MEDIUM > LOW)
        const pa = PRIORITY_ORDER_MAP[a.priority] ?? 3;
        const pb = PRIORITY_ORDER_MAP[b.priority] ?? 3;
        if (pa !== pb) return pa - pb;
        // Then due date (earliest first)
        const da = a.due_date || 'z', db = b.due_date || 'z';
        return da < db ? -1 : da > db ? 1 : 0;
      });
    }
    return map;
  }, [allTasks]);

  const toggleCollapse = (colKey) => {
    setCollapsedCols(prev => {
      const next = new Set(prev);
      next.has(colKey) ? next.delete(colKey) : next.add(colKey);
      return next;
    });
  };

  // ---- Drag handlers ----
  const onDragStart = (e, taskId) => { setDraggedId(taskId); e.dataTransfer.effectAllowed = 'move'; };
  const onDragOver  = (e, colKey) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colKey) setDragOverCol(colKey);
  };
  const onDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    if (!draggedId) return;
    const task = allTasks.find(t => t.id === draggedId);
    if (!task || task.status === targetStatus) { setDraggedId(null); return; }
    setDraggedId(null);
    await handlers.onUpdateTask(draggedId, { status: targetStatus });
  };
  const onDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOverCol(null);
  };
  const onDragEnd = () => { setDraggedId(null); setDragOverCol(null); };

  // Total count for footer
  const totalTasks = allTasks.length;

  return (
    <div className="kanban-wrapper">
      <div className="kanban-board">
        {COLUMNS.map(col => {
          const tasks       = tasksByStatus[col.key] || [];
          const isCollapsed = collapsedCols.has(col.key);
          const isDragTarget = dragOverCol === col.key;

          return (
            <div
              key={col.key}
              className={`kanban-column ${col.cls}${isDragTarget ? ' kanban-col-drag-target' : ''}${isCollapsed ? ' kanban-col-collapsed' : ''}`}
              onDragOver={e => onDragOver(e, col.key)}
              onDrop={e      => onDrop(e, col.key)}
              onDragLeave={onDragLeave}
            >
              {/* Column header */}
              <div className="kanban-col-header" style={{ borderTopColor: col.color }}>
                <div className="kanban-col-title-row">
                  <span className="kanban-col-label" style={{ color: col.color }}>{col.label}</span>
                  <span className="kanban-col-count" style={{ background: col.color + '33', color: col.color }}>
                    {tasks.length}
                  </span>
                  <button
                    className="btn-icon kanban-col-collapse-btn"
                    onClick={() => toggleCollapse(col.key)}
                    aria-label={isCollapsed ? `Expand ${col.label} column` : `Collapse ${col.label} column`}
                    title={isCollapsed ? 'Expand' : 'Collapse'}
                  >
                    {isCollapsed ? '▼' : '▲'}
                  </button>
                </div>
              </div>

              {/* Column body */}
              {!isCollapsed && (
                <div className="kanban-col-body">
                  {tasks.length === 0 ? (
                    <div className="kanban-col-empty">
                      {isDragTarget ? 'Drop here' : 'No tasks'}
                    </div>
                  ) : (
                    tasks.map(task => (
                      <KanbanCard
                        key={task.id}
                        task={task}
                        isDragging={draggedId === task.id}
                        onEdit={setEditTask}
                        onFocus={t => onFocusTask && onFocusTask(t)}
                        onDelete={setDeleteConfirm}
                        onDragStart={e => onDragStart(e, task.id)}
                        onDragEnd={onDragEnd}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Stats footer */}
      <div className="kanban-stats-footer">
        <span className="kanban-stats-total">{totalTasks} task{totalTasks !== 1 ? 's' : ''} total</span>
        {COLUMNS.map(col => (
          <span key={col.key} className="kanban-stats-col" style={{ color: col.color }}>
            {col.label}: {(tasksByStatus[col.key] || []).length}
          </span>
        ))}
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
    </div>
  );
}
