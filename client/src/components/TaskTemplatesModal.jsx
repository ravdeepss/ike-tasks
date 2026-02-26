import React, { useState, useEffect, useCallback } from 'react';
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

const QUADRANT_OPTIONS = [
  { value: 'Q1_DO', label: 'Q1: Do First' },
  { value: 'Q2_SCHEDULE', label: 'Q2: Schedule' },
  { value: 'Q3_DELEGATE', label: 'Q3: Delegate' },
  { value: 'Q4_ELIMINATE', label: 'Q4: Eliminate' },
];

export default function TaskTemplatesModal({ onClose, onUseTemplate, projects }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createData, setCreateData] = useState({
    name: '',
    icon: '📋',
    default_priority: 'MEDIUM',
    default_status: 'PENDING',
    default_quadrant: '',
    default_comments: '',
  });

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/task-templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (e) {
      console.error('Failed to fetch templates:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Handle escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (selectedTemplate) setSelectedTemplate(null);
        else if (showCreateForm) setShowCreateForm(false);
        else onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, selectedTemplate, showCreateForm]);

  // Filter templates by search
  const filteredTemplates = React.useMemo(() => {
    if (!searchQuery.trim()) return templates;
    const q = searchQuery.toLowerCase();
    return templates.filter(t =>
      t.name?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    );
  }, [templates, searchQuery]);

  // Group templates: built-in vs custom
  const { builtInTemplates, customTemplates } = React.useMemo(() => {
    const builtIn = filteredTemplates.filter(t => t.is_builtin);
    const custom = filteredTemplates.filter(t => !t.is_builtin);
    return { builtInTemplates: builtIn, customTemplates: custom };
  }, [filteredTemplates]);

  // Handle create template
  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    if (!createData.name.trim()) return;

    try {
      const res = await fetch('/api/task-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData),
      });
      if (res.ok) {
        await fetchTemplates();
        setShowCreateForm(false);
        setCreateData({
          name: '',
          icon: '📋',
          default_priority: 'MEDIUM',
          default_status: 'PENDING',
          default_quadrant: '',
          default_comments: '',
        });
      }
    } catch (e) {
      console.error('Failed to create template:', e);
    }
  };

  // Handle delete template
  const handleDeleteTemplate = async (template) => {
    if (template.is_builtin) return;
    if (!window.confirm(`Delete template "${template.name}"?`)) return;

    try {
      const res = await fetch(`/api/task-templates/${template.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setTemplates(prev => prev.filter(t => t.id !== template.id));
      }
    } catch (e) {
      console.error('Failed to delete template:', e);
    }
  };

  // Handle use template
  const handleUseTemplate = (template) => {
    setSelectedTemplate(template);
  };

  // Handle create task from template
  const handleCreateFromTemplate = async (projectCode, overrides = {}) => {
    if (!selectedTemplate || !projectCode) return;

    const taskData = {
      title: overrides.title || selectedTemplate.name,
      priority: selectedTemplate.default_priority || 'MEDIUM',
      status: selectedTemplate.default_status || 'PENDING',
      quadrant: selectedTemplate.default_quadrant || null,
      comments: selectedTemplate.default_comments || null,
      ...overrides,
    };

    try {
      const res = await fetch(`/api/projects/${projectCode}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      if (res.ok) {
        const data = await res.json();
        if (onUseTemplate) onUseTemplate(data);
        setSelectedTemplate(null);
        onClose();
      }
    } catch (e) {
      console.error('Failed to create task from template:', e);
    }
  };

  // Template card component
  const TemplateCard = ({ template }) => (
    <div
      className={`template-card ${template.is_builtin ? 'template-builtin' : ''}`}
      onClick={() => handleUseTemplate(template)}
    >
      <div className="template-card-icon">{template.icon || '📋'}</div>
      <div className="template-card-content">
        <div className="template-card-header">
          <span className="template-card-name">{template.name}</span>
          {template.is_builtin && <span className="template-builtin-badge" title="Built-in">🔒</span>}
        </div>
        {template.description && (
          <p className="template-card-desc">{template.description}</p>
        )}
        <div className="template-card-meta">
          {template.default_priority && (
            <span className={`badge priority-${template.default_priority.toLowerCase()}`}>
              {template.default_priority}
            </span>
          )}
        </div>
      </div>
      {!template.is_builtin && (
        <button
          className="btn-icon template-delete-btn"
          onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(template); }}
          title="Delete template"
        >
          ✕
        </button>
      )}
    </div>
  );

  // Selected template form
  if (selectedTemplate) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{selectedTemplate.icon || '📋'} {selectedTemplate.name}</h2>
            <button className="btn-icon" onClick={() => setSelectedTemplate(null)}>✕</button>
          </div>

          <TemplateTaskForm
            template={selectedTemplate}
            projects={projects}
            onSubmit={handleCreateFromTemplate}
            onCancel={() => setSelectedTemplate(null)}
          />
        </div>
      </div>
    );
  }

  // Create template form
  if (showCreateForm) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>+ New Template</h2>
            <button className="btn-icon" onClick={() => setShowCreateForm(false)}>✕</button>
          </div>

          <form onSubmit={handleCreateTemplate}>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input
                type="text"
                className="form-input"
                value={createData.name}
                onChange={(e) => setCreateData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Template name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Icon</label>
              <input
                type="text"
                className="form-input"
                value={createData.icon}
                onChange={(e) => setCreateData(prev => ({ ...prev, icon: e.target.value }))}
                placeholder="📋"
                maxLength={4}
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Default Priority</label>
                <select
                  className="form-select"
                  value={createData.default_priority}
                  onChange={(e) => setCreateData(prev => ({ ...prev, default_priority: e.target.value }))}
                >
                  {PRIORITY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Default Status</label>
                <select
                  className="form-select"
                  value={createData.default_status}
                  onChange={(e) => setCreateData(prev => ({ ...prev, default_status: e.target.value }))}
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Default Quadrant</label>
              <select
                className="form-select"
                value={createData.default_quadrant}
                onChange={(e) => setCreateData(prev => ({ ...prev, default_quadrant: e.target.value }))}
              >
                <option value="">None</option>
                {QUADRANT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Default Comments</label>
              <textarea
                className="form-textarea"
                value={createData.default_comments}
                onChange={(e) => setCreateData(prev => ({ ...prev, default_comments: e.target.value }))}
                placeholder="Default notes or checklist..."
                rows={3}
              />
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={!createData.name.trim()}>
                Create Template
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Main templates list
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📋 Task Templates</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Search and create */}
        <div className="templates-toolbar">
          <input
            type="text"
            className="form-input templates-search"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreateForm(true)}>
            + New Template
          </button>
        </div>

        {/* Templates list */}
        <div className="templates-list">
          {loading ? (
            <div className="templates-loading">Loading templates...</div>
          ) : (
            <>
              {customTemplates.length > 0 && (
                <div className="templates-section">
                  <h3 className="templates-section-title">Custom Templates</h3>
                  <div className="templates-grid">
                    {customTemplates.map(t => (
                      <TemplateCard key={t.id} template={t} />
                    ))}
                  </div>
                </div>
              )}

              {builtInTemplates.length > 0 && (
                <div className="templates-section">
                  <h3 className="templates-section-title">Built-in Templates</h3>
                  <div className="templates-grid">
                    {builtInTemplates.map(t => (
                      <TemplateCard key={t.id} template={t} />
                    ))}
                  </div>
                </div>
              )}

              {filteredTemplates.length === 0 && (
                <div className="templates-empty">
                  {searchQuery ? 'No templates match your search.' : 'No templates yet. Create one above!'}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Sub-component: Form to create task from template
function TemplateTaskForm({ template, projects, onSubmit, onCancel }) {
  const [title, setTitle] = useState(template.name || '');
  const [projectCode, setProjectCode] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  const sortedProjects = React.useMemo(() => {
    if (!projects) return [];
    return [...projects]
      .filter(p => p.status !== 'Archived')
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [projects]);

  useEffect(() => {
    if (sortedProjects.length > 0 && !projectCode) {
      setProjectCode(sortedProjects[0].code);
    }
  }, [sortedProjects, projectCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !projectCode) return;

    setLoading(true);
    await onSubmit(projectCode, {
      title: title.trim(),
      due_date: dueDate || null,
    });
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <p className="modal-desc">
        Create a new task from this template. You can customize the title and due date.
      </p>

      <div className="form-group">
        <label className="form-label">Title</label>
        <input
          type="text"
          className="form-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Project *</label>
        <select
          className="form-select"
          value={projectCode}
          onChange={(e) => setProjectCode(e.target.value)}
        >
          <option value="">Select project...</option>
          {sortedProjects.map(p => (
            <option key={p.code} value={p.code}>{p.name} ({p.code})</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Due Date</label>
        <NaturalDateInput
          value={dueDate}
          onChange={setDueDate}
          placeholder="tomorrow, next week..."
        />
      </div>

      <div className="template-preview">
        <div className="template-preview-label">Template defaults:</div>
        <div className="template-preview-content">
          <span className={`badge priority-${(template.default_priority || 'MEDIUM').toLowerCase()}`}>
            {template.default_priority || 'MEDIUM'}
          </span>
          <span className={`badge status-${(template.default_status || 'PENDING').toLowerCase()}`}>
            {template.default_status || 'PENDING'}
          </span>
          {template.default_quadrant && (
            <span className="badge">{template.default_quadrant}</span>
          )}
        </div>
      </div>

      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading || !projectCode}>
          {loading ? 'Creating...' : 'Create Task'}
        </button>
      </div>
    </form>
  );
}