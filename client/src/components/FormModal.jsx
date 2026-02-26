import React, { useState } from 'react';

// ============================================================
// ProjectFormModal — create or edit a project
// ============================================================
export function ProjectFormModal({ mode = 'create', initial = {}, onSubmit, onClose }) {
  const isEdit = mode === 'edit';

  const [code,        setCode]        = useState(initial.code        || '');
  const [name,        setName]        = useState(initial.name        || '');
  const [description, setDescription] = useState(initial.description || '');
  const [status,      setStatus]      = useState(initial.status      || 'In Progress');
  const [error,       setError]       = useState('');
  const [saving,      setSaving]      = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim())         { setError('Name is required.'); return; }
    if (!isEdit && !code.trim()) { setError('Code is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = isEdit
        ? { name: name.trim(), description: description.trim(), status }
        : { code: code.trim().toUpperCase(), name: name.trim(), description: description.trim(), status };
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save project.');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pform-title"
      >
        <div className="modal-header">
          <h2 id="pform-title">{isEdit ? 'Edit Project' : 'New Project'}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}

          {!isEdit && (
            <div className="form-group">
              <label className="form-label">Code *</label>
              <input
                className="form-input"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. WEB"
                maxLength={10}
                autoFocus
                required
              />
              <span className="form-hint">Short uppercase identifier, max 10 chars</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Name *</label>
            <input
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Project name"
              autoFocus={isEdit}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              {isEdit && <option value="Archived">Archived</option>}
            </select>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// ConfirmDialog — generic confirmation
// ============================================================
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onClose,
}) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal modal-sm"
        onClick={e => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <div className="modal-header">
          <h2 id="confirm-title">{title}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="confirm-dialog-message">{message}</p>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Loading…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
