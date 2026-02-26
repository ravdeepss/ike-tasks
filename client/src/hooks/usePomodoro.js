import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'taskDashboard_pomodoroState';

// Duration presets in seconds
const DURATIONS = {
  work: 25 * 60,       // 25 minutes
  shortWork: 15 * 60,  // 15 minutes
  shortBreak: 5 * 60,  // 5 minutes
  longBreak: 15 * 60,  // 15 minutes
};

// Load saved state from localStorage
function loadSavedState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const state = JSON.parse(saved);
    // Check if session is still valid (not expired)
    if (state.expiresAt && state.expiresAt > Date.now()) {
      return state;
    }
    // Clear expired state
    localStorage.removeItem(STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}

// Play audio chime using Web Audio API
function playChime() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
    
    // Play second tone
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.setValueAtTime(1100, audioContext.currentTime);
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      osc2.start(audioContext.currentTime);
      osc2.stop(audioContext.currentTime + 0.5);
    }, 200);
  } catch (e) {
    console.warn('Could not play chime:', e);
  }
}

// Send browser notification
function sendNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'pomodoro-complete',
        requireInteraction: false,
      });
    } catch (e) {
      console.warn('Could not send notification:', e);
    }
  }
}

export default function usePomodoro(onRefresh) {
  const savedState = useRef(loadSavedState());
  
  const [isRunning, setIsRunning] = useState(() => savedState.current?.isRunning ?? false);
  const [isPaused, setIsPaused] = useState(() => savedState.current?.isPaused ?? false);
  const [timeRemaining, setTimeRemaining] = useState(() => savedState.current?.timeRemaining ?? DURATIONS.work);
  const [mode, setMode] = useState(() => savedState.current?.mode ?? 'work');
  const [sessionId, setSessionId] = useState(() => savedState.current?.sessionId ?? null);
  const [taskId, setTaskId] = useState(() => savedState.current?.taskId ?? null);
  const [sessionsCompleted, setSessionsCompleted] = useState(() => savedState.current?.sessionsCompleted ?? 0);
  const [todayStats, setTodayStats] = useState({ sessionCount: 0, totalMinutes: 0 });

  // Persist state to localStorage
  const saveState = useCallback(() => {
    try {
      const state = {
        isRunning,
        isPaused,
        timeRemaining,
        mode,
        sessionId,
        taskId,
        sessionsCompleted,
        expiresAt: isRunning && !isPaused ? Date.now() + (timeRemaining * 1000) : null,
        savedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage errors
    }
  }, [isRunning, isPaused, timeRemaining, mode, sessionId, taskId, sessionsCompleted]);

  // Save state whenever it changes
  useEffect(() => {
    saveState();
  }, [saveState]);

  // Fetch today's stats
  const fetchTodayStats = useCallback(async () => {
    try {
      const res = await fetch('/api/pomodoro/stats/today');
      if (res.ok) {
        const data = await res.json();
        setTodayStats(data);
      }
    } catch (e) {
      console.warn('Could not fetch pomodoro stats:', e);
    }
  }, []);

  // Fetch stats on mount
  useEffect(() => {
    fetchTodayStats();
  }, [fetchTodayStats]);

  // Check for active session on mount
  useEffect(() => {
    async function checkActiveSession() {
      // If we have a saved state that's still running, use it
      if (savedState.current?.isRunning && savedState.current?.sessionId) {
        // Verify with backend
        try {
          const res = await fetch('/api/pomodoro/active');
          if (res.ok) {
            const data = await res.json();
            if (data.session && data.session.id === savedState.current.sessionId) {
              // Session is still active on backend
              return;
            } else if (data.session) {
              // Different active session from backend
              setSessionId(data.session.id);
              setTaskId(data.session.task_id);
              const elapsed = Math.floor((Date.now() - new Date(data.session.started_at).getTime()) / 1000);
              const remaining = (data.session.duration_minutes * 60) - elapsed;
              if (remaining > 0) {
                setTimeRemaining(remaining);
                setIsRunning(true);
                setIsPaused(false);
              } else {
                // Session expired, complete it
                await fetch(`/api/pomodoro/${data.session.id}/complete`, { method: 'POST' });
              }
            }
          }
        } catch (e) {
          console.warn('Could not check active session:', e);
        }
      }
    }
    checkActiveSession();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!isRunning || isPaused) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimerComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isPaused]);

  // Handle timer completion
  const handleTimerComplete = useCallback(async () => {
    setIsRunning(false);
    setIsPaused(false);
    
    playChime();
    
    if (sessionId) {
      try {
        await fetch(`/api/pomodoro/${sessionId}/complete`, { method: 'POST' });
        setSessionsCompleted(prev => prev + 1);
        fetchTodayStats();
        if (onRefresh) onRefresh();
      } catch (e) {
        console.warn('Could not complete session:', e);
      }
    }

    // Send notification
    const modeLabel = mode === 'work' ? 'Work session' : mode === 'shortBreak' ? 'Short break' : 'Long break';
    sendNotification(`${modeLabel} complete!`, mode === 'work' ? 'Time for a break!' : 'Ready to focus again?');

    // Reset for break or next work session
    if (mode === 'work') {
      // After 4 work sessions, suggest long break
      const newSessionsCompleted = sessionsCompleted + 1;
      if (newSessionsCompleted % 4 === 0) {
        setMode('longBreak');
        setTimeRemaining(DURATIONS.longBreak);
      } else {
        setMode('shortBreak');
        setTimeRemaining(DURATIONS.shortBreak);
      }
    } else {
      setMode('work');
      setTimeRemaining(DURATIONS.work);
    }
    
    setSessionId(null);
    setTaskId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, [sessionId, mode, sessionsCompleted, fetchTodayStats, onRefresh]);

  // Start a new session
  const startSession = useCallback(async (durationMinutes = 25, task = null) => {
    try {
      const res = await fetch('/api/pomodoro/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task?.id || null,
          durationMinutes,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error?.includes('already active')) {
          // Get the active session
          const activeRes = await fetch('/api/pomodoro/active');
          if (activeRes.ok) {
            const activeData = await activeRes.json();
            if (activeData.session) {
              setSessionId(activeData.session.id);
              setTaskId(activeData.session.task_id);
              const elapsed = Math.floor((Date.now() - new Date(activeData.session.started_at).getTime()) / 1000);
              const remaining = (activeData.session.duration_minutes * 60) - elapsed;
              setTimeRemaining(Math.max(0, remaining));
              setIsRunning(true);
              setIsPaused(false);
              setMode('work');
            }
          }
          return;
        }
        throw new Error(data.error || 'Failed to start session');
      }

      const data = await res.json();
      setSessionId(data.session.id);
      setTaskId(task?.id || null);
      setTimeRemaining(durationMinutes * 60);
      setIsRunning(true);
      setIsPaused(false);
      setMode('work');
    } catch (e) {
      console.error('Failed to start pomodoro session:', e);
      throw e;
    }
  }, []);

  // Pause the timer
  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  // Resume the timer
  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  // Stop/cancel the current session
  const stop = useCallback(async () => {
    if (sessionId) {
      try {
        await fetch(`/api/pomodoro/${sessionId}/cancel`, { method: 'POST' });
      } catch (e) {
        console.warn('Could not cancel session:', e);
      }
    }
    
    setIsRunning(false);
    setIsPaused(false);
    setTimeRemaining(DURATIONS.work);
    setMode('work');
    setSessionId(null);
    setTaskId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, [sessionId]);

  // Complete the current session early
  const complete = useCallback(async () => {
    if (timeRemaining > 0) {
      // Force complete
      await handleTimerComplete();
    }
  }, [timeRemaining, handleTimerComplete]);

  // Update linked task
  const updateTask = useCallback(async (newTaskId) => {
    if (sessionId) {
      try {
        await fetch(`/api/pomodoro/${sessionId}/task`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: newTaskId }),
        });
        setTaskId(newTaskId);
      } catch (e) {
        console.warn('Could not update session task:', e);
      }
    }
  }, [sessionId]);

  // Set duration without starting
  const setDuration = useCallback((minutes) => {
    if (!isRunning) {
      setTimeRemaining(minutes * 60);
    }
  }, [isRunning]);

  // Format time as MM:SS
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Get progress percentage
  const getProgress = useCallback(() => {
    const totalDuration = mode === 'work' ? DURATIONS.work : mode === 'shortBreak' ? DURATIONS.shortBreak : DURATIONS.longBreak;
    const customDuration = isRunning ? null : Math.ceil(timeRemaining / 60) * 60;
    const total = customDuration || totalDuration;
    return ((total - timeRemaining) / total) * 100;
  }, [mode, timeRemaining, isRunning]);

  return {
    // State
    isRunning,
    isPaused,
    timeRemaining,
    mode,
    sessionId,
    taskId,
    sessionsCompleted,
    todayStats,
    
    // Actions
    startSession,
    pause,
    resume,
    stop,
    complete,
    updateTask,
    setDuration,
    
    // Helpers
    formatTime,
    getProgress,
    DURATIONS,
    
    // Refresh stats
    refreshStats: fetchTodayStats,
  };
}