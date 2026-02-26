const express = require('express');
const cors = require('cors');
const yaml = require('js-yaml');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

// ============================================================
// Health
// ============================================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
});

// ============================================================
// Read endpoints
// ============================================================

app.get('/api/tasks', (req, res) => {
  try {
    const projects = db.getAllProjectsWithTasks();
    const tags = db.getAllTags();
    res.json({ projects, tags, lastUpdated: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    res.json(db.getStats());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/summary', (req, res) => {
  try {
    const data = db.getSummaryData();
    const generatedAt = new Date().toISOString();

    const overdueCount = data.overdue.length;
    const totalActive = data.projectBreakdown.reduce((sum, p) => {
      const counts = p.statusCounts;
      return sum + (counts['PENDING'] || 0) + (counts['INPROGRESS'] || 0);
    }, 0);
    const overdueRatio = totalActive > 0 ? overdueCount / totalActive : 0;
    const healthStatus = overdueRatio === 0 ? '🟢 Healthy' : overdueRatio < 0.2 ? '🟡 Attention Needed' : '🔴 Critical';

    const lines = [];
    lines.push(`# Task Dashboard Summary`);
    lines.push(`*Generated: ${new Date(generatedAt).toLocaleString()}*`);
    lines.push('');
    lines.push(`**Health Status:** ${healthStatus}`);
    lines.push('');

    // Overdue
    lines.push('## ⚠️ Overdue Tasks');
    if (data.overdue.length === 0) {
      lines.push('*No overdue tasks. Great work!*');
    } else {
      data.overdue.forEach((t) => {
        const daysAgo = Math.floor((Date.now() - new Date(t.due_date).getTime()) / 86400000);
        lines.push(`- **${t.title}** (${t.project_name}) — ${daysAgo} day${daysAgo !== 1 ? 's' : ''} overdue`);
      });
    }
    lines.push('');

    // Upcoming
    lines.push('## 📅 Upcoming Deadlines (Next 7 Days)');
    if (data.upcoming.length === 0) {
      lines.push('*No upcoming deadlines this week.*');
    } else {
      data.upcoming.forEach((t) => {
        lines.push(`- **${t.title}** (${t.project_name}) — due ${t.due_date}`);
      });
    }
    lines.push('');

    // High priority
    lines.push('## 🔥 High Priority Tasks');
    if (data.highPriority.length === 0) {
      lines.push('*No high priority tasks.*');
    } else {
      data.highPriority.forEach((t) => {
        const due = t.due_date ? ` — due ${t.due_date}` : '';
        lines.push(`- **${t.title}** (${t.project_name})${due}`);
      });
    }
    lines.push('');

    // Blockers
    lines.push('## 🚧 Potential Blockers');
    if (data.blockers.length === 0) {
      lines.push('*No potential blockers detected.*');
    } else {
      data.blockers.forEach((t) => {
        lines.push(`- **${t.title}** (${t.project_name})`);
      });
    }
    lines.push('');

    // Subtask progress
    lines.push('## ✅ Subtask Progress');
    if (data.tasksWithSubtasks.length === 0) {
      lines.push('*No tasks with incomplete subtasks.*');
    } else {
      data.tasksWithSubtasks.forEach((t) => {
        const pct = Math.round((t.completed / t.total) * 100);
        lines.push(`- **${t.title}** (${t.project_name}) — ${t.completed}/${t.total} (${pct}%)`);
      });
    }
    lines.push('');

    // Project breakdown
    lines.push('## 📊 Project Breakdown');
    data.projectBreakdown.forEach((p) => {
      const counts = p.statusCounts;
      const total = Object.values(counts).reduce((s, c) => s + c, 0);
      if (total === 0) return;
      const done = (counts['COMPLETED'] || 0) + (counts['DONE'] || 0);
      const inProgress = counts['INPROGRESS'] || 0;
      const pending = counts['PENDING'] || 0;
      lines.push(`- **${p.name}** (${p.code}): ${done} done, ${inProgress} in progress, ${pending} pending`);
    });

    res.json({ summary: lines.join('\n'), generatedAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Projects
// ============================================================

app.post('/api/projects', (req, res) => {
  try {
    const { code, name, description, status, user } = req.body;
    if (!code || !name) return res.status(400).json({ error: 'code and name are required' });
    db.createProject({ code: code.toUpperCase(), name, description, status });
    db.logActivity({
      entityType: 'project',
      entityId: code.toUpperCase(),
      entityName: name,
      actionType: 'create',
      user: user || 'System',
      description: `Created project "${name}"`,
    });
    res.status(201).json({ code: code.toUpperCase(), name });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Project code already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/projects/:code', (req, res) => {
  try {
    const { code } = req.params;
    const { user, ...data } = req.body;
    const result = db.updateProject(code, data);
    if (!result || result.changes === 0) return res.status(404).json({ error: 'Project not found' });
    db.logActivity({
      entityType: 'project',
      entityId: code,
      entityName: data.name || code,
      actionType: 'update',
      user: user || 'System',
      changes: data,
      description: `Updated project "${code}"`,
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/projects/:code/archive', (req, res) => {
  try {
    const { code } = req.params;
    const { user } = req.body || {};
    const result = db.archiveProject(code);
    if (!result || result.changes === 0) return res.status(404).json({ error: 'Project not found' });
    db.logActivity({
      entityType: 'project',
      entityId: code,
      entityName: code,
      actionType: 'archive',
      user: user || 'System',
      description: `Archived project "${code}"`,
    });
    res.json({ canUndo: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/projects/:code/restore', (req, res) => {
  try {
    const { code } = req.params;
    const { status, user } = req.body || {};
    const result = db.restoreProject(code, status);
    if (!result || result.changes === 0) return res.status(404).json({ error: 'Project not found' });
    db.logActivity({
      entityType: 'project',
      entityId: code,
      entityName: code,
      actionType: 'restore',
      user: user || 'System',
      description: `Restored project "${code}"`,
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/projects/:code', (req, res) => {
  try {
    const { code } = req.params;
    const user = req.query.user || 'System';
    const result = db.deleteProject(code);
    if (!result || result.changes === 0) return res.status(404).json({ error: 'Project not found' });
    db.logActivity({
      entityType: 'project',
      entityId: code,
      entityName: code,
      actionType: 'delete',
      user,
      description: `Deleted project "${code}"`,
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Tasks — specific routes BEFORE /:id
// ============================================================

app.get('/api/tasks/deleted', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const tasks = db.getDeletedTasks(limit);
    res.json({ tasks, count: tasks.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/bulk-move', (req, res) => {
  try {
    const { taskIds, projectCode, user } = req.body;
    if (!taskIds || !projectCode) return res.status(400).json({ error: 'taskIds and projectCode required' });
    const result = db.bulkMoveTasks(taskIds, projectCode, user || 'System');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/reorder', (req, res) => {
  try {
    const { taskOrders } = req.body;
    if (!taskOrders) return res.status(400).json({ error: 'taskOrders required' });
    db.reorderAllTasks(taskOrders);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tasks by project
app.post('/api/projects/:projectCode/tasks', (req, res) => {
  try {
    const { projectCode } = req.params;
    const { user, ...taskData } = req.body;
    if (!taskData.title) return res.status(400).json({ error: 'title is required' });
    const result = db.createTask(projectCode, taskData);
    if (!result) return res.status(404).json({ error: 'Project not found' });
    db.logActivity({
      entityType: 'task',
      entityId: String(result.taskId),
      entityName: taskData.title,
      actionType: 'create',
      user: user || 'System',
      description: `Created task "${taskData.title}" in project ${projectCode}`,
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/projects/:projectCode/tasks/reorder', (req, res) => {
  try {
    const { projectCode } = req.params;
    const { taskOrders } = req.body;
    if (!taskOrders) return res.status(400).json({ error: 'taskOrders required' });
    db.reorderTasks(projectCode, taskOrders);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tasks by ID
app.put('/api/tasks/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { user, ...data } = req.body;
    const result = db.updateTask(id, data, user || 'System');
    if (!result) return res.status(404).json({ error: 'Task not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const permanent = req.query.permanent === 'true';
    const user = req.query.user || 'System';
    const result = db.deleteTask(id, permanent, user);
    if (!result) return res.status(404).json({ error: 'Task not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks/:id/restore', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { user } = req.body || {};
    const result = db.restoreTask(id, user || 'System');
    if (!result) return res.status(404).json({ error: 'Task not found' });
    if (result.error) return res.status(400).json(result);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:id/pin', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { user } = req.body || {};
    const result = db.togglePin(id, user || 'System');
    if (!result) return res.status(404).json({ error: 'Task not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:id/move', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { projectCode, user } = req.body;
    if (!projectCode) return res.status(400).json({ error: 'projectCode required' });
    const result = db.moveTask(id, projectCode, user || 'System');
    if (!result) return res.status(404).json({ error: 'Task or project not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:id/tags', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { tagIds } = req.body;
    if (!Array.isArray(tagIds)) return res.status(400).json({ error: 'tagIds must be an array' });
    const tags = db.setTaskTags(id, tagIds);
    res.json({ tags });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tasks/:id/activity', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const limit = parseInt(req.query.limit) || 20;
    const activities = db.getTaskActivity(id, limit);
    res.json({ activities });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Subtasks — specific routes BEFORE /:subtaskId
// ============================================================

app.get('/api/tasks/:id/subtasks', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = db.getSubtasks(id);
    res.json({ taskId: id, subtasks: result.subtasks, stats: result.stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks/:id/subtasks/bulk', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { subtasks, user } = req.body;
    if (!subtasks) return res.status(400).json({ error: 'subtasks required' });
    const result = db.bulkCreateSubtasks(id, subtasks, user || 'System');
    res.status(201).json({ subtasks: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:id/subtasks/reorder', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { subtaskOrders } = req.body;
    if (!subtaskOrders) return res.status(400).json({ error: 'subtaskOrders required' });
    db.reorderSubtasks(id, subtaskOrders);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks/:id/subtasks', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, user } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    const subtask = db.createSubtask(id, title, user || 'System');
    res.status(201).json({ subtask });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:taskId/subtasks/:subtaskId', (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const subtaskId = parseInt(req.params.subtaskId);
    const { user, ...data } = req.body;
    const result = db.updateSubtask(taskId, subtaskId, data, user || 'System');
    if (!result) return res.status(404).json({ error: 'Subtask not found' });
    res.json({ subtask: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks/:taskId/subtasks/:subtaskId/toggle', (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const subtaskId = parseInt(req.params.subtaskId);
    const result = db.toggleSubtask(taskId, subtaskId);
    if (!result) return res.status(404).json({ error: 'Subtask not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:taskId/subtasks/:subtaskId', (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const subtaskId = parseInt(req.params.subtaskId);
    const result = db.deleteSubtask(taskId, subtaskId);
    if (!result) return res.status(404).json({ error: 'Subtask not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Notes
// ============================================================

app.get('/api/tasks/:id/notes', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    res.json(db.getTaskNotes(id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks/:id/notes', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { content, user } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });
    const note = db.createNote(id, content, user || 'System');
    res.status(201).json({ note });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:taskId/notes/:noteId', (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const noteId = parseInt(req.params.noteId);
    const { content, user } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });
    const note = db.updateNote(taskId, noteId, content, user || 'System');
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json({ note });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:taskId/notes/:noteId', (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const noteId = parseInt(req.params.noteId);
    const result = db.deleteNote(taskId, noteId);
    if (!result) return res.status(404).json({ error: 'Note not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Pomodoro — specific routes BEFORE /:id
// ============================================================

app.get('/api/pomodoro/active', (req, res) => {
  try {
    const session = db.getActiveSession();
    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pomodoro/stats/today', (req, res) => {
  try {
    res.json(db.getTodayStats());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/pomodoro/sessions', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const sessions = db.getRecentSessions(limit);
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pomodoro/start', (req, res) => {
  try {
    const { taskId, durationMinutes } = req.body;
    const result = db.startSession(taskId || null, durationMinutes || 25);
    if (result.error) return res.status(409).json(result);
    res.status(201).json({ session: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pomodoro/:id/complete', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { notes } = req.body || {};
    const result = db.completeSession(id, notes);
    if (!result) return res.status(404).json({ error: 'Session not found' });
    if (result.error) return res.status(400).json(result);
    res.json({ session: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pomodoro/:id/cancel', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = db.cancelSession(id);
    if (!result) return res.status(404).json({ error: 'Session not found' });
    if (result.error) return res.status(400).json(result);
    res.json({ session: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/pomodoro/:id/task', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { taskId } = req.body;
    const result = db.updateSessionTask(id, taskId);
    if (!result || result.changes === 0) return res.status(404).json({ error: 'Session not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tasks/:id/pomodoro', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    res.json(db.getTaskPomodoro(id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Tags — specific routes BEFORE /:id
// ============================================================

app.get('/api/tags/context', (req, res) => {
  try {
    res.json({ tags: db.getContextTags() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tags/regular', (req, res) => {
  try {
    res.json({ tags: db.getRegularTags() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tags', (req, res) => {
  try {
    res.json({ tags: db.getAllTags() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tags', (req, res) => {
  try {
    const { name, color, isContext } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const result = db.createTag({ name, color, isContext });
    res.status(201).json({ id: result.lastInsertRowid, name, color });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Tag name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tags/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, color } = req.body;
    const result = db.updateTag(id, { name, color });
    if (!result || result.changes === 0) return res.status(404).json({ error: 'Tag not found' });
    res.json({ ok: true });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Tag name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tags/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = db.deleteTag(id);
    if (!result || result.changes === 0) return res.status(404).json({ error: 'Tag not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Templates — specific routes BEFORE /:id
// ============================================================

app.post('/api/task-templates/from-task/:taskId', (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const template = db.createTemplateFromTask(taskId, name);
    if (!template) return res.status(404).json({ error: 'Task not found' });
    res.status(201).json({ template });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/task-templates', (req, res) => {
  try {
    res.json({ templates: db.getTemplates() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/task-templates/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const template = db.getTemplate(id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json({ template });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/task-templates', (req, res) => {
  try {
    const { name, ...data } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const template = db.createTemplate({ name, ...data });
    res.status(201).json({ template });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/task-templates/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = db.updateTemplate(id, req.body);
    if (!result) return res.status(404).json({ error: 'Template not found' });
    if (result.error) return res.status(403).json(result);
    res.json({ template: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/task-templates/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = db.deleteTemplate(id);
    if (!result) return res.status(404).json({ error: 'Template not found' });
    if (result.error) return res.status(403).json(result);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Activity
// ============================================================

app.get('/api/activity', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const { entityType, entityId } = req.query;
    res.json(db.getActivity({ limit, offset, entityType, entityId }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// YAML Export
// ============================================================

app.get('/api/yaml', (req, res) => {
  try {
    const data = db.getYamlExport();
    const content = yaml.dump(data.projects, { lineWidth: -1, noRefs: true });
    res.json({ content, lastModified: data.lastModified });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Start
// ============================================================

app.listen(PORT, () => {
  console.log(`Task Dashboard server running on port ${PORT}`);
});
