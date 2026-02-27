import React, { useState, useEffect, useMemo, useCallback } from 'react';

const REVIEW_TYPES = {
  daily: { label: 'Daily Review', days: 1 },
  weekly: { label: 'Weekly Review', days: 7 },
};

const STATUS_OPTIONS = ['PENDING', 'INPROGRESS', 'COMPLETED', 'CANCELLED'];

export default function ReviewMode({ type, onClose, projects, onUpdateTask, onRefresh }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [updating, setUpdating] = useState(false);

  const reviewConfig = REVIEW_TYPES[type] || REVIEW_TYPES.daily;
  const daysAhead = reviewConfig.days;

  // Get all tasks flattened
  const allTasks = useMemo(() => {
    return (projects || []).flatMap(p =>
      (p.tasks || []).map(t => ({
        ...t,
        projectCode: p.code,
        projectName: p.name,
      }))
    );
  }, [projects]);

  // Categorize tasks
  const { overdueTasks, dueTodayTasks, upcomingTasks, inProgressTasks, unscheduledHighPriority } = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + daysAhead);

    const overdue = [];
    const dueToday = [];
    const upcoming = [];
    const inProgress = [];
    const highPriority = [];

    allTasks.forEach(task => {
      // Skip completed/cancelled/done/not-doing
      if (['COMPLETED', 'DONE', 'CANCELLED', 'NOT DOING'].includes(task.status)) return;

      // In progress tasks
      if (task.status === 'INPROGRESS') {
        inProgress.push(task);
      }

      // High priority unscheduled
      if (task.priority === 'HIGH' && !task.due_date) {
        highPriority.push(task);
      }

      // Due date categorization
      if (task.due_date) {
        const dueDate = new Date(task.due_date);
        const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

        if (dueDateOnly < today) {
          overdue.push(task);
        } else if (dueDateOnly.getTime() === today.getTime()) {
          dueToday.push(task);
        } else if (dueDateOnly <= endDate) {
          upcoming.push(task);
        }
      }
    });

    // Sort functions
    const sortByDueDate = (a, b) => new Date(a.due_date) - new Date(b.due_date);
    const sortByPriority = (a, b) => {
      const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return (order[a.priority] || 2) - (order[b.priority] || 2);
    };

    return {
      overdueTasks: overdue.sort(sortByDueDate),
      dueTodayTasks: dueToday.sort(sortByPriority),
      upcomingTasks: upcoming.sort(sortByDueDate),
      inProgressTasks: inProgress.sort(sortByPriority),
      unscheduledHighPriority: highPriority.sort(sortByPriority),
    };
  }, [allTasks, daysAhead]);

  // Steps configuration
  const steps = [
    {
      id: 'overdue',
      title: 'Review Overdue',
      icon: '⚠️',
      tasks: overdueTasks,
      emptyMessage: 'No overdue tasks. Great job!',
      actions: ['complete', 'inprogress', 'cancel'],
    },
    {
      id: 'today',
      title: 'Due Today',
      icon: '📅',
      tasks: dueTodayTasks,
      emptyMessage: 'No tasks due today.',
      actions: ['complete', 'inprogress', 'cancel'],
    },
    {
      id: 'progress',
      title: 'Update Progress',
      icon: '📊',
      tasks: inProgressTasks,
      emptyMessage: 'No tasks in progress.',
      actions: ['progress', 'complete'],
    },
    {
      id: 'upcoming',
      title: 'Plan Ahead',
      icon: '🗓️',
      tasks: [...upcomingTasks, ...unscheduledHighPriority],
      emptyMessage: 'No upcoming tasks in the next ' + daysAhead + ' days.',
      actions: [],
    },
  ];

  // Handle escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Handle task status change
  const handleStatusChange = async (task, newStatus) => {
    setUpdating(true);
    try {
      await onUpdateTask(task.id, { status: newStatus });
      onRefresh();
    } catch (e) {
      console.error('Failed to update task:', e);
    } finally {
      setUpdating(false);
    }
  };

  // Handle progress change
  const handleProgressChange = async (task, progress) => {
    setUpdating(true);
    try {
      await onUpdateTask(task.id, { progress: parseInt(progress, 10) });
      onRefresh();
    } catch (e) {
      console.error('Failed to update progress:', e);
    } finally {
      setUpdating(false);
    }
  };

  // Current step data
  const step = steps[currentStep];

  // Task card component
  const TaskCard = ({ task }) => (
    <div className="review-task-card">
      <div className="review-task-header">
        <span className="review-task-project">[{task.projectCode}]</span>
        <span className="review-task-title truncate">{task.title}</span>
      </div>
      <div className="review-task-meta">
        {task.due_date && (
          <span className="review-task-due">
            {new Date(task.due_date).toLocaleDateString()}
          </span>
        )}
        <span className={`badge priority-${(task.priority || 'MEDIUM').toLowerCase()}`}>
          {task.priority || 'MEDIUM'}
        </span>
        {task.status === 'INPROGRESS' && task.progress != null && (
          <span className="review-task-progress">{task.progress}%</span>
        )}
      </div>

      {/* Action buttons based on step */}
      <div className="review-task-actions">
        {step.actions.includes('complete') && (
          <button
            className="btn btn-success btn-sm"
            onClick={() => handleStatusChange(task, 'COMPLETED')}
            disabled={updating}
          >
            ✓ Complete
          </button>
        )}
        {step.actions.includes('inprogress') && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => handleStatusChange(task, 'INPROGRESS')}
            disabled={updating}
          >
            ▶ Start
          </button>
        )}
        {step.actions.includes('cancel') && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleStatusChange(task, 'CANCELLED')}
            disabled={updating}
          >
            ✕ Cancel
          </button>
        )}
        {step.actions.includes('progress') && (
          <div className="review-progress-slider">
            <input
              type="range"
              min="0"
              max="100"
              value={task.progress || 0}
              onChange={(e) => handleProgressChange(task, e.target.value)}
              disabled={updating}
            />
            <span>{task.progress || 0}%</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="review-mode-overlay">
      <div className="review-mode">
        {/* Header */}
        <div className="review-header">
          <h1>{reviewConfig.label}</h1>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Progress indicator */}
        <div className="review-progress-bar">
          {steps.map((s, i) => (
            <div
              key={s.id}
              className={`review-progress-step ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'completed' : ''}`}
              onClick={() => setCurrentStep(i)}
            >
              <span className="review-step-icon">{s.icon}</span>
              <span className="review-step-label">{s.title}</span>
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="review-step-content">
          <div className="review-step-header">
            <h2>{step.icon} {step.title}</h2>
            <span className="review-step-count">{step.tasks.length} task{step.tasks.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="review-task-list">
            {step.tasks.length === 0 ? (
              <div className="review-empty">{step.emptyMessage}</div>
            ) : (
              step.tasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))
            )}
          </div>
        </div>

        {/* Footer navigation */}
        <div className="review-footer">
          <button
            className="btn btn-secondary"
            onClick={() => setCurrentStep(i => Math.max(0, i - 1))}
            disabled={currentStep === 0}
          >
            ← Previous
          </button>

          <span className="review-step-indicator">
            Step {currentStep + 1} of {steps.length}
          </span>

          {currentStep < steps.length - 1 ? (
            <button
              className="btn btn-primary"
              onClick={() => setCurrentStep(i => i + 1)}
            >
              Next →
            </button>
          ) : (
            <button className="btn btn-success" onClick={onClose}>
              Finish Review ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
}