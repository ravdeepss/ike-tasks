import React, { useState, useMemo } from 'react';
import { TaskFormModal, DueDateDisplay } from './TaskTable';

// ============================================================
// Constants
// ============================================================
const PRIORITY_LABELS = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };
const PRIORITY_CSS    = { HIGH: 'priority-high', MEDIUM: 'priority-medium', LOW: 'priority-low' };

const QUADRANT_ORDER = ['DO FIRST', 'SCHEDULE', 'DELEGATE', 'ELIMINATE'];

const QUADRANT_META = {
  'DO FIRST':  { label: 'DO FIRST',  subtitle: 'Urgent & Important',         color: '#ef4444', icon: '🔥' },
  'SCHEDULE':  { label: 'SCHEDULE',  subtitle: 'Important, Not Urgent',       color: '#38bdf8', icon: '📅' },
  'DELEGATE':  { label: 'DELEGATE',  subtitle: 'Urgent, Not Important',       color: '#fbbf24', icon: '👤' },
  'ELIMINATE': { label: 'ELIMINATE', subtitle: 'Not Urgent & Not Important',  color: '#64748b', icon: '🗑' },
};

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
// Task card for priority matrix
// ============================================================
function PMTaskCard({ task, isDragging, onEdit, onFocus, onDragStart, onDragEnd }) {
  const pct = task.progress || 0;

  return (
    <div
      className={`pm-task-card${isDragging ? ' pm-card-dragging' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onEdit(task)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onEdit(task)}
      aria-label={`Task: ${task.title}. Click to edit.`}
    >
      <div className="pm-card-header">
        <span
          className="pm-card-project"
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
        {task.pinned && <span className="pm-card-pin" title="Pinned" aria-hidden="true">📌</span>}
      </div>

      <div className="pm-card-title">{task.title}</div>

      {task.due_date && (
        <div className="pm-card-due">
          <DueDateDisplay dueDate={task.due_date} />
        </div>
      )}

      {pct > 0 && (
        <div className="pm-card-progress">
          <div className="pm-progress-track">
            <div className="pm-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="pm-progress-label">{pct}%</span>
        </div>
      )}

      <div className="pm-card-actions">
        <button
          className="btn-icon action-btn"
          onClick={e => { e.stopPropagation(); onFocus(task); }}
          title="Focus mode"
          aria-label="Focus mode"
        >◎</button>
      </div>
    </div>
  );
}

// ============================================================
// Main PriorityMatrix
// ============================================================
export default function PriorityMatrix({ projects, allTags, handlers, onFocusTask }) {
  const [editTask,   setEditTask]   = useState(null);
  const [dragTaskId, setDragTaskId] = useState(null);
  const [dragOverQ,  setDragOverQ]  = useState(null);

  // Flatten tasks from all filtered projects
  const allTasks = useMemo(() => {
    return projects.flatMap(p =>
      (p.tasks || []).map(t => ({ ...t, projectCode: p.code, projectName: p.name }))
    );
  }, [projects]);

  // Group by quadrant (tasks without quadrant fall into ELIMINATE)
  const tasksByQuadrant = useMemo(() => {
    const map = { 'DO FIRST': [], 'SCHEDULE': [], 'DELEGATE': [], 'ELIMINATE': [] };
    for (const task of allTasks) {
      const q = task.quadrant && QUADRANT_ORDER.includes(task.quadrant) ? task.quadrant : 'ELIMINATE';
      map[q].push(task);
    }
    return map;
  }, [allTasks]);

  // ---- Drag handlers ----
  const handleDragStart = (e, taskId) => {
    setDragTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e, quadrant) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverQ !== quadrant) setDragOverQ(quadrant);
  };
  const handleDrop = async (e, targetQuadrant) => {
    e.preventDefault();
    setDragOverQ(null);
    if (!dragTaskId) return;
    const task = allTasks.find(t => t.id === dragTaskId);
    const currentQuadrant = task?.quadrant && QUADRANT_ORDER.includes(task.quadrant) ? task.quadrant : 'ELIMINATE';
    if (!task || currentQuadrant === targetQuadrant) { setDragTaskId(null); return; }
    setDragTaskId(null);
    await handlers.onUpdateTask(dragTaskId, { quadrant: targetQuadrant });
  };
  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOverQ(null);
  };
  const handleDragEnd = () => { setDragTaskId(null); setDragOverQ(null); };

  if (allTasks.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🎯</div>
        <h3 className="empty-state-title">No tasks</h3>
        <p className="empty-state-desc">No tasks match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="priority-matrix">
      {QUADRANT_ORDER.map(q => {
        const { label, subtitle, color, icon } = QUADRANT_META[q];
        const tasks        = tasksByQuadrant[q];
        const isDragTarget = dragOverQ === q;

        return (
          <div
            key={q}
            className={`pm-quadrant${isDragTarget ? ' pm-drag-target' : ''}`}
            onDragOver={e => handleDragOver(e, q)}
            onDrop={e      => handleDrop(e, q)}
            onDragLeave={handleDragLeave}
          >
            <div className="pm-quadrant-header" style={{ borderLeftColor: color }}>
              <div className="pm-quadrant-top">
                <span className="pm-quadrant-icon" aria-hidden="true">{icon}</span>
                <span className="pm-quadrant-label" style={{ color }}>{label}</span>
                <span className="pm-quadrant-count">{tasks.length}</span>
              </div>
              <div className="pm-quadrant-subtitle">{subtitle}</div>
            </div>

            <div className="pm-quadrant-body">
              {tasks.length === 0 ? (
                <div className="pm-empty">Drop tasks here</div>
              ) : (
                tasks.map(task => (
                  <PMTaskCard
                    key={task.id}
                    task={task}
                    isDragging={dragTaskId === task.id}
                    onEdit={setEditTask}
                    onFocus={t => onFocusTask && onFocusTask(t)}
                    onDragStart={e => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}

      {editTask && (
        <TaskFormModal
          mode="edit"
          initial={editTask}
          onSubmit={data => handlers.onUpdateTask(editTask.id, data)}
          onClose={() => setEditTask(null)}
        />
      )}
    </div>
  );
}
