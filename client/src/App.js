import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './App.css';
import useTheme from './hooks/useTheme';
import useAuth from './hooks/useAuth';
import useFaviconBadge from './hooks/useFaviconBadge';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';
import ErrorBoundary from './components/ErrorBoundary';
import UndoToast from './components/UndoToast';

export default function App() {
  const [projects, setProjects] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const auth = useAuth();

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
      const res = await fetch('/api/tasks', { credentials: 'include' });
      if (res.status === 401) return; // Not authenticated, handled by auth
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

  // Check if this is a fresh install (no users yet)
  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(data => {
        if (data.needsSetup) setNeedsSetup(true);
      })
      .catch(() => {});
  }, []);

  // Fetch tasks when user is authenticated
  useEffect(() => {
    if (auth.user) {
      fetchTasks();
    } else {
      setLoading(false);
    }
  }, [auth.user, fetchTasks]);

  // Show loading while checking auth
  if (auth.loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading Task Dashboard…</p>
      </div>
    );
  }

  // Show login if not authenticated
  if (!auth.user) {
    return (
      <LoginPage
        onLogin={auth.login}
        onRegister={auth.register}
        error={auth.error}
        onClearError={auth.clearError}
        needsSetup={needsSetup}
      />
    );
  }

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
    <ErrorBoundary>
      <UndoToast>
        <Dashboard
          projects={projects}
          tags={tags}
          onRefresh={fetchTasks}
          theme={theme}
          onToggleTheme={toggleTheme}
          user={auth.user}
          onLogout={auth.logout}
        />
      </UndoToast>
    </ErrorBoundary>
  );
}
