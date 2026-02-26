import React, { useState, useCallback } from 'react';
import { ProjectFormModal, ConfirmDialog } from './FormModal';
import TaskTable from './TaskTable';

// ---- Helpers ----
function lsGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
}

/** Deterministic colour for a project code */
function codeColor(code) {
  const palette = [
    '#3b82f6','#8b5cf6','#ec4899','#06b6d4',
    '#22c55e','#f97316','#eab308','#ef4444',
    '#14b8a6','#a855f7','#0ea5e9','#84cc16',
  ];
  let h = 0;
  for (const ch of (code || '')) h = (h * 31 + ch.charCodeAt(0)) & 0xffff;
  return palette[h % palette.length];
}

const PROJECT_STATUS_CSS = {
  'In Progress': 'status-inprogress',
  'Completed':   'status-completed',
  'Archived':    'status-not-doing',
};

// ============================================================
// ProjectCard
// ============================================================
export default function ProjectCard({ project, allTags, allProjects, handlers, onFocusTask }) {
  const lsKey = `taskDashboard_projectExpanded_${project.code}`;

  const [expanded,           setExpanded]           = useState(() => lsGet(lsKey, true));
  const [showEdit,           setShowEdit]           = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showDeleteConfirm,  setShowDeleteConfirm]  = useState(false);

  const toggle = () => setExpanded(v => { lsSet(lsKey, !v); return !v; });

  const tasks     = project.tasks || [];
  const total     = tasks.length;
  const completed = tasks.filter(t => t.status === 'COMPLETED').length;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
  const color     = codeColor(project.code);
  const isArchived = project.status === 'Archived';

  const handleEdit    = useCallback(data => handlers.onUpdateProject(project.code, data), [handlers, project.code]);
  const handleArchive = useCallback(()   => handlers.onArchiveProject(project.code),      [handlers, project.code]);
  const handleRestore = useCallback(()   => handlers.onRestoreProject(project.code, 'In Progress'), [handlers, project.code]);
  const handleDelete  = useCallback(()   => handlers.onDeleteProject(project.code),       [handlers, project.code]);

  return (
    <div
      className={`project-card${expanded ? ' expanded' : ''}${isArchived ? ' archived' : ''}`}
      id={`project-card-${project.code}`}
    >
      {/* ---- Header (click to expand/collapse) ---- */}
      <div
        className="project-card-header"
        onClick={toggle}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && toggle()}
      >
        <span className="expand-arrow" aria-hidden="true">
          {expanded ? '▾' : '▸'}
        </span>

        <span
          className="project-code-badge"
          style={{ background: color }}
          aria-label={`Project ${project.code}`}
        >
          {project.code.slice(0, 4)}
        </span>

        <div className="project-card-info">
          <span className="project-card-name">{project.name}</span>
          {project.description && (
            <span className="project-card-desc truncate">{project.description}</span>
          )}
        </div>

        <span className={`status-badge ${PROJECT_STATUS_CSS[project.status] || ''}`}>
          {project.status}
        </span>

        <div className="project-card-stats">
          <span className="project-task-count">
            {completed}/{total}
            <span className="project-task-count-label"> done</span>
          </span>
          <div className="project-card-progress-bar" title={`${pct}% complete`}>
            <div
              className="project-card-progress-fill"
              style={{ width: `${pct}%`, background: color }}
            />
          </div>
        </div>

        {/* Action buttons — stop click from toggling expand */}
        <div className="project-card-actions" onClick={e => e.stopPropagation()}>
          <button
            className="btn-icon project-action-btn"
            title="Edit project"
            onClick={() => setShowEdit(true)}
            aria-label="Edit project"
          >
            ✎
          </button>

          {isArchived ? (
            <button
              className="btn-icon project-action-btn"
              title="Restore project"
              onClick={() => setShowRestoreConfirm(true)}
              aria-label="Restore project"
            >
              ↩
            </button>
          ) : (
            <button
              className="btn-icon project-action-btn"
              title="Archive project"
              onClick={() => setShowArchiveConfirm(true)}
              aria-label="Archive project"
            >
              ⊡
            </button>
          )}

          <button
            className="btn-icon project-action-btn project-action-btn-danger"
            title="Delete project"
            onClick={() => setShowDeleteConfirm(true)}
            aria-label="Delete project permanently"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ---- Expanded body ---- */}
      {expanded && (
        <div className="project-card-body">
          <TaskTable
            tasks={tasks}
            projectCode={project.code}
            allTags={allTags}
            allProjects={allProjects}
            handlers={handlers}
            onFocusTask={onFocusTask}
          />
        </div>
      )}

      {/* ---- Modals ---- */}
      {showEdit && (
        <ProjectFormModal
          mode="edit"
          initial={project}
          onSubmit={handleEdit}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showArchiveConfirm && (
        <ConfirmDialog
          title="Archive Project"
          message={`Archive "${project.name}"? You can restore it later.`}
          confirmLabel="Archive"
          onConfirm={handleArchive}
          onClose={() => setShowArchiveConfirm(false)}
        />
      )}

      {showRestoreConfirm && (
        <ConfirmDialog
          title="Restore Project"
          message={`Restore "${project.name}" to active status?`}
          confirmLabel="Restore"
          onConfirm={handleRestore}
          onClose={() => setShowRestoreConfirm(false)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Project"
          message={`Permanently delete "${project.name}" and all its tasks? This cannot be undone.`}
          confirmLabel="Delete Forever"
          danger
          onConfirm={handleDelete}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
