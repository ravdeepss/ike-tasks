import React, { useState } from 'react';

/**
 * Feature definitions organized by category
 */
const FEATURE_CATEGORIES = [
  {
    id: 'organization',
    title: '📋 Organization',
    features: [
      {
        name: 'Projects',
        description: 'Organize your tasks into projects. Each project has a unique code and can contain multiple tasks.',
        tips: ['Use short, memorable codes like "WORK" or "HOME"', 'Archive completed projects to keep your workspace clean', 'Click a project in the sidebar to jump to it'],
        shortcuts: ['Alt+P to create a new project'],
      },
      {
        name: 'Task Management',
        description: 'Create, edit, and organize tasks with titles, due dates, priorities, and more.',
        tips: ['Use natural language for due dates: "tomorrow", "next friday", "+3d"', 'Pin important tasks to keep them at the top', 'Use the progress bar to track completion'],
        shortcuts: ['Alt+N to quick add a task', 'Alt+I for quick inbox'],
      },
      {
        name: 'Tags & Contexts',
        description: 'Use GTD-style context tags (@computer, @calls, etc.) to categorize tasks by where/when they can be done.',
        tips: ['Click on tags in a task row to edit them', 'Filter tasks by context using the context bar', 'Create custom tags for your workflow'],
        shortcuts: [],
      },
    ],
  },
  {
    id: 'views',
    title: '👁️ Views',
    features: [
      {
        name: 'Projects View',
        description: 'See all your projects as expandable cards with their tasks in a table format.',
        tips: ['Click the project header to expand/collapse', 'Drag tasks to reorder them', 'Use inline editing for quick changes'],
        shortcuts: ['Alt+1 to switch to Projects view'],
      },
      {
        name: 'All Tasks View',
        description: 'See all tasks across all projects in a single flat list.',
        tips: ['Use bulk selection for batch operations', 'Sort by any column', 'Drag to reorder across projects'],
        shortcuts: ['Alt+2 to switch to All Tasks view'],
      },
      {
        name: 'Priority Matrix',
        description: 'Eisenhower Matrix view with 4 quadrants: Do First, Schedule, Delegate, Eliminate.',
        tips: ['Drag tasks between quadrants to change priority', 'Focus on Q1 (Do First) for urgent tasks', 'Review Q4 (Eliminate) for tasks to drop'],
        shortcuts: ['Alt+3 to switch to Priority Matrix'],
      },
      {
        name: 'Kanban Board',
        description: 'Visual board with columns for each status: Pending, In Progress, Completed, Cancelled.',
        tips: ['Drag cards between columns to change status', 'Pinned tasks appear at the top of each column', 'Click a card to edit the task'],
        shortcuts: ['Alt+4 to switch to Kanban view'],
      },
    ],
  },
  {
    id: 'productivity',
    title: '⚡ Productivity',
    features: [
      {
        name: 'Pomodoro Timer',
        description: 'Built-in Pomodoro timer with 25-minute work sessions and 5-minute breaks.',
        tips: ['Link the timer to a task for tracking', 'See today\'s focus stats in the timer widget', 'Timer state persists across page refreshes'],
        shortcuts: [],
      },
      {
        name: 'Quick Inbox',
        description: 'Rapidly capture tasks to an INBOX project for later processing.',
        tips: ['Use for GTD-style capture', 'Process your inbox regularly', 'Tasks are numbered automatically'],
        shortcuts: ['Alt+I to open Quick Inbox'],
      },
      {
        name: 'Task Templates',
        description: 'Pre-defined templates for common task types like Bug Investigation, Meeting Follow-up, etc.',
        tips: ['Create custom templates for recurring tasks', 'Use "Create from Task" to template an existing task', 'Built-in templates can\'t be modified'],
        shortcuts: ['Alt+T to open Templates'],
      },
      {
        name: 'Review Mode',
        description: 'Guided review process for overdue tasks, progress updates, and upcoming planning.',
        tips: ['Do daily reviews each morning', 'Weekly reviews help with longer-term planning', 'Quick actions available for each task'],
        shortcuts: ['Alt+Shift+R for Review Mode', 'Alt+D for Daily Review', 'Alt+W for Weekly Review'],
      },
      {
        name: 'Focus Mode',
        description: 'Distraction-free view showing a single task with all its details.',
        tips: ['Great for deep work on a single task', 'Shows all task details including notes', 'Press Escape or click ✕ to exit'],
        shortcuts: ['Alt+O to toggle Focus Mode'],
      },
    ],
  },
  {
    id: 'subtasks-notes',
    title: '📝 Details',
    features: [
      {
        name: 'Subtasks',
        description: 'Break down tasks into smaller, actionable subtasks with checkboxes.',
        tips: ['Drag to reorder subtasks', 'Progress bar updates automatically', 'Use for complex multi-step tasks'],
        shortcuts: [],
      },
      {
        name: 'Notes',
        description: 'Add rich-text notes to tasks with Markdown support.',
        tips: ['Use Markdown for formatting', 'Notes are timestamped', 'Great for meeting notes or research'],
        shortcuts: [],
      },
      {
        name: 'Activity Log',
        description: 'Track all changes to tasks and projects with detailed history.',
        tips: ['View in the Summary panel (Alt+S)', 'See who changed what and when', 'Expand changes to see old vs new values'],
        shortcuts: ['Alt+S to toggle Summary panel'],
      },
    ],
  },
  {
    id: 'tips',
    title: '💡 Tips & Tricks',
    features: [
      {
        name: 'Keyboard Navigation',
        description: 'The entire app can be navigated with keyboard shortcuts for maximum efficiency.',
        tips: ['Press Alt+/ to see all shortcuts', 'Escape closes any modal or panel', 'Ctrl+K focuses the search bar'],
        shortcuts: ['Alt+/ for shortcuts help'],
      },
      {
        name: 'Search & Filter',
        description: 'Powerful search and filtering across all tasks.',
        tips: ['Search matches title, comments, and assignee', 'Combine filters for precise results', 'Clear all filters with one click'],
        shortcuts: ['Ctrl+K to focus search'],
      },
      {
        name: 'Theme Toggle',
        description: 'Switch between dark and light themes.',
        tips: ['Theme preference is saved automatically', 'Matches system preference by default'],
        shortcuts: ['Alt+L to toggle theme'],
      },
      {
        name: 'Notifications',
        description: 'Browser notifications for overdue and due-today tasks.',
        tips: ['Enable notifications when prompted', 'Notifications are deduplicated per day', 'Click a notification to focus the app'],
        shortcuts: [],
      },
    ],
  },
];

