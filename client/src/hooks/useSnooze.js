import { useState, useCallback, useEffect } from 'react';

const SNOOZE_KEY = 'taskDashboard_snoozedItems';

/**
 * Snooze duration presets in milliseconds
 */
export const SNOOZE_DURATIONS = {
  '15min': 15 * 60 * 1000,
  '30min': 30 * 60 * 1000,
  '1hr': 60 * 60 * 1000,
  '3hrs': 3 * 60 * 60 * 1000,
  'eod': getEndOfDayMs(), // End of day (11:59 PM)
  'tomorrow': getTomorrow8AmMs(), // Tomorrow at 8 AM
};

/**
 * Get milliseconds until end of day (11:59 PM)
 */
function getEndOfDayMs() {
  const now = new Date();
  const eod = new Date(now);
  eod.setHours(23, 59, 59, 999);
  return eod.getTime() - now.getTime();
}

/**
 * Get milliseconds until tomorrow at 8 AM
 */
function getTomorrow8AmMs() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);
  return tomorrow.getTime() - now.getTime();
}

/**
 * Human-readable labels for snooze durations
 */
export const SNOOZE_LABELS = {
  '15min': '15 minutes',
  '30min': '30 minutes',
  '1hr': '1 hour',
  '3hrs': '3 hours',
  'eod': 'End of day',
  'tomorrow': 'Tomorrow 8 AM',
};

/**
 * Custom hook for managing snoozed items.
 * - Tracks snoozed items in localStorage
 * - Auto-expires snoozed items
 * - Provides functions to snooze individual items or all items
 */
export default function useSnooze() {
  // Load snoozed items from localStorage, filtering out expired ones
  const [snoozed, setSnoozed] = useState(() => {
    try {
      const stored = localStorage.getItem(SNOOZE_KEY);
      if (!stored) return {};

      const items = JSON.parse(stored);
      const now = Date.now();
      const active = {};

      for (const [id, expiresAt] of Object.entries(items)) {
        if (expiresAt > now) {
          active[id] = expiresAt;
        }
      }

      return active;
    } catch {
      return {};
    }
  });

  // Persist to localStorage whenever snoozed changes
  useEffect(() => {
    try {
      localStorage.setItem(SNOOZE_KEY, JSON.stringify(snoozed));
    } catch {
      // Ignore storage errors
    }
  }, [snoozed]);

  // Check if an item is currently snoozed
  const isSnoozed = useCallback((id) => {
    const expiresAt = snoozed[id];
    if (!expiresAt) return false;
    
    if (expiresAt <= Date.now()) {
      // Expired - clean up
      setSnoozed(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return false;
    }
    
    return true;
  }, [snoozed]);

  // Snooze a single item
  const snoozeItem = useCallback((id, duration = '1hr') => {
    const durationMs = typeof duration === 'number' 
      ? duration 
      : SNOOZE_DURATIONS[duration] || SNOOZE_DURATIONS['1hr'];
    
    const expiresAt = Date.now() + durationMs;
    
    setSnoozed(prev => ({
      ...prev,
      [id]: expiresAt,
    }));
  }, []);

  // Snooze multiple items at once
  const snoozeAll = useCallback((ids, duration = '1hr') => {
    const durationMs = typeof duration === 'number'
      ? duration
      : SNOOZE_DURATIONS[duration] || SNOOZE_DURATIONS['1hr'];
    
    const expiresAt = Date.now() + durationMs;
    
    setSnoozed(prev => {
      const next = { ...prev };
      ids.forEach(id => {
        next[id] = expiresAt;
      });
      return next;
    });
  }, []);

  // Remove snooze from an item
  const unsnoozeItem = useCallback((id) => {
    setSnoozed(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  // Clear all snoozed items
  const clearAllSnoozed = useCallback(() => {
    setSnoozed({});
  }, []);

  // Get time remaining for a snoozed item (in ms)
  const getTimeRemaining = useCallback((id) => {
    const expiresAt = snoozed[id];
    if (!expiresAt) return 0;
    
    const remaining = expiresAt - Date.now();
    return remaining > 0 ? remaining : 0;
  }, [snoozed]);

  // Get all currently snoozed item IDs
  const getSnoozedIds = useCallback(() => {
    const now = Date.now();
    return Object.entries(snoozed)
      .filter(([, expiresAt]) => expiresAt > now)
      .map(([id]) => id);
  }, [snoozed]);

  // Format remaining time for display
  const formatTimeRemaining = useCallback((id) => {
    const ms = getTimeRemaining(id);
    if (ms <= 0) return null;

    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 
        ? `${hours}h ${remainingMinutes}m` 
        : `${hours}h`;
    }
    
    return `${minutes}m`;
  }, [getTimeRemaining]);

  return {
    snoozed,
    isSnoozed,
    snoozeItem,
    snoozeAll,
    unsnoozeItem,
    clearAllSnoozed,
    getTimeRemaining,
    getSnoozedIds,
    formatTimeRemaining,
    durations: SNOOZE_DURATIONS,
    labels: SNOOZE_LABELS,
  };
}