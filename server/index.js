require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const morgan = require('morgan');
const yaml = require('js-yaml');
const db = require('./database');
const logger = require('./logger');
const { requireAuth, csrfCheck } = require('./middleware/auth');
const { validate, projectSchema, projectUpdateSchema, taskSchema, taskUpdateSchema, tagSchema, noteSchema, subtaskSchema } = require('./validation');

const app = express();

const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS — restrict to allowed origins
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:3000'];

const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? allowedOrigins
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Body parsing with size limit
app.use(express.json({ limit: '1mb' }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api', apiLimiter);

// Request correlation IDs
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// HTTP request logging
app.use(morgan(':method :url :status :response-time ms', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));

// Error response helper — hides internals in production
function sendError(res, err, status = 500) {
  if (status === 500) logger.error('Server error', { error: err.message, stack: err.stack, requestId: res.req?.id });
  const message = status === 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : (err.message || String(err));
  res.status(status).json({ error: message });
}

// Session middleware
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  console.error('FATAL: SESSION_SECRET must be set in production');
  process.exit(1);
}
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

// CSRF check on state-changing requests
app.use('/api', csrfCheck);

// ============================================================
// Health (public)
// ============================================================

app.get('/api/health', (req, res) => {
  try {
    const userCount = db.getUserCount();
    const health = {
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
      needsSetup: userCount === 0,
    };
    if (process.env.NODE_ENV !== 'production') {
      health.uptime = Math.floor(process.uptime());
      health.memory = Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB';
    }
    res.json(health);
  } catch (err) {
    res.status(503).json({ status: 'degraded', database: 'error', timestamp: new Date().toISOString() });
  }
});

// ============================================================
// Auth endpoints (public)
// ============================================================

app.post('/api/auth/register', (req, res) => {
  try {
    const { username, password, displayName } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const existing = db.getUserByUsername(username);
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    const hash = bcrypt.hashSync(password, 10);
    const user = db.createUser(username, hash, displayName);
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    res.status(201).json({ id: user.id, username: user.username, displayName: user.display_name, role: user.role });
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    const user = db.getUserByUsername(username);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    db.updateLastLogin(user.id);
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    res.json({ id: user.id, username: user.username, displayName: user.display_name, role: user.role });
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return sendError(res, err);
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const user = db.getUserById(req.session.userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  res.json({ id: user.id, username: user.username, displayName: user.display_name, role: user.role });
});

// ============================================================
// Auth wall — all routes below require authentication
// ============================================================

app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth') || req.path === '/health') return next();
  requireAuth(req, res, next);
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
    sendError(res, err);
  }
});

app.get('/api/stats', (req, res) => {
  try {
    res.json(db.getStats());
  } catch (err) {
    sendError(res, err);
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
    sendError(res, err);
  }
});

// ============================================================
// Projects
// ============================================================

app.post('/api/projects', validate(projectSchema), (req, res) => {
  try {
    const { code, name, description, status } = req.body;
    if (!code || !name) return res.status(400).json({ error: 'code and name are required' });
    db.createProject({ code: code.toUpperCase(), name, description, status });
    db.logActivity({
      entityType: 'project',
      entityId: code.toUpperCase(),
      entityName: name,
      actionType: 'create',
      user: req.user?.username || 'System',
      description: `Created project "${name}"`,
    });
    res.status(201).json({ code: code.toUpperCase(), name });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Project code already exists' });
    }
    sendError(res, err);
  }
});

app.put('/api/projects/:code', validate(projectUpdateSchema), (req, res) => {
  try {
    const { code } = req.params;
    const data = req.body;
    const result = db.updateProject(code, data);
    if (!result || result.changes === 0) return res.status(404).json({ error: 'Project not found' });
    db.logActivity({
      entityType: 'project',
      entityId: code,
      entityName: data.name || code,
      actionType: 'update',
      user: req.user?.username || 'System',
      changes: data,
      description: `Updated project "${code}"`,
    });
    res.json({ ok: true });
  } catch (err) {
    sendError(res, err);
  }
});

app.put('/api/projects/:code/archive', (req, res) => {
  try {
    const { code } = req.params;
    const user = req.user?.username || 'System';
    const result = db.archiveProject(code);
    if (!result || result.changes === 0) return res.status(404).json({ error: 'Project not found' });
    db.logActivity({
      entityType: 'project',
      entityId: code,
      entityName: code,
      actionType: 'archive',
      user: req.user?.username || 'System',
      description: `Archived project "${code}"`,
    });
    res.json({ canUndo: true });
  } catch (err) {
    sendError(res, err);
  }
});

