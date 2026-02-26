import { useEffect, useCallback } from 'react';

/**
 * Custom hook for registering global keyboard shortcuts.
 * Automatically ignores shortcuts when focus is in input/textarea/select/contenteditable.
 *
 * @param {Object} shortcuts - Map of key combination to handler function
 * @param {Array} deps - Dependencies array for the handlers
 */
export default function useHotkeys(shortcuts, deps = []) {
  // Check if we should ignore keyboard events (when in input fields)
  const shouldIgnore = useCallback(() => {
    const active = document.activeElement;
    if (!active) return false;

    const tag = active.tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return true;
    if (active.isContentEditable) return true;
    if (active.getAttribute('contenteditable') === 'true') return true;

    return false;
  }, []);

  // Parse key combination string like "Alt+Shift+R" or "Ctrl+K"
  const parseCombo = useCallback((combo) => {
    const parts = combo.toLowerCase().split('+');
    const key = parts[parts.length - 1];
    const modifiers = {
      alt: parts.includes('alt'),
      ctrl: parts.includes('ctrl'),
      shift: parts.includes('shift'),
      meta: parts.includes('meta') || parts.includes('cmd'),
    };
    return { key, modifiers };
  }, []);

  // Check if event matches the key combination
  const matchesCombo = useCallback((e, { key, modifiers }) => {
    const eventKey = e.key.toLowerCase();
    
    // Handle special keys
    let normalizedKey = eventKey;
    if (eventKey === ' ') normalizedKey = 'space';
    if (eventKey === 'escape') normalizedKey = 'escape';
    
    // Check key match
    if (normalizedKey !== key) return false;

    // Check modifiers
    const altOk = modifiers.alt ? e.altKey : !e.altKey;
    const ctrlOk = modifiers.ctrl ? (e.ctrlKey || e.metaKey) : (!e.ctrlKey && !e.metaKey);
    const shiftOk = modifiers.shift ? e.shiftKey : !e.shiftKey;
    const metaOk = modifiers.meta ? e.metaKey : true; // meta is optional

    // For Ctrl combinations, allow Cmd on Mac
    if (modifiers.ctrl && !e.ctrlKey && e.metaKey) {
      return altOk && shiftOk;
    }

    return altOk && ctrlOk && shiftOk;
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (shouldIgnore()) return;

      for (const [combo, callback] of Object.entries(shortcuts)) {
        const parsed = parseCombo(combo);
        if (matchesCombo(e, parsed)) {
          e.preventDefault();
          e.stopPropagation();
          callback(e);
          return;
        }
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [shortcuts, shouldIgnore, parseCombo, matchesCombo, ...deps]);
}

/**
 * Predefined keyboard shortcuts for the Task Dashboard.
 * Export these for use in KeyboardShortcutsHelp component.
 */
export const SHORTCUT_DEFINITIONS = {
  actions: [
    { key: 'Alt+I', description: 'Open Quick Inbox' },
    { key: 'Alt+N', description: 'Quick Add Task' },
    { key: 'Alt+P', description: 'New Project' },
    { key: 'Alt+T', description: 'Task Templates' },
    { key: 'Alt+R', description: 'Refresh Data' },
    { key: 'Alt+Shift+R', description: 'Review Mode' },
    { key: 'Alt+D', description: 'Daily Review' },
    { key: 'Alt+W', description: 'Weekly Review' },
  ],
  navigation: [
    { key: 'Alt+1', description: 'Switch to Projects view' },
    { key: 'Alt+2', description: 'Switch to All Tasks view' },
    { key: 'Alt+3', description: 'Switch to Priority Matrix' },
    { key: 'Alt+4', description: 'Switch to Kanban view' },
    { key: 'Ctrl+K', description: 'Focus search' },
  ],
  view: [
    { key: 'Alt+L', description: 'Toggle theme (dark/light)' },
    { key: 'Alt+S', description: 'Toggle summary panel' },
    { key: 'Alt+H', description: 'Toggle header toolbar' },
    { key: 'Alt+Shift+S', description: 'Toggle stats bar' },
    { key: 'Alt+O', description: 'Focus mode' },
  ],
  help: [
    { key: 'Alt+/', description: 'Keyboard shortcuts help' },
    { key: 'Alt+Shift+/', description: 'Feature guide' },
    { key: 'Escape', description: 'Close modal / panel' },
  ],
};

/**
 * Get all shortcuts as a flat array.
 */
export function getAllShortcuts() {
  return [
    ...SHORTCUT_DEFINITIONS.actions,
    ...SHORTCUT_DEFINITIONS.navigation,
    ...SHORTCUT_DEFINITIONS.view,
    ...SHORTCUT_DEFINITIONS.help,
  ];
}

/**
 * Format a keyboard shortcut for display.
 * Shows Cmd on Mac, Ctrl on Windows/Linux.
 */
export function formatShortcut(key) {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  return key
    .replace(/Ctrl/g, isMac ? '⌘' : 'Ctrl')
    .replace(/Alt/g, isMac ? '⌥' : 'Alt')
    .replace(/Shift/g, isMac ? '⇧' : 'Shift')
    .replace(/\+/g, isMac ? '' : '+');
}