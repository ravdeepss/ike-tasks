import React, { useState, useEffect, useRef } from 'react';
import usePomodoro from '../hooks/usePomodoro';

export default function PomodoroTimer({ projects, onRefresh }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const taskSelectorRef = useRef(null);

  const {
    isRunning,
    isPaused,
    timeRemaining,
    mode,
    sessionId,
    taskId,
    todayStats,
    startSession,
    pause,
    resume,
    stop,
    complete,
    updateTask,
    setDuration,
    formatTime,
    getProgress,
    DURATIONS,
  } = usePomodoro(onRefresh);

  // Get all tasks for task selector
  const allTasks = React.useMemo(() => {
    return (projects || []).flatMap(p =>
      (p.tasks || []).map(t => ({
        ...t,
        projectCode: p.code,
        projectName: p.name,
      }))
    );
  }, [projects]);

  // Find currently linked task
  const linkedTask = React.useMemo(() => {
    if (!taskId) return null;
    return allTasks.find(t => t.id === taskId);
  }, [taskId, allTasks]);

  // Close task selector when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (taskSelectorRef.current && !taskSelectorRef.current.contains(e.target)) {
        setShowTaskSelector(false);
      }
    }
    if (showTaskSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTaskSelector]);

  // Handle task selection
  const handleSelectTask = async (task) => {
    setSelectedTask(task);
    setShowTaskSelector(false);
    if (isRunning && sessionId) {
      await updateTask(task.id);
    }
  };

  // Clear task selection
  const handleClearTask = () => {
    setSelectedTask(null);
    if (isRunning && sessionId) {
      updateTask(null);
    }
  };

  // Handle duration preset click
  const handleDurationPreset = (minutes) => {
    if (!isRunning) {
      setDuration(minutes);
    }
  };

  // Handle start button
  const handleStart = () => {
    startSession(Math.ceil(timeRemaining / 60), selectedTask);
  };

  // Mode colors
  const modeColors = {
    work: 'var(--accent-primary)',
    shortBreak: '#4ade80',
    longBreak: '#818cf8',
  };

  const modeLabels = {
    work: 'Focus',
    shortBreak: 'Short Break',
    longBreak: 'Long Break',
  };

  const currentColor = modeColors[mode] || modeColors.work;
  const progress = getProgress();

  // Mini view (collapsed)
  if (!isExpanded) {
    return (
      <div className="pomodoro-mini" onClick={() => setIsExpanded(true)}>
        <div className="pomodoro-mini-ring" style={{ '--progress': `${progress}%`, '--color': currentColor }}>
          <div className="pomodoro-mini-inner">
            <span className="pomodoro-mini-time">{formatTime(timeRemaining)}</span>
            {isRunning && !isPaused && <span className="pomodoro-mini-dot" />}
          </div>
        </div>
        <span className="pomodoro-mini-label">{modeLabels[mode]}</span>
      </div>
    );
  }

  // Expanded view
  return (
    <div className="pomodoro-widget">
      <div className="pomodoro-header">
        <span className="pomodoro-title">🍅 Pomodoro</span>
        <button className="btn-icon" onClick={() => setIsExpanded(false)} title="Minimize">
          ▼
        </button>
      </div>

      {/* Timer display */}
      <div className="pomodoro-timer-display">
        <div className="pomodoro-timer-ring" style={{ '--progress': `${progress}%`, '--color': currentColor }}>
          <div className="pomodoro-timer-inner">
            <span className="pomodoro-timer-time">{formatTime(timeRemaining)}</span>
            <span className="pomodoro-timer-mode">{modeLabels[mode]}</span>
          </div>
        </div>
      </div>

      {/* Duration presets */}
      {!isRunning && (
        <div className="pomodoro-presets">
          <button
            className={`btn btn-sm ${timeRemaining === 25 * 60 ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleDurationPreset(25)}
          >
            25m
          </button>
          <button
            className={`btn btn-sm ${timeRemaining === 15 * 60 ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleDurationPreset(15)}
          >
            15m
          </button>
          <button
            className={`btn btn-sm ${timeRemaining === 5 * 60 ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleDurationPreset(5)}
          >
            5m
          </button>
        </div>
      )}

      {/* Task selector */}
      <div className="pomodoro-task-selector" ref={taskSelectorRef}>
        {linkedTask || selectedTask ? (
          <div className="pomodoro-task-selected">
            <span className="pomodoro-task-project">[{(linkedTask || selectedTask).projectCode}]</span>
            <span className="pomodoro-task-title truncate">{(linkedTask || selectedTask).title}</span>
            <button className="btn-icon pomodoro-task-clear" onClick={handleClearTask}>✕</button>
          </div>
        ) : (
          <button
            className="btn btn-secondary btn-sm pomodoro-task-btn"
            onClick={() => setShowTaskSelector(v => !v)}
          >
            🔗 Link task (optional)
          </button>
        )}

        {showTaskSelector && (
          <div className="pomodoro-task-dropdown">
            <input
              type="text"
              className="form-input pomodoro-task-search"
              placeholder="Search tasks..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') setShowTaskSelector(false);
              }}
              onChange={(e) => {
                // Simple filter - could be enhanced
                const query = e.target.value.toLowerCase();
                const items = taskSelectorRef.current.querySelectorAll('.pomodoro-task-item');
                items.forEach(item => {
                  const text = item.textContent.toLowerCase();
                  item.style.display = text.includes(query) ? '' : 'none';
                });
              }}
            />
            <div className="pomodoro-task-list">
              {allTasks.length === 0 ? (
                <div className="pomodoro-task-empty">No tasks available</div>
              ) : (
                allTasks.slice(0, 50).map(task => (
                  <button
                    key={task.id}
                    className="pomodoro-task-item"
                    onClick={() => handleSelectTask(task)}
                  >
                    <span className="pomodoro-task-item-project">[{task.projectCode}]</span>
                    <span className="pomodoro-task-item-title truncate">{task.title}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="pomodoro-controls">
        {!isRunning ? (
          <button className="btn btn-primary pomodoro-start-btn" onClick={handleStart}>
            ▶ Start
          </button>
        ) : isPaused ? (
          <button className="btn btn-primary pomodoro-resume-btn" onClick={resume}>
            ▶ Resume
          </button>
        ) : (
          <button className="btn btn-secondary pomodoro-pause-btn" onClick={pause}>
            ⏸ Pause
          </button>
        )}

        {isRunning && (
          <>
            <button className="btn btn-secondary btn-sm" onClick={complete} title="Complete early">
              ✓ Complete
            </button>
            <button className="btn btn-ghost btn-sm" onClick={stop} title="Cancel session">
              ✕ Cancel
            </button>
          </>
        )}
      </div>

      {/* Today's stats */}
      <div className="pomodoro-stats">
        <span className="pomodoro-stats-label">Today:</span>
        <span className="pomodoro-stats-value">
          {todayStats.sessionCount || 0} session{todayStats.sessionCount !== 1 ? 's' : ''}, {' '}
          {todayStats.totalMinutes || 0} min focused
        </span>
      </div>
    </div>
  );
}