app.put('/api/projects/:code/restore', (req, res) => {
  try {
    const { code } = req.params;
    const { status } = req.body || {};
    const result = db.restoreProject(code, status);
    if (!result || result.changes === 0) return res.status(404).json({ error: 'Project not found' });
    db.logActivity({
      entityType: 'project',
      entityId: code,
      entityName: code,
      actionType: 'restore',
      user: req.user?.username || 'System',
      description: `Restored project "${code}"`,
    });
    res.json({ ok: true });
  } catch (err) {
    sendError(res, err);
  }
});

app.delete('/api/projects/:code', (req, res) => {
  try {
    const { code } = req.params;
    const user = req.user?.username || 'System';
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
    sendError(res, err);
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
    sendError(res, err);
  }
});

app.put('/api/tasks/bulk-move', (req, res) => {
  try {
    const { taskIds, projectCode } = req.body;
    if (!taskIds || !projectCode) return res.status(400).json({ error: 'taskIds and projectCode required' });
    const result = db.bulkMoveTasks(taskIds, projectCode, req.user?.username || 'System');
    res.json(result);
  } catch (err) {
    sendError(res, err);
  }
});

app.put('/api/tasks/reorder', (req, res) => {
  try {
    const { taskOrders } = req.body;
    if (!taskOrders) return res.status(400).json({ error: 'taskOrders required' });
    db.reorderAllTasks(taskOrders);
    res.json({ ok: true });
  } catch (err) {
    sendError(res, err);
  }
});

// Tasks by project
app.post('/api/projects/:projectCode/tasks', validate(taskSchema), (req, res) => {
  try {
    const { projectCode } = req.params;
    const taskData = req.body;
    if (!taskData.title) return res.status(400).json({ error: 'title is required' });
    const result = db.createTask(projectCode, taskData);
    if (!result) return res.status(404).json({ error: 'Project not found' });
    db.logActivity({
      entityType: 'task',
      entityId: String(result.taskId),
      entityName: taskData.title,
      actionType: 'create',
      user: req.user?.username || 'System',
      description: `Created task "${taskData.title}" in project ${projectCode}`,
    });
    res.status(201).json(result);
  } catch (err) {
    sendError(res, err);
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
    sendError(res, err);
  }
});

// Tasks by ID
app.put('/api/tasks/:id', validate(taskUpdateSchema), (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const result = db.updateTask(id, data, req.user?.username || 'System');
    if (!result) return res.status(404).json({ error: 'Task not found' });
    res.json({ ok: true });
  } catch (err) {
    sendError(res, err);
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const permanent = req.query.permanent === 'true';
    const user = req.user?.username || 'System';
    const result = db.deleteTask(id, permanent, user);
    if (!result) return res.status(404).json({ error: 'Task not found' });
    res.json(result);
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/tasks/:id/restore', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const user = req.user?.username || 'System';
    const result = db.restoreTask(id, user);
    if (!result) return res.status(404).json({ error: 'Task not found' });
    if (result.error) return res.status(400).json(result);
    res.json({ ok: true });
  } catch (err) {
    sendError(res, err);
  }
});

app.put('/api/tasks/:id/pin', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const user = req.user?.username || 'System';
    const result = db.togglePin(id, user);
    if (!result) return res.status(404).json({ error: 'Task not found' });
    res.json(result);
  } catch (err) {
    sendError(res, err);
  }
});

app.put('/api/tasks/:id/move', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { projectCode } = req.body;
    if (!projectCode) return res.status(400).json({ error: 'projectCode required' });
    const result = db.moveTask(id, projectCode, req.user?.username || 'System');
    if (!result) return res.status(404).json({ error: 'Task or project not found' });
    res.json(result);
  } catch (err) {
    sendError(res, err);
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
    sendError(res, err);
  }
});

app.get('/api/tasks/:id/activity', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const limit = parseInt(req.query.limit) || 20;
    const activities = db.getTaskActivity(id, limit);
    res.json({ activities });
  } catch (err) {
    sendError(res, err);
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
    sendError(res, err);
  }
});

app.post('/api/tasks/:id/subtasks/bulk', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { subtasks } = req.body;
    if (!subtasks) return res.status(400).json({ error: 'subtasks required' });
    const result = db.bulkCreateSubtasks(id, subtasks, req.user?.username || 'System');
    res.status(201).json({ subtasks: result });
  } catch (err) {
    sendError(res, err);
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
    sendError(res, err);
  }
});

