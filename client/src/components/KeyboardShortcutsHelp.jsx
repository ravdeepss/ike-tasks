import React from 'react';
import { SHORTCUT_DEFINITIONS, formatShortcut } from '../hooks/useHotkeys';

/**
 * KeyboardShortcutsHelp - Modal displaying all keyboard shortcuts.
 * 
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Callback to close the modal
 */
export default function KeyboardShortcutsHelp({ isOpen, onClose }) {
  if (!isOpen) return null;

  // Handle click on overlay
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
        <div className="modal-header">
          <h2 id="shortcuts-title">⌨️ Keyboard Shortcuts</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>
        
        <div className="shortcuts-content">
          <ShortcutsSection title="Actions" shortcuts={SHORTCUT_DEFINITIONS.actions} />
          <ShortcutsSection title="Navigation" shortcuts={SHORTCUT_DEFINITIONS.navigation} />
          <ShortcutsSection title="View" shortcuts={SHORTCUT_DEFINITIONS.view} />
          <ShortcutsSection title="Help" shortcuts={SHORTCUT_DEFINITIONS.help} />
        </div>

        <div className="modal-footer">
          <span className="shortcuts-hint">Press <kbd className="kbd">Escape</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Section of shortcuts grouped by category
 */
function ShortcutsSection({ title, shortcuts }) {
  return (
    <div className="shortcuts-section">
      <h3 className="shortcuts-section-title">{title}</h3>
      <div className="shortcuts-grid">
        {shortcuts.map((shortcut, i) => (
          <ShortcutItem key={i} shortcut={shortcut} />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual shortcut item
 */
function ShortcutItem({ shortcut }) {
  const { key, description } = shortcut;
  const formattedKey = formatShortcut(key);

  return (
    <div className="shortcut-item">
      <kbd className="kbd kbd-lg">{formattedKey}</kbd>
      <span className="shortcut-description">{description}</span>
    </div>
  );
}