import React, { useState } from 'react';

export default function ContextFilterBar({ tags, activeTag, onTagSelect }) {
  const [visible, setVisible] = useState(true);
  const contextTags = tags.filter(t => t.is_context);

  if (contextTags.length === 0) return null;

  return (
    <div className="context-filter-bar">
      <button
        className="context-bar-toggle btn-icon"
        onClick={() => setVisible(v => !v)}
        title={visible ? 'Hide context tags' : 'Show context tags'}
        aria-expanded={visible}
      >
        <span className="context-bar-toggle-icon">{visible ? '▾' : '▸'}</span>
        <span className="context-bar-toggle-label">Context</span>
      </button>

      {visible && (
        <div className="context-filter-tags">
          {contextTags.map(tag => (
            <button
              key={tag.id}
              className={`context-tag-btn${activeTag === tag.id ? ' active' : ''}`}
              onClick={() => onTagSelect(activeTag === tag.id ? null : tag.id)}
              title={tag.name}
            >
              <span
                className="context-tag-dot"
                style={{ background: tag.color }}
                aria-hidden="true"
              />
              {tag.name}
            </button>
          ))}

          {activeTag && (
            <button
              className="btn btn-ghost btn-sm context-clear-btn"
              onClick={() => onTagSelect(null)}
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
