import React, { useState, useEffect, useCallback } from 'react';

const PRESET_COLORS = [
  '#38bdf8', '#818cf8', '#4ade80', '#fb7185', '#fbbf24',
  '#f97316', '#a78bfa', '#34d399', '#60a5fa', '#e879f9',
  '#f43f5e', '#0ea5e9', '#22d3ee', '#84cc16', '#a3e635',
];

export default function InlineTagEditor({ task, allTags, onUpdateTags, onClose }) {
  const [selectedIds, setSelectedIds] = useState(
    new Set((task.tags || []).map(t => t.id))
  );
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#38bdf8');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Sync selectedIds when task.tags changes (after refresh)
  useEffect(() => {
    setSelectedIds(new Set((task.tags || []).map(t => t.id)));
  }, [task.tags]);

  const contextTags = allTags.filter(t => t.is_context);
  const regularTags = allTags.filter(t => !t.is_context);

  const toggle = useCallback(async (tagId) => {
    const next = new Set(selectedIds);
    if (next.has(tagId)) next.delete(tagId);
    else next.add(tagId);
    setSelectedIds(next);
    setSaving(true);
    try {
      await onUpdateTags(task.id, [...next]);
    } finally {
      setSaving(false);
    }
  }, [selectedIds, task.id, onUpdateTags]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      });
      if (res.status === 409) { setCreateError('Tag already exists.'); setCreating(false); return; }
      if (!res.ok) { setCreateError('Failed to create tag.'); setCreating(false); return; }
      const data = await res.json();
      const next = new Set(selectedIds);
      next.add(data.id);
      setSelectedIds(next);
      await onUpdateTags(task.id, [...next]);
      setNewName('');
    } catch {
      setCreateError('Failed to create tag.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      {/* Transparent backdrop to close on outside click */}
      <div className="tt-backdrop" onClick={onClose} />

      <div className="tag-editor" role="dialog" aria-label="Edit tags">
        <div className="tag-editor-header">
          <span className="tag-editor-title">Tags</span>
          {saving && <span className="tag-editor-saving">saving…</span>}
          <button className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {contextTags.length > 0 && (
          <div className="tag-editor-group">
            <div className="tag-editor-group-label">Context</div>
            {contextTags.map(tag => (
              <label key={tag.id} className="tag-editor-item">
                <input
                  type="checkbox"
                  checked={selectedIds.has(tag.id)}
                  onChange={() => toggle(tag.id)}
                />
                <span className="tag-dot" style={{ background: tag.color }} />
                <span className="tag-editor-name">{tag.name}</span>
              </label>
            ))}
          </div>
        )}

        {regularTags.length > 0 && (
          <div className="tag-editor-group">
            <div className="tag-editor-group-label">Labels</div>
            {regularTags.map(tag => (
              <label key={tag.id} className="tag-editor-item">
                <input
                  type="checkbox"
                  checked={selectedIds.has(tag.id)}
                  onChange={() => toggle(tag.id)}
                />
                <span className="tag-dot" style={{ background: tag.color }} />
                <span className="tag-editor-name">{tag.name}</span>
              </label>
            ))}
          </div>
        )}

        <div className="tag-editor-create">
          <div className="tag-editor-group-label">New tag</div>
          {createError && <div className="tag-editor-error">{createError}</div>}
          <form onSubmit={handleCreate} className="tag-editor-create-form">
            <input
              className="form-input tag-editor-create-input"
              placeholder="Tag name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <div className="tag-color-row">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`tag-color-swatch${newColor === c ? ' selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setNewColor(c)}
                  aria-label={`Color ${c}`}
                />
              ))}
              <input
                type="color"
                className="tag-color-custom"
                value={newColor}
                onChange={e => setNewColor(e.target.value)}
                title="Custom color"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={!newName.trim() || creating}
            >
              {creating ? '…' : '+ Create Tag'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