app.post('/api/tasks/:id/subtasks', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    const subtask = db.createSubtask(id, title, req.user?.username || 'System');
    res.status(201).json({ subtask });
  } catch (err) {
    sendError(res, err);
  }
});

app.put('/api/tasks/:taskId/subtasks/:subtaskId', (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const subtaskId = parseInt(req.params.subtaskId);
    const data = req.body;
    const result = db.updateSubtask(taskId, subtaskId, data, req.user?.username || 'System');
    if (!result) return res.status(404).json({ error: 'Subtask not found' });
    res.json({ subtask: result });
  } catch (err) {
    sendError(res, err);
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
    sendError(res, err);
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
    sendError(res, err);
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
    sendError(res, err);
  }
});

app.post('/api/tasks/:id/notes', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });
    const note = db.createNote(id, content, req.user?.username || 'System');
    res.status(201).json({ note });
  } catch (err) {
    sendError(res, err);
  }
});

app.put('/api/tasks/:taskId/notes/:noteId', (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const noteId = parseInt(req.params.noteId);
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });
    const note = db.updateNote(taskId, noteId, content, req.user?.username || 'System');
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json({ note });
  } catch (err) {
    sendError(res, err);
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
    sendError(res, err);
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
    sendError(res, err);
  }
});

app.get('/api/pomodoro/stats/today', (req, res) => {
  try {
    res.json(db.getTodayStats());
  } catch (err) {
    sendError(res, err);
  }
});

app.get('/api/pomodoro/sessions', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const sessions = db.getRecentSessions(limit);
    res.json({ sessions });
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/pomodoro/start', (req, res) => {
  try {
    const { taskId, durationMinutes } = req.body;
    const result = db.startSession(taskId || null, durationMinutes || 25);
    if (result.error) return res.status(409).json(result);
    res.status(201).json({ session: result });
  } catch (err) {
    sendError(res, err);
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
    sendError(res, err);
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
    sendError(res, err);
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
    sendError(res, err);
  }
});

app.get('/api/tasks/:id/pomodoro', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    res.json(db.getTaskPomodoro(id));
  } catch (err) {
    sendError(res, err);
  }
});

// ============================================================
// Tags — specific routes BEFORE /:id
// ============================================================

app.get('/api/tags/context', (req, res) => {
  try {
    res.json({ tags: db.getContextTags() });
  } catch (err) {
    sendError(res, err);
  }
});

app.get('/api/tags/regular', (req, res) => {
  try {
    res.json({ tags: db.getRegularTags() });
  } catch (err) {
    sendError(res, err);
  }
});

app.get('/api/tags', (req, res) => {
  try {
    res.json({ tags: db.getAllTags() });
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/tags', validate(tagSchema), (req, res) => {
  try {
    const { name, color, isContext } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const result = db.createTag({ name, color, isContext });
    res.status(201).json({ id: result.lastInsertRowid, name, color });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Tag name already exists' });
    }
    sendError(res, err);
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
    sendError(res, err);
  }
});

app.delete('/api/tags/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = db.deleteTag(id);
    if (!result || result.changes === 0) return res.status(404).json({ error: 'Tag not found' });
    res.json({ ok: true });
  } catch (err) {
    sendError(res, err);
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
    sendError(res, err);
  }
});

app.get('/api/task-templates', (req, res) => {
  try {
    res.json({ templates: db.getTemplates() });
  } catch (err) {
    sendError(res, err);
  }
});

app.get('/api/task-templates/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const template = db.getTemplate(id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json({ template });
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/task-templates', (req, res) => {
  try {
    const { name, ...data } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const template = db.createTemplate({ name, ...data });
    res.status(201).json({ template });
  } catch (err) {
    sendError(res, err);
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
    sendError(res, err);
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
    sendError(res, err);
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
    sendError(res, err);
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
    sendError(res, err);
  }
});

// ============================================================
// Global error handler
// ============================================================

app.use((err, req, res, next) => {
  sendError(res, err);
});

// ============================================================
// Production static file serving
// ============================================================
const path = require('path');
const buildPath = path.join(__dirname, '..', 'client', 'build');
app.use(express.static(buildPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

// ============================================================
// Start
// ============================================================

if (require.main === module) {
  const server = app.listen(PORT, () => {
    logger.info(`Task Dashboard server running on port ${PORT}`);
  });

  // Graceful shutdown
  function shutdown(signal) {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      db.close();
      logger.info('Server closed.');
      process.exit(0);
    });
    setTimeout(() => { process.exit(1); }, 10000);
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;