/**
 * FeatureHelpGuide - Modal displaying feature descriptions and tips.
 * 
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Callback to close the modal
 */
export default function FeatureHelpGuide({ isOpen, onClose }) {
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [expandedFeature, setExpandedFeature] = useState(null);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  const toggleFeature = (featureId) => {
    setExpandedFeature(expandedFeature === featureId ? null : featureId);
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal modal-lg feature-guide-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="feature-guide-title">
        <div className="modal-header">
          <h2 id="feature-guide-title">📚 Feature Guide</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>
        
        <div className="feature-guide-content">
          {FEATURE_CATEGORIES.map(category => (
            <FeatureCategory
              key={category.id}
              category={category}
              isExpanded={expandedCategory === category.id}
              expandedFeature={expandedFeature}
              onToggleCategory={() => toggleCategory(category.id)}
              onToggleFeature={toggleFeature}
            />
          ))}
        </div>

        <div className="modal-footer">
          <span className="feature-guide-hint">
            Press <kbd className="kbd">Alt+/</kbd> for keyboard shortcuts • 
            <kbd className="kbd">Escape</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Feature category section
 */
function FeatureCategory({ category, isExpanded, expandedFeature, onToggleCategory, onToggleFeature }) {
  return (
    <div className={`feature-category${isExpanded ? ' expanded' : ''}`}>
      <button className="feature-category-header" onClick={onToggleCategory}>
        <span className="feature-category-title">{category.title}</span>
        <span className="feature-category-count">{category.features.length} features</span>
        <span className="feature-category-arrow">{isExpanded ? '▼' : '▶'}</span>
      </button>
      
      {isExpanded && (
        <div className="feature-category-items">
          {category.features.map((feature, i) => (
            <FeatureItem
              key={`${category.id}-${i}`}
              feature={feature}
              featureId={`${category.id}-${i}`}
              isExpanded={expandedFeature === `${category.id}-${i}`}
              onToggle={() => onToggleFeature(`${category.id}-${i}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Individual feature item
 */
function FeatureItem({ feature, featureId, isExpanded, onToggle }) {
  return (
    <div className={`feature-item${isExpanded ? ' expanded' : ''}`}>
      <button className="feature-item-header" onClick={onToggle}>
        <span className="feature-item-name">{feature.name}</span>
        <span className="feature-item-arrow">{isExpanded ? '▼' : '▶'}</span>
      </button>
      
      {isExpanded && (
        <div className="feature-item-details">
          <p className="feature-description">{feature.description}</p>
          
          {feature.tips.length > 0 && (
            <div className="feature-tips">
              <span className="feature-tips-label">💡 Tips:</span>
              <ul className="feature-tips-list">
                {feature.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
          
          {feature.shortcuts.length > 0 && (
            <div className="feature-shortcuts">
              <span className="feature-shortcuts-label">⌨️ Shortcuts:</span>
              <div className="feature-shortcuts-list">
                {feature.shortcuts.map((shortcut, i) => (
                  <kbd key={i} className="kbd">{shortcut}</kbd>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}