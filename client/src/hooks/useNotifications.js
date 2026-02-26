import { useEffect, useCallback, useRef } from 'react';

const NOTIFIED_KEY = 'taskDashboard_notifiedTasks';
const PERMISSION_REQUESTED_KEY = 'taskDashboard_notificationPermissionRequested';

/**
 * Custom hook for managing browser notifications.
 * - Requests permission after a delay on first load
 * - Sends notifications for overdue and due-today tasks
 * - Deduplicates notifications per day
 * - Schedules 1-hour-before notifications for tasks with specific due times
 */
export default function useNotifications(overdueTasks = [], dueTodayTasks = []) {
  const permissionRequested = useRef(false);
  const scheduledNotifications = useRef(new Map());

  // Get already-notified task IDs for today
  const getNotifiedIds = useCallback(() => {
    try {
      const stored = localStorage.getItem(NOTIFIED_KEY);
      if (!stored) return new Set();
      
      const { date, ids } = JSON.parse(stored);
      const today = new Date().toDateString();
      
      // Reset if it's a new day
      if (date !== today) return new Set();
      
      return new Set(ids);
    } catch {
      return new Set();
    }
  }, []);

  // Save notified task IDs
  const saveNotifiedIds = useCallback((ids) => {
    try {
      localStorage.setItem(NOTIFIED_KEY, JSON.stringify({
        date: new Date().toDateString(),
        ids: Array.from(ids),
      }));
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }, []);

  // Send a notification
  const sendNotification = useCallback((title, options = {}) => {
    if (!('Notification' in window)) return null;
    if (Notification.permission !== 'granted') return null;

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: false,
        silent: false,
        ...options,
      });

      // Auto-close after 10 seconds
      setTimeout(() => {
        notification.close();
      }, 10000);

      // Handle click - focus the window
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch {
      return null;
    }
  }, []);

  // Request permission after delay on first load
  useEffect(() => {
    const alreadyRequested = localStorage.getItem(PERMISSION_REQUESTED_KEY);
    if (alreadyRequested) return;

    const timer = setTimeout(() => {
      requestPermission();
      localStorage.setItem(PERMISSION_REQUESTED_KEY, 'true');
    }, 3000);

    return () => clearTimeout(timer);
  }, [requestPermission]);

  // Send notifications for overdue and due-today tasks
  useEffect(() => {
    if (!overdueTasks.length && !dueTodayTasks.length) return;
    if (Notification.permission !== 'granted') return;

    const notified = getNotifiedIds();
    let hasNewNotifications = false;

    // Notify for overdue tasks (limit to 3 to avoid spam)
    const overdueToNotify = overdueTasks.filter(t => !notified.has(`overdue-${t.id}`)).slice(0, 3);
    
    overdueToNotify.forEach(task => {
      const daysOverdue = task.due_date
        ? Math.floor((Date.now() - new Date(task.due_date + 'T00:00:00').getTime()) / 86400000)
        : 0;

      sendNotification(`⚠️ Overdue: ${task.title}`, {
        body: `[${task.projectCode}] ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`,
        tag: `overdue-${task.id}`,
      });

      notified.add(`overdue-${task.id}`);
      hasNewNotifications = true;
    });

    // Notify for due-today tasks (limit to 3)
    const todayToNotify = dueTodayTasks.filter(t => !notified.has(`today-${t.id}`)).slice(0, 3);
    
    todayToNotify.forEach(task => {
      sendNotification(`📅 Due Today: ${task.title}`, {
        body: `[${task.projectCode}] Due: ${task.due_date}`,
        tag: `today-${task.id}`,
      });

      notified.add(`today-${task.id}`);
      hasNewNotifications = true;
    });

    if (hasNewNotifications) {
      saveNotifiedIds(notified);
    }
  }, [overdueTasks, dueTodayTasks, getNotifiedIds, saveNotifiedIds, sendNotification]);

  // Schedule 1-hour-before notifications for tasks with specific due times
  const scheduleHourBefore = useCallback((tasks) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    // Clear old scheduled notifications
    scheduledNotifications.current.forEach(timer => clearTimeout(timer));
    scheduledNotifications.current.clear();

    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    tasks.forEach(task => {
      if (!task.due_date) return;
      
      // Check if task has a specific time (ISO string with time)
      const dueDate = new Date(task.due_date);
      const hasTime = task.due_date.includes('T') && task.due_date.length > 10;
      
      if (!hasTime) return; // Skip tasks without specific times

      const notifyTime = dueDate.getTime() - oneHour;
      const delay = notifyTime - now;

      if (delay > 0 && delay < 24 * oneHour) { // Only schedule within next 24 hours
        const timer = setTimeout(() => {
          sendNotification(`⏰ Due in 1 hour: ${task.title}`, {
            body: `[${task.projectCode}] Due at ${dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            tag: `1hr-${task.id}`,
          });
          scheduledNotifications.current.delete(task.id);
        }, delay);

        scheduledNotifications.current.set(task.id, timer);
      }
    });
  }, [sendNotification]);

  // Cleanup scheduled notifications on unmount
  useEffect(() => {
    return () => {
      scheduledNotifications.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  return {
    requestPermission,
    sendNotification,
    scheduleHourBefore,
    hasPermission: () => Notification.permission === 'granted',
  };
}