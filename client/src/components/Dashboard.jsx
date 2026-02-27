import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Sidebar          from './Sidebar';
import SearchFilterBar  from './SearchFilterBar';
import ContextFilterBar from './ContextFilterBar';
import ProjectCard      from './ProjectCard';
import AllTasksView     from './AllTasksView';
import PriorityMatrix   from './PriorityMatrix';
import KanbanBoard      from './KanbanBoard';
import SliderPanel      from './SliderPanel';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import FeatureHelpGuide from './FeatureHelpGuide';
import { ProjectFormModal } from './FormModal';
import { useUndoToasts } from './UndoToast';
import useNotifications from '../hooks/useNotifications';
import QuickAddTaskModal from './QuickAddTaskModal';
import QuickInboxModal from './QuickInboxModal';
import TaskTemplatesModal from './TaskTemplatesModal';
import ReviewMode from './ReviewMode';

// ============================================================
// localStorage helpers
// ============================================================
const LS_KEYS = {
  viewMode:         'taskDashboard_defaultView',
  showArchived:     'taskDashboard_showArchived',
  headerCollapsed:  'taskDashboard_headerCollapsed',
  statsCollapsed:   'taskDashboard_statsCollapsed',
  sidebarCollapsed: 'taskDashboard_sidebarCollapsed',
};

function lsGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
}

// ============================================================
// Small presentational helpers
// ============================================================
function StatCard({ label, count, color }) {
  return (
    <div className="stat-card">
      <div className="stat-card-count" style={{ color }}>{count}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}

// ============================================================
// Attention banners (overdue / due today)
// ============================================================
function AttentionBanners({ overdueTasks, dueTodayTasks, onUpdateTask }) {
  const [snoozed, setSnoozed] = useState(() => {
    try {
      const stored = localStorage.getItem('taskDashboard_snoozedItems');
      if (!stored) return {};
      const items = JSON.parse(stored);
      const now   = Date.now();
      const active = {};
      for (const [id, expiresAt] of Object.entries(items)) {
        if (expiresAt > now) active[id] = expiresAt;
      }
      return active;
    } catch { return {}; }
  });

  const snoozeTask = useCallback((taskId, ms = 3_600_000) => {
    setSnoozed(prev => {
      const next = { ...prev, [taskId]: Date.now() + ms };
      try { localStorage.setItem('taskDashboard_snoozedItems', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const isSnoozed        = (id) => snoozed[id] && snoozed[id] > Date.now();
  const visibleOverdue   = overdueTasks.filter(t  => !isSnoozed(t.id));
  const visibleDueToday  = dueTodayTasks.filter(t => !isSnoozed(t.id));

  if (!visibleOverdue.length && !visibleDueToday.length) return null;

  return (
    <div className="attention-banners">
      {visibleOverdue.length > 0 && (
        <div className="attention-banner attention-overdue">
          <div className="attention-banner-header">
            <span className="attention-banner-title">
              ⚠ {visibleOverdue.length} Overdue Task{visibleOverdue.length !== 1 ? 's' : ''}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => visibleOverdue.forEach(t => snoozeTask(t.id))}>
              Snooze All
            </button>
          </div>
          <div className="attention-banner-tasks">
            {visibleOverdue.slice(0, 5).map(t => (
              <AttentionTaskItem key={t.id} task={t} onSnooze={() => snoozeTask(t.id)} onUpdateTask={onUpdateTask} />
            ))}
            {visibleOverdue.length > 5 && (
              <span className="attention-more">+{visibleOverdue.length - 5} more</span>
            )}
          </div>
        </div>
      )}

      {visibleDueToday.length > 0 && (
        <div className="attention-banner attention-today">
          <div className="attention-banner-header">
            <span className="attention-banner-title">
              📅 {visibleDueToday.length} Due Today
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => visibleDueToday.forEach(t => snoozeTask(t.id))}>
              Snooze All
            </button>
          </div>
          <div className="attention-banner-tasks">
            {visibleDueToday.slice(0, 5).map(t => (
              <AttentionTaskItem key={t.id} task={t} onSnooze={() => snoozeTask(t.id)} onUpdateTask={onUpdateTask} />
            ))}
            {visibleDueToday.length > 5 && (
              <span className="attention-more">+{visibleDueToday.length - 5} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AttentionTaskItem({ task, onSnooze, onUpdateTask }) {
  const daysOverdue = task.due_date
    ? Math.floor((Date.now() - new Date(task.due_date + 'T00:00:00').getTime()) / 86400000)
    : 0;
  return (
    <div className="attention-task-item">
      <span className="attention-task-project">[{task.projectCode}]</span>
      <span className="attention-task-title truncate">{task.title}</span>
      {daysOverdue > 0 && <span className="attention-task-overdue">{daysOverdue}d overdue</span>}
      <div className="attention-task-actions">
        <button className="btn btn-ghost btn-sm" onClick={() => onUpdateTask(task.id, { status: 'COMPLETED' })}>Done</button>
        <button className="btn btn-ghost btn-sm" onClick={onSnooze}>Snooze</button>
      </div>
    </div>
  );
}

// ============================================================
// Keyboard shortcuts modal
// ============================================================
const SHORTCUTS = [
  { key: 'Alt+I',       action: 'Open Quick Inbox' },
  { key: 'Alt+N',       action: 'Quick Add Task' },
  { key: 'Alt+P',       action: 'New Project' },
  { key: 'Alt+T',       action: 'Task Templates' },
  { key: 'Alt+R',       action: 'Refresh Data' },
  { key: 'Alt+Shift+R', action: 'Review Mode' },
  { key: 'Alt+L',       action: 'Toggle Theme' },
  { key: 'Alt+S',       action: 'Toggle Summary Panel' },
  { key: 'Alt+H',       action: 'Toggle Header Toolbar' },
  { key: 'Alt+Shift+S', action: 'Toggle Stats Bar' },
  { key: 'Alt+O',       action: 'Focus Mode' },
  { key: 'Alt+1–4',     action: 'Switch View' },
  { key: 'Ctrl+K',      action: 'Focus Search' },
  { key: 'Alt+/',       action: 'Keyboard Shortcuts Help' },
  { key: 'Alt+Shift+/', action: 'Feature Guide' },
  { key: 'Escape',      action: 'Close Modal / Panel' },
];

function KeyboardShortcutsModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2>Keyboard Shortcuts</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="keyboard-shortcuts-grid">
          {SHORTCUTS.map(({ key, action }) => (
            <div key={key} className="keyboard-shortcut-item">
              <kbd className="kbd">{key}</kbd>
              <span>{action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Focus mode overlay (basic — enhanced in Phase 8)
// ============================================================
function FocusModeOverlay({ task, onClose }) {
  const STATUS_LABELS = { PENDING: 'Pending', INPROGRESS: 'In Progress', COMPLETED: 'Completed', DONE: 'Done', CANCELLED: 'Cancelled', 'NOT DOING': 'Not Doing' };
  const PRIORITY_LABELS = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="focus-mode-overlay" role="dialog" aria-modal="true" aria-label="Focus mode">
      <div className="focus-mode-content">
        <div className="focus-mode-header">
          <span className="focus-mode-project">{task.projectCode && `[${task.projectCode}]`} #{task.task_number}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Exit focus mode">
            ✕ Exit Focus
          </button>
        </div>

        <h1 className="focus-mode-title">{task.title}</h1>

        <div className="focus-mode-meta">
          {task.status   && <span className="focus-meta-item">{STATUS_LABELS[task.status]   || task.status}</span>}
          {task.priority && <span className="focus-meta-item">{PRIORITY_LABELS[task.priority] || task.priority}</span>}
          {task.due_date && <span className="focus-meta-item">Due {task.due_date}</span>}
          {task.assigned_to && <span className="focus-meta-item">@{task.assigned_to}</span>}
          {task.quadrant && <span className="focus-meta-item">{task.quadrant}</span>}
        </div>

        {(task.progress > 0) && (
          <div className="focus-mode-progress">
            <div className="focus-progress-track">
              <div className="focus-progress-fill" style={{ width: `${task.progress}%` }} />
            </div>
            <span className="focus-progress-label">{task.progress}%</span>
          </div>
        )}

        {task.comments && (
          <div className="focus-mode-comments">
            <pre className="focus-comments-text">{task.comments}</pre>
          </div>
        )}

        <p className="focus-mode-hint">Press Escape or click ✕ to exit. Full focus mode coming in Phase 8.</p>
      </div>
    </div>
  );
}

// ============================================================
// Main Dashboard
// ============================================================
const VIEW_LABELS = {
  projects: 'Projects',
  tasks:    'All Tasks',
  priority: 'Priority Matrix',
  kanban:   'Kanban',
};

export default function Dashboard({ projects, tags, onRefresh, theme, onToggleTheme, user, onLogout }) {
  const { addToast } = useUndoToasts();

  // ---- Persistent UI state ----
  const [viewMode,         setViewMode]         = useState(() => lsGet(LS_KEYS.viewMode,         'projects'));
  const [showArchived,     setShowArchived]     = useState(() => lsGet(LS_KEYS.showArchived,     false));
  const [headerCollapsed,  setHeaderCollapsed]  = useState(() => lsGet(LS_KEYS.headerCollapsed,  false));
  const [statsCollapsed,   setStatsCollapsed]   = useState(() => lsGet(LS_KEYS.statsCollapsed,   false));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => lsGet(LS_KEYS.sidebarCollapsed, false));

  useEffect(() => { lsSet(LS_KEYS.viewMode,         viewMode);         }, [viewMode]);
  useEffect(() => { lsSet(LS_KEYS.showArchived,     showArchived);     }, [showArchived]);
  useEffect(() => { lsSet(LS_KEYS.headerCollapsed,  headerCollapsed);  }, [headerCollapsed]);
  useEffect(() => { lsSet(LS_KEYS.statsCollapsed,   statsCollapsed);   }, [statsCollapsed]);
  useEffect(() => { lsSet(LS_KEYS.sidebarCollapsed, sidebarCollapsed); }, [sidebarCollapsed]);

  // ---- Selection ----
  const [selectedProject, setSelectedProject] = useState(null);

  // ---- Filters ----
  const [searchQuery,    setSearchQuery]    = useState('');
  const [statusFilter,   setStatusFilter]   = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [dateFrom,       setDateFrom]       = useState('');
  const [dateTo,         setDateTo]         = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [activeContextTag, setActiveContextTag] = useState(null);

  // ---- Modals / panels ----
  const [showSummary,      setShowSummary]      = useState(false);
  const [showNewProject,   setShowNewProject]   = useState(false);
  const [showQuickAdd,     setShowQuickAdd]     = useState(false);
  const [showQuickInbox,   setShowQuickInbox]   = useState(false);
  const [showTemplates,    setShowTemplates]    = useState(false);
  const [showReview,       setShowReview]       = useState(false);
  const [reviewType,       setReviewType]       = useState('daily'); // 'daily' or 'weekly'
  const [showTrash,        setShowTrash]        = useState(false);
  const [deletedTasks,     setDeletedTasks]     = useState([]);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showFeatureGuide, setShowFeatureGuide] = useState(false);
  const [focusMode,        setFocusMode]        = useState(false);
  const [focusTask,        setFocusTask]        = useState(null);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (document.activeElement?.isContentEditable) return;

      if (e.altKey && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'i': e.preventDefault(); setShowQuickInbox(v => !v);  break;
          case 'n': e.preventDefault(); setShowQuickAdd(v => !v);    break;
          case 'p': e.preventDefault(); setShowNewProject(v => !v);  break;
          case 't': e.preventDefault(); setShowTemplates(v => !v);   break;
          case 'r': e.preventDefault(); onRefresh();                  break;
          case 'l': e.preventDefault(); onToggleTheme();              break;
          case 's': e.preventDefault(); setShowSummary(v => !v);     break;
          case 'h': e.preventDefault(); setHeaderCollapsed(v => !v); break;
          case 'o': e.preventDefault(); setFocusMode(v => !v);       break;
          case '1': e.preventDefault(); setViewMode('projects');      break;
          case '2': e.preventDefault(); setViewMode('tasks');         break;
          case '3': e.preventDefault(); setViewMode('priority');      break;
          case '4': e.preventDefault(); setViewMode('kanban');        break;
          case '/': e.preventDefault(); setShowKeyboardHelp(v => !v); break;
          default: break;
        }
      }

      if (e.altKey && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'r': e.preventDefault(); setReviewType('daily'); setShowReview(v => !v); break;
          case 's': e.preventDefault(); setStatsCollapsed(v => !v);    break;
          case '/': e.preventDefault(); setShowFeatureGuide(v => !v);  break;
          default: break;
        }
      }

      // Alt+D for daily review, Alt+W for weekly review
      if (e.altKey && !e.shiftKey) {
        if (e.key.toLowerCase() === 'd') {
          e.preventDefault();
          setReviewType('daily');
          setShowReview(true);
        }
        if (e.key.toLowerCase() === 'w') {
          e.preventDefault();
          setReviewType('weekly');
          setShowReview(true);
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }

      if (e.key === 'Escape') {
        if (focusMode)        { setFocusMode(false); return; }
        if (showKeyboardHelp) { setShowKeyboardHelp(false); return; }
        if (showFeatureGuide) { setShowFeatureGuide(false); return; }
        if (showReview)       { setShowReview(false); return; }
        if (showTemplates)    { setShowTemplates(false); return; }
        if (showQuickAdd)     { setShowQuickAdd(false); return; }
        if (showQuickInbox)   { setShowQuickInbox(false); return; }
        if (showNewProject)   { setShowNewProject(false); return; }
        if (showSummary)      { setShowSummary(false); return; }
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [
    onRefresh, onToggleTheme,
    focusMode, showKeyboardHelp, showFeatureGuide, showReview,
    showTemplates, showQuickAdd, showQuickInbox, showNewProject, showSummary,
  ]);

  // ---- Computed dates ----
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  // ---- Stats ----
  const stats = useMemo(() => {
    const all = projects.flatMap(p => p.tasks || []);
    const overdue = all.filter(t => {
      if (!t.due_date) return false;
      if (['COMPLETED','DONE','CANCELLED','NOT DOING'].includes(t.status)) return false;
      const d = new Date(t.due_date + 'T00:00:00'); d.setHours(0, 0, 0, 0);
      return d < today;
    }).length;
    return {
      total:     all.length,
      pending:   all.filter(t => t.status === 'PENDING').length,
      inprogress:all.filter(t => t.status === 'INPROGRESS').length,
      completed: all.filter(t => t.status === 'COMPLETED').length,
      overdue,
    };
  }, [projects, today]);

  // ---- Attention banners ----
  const overdueTasks = useMemo(() => projects.flatMap(p =>
    (p.tasks || [])
      .filter(t => {
        if (!t.due_date || ['COMPLETED','DONE','CANCELLED','NOT DOING'].includes(t.status)) return false;
        const d = new Date(t.due_date + 'T00:00:00'); d.setHours(0, 0, 0, 0);
        return d < today;
      })
      .map(t => ({ ...t, projectCode: p.code, projectName: p.name }))
  ), [projects, today]);

  const dueTodayTasks = useMemo(() => projects.flatMap(p =>
    (p.tasks || [])
      .filter(t => {
        if (!t.due_date || ['COMPLETED','DONE','CANCELLED','NOT DOING'].includes(t.status)) return false;
        const d = new Date(t.due_date + 'T00:00:00'); d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      })
      .map(t => ({ ...t, projectCode: p.code, projectName: p.name }))
  ), [projects, today]);

  // ---- Filtered projects ----
  const filteredProjects = useMemo(() => {
    let proj = showArchived ? projects : projects.filter(p => p.status !== 'Archived');
    const q  = searchQuery.toLowerCase().trim();

    return proj
      .map(project => {
        let tasks = project.tasks || [];
        if (q)              tasks = tasks.filter(t => t.title?.toLowerCase().includes(q) || t.comments?.toLowerCase().includes(q) || t.assigned_to?.toLowerCase().includes(q));
        if (statusFilter)   tasks = tasks.filter(t => t.status   === statusFilter);
        if (priorityFilter) tasks = tasks.filter(t => t.priority === priorityFilter);
        if (assigneeFilter) tasks = tasks.filter(t => t.assigned_to?.toLowerCase().includes(assigneeFilter.toLowerCase()));
        if (dateFrom)       tasks = tasks.filter(t => t.due_date && t.due_date >= dateFrom);
        if (dateTo)         tasks = tasks.filter(t => t.due_date && t.due_date <= dateTo);
        if (activeContextTag) tasks = tasks.filter(t => t.tags?.some(tag => tag.id === activeContextTag));
        return { ...project, tasks };
      })
      .filter(p => {
        const hasFilter = q || statusFilter || priorityFilter || dateFrom || dateTo || assigneeFilter || activeContextTag;
        return hasFilter ? p.tasks.length > 0 : true;
      });
  }, [projects, showArchived, searchQuery, statusFilter, priorityFilter, assigneeFilter, dateFrom, dateTo, activeContextTag]);

  const clearFilters = useCallback(() => {
    setSearchQuery(''); setStatusFilter(''); setPriorityFilter('');
    setDateFrom(''); setDateTo(''); setAssigneeFilter(''); setActiveContextTag(null);
  }, []);

  // ---- Sidebar project navigation ----
  const handleSelectProject = useCallback((code) => {
    setSelectedProject(code);
    if (viewMode !== 'projects') setViewMode('projects');
    setTimeout(() => {
      const el = document.getElementById(`project-card-${code}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('highlight-pulse');
        setTimeout(() => el.classList.remove('highlight-pulse'), 1400);
      }
    }, 60);
  }, [viewMode]);

  // ============================================================
  // CRUD Handlers
  // ============================================================
  const handleCreateProject = useCallback(async (data) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Server error ${res.status}`); }
    await onRefresh();
  }, [onRefresh]);

  const handleUpdateProject = useCallback(async (code, data) => {
    const res = await fetch(`/api/projects/${code}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Server error ${res.status}`); }
    await onRefresh();
  }, [onRefresh]);

  const handleArchiveProject = useCallback(async (code) => {
    const res = await fetch(`/api/projects/${code}/archive`, { method: 'PUT' });
    if (!res.ok) return;
    addToast({
      message: 'Project archived',
      onUndo: async () => {
        await fetch(`/api/projects/${code}/restore`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'In Progress' }),
        });
        onRefresh();
      },
    });
    await onRefresh();
  }, [onRefresh, addToast]);

  const handleRestoreProject = useCallback(async (code, status) => {
    const res = await fetch(`/api/projects/${code}/restore`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: status || 'In Progress' }),
    });
    if (!res.ok) return;
    await onRefresh();
  }, [onRefresh]);

  const handleDeleteProject = useCallback(async (code) => {
    const res = await fetch(`/api/projects/${code}`, { method: 'DELETE' });
    if (!res.ok) return;
    await onRefresh();
  }, [onRefresh]);

  const handleCreateTask = useCallback(async (projectCode, data) => {
    const res = await fetch(`/api/projects/${projectCode}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Server error ${res.status}`); }
    const result = await res.json();
    await onRefresh();
    return result;
  }, [onRefresh]);

  const handleUpdateTask = useCallback(async (id, data) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Server error ${res.status}`); }
    await onRefresh();
  }, [onRefresh]);

  const handleDeleteTask = useCallback(async (id, permanent = false) => {
    const url = permanent ? `/api/tasks/${id}?permanent=true` : `/api/tasks/${id}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) return;
    if (!permanent) {
      addToast({
        message: 'Task deleted',
        onUndo: async () => { await fetch(`/api/tasks/${id}/restore`, { method: 'POST' }); onRefresh(); },
      });
    }
    await onRefresh();
  }, [onRefresh, addToast]);

  const handleRestoreTask = useCallback(async (id) => {
    await fetch(`/api/tasks/${id}/restore`, { method: 'POST' });
    await onRefresh();
  }, [onRefresh]);

  const handleTogglePin = useCallback(async (id) => {
    await fetch(`/api/tasks/${id}/pin`, { method: 'PUT' });
    await onRefresh();
  }, [onRefresh]);

  const handleMoveTask = useCallback(async (id, projectCode) => {
    const res = await fetch(`/api/tasks/${id}/move`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetProjectCode: projectCode }),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Server error ${res.status}`); }
    await onRefresh();
  }, [onRefresh]);

  const handleUpdateTags = useCallback(async (taskId, tagIds) => {
    await fetch(`/api/tasks/${taskId}/tags`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagIds }),
    });
    await onRefresh();
  }, [onRefresh]);

  const handleReorderTasks = useCallback(async (projectCode, taskOrders) => {
    await fetch(`/api/projects/${projectCode}/tasks/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskOrders }),
    });
    await onRefresh();
  }, [onRefresh]);

  const handleReorderAllTasks = useCallback(async (taskOrders) => {
    await fetch('/api/tasks/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskOrders }),
    });
    await onRefresh();
  }, [onRefresh]);

  const handleFocusTask = useCallback((task) => {
    setFocusTask(task);
    setFocusMode(true);
  }, []);

  // ---- Load deleted tasks for trash view ----
  const loadDeletedTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks/deleted?limit=50');
      if (res.ok) {
        const data = await res.json();
        setDeletedTasks(data.tasks || []);
      }
    } catch { /* ignore */ }
  }, []);

  // ---- Props bundle for child views ----
  const crudHandlers = {
    onCreateProject:  handleCreateProject,
    onUpdateProject:  handleUpdateProject,
    onArchiveProject: handleArchiveProject,
    onRestoreProject: handleRestoreProject,
    onDeleteProject:  handleDeleteProject,
    onCreateTask:     handleCreateTask,
    onUpdateTask:     handleUpdateTask,
    onDeleteTask:     handleDeleteTask,
    onRestoreTask:    handleRestoreTask,
    onTogglePin:      handleTogglePin,
    onMoveTask:       handleMoveTask,
    onUpdateTags:     handleUpdateTags,
    onReorderTasks:    handleReorderTasks,
    onReorderAllTasks: handleReorderAllTasks,
    onRefresh,
  };

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="dashboard">
      {/* ---- Sidebar ---- */}
      <Sidebar
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={handleSelectProject}
        showArchived={showArchived}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(v => !v)}
      />

      {/* ---- Main content ---- */}
      <div className="main-content">

        {/* Header toolbar */}
        {!headerCollapsed ? (
          <header className="dashboard-header">
            <div className="header-left">
              <div className="view-toggle-group" role="tablist" aria-label="View mode">
                {Object.entries(VIEW_LABELS).map(([v, label], i) => (
                  <button
                    key={v}
                    role="tab"
                    aria-selected={viewMode === v}
                    className={`view-toggle-btn${viewMode === v ? ' active' : ''}`}
                    onClick={() => setViewMode(v)}
                    title={`Alt+${i + 1}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="header-right">
              <button className="btn btn-primary btn-sm"   onClick={() => setShowNewProject(true)}   title="New project (Alt+P)">+ Project</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowQuickAdd(true)}     title="Quick add task (Alt+N)">+ Task</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowQuickInbox(true)}   title="Quick inbox (Alt+I)">Inbox</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowTemplates(true)}    title="Task templates (Alt+T)">Templates</button>

              <div className="header-divider" aria-hidden="true" />

              <button className={`btn btn-ghost btn-sm${showSummary ? ' active' : ''}`} onClick={() => setShowSummary(v => !v)} title="Toggle summary (Alt+S)">
                {showSummary ? '◀' : '▶'} Summary
              </button>
              <button className={`btn btn-ghost btn-sm${showArchived ? ' active' : ''}`} onClick={() => setShowArchived(v => !v)}>
                {showArchived ? 'Hide Archived' : 'Show Archived'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowTrash(true)} title="View deleted tasks">🗑️</button>
              <button className="btn btn-ghost btn-sm" onClick={onRefresh}       title="Refresh (Alt+R)">↺</button>
              <button className="btn btn-ghost btn-sm" onClick={onToggleTheme}   title="Toggle theme (Alt+L)">{theme === 'dark' ? '☀' : '☾'}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowKeyboardHelp(true)} title="Keyboard shortcuts (Alt+/)" aria-label="Keyboard shortcuts">?</button>
              <div className="header-divider" aria-hidden="true" />
              <span className="header-user-label" title={user?.username}>{user?.displayName || user?.username}</span>
              <button className="btn btn-ghost btn-sm" onClick={onLogout} title="Logout">Logout</button>
              <button className="btn-icon header-collapse-btn" onClick={() => setHeaderCollapsed(true)} title="Collapse toolbar (Alt+H)" aria-label="Collapse toolbar">▲</button>
            </div>
          </header>
        ) : (
          <div className="header-collapsed-bar">
            <div className="header-left">
              <div className="view-toggle-group" role="tablist">
                {Object.entries(VIEW_LABELS).map(([v, label], i) => (
                  <button key={v} role="tab" aria-selected={viewMode === v}
                    className={`view-toggle-btn${viewMode === v ? ' active' : ''}`}
                    onClick={() => setViewMode(v)} title={`Alt+${i + 1}`}
                  >{label}</button>
                ))}
              </div>
            </div>
            <div className="header-right">
              <button className="btn btn-ghost btn-sm" onClick={onLogout} title="Logout">Logout</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setHeaderCollapsed(false)} title="Show toolbar (Alt+H)">▼ Toolbar</button>
            </div>
          </div>
        )}

        {/* Stats bar */}
        {!statsCollapsed ? (
          <div className="stats-bar">
            <StatCard label="Total"       count={stats.total}      color="var(--text-primary)" />
            <StatCard label="Pending"     count={stats.pending}    color="#fbbf24" />
            <StatCard label="In Progress" count={stats.inprogress} color="#60a5fa" />
            <StatCard label="Completed"   count={stats.completed}  color="#4ade80" />
            <StatCard label="Overdue"     count={stats.overdue}    color="#f87171" />
            <button className="btn-icon stats-collapse-btn" onClick={() => setStatsCollapsed(true)} title="Collapse stats (Alt+Shift+S)" aria-label="Collapse stats">▲</button>
          </div>
        ) : (
          <button className="btn btn-ghost btn-sm stats-expand-btn" onClick={() => setStatsCollapsed(false)} title="Show stats (Alt+Shift+S)">
            Stats ▼
          </button>
        )}

        {/* Search & filter bar */}
        <SearchFilterBar
          searchQuery={searchQuery}       onSearchChange={setSearchQuery}
          statusFilter={statusFilter}     onStatusChange={setStatusFilter}
          priorityFilter={priorityFilter} onPriorityChange={setPriorityFilter}
          dateFrom={dateFrom}             onDateFromChange={setDateFrom}
          dateTo={dateTo}                 onDateToChange={setDateTo}
          assigneeFilter={assigneeFilter} onAssigneeChange={setAssigneeFilter}
          onClear={clearFilters}
        />

        {/* Context filter bar */}
        <ContextFilterBar
          tags={tags}
          activeTag={activeContextTag}
          onTagSelect={setActiveContextTag}
        />

        {/* Attention banners */}
        <AttentionBanners
          overdueTasks={overdueTasks}
          dueTodayTasks={dueTodayTasks}
          onUpdateTask={handleUpdateTask}
        />

        {/* ---- View content ---- */}
        <div className="main-content-body">

          {viewMode === 'projects' && (
            <div className="projects-view">
              {filteredProjects.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📋</div>
                  <h3 className="empty-state-title">
                    {projects.length === 0 ? 'No projects yet' : 'No projects match your filters'}
                  </h3>
                  <p className="empty-state-desc">
                    {projects.length === 0
                      ? 'Create a project to start managing your tasks.'
                      : 'Try clearing some filters or showing archived projects.'}
                  </p>
                  {projects.length === 0 && (
                    <button className="btn btn-primary" onClick={() => setShowNewProject(true)}>
                      + New Project
                    </button>
                  )}
                </div>
              ) : (
                filteredProjects.map(project => (
                  <ProjectCard
                    key={project.code}
                    project={project}
                    allTags={tags}
                    allProjects={projects}
                    handlers={crudHandlers}
                    onFocusTask={handleFocusTask}
                  />
                ))
              )}
            </div>
          )}

          {viewMode === 'tasks' && (
            <AllTasksView
              projects={filteredProjects}
              allTags={tags}
              allProjects={projects}
              handlers={crudHandlers}
              onFocusTask={handleFocusTask}
            />
          )}

          {viewMode === 'priority' && (
            <PriorityMatrix
              projects={filteredProjects}
              allTags={tags}
              handlers={crudHandlers}
              onFocusTask={handleFocusTask}
            />
          )}

          {viewMode === 'kanban' && (
            <KanbanBoard
              projects={filteredProjects}
              allTags={tags}
              handlers={crudHandlers}
              onFocusTask={handleFocusTask}
            />
          )}
        </div>
      </div>

      {/* ---- Summary panel ---- */}
      <SliderPanel
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
        projects={projects}
      />

      {/* ---- New Project modal ---- */}
      {showNewProject && (
        <ProjectFormModal
          mode="create"
          onSubmit={handleCreateProject}
          onClose={() => setShowNewProject(false)}
        />
      )}

      {/* ---- Keyboard shortcuts modal ---- */}
      <KeyboardShortcutsHelp
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />

      {/* ---- Feature guide modal ---- */}
      <FeatureHelpGuide
        isOpen={showFeatureGuide}
        onClose={() => setShowFeatureGuide(false)}
      />

      {/* ---- Focus mode overlay ---- */}
      {focusMode && focusTask && (
        <FocusModeOverlay task={focusTask} onClose={() => setFocusMode(false)} />
      )}

      {/* ---- Quick Add Task modal ---- */}
      {showQuickAdd && (
        <QuickAddTaskModal
          onClose={() => setShowQuickAdd(false)}
          onCreateTask={onRefresh}
          projects={projects}
        />
      )}

      {/* ---- Quick Inbox modal ---- */}
      {showQuickInbox && (
        <QuickInboxModal
          onClose={() => setShowQuickInbox(false)}
          onCreateTask={onRefresh}
          projects={projects}
        />
      )}

      {/* ---- Task Templates modal ---- */}
      {showTemplates && (
        <TaskTemplatesModal
          onClose={() => setShowTemplates(false)}
          onUseTemplate={onRefresh}
          projects={projects}
        />
      )}

      {/* ---- Review Mode modal ---- */}
      {showReview && (
        <ReviewMode
          type={reviewType}
          onClose={() => setShowReview(false)}
          projects={projects}
          onUpdateTask={handleUpdateTask}
          onRefresh={onRefresh}
        />
      )}

      {/* ---- Trash modal ---- */}
      {showTrash && (
        <TrashModal
          deletedTasks={deletedTasks}
          onRestore={handleRestoreTask}
          onDeletePermanent={async (id) => { await handleDeleteTask(id, true); await loadDeletedTasks(); }}
          onClose={() => setShowTrash(false)}
        />
      )}
    </div>
  );
}

// ============================================================
// Trash Modal Component
// ============================================================
function TrashModal({ deletedTasks, onRestore, onDeletePermanent, onClose }) {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState(deletedTasks);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/tasks/deleted?limit=50');
        if (res.ok) {
          const data = await res.json();
          setTasks(data.tasks || []);
        }
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const fmt = (ts) => {
    if (!ts) return '';
    try { return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return ts; }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2>🗑️ Trash — Deleted Tasks</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <p className="text-muted">Loading…</p>
          ) : tasks.length === 0 ? (
            <p className="text-muted">No deleted tasks. Deleted tasks can be restored within 30 days.</p>
          ) : (
            <div className="trash-list">
              {tasks.map(task => (
                <div key={task.id} className="trash-item">
                  <div className="trash-item-info">
                    <span className="trash-item-title">{task.title}</span>
                    <span className="trash-item-meta">
                      [{task.project_code}] · deleted {fmt(task.deleted_at)}
                    </span>
                  </div>
                  <div className="trash-item-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={async () => { await onRestore(task.id); setTasks(tasks.filter(t => t.id !== task.id)); }}
                    >
                      ↩ Restore
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => onDeletePermanent(task.id)}
                    >
                      ✕ Delete Forever
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
