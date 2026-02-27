import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import DOMPurify from 'dompurify';

/**
 * SliderPanel - Slide-out panel with Summary and Activity tabs.
 * 
 * @param {boolean} isOpen - Whether the panel is visible
 * @param {function} onClose - Callback to close the panel
 * @param {Array} projects - Projects data for summary generation
 */
export default function SliderPanel({ isOpen, onClose, projects = [] }) {
  const [activeTab, setActiveTab] = useState('summary');
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  // Activity log state
  const [activities, setActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityPage, setActivityPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [activityTotal, setActivityTotal] = useState(0);

  const ITEMS_PER_PAGE = 20;

  // Fetch summary when summary tab is active
  useEffect(() => {
    if (isOpen && activeTab === 'summary' && !summary && !summaryLoading) {
      fetchSummary();
    }
  }, [isOpen, activeTab, summary, summaryLoading]);

  // Fetch activity when activity tab is active
  useEffect(() => {
    if (isOpen && activeTab === 'activity' && activities.length === 0 && !activityLoading) {
      fetchActivities(0);
    }
  }, [isOpen, activeTab, activities.length, activityLoading]);

  // Reset state when panel closes
  useEffect(() => {
    if (!isOpen) {
      // Optionally reset state when panel closes
    }
  }, [isOpen]);

  const fetchSummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    
    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      if (!res.ok) throw new Error('Failed to generate summary');
      
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      setSummaryError(err.message);
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchActivities = async (page) => {
    setActivityLoading(true);
    
    try {
      const offset = page * ITEMS_PER_PAGE;
      const res = await fetch(`/api/activity?offset=${offset}&limit=${ITEMS_PER_PAGE}`);
      
      if (!res.ok) throw new Error('Failed to fetch activity');
      
      const data = await res.json();
      
      if (page === 0) {
        setActivities(data.activities || []);
      } else {
        setActivities(prev => [...prev, ...(data.activities || [])]);
      }
      
      setActivityTotal(data.total || 0);
      setHasMore(data.hasMore || false);
      setActivityPage(page);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  const loadMoreActivities = () => {
    if (!activityLoading && hasMore) {
      fetchActivities(activityPage + 1);
    }
  };

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <aside className="slider-panel slider-panel-open">
      <div className="slider-panel-header">
        <div className="slider-panel-tabs">
          <button
            className={`slider-tab${activeTab === 'summary' ? ' active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            Summary
          </button>
          <button
            className={`slider-tab${activeTab === 'activity' ? ' active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            Activity
          </button>
        </div>
        <button className="btn-icon" onClick={onClose} aria-label="Close panel">✕</button>
      </div>

      <div className="slider-panel-content">
        {activeTab === 'summary' && (
          <SummaryTab
            summary={summary}
            loading={summaryLoading}
            error={summaryError}
            onRefresh={fetchSummary}
          />
        )}

        {activeTab === 'activity' && (
          <ActivityTab
            activities={activities}
            loading={activityLoading}
            hasMore={hasMore}
            total={activityTotal}
            onLoadMore={loadMoreActivities}
          />
        )}
      </div>
    </aside>
  );
}

/**
 * Summary Tab - Displays generated markdown summary
 */
function SummaryTab({ summary, loading, error, onRefresh }) {
  if (loading) {
    return (
      <div className="slider-loading">
        <div className="loading-spinner" />
        <span>Generating summary...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="slider-error">
        <p>Failed to generate summary</p>
        <button className="btn btn-secondary btn-sm" onClick={onRefresh}>
          Retry
        </button>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="slider-empty">
        <p>No summary available</p>
        <button className="btn btn-secondary btn-sm" onClick={onRefresh}>
          Generate Summary
        </button>
      </div>
    );
  }

  return (
    <div className="summary-content">
      <div className="summary-header">
        <span className="summary-generated">
          Generated: {summary.generatedAt ? new Date(summary.generatedAt).toLocaleString() : 'Just now'}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={onRefresh} title="Refresh summary">
          ↺
        </button>
      </div>
      <div className="markdown-content">
        <ReactMarkdown>{DOMPurify.sanitize(summary.summary || '')}</ReactMarkdown>
      </div>
    </div>
  );
}

/**
 * Activity Tab - Displays paginated activity log
 */
function ActivityTab({ activities, loading, hasMore, total, onLoadMore }) {
  // Group activities by date
  const groupedActivities = groupActivitiesByDate(activities);

  if (activities.length === 0 && !loading) {
    return (
      <div className="slider-empty">
        <p>No activity yet</p>
        <span className="slider-empty-hint">
          Activity will appear here as you create and update tasks.
        </span>
      </div>
    );
  }

  return (
    <div className="activity-content">
      {total > 0 && (
        <div className="activity-count">
          {total} {total === 1 ? 'activity' : 'activities'}
        </div>
      )}

      <div className="activity-list">
        {Object.entries(groupedActivities).map(([date, items]) => (
          <ActivityDateGroup key={date} date={date} activities={items} />
        ))}
      </div>

      {loading && (
        <div className="activity-loading">
          <div className="loading-spinner" />
        </div>
      )}

      {hasMore && !loading && (
        <button className="btn btn-secondary btn-sm activity-load-more" onClick={onLoadMore}>
          Load More
        </button>
      )}
    </div>
  );
}

/**
 * Group activities by date
 */
function groupActivitiesByDate(activities) {
  const groups = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  activities.forEach(activity => {
    const date = new Date(activity.timestamp || activity.created_at).toDateString();
    let label = date;

    if (date === today) label = 'Today';
    else if (date === yesterday) label = 'Yesterday';
    else {
      // Format as "Mon Jan 15"
      label = new Date(activity.timestamp || activity.created_at).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }

    if (!groups[label]) groups[label] = [];
    groups[label].push(activity);
  });

  return groups;
}

/**
 * Activity date group with header and items
 */
function ActivityDateGroup({ date, activities }) {
  return (
    <div className="activity-date-group">
      <div className="activity-date-label">{date}</div>
      <div className="activity-date-items">
        {activities.map((activity, i) => (
          <ActivityItem key={activity.id || `${date}-${i}`} activity={activity} />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual activity item
 */
function ActivityItem({ activity }) {
  const { action, entity_type, entity_name, description, changes, timestamp, created_at } = activity;

  // Get icon and color based on action type
  const { icon, color } = getActivityMeta(action);

  // Format time
  const time = new Date(timestamp || created_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const [expanded, setExpanded] = useState(false);

  return (
    <div className="activity-item">
      <div className="activity-icon" style={{ color }}>
        {icon}
      </div>
      <div className="activity-body">
        <div className="activity-main">
          <span className="activity-action">{description || `${action} ${entity_type}`}</span>
          {entity_name && (
            <span className="activity-entity">{entity_name}</span>
          )}
        </div>
        <div className="activity-time">{time}</div>

        {changes && Object.keys(changes).length > 0 && (
          <div className="activity-changes">
            <button
              className="activity-changes-toggle"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? '▼' : '▶'} {Object.keys(changes).length} change{Object.keys(changes).length !== 1 ? 's' : ''}
            </button>
            {expanded && (
              <div className="activity-changes-detail">
                {Object.entries(changes).map(([field, change]) => (
                  <div key={field} className="activity-change-item">
                    <span className="change-field">{formatFieldName(field)}:</span>
                    <span className="change-old">{formatValue(change.old)}</span>
                    <span className="change-arrow">→</span>
                    <span className="change-new">{formatValue(change.new)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Get icon and color for activity action type
 */
function getActivityMeta(action) {
  switch (action?.toLowerCase()) {
    case 'create':
    case 'created':
      return { icon: '✚', color: '#4ade80' };
    case 'update':
    case 'updated':
      return { icon: '✎', color: '#60a5fa' };
    case 'delete':
    case 'deleted':
      return { icon: '✕', color: '#f87171' };
    case 'restore':
    case 'restored':
      return { icon: '↺', color: '#fbbf24' };
    case 'archive':
    case 'archived':
      return { icon: '📦', color: '#94a3b8' };
    case 'complete':
    case 'completed':
      return { icon: '✓', color: '#4ade80' };
    case 'move':
    case 'moved':
      return { icon: '→', color: '#a78bfa' };
    case 'pin':
    case 'pinned':
      return { icon: '📌', color: '#f472b6' };
    default:
      return { icon: '•', color: 'var(--text-muted)' };
  }
}

/**
 * Format field name for display
 */
function formatFieldName(field) {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Format a value for display in activity log
 */
function formatValue(value) {
  if (value === null || value === undefined) return '(none)';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}