import React from 'react';

const PROJECT_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#06b6d4', '#14b8a6', '#6366f1',
];

function projectColor(code) {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length];
}

function ProjectItem({ project, collapsed, isSelected, onClick }) {
  const tasks = project.tasks || [];
  const total = tasks.length;
  const done = tasks.filter(t => t.status === 'COMPLETED' || t.status === 'DONE').length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const color = projectColor(project.code);
  const initials = project.code.slice(0, 2).toUpperCase();

  return (
    <button
      className={`sidebar-project-item${isSelected ? ' selected' : ''}`}
      onClick={() => onClick(project.code)}
      title={collapsed ? `${project.name} — ${done}/${total} done` : undefined}
    >
      <span className="sidebar-project-avatar" style={{ background: color }}>
        {initials}
      </span>
      {!collapsed && (
        <div className="sidebar-project-info">
          <span className="sidebar-project-name truncate">{project.name}</span>
          <div className="sidebar-project-progress">
            <div className="sidebar-project-progress-track">
              <div
                className="sidebar-project-progress-fill"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
            <span className="sidebar-project-progress-text">{done}/{total}</span>
          </div>
        </div>
      )}
    </button>
  );
}

function SidebarSection({ label, projects, collapsed, selectedProject, onSelectProject }) {
  if (projects.length === 0) return null;
  return (
    <div className="sidebar-section">
      {!collapsed && (
        <div className="sidebar-section-label">{label}</div>
      )}
      {projects.map(p => (
        <ProjectItem
          key={p.code}
          project={p}
          collapsed={collapsed}
          isSelected={selectedProject === p.code}
          onClick={onSelectProject}
        />
      ))}
    </div>
  );
}

export default function Sidebar({
  projects,
  selectedProject,
  onSelectProject,
  showArchived,
  collapsed,
  onToggle,
}) {
  const active = projects.filter(p => p.status !== 'Completed' && p.status !== 'Archived');
  const completed = projects.filter(p => p.status === 'Completed');
  const archived = projects.filter(p => p.status === 'Archived');

  return (
    <aside className={`sidebar${collapsed ? ' sidebar-collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && <span className="sidebar-title">Projects</span>}
        <button
          className="btn-icon sidebar-toggle-btn"
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      <div className="sidebar-content">
        <SidebarSection
          label="Active"
          projects={active}
          collapsed={collapsed}
          selectedProject={selectedProject}
          onSelectProject={onSelectProject}
        />
        <SidebarSection
          label="Completed"
          projects={completed}
          collapsed={collapsed}
          selectedProject={selectedProject}
          onSelectProject={onSelectProject}
        />
        {showArchived && archived.length > 0 && (
          <SidebarSection
            label="Archived"
            projects={archived}
            collapsed={collapsed}
            selectedProject={selectedProject}
            onSelectProject={onSelectProject}
          />
        )}

        {projects.length === 0 && !collapsed && (
          <div className="sidebar-empty">
            <span>No projects yet.</span>
            <span>Click "+ Project" to start.</span>
          </div>
        )}
      </div>
    </aside>
  );
}
