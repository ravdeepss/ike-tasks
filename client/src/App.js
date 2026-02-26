import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './App.css';
import useTheme from './hooks/useTheme';
import useFaviconBadge from './hooks/useFaviconBadge';
import Dashboard from './components/Dashboard';
import UndoToast from './components/UndoToast';

export default function App() {
  const [projects, setProjects] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { theme, toggleTheme } = useTheme();

  // Count overdue + due-today tasks for favicon badge
  const urgentCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let count = 0;
    for (const project of projects) {
      for (const task of project.tasks || []) {
        if (!task.due_date) continue;
        if (task.status === 'COMPLETED' || task.status === 'CANCELLED') continue;
        const due = new Date(task.due_date);
        due.setHours(0, 0, 0, 0);
        if (due <= today) count++;
      }
    }
    return count;
  }, [projects]);

  useFaviconBadge(urgentCount);

  const fetchTasks = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/tasks');
      if (!res.ok) throw new Error(`Server error: ${res.status} ${res.statusText}`);
      const data = await res.json();
      setProjects(data.projects || []);
      setTags(data.tags || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading Task Dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Failed to Connect</h2>
        <p>{error}</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Make sure the server is running on port 3001.
        </p>
        <button className="retry-btn" onClick={fetchTasks}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <UndoToast>
      <Dashboard
        projects={projects}
        tags={tags}
        onRefresh={fetchTasks}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    </UndoToast>
  );
}
