const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'tasks.db');
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// ============================================================
// Schema creation
// ============================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_code TEXT NOT NULL,
    task_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    due_date TEXT,
    created_on TEXT,
    assigned_to TEXT,
    status TEXT DEFAULT 'PENDING',
    comments TEXT,
    priority TEXT,
    quadrant TEXT,
    progress INTEGER DEFAULT 0,
    deleted_at TEXT,
    pinned INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (project_code) REFERENCES projects(code) ON DELETE CASCADE,
    UNIQUE (project_code, task_number)
  );

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#38bdf8',
    is_context INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS task_tags (
    task_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (task_id, tag_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    is_completed INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS task_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS task_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '📋',
    title TEXT NOT NULL,
    priority TEXT,
    quadrant TEXT,
    estimated_duration TEXT,
    default_tags TEXT,
    comments TEXT,
    is_builtin INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    entity_name TEXT,
    action_type TEXT NOT NULL,
    user TEXT DEFAULT 'System',
    changes TEXT,
    description TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    duration_minutes INTEGER NOT NULL DEFAULT 25,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    notes TEXT,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
  );
`);

// ============================================================
// Indexes
// ============================================================

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_code);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
  CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

  CREATE INDEX IF NOT EXISTS idx_task_tags_task ON task_tags(task_id);
  CREATE INDEX IF NOT EXISTS idx_task_tags_tag ON task_tags(tag_id);

  CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);
  CREATE INDEX IF NOT EXISTS idx_subtasks_sort ON subtasks(task_id, sort_order);

  CREATE INDEX IF NOT EXISTS idx_task_notes_task ON task_notes(task_id);
  CREATE INDEX IF NOT EXISTS idx_task_notes_created ON task_notes(created_at);

  CREATE INDEX IF NOT EXISTS idx_task_templates_sort ON task_templates(sort_order, name);

  CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_log(timestamp);
  CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log(entity_type, entity_id);
  CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_log(action_type);

  CREATE INDEX IF NOT EXISTS idx_pomodoro_task ON pomodoro_sessions(task_id);
  CREATE INDEX IF NOT EXISTS idx_pomodoro_status ON pomodoro_sessions(status);
  CREATE INDEX IF NOT EXISTS idx_pomodoro_started ON pomodoro_sessions(started_at);

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    role TEXT DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now')),
    last_login TEXT
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
`);

// ============================================================
// Seed data
// ============================================================

const tagCount = db.prepare('SELECT COUNT(*) as c FROM tags').get().c;
if (tagCount === 0) {
  const insertTag = db.prepare(
    'INSERT INTO tags (name, color, is_context, sort_order) VALUES (?, ?, 1, ?)'
  );
  const contextTags = [
    { name: '@computer', color: '#3b82f6' },
    { name: '@calls',    color: '#22c55e' },
    { name: '@email',    color: '#8b5cf6' },
    { name: '@errands',  color: '#f97316' },
    { name: '@home',     color: '#ec4899' },
    { name: '@office',   color: '#06b6d4' },
    { name: '@waiting',  color: '#eab308' },
    { name: '@read',     color: '#64748b' },
    { name: '@focus',    color: '#ef4444' },
    { name: '@quick',    color: '#14b8a6' },
  ];
  const seedTags = db.transaction(() => {
    contextTags.forEach((tag, i) => insertTag.run(tag.name, tag.color, i));
  });
  seedTags();
}

const templateCount = db.prepare('SELECT COUNT(*) as c FROM task_templates').get().c;
if (templateCount === 0) {
  const insertTemplate = db.prepare(`
    INSERT INTO task_templates (name, description, icon, title, priority, quadrant, estimated_duration, comments, is_builtin, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);
  const builtinTemplates = [
    {
      name: 'Quick Task',
      description: 'A simple task with no extra overhead',
      icon: '⚡',
      title: 'Quick Task: ',
      priority: 'MEDIUM',
      quadrant: 'DO FIRST',
      estimated_duration: '15min',
      comments: '',
      sort_order: 0,
    },
    {
      name: 'Code Review',
      description: 'Review a pull request or code change',
      icon: '🔍',
      title: 'Code Review: ',
      priority: 'HIGH',
      quadrant: 'DO FIRST',
      estimated_duration: '30min',
      comments: '## Code Review Checklist\n- [ ] Functionality correct\n- [ ] Tests pass\n- [ ] Code style consistent\n- [ ] No security issues\n- [ ] Documentation updated',
      sort_order: 1,
    },
    {
      name: 'Bug Investigation',
      description: 'Investigate and fix a reported bug',
      icon: '🐛',
      title: 'Bug: ',
      priority: 'HIGH',
      quadrant: 'DO FIRST',
      estimated_duration: '1hr',
      comments: '## Bug Investigation\n**Description:**\n\n**Steps to Reproduce:**\n1. \n\n**Expected Behavior:**\n\n**Actual Behavior:**\n\n**Root Cause:**\n\n**Fix:**',
      sort_order: 2,
    },
    {
      name: 'Meeting Follow-up',
      description: 'Action items from a meeting',
      icon: '📝',
      title: 'Follow-up: ',
      priority: 'MEDIUM',
      quadrant: 'SCHEDULE',
      estimated_duration: '30min',
      comments: '## Meeting Follow-up\n**Meeting:**\n**Date:**\n\n## Action Items\n- [ ] \n- [ ] \n\n## Notes',
      sort_order: 3,
    },
    {
      name: 'Research Task',
      description: 'Research and summarize a topic',
      icon: '🔬',
      title: 'Research: ',
      priority: 'MEDIUM',
      quadrant: 'SCHEDULE',
      estimated_duration: '2hr',
      comments: '## Research Task\n**Topic:**\n\n**Goal:**\n\n## Resources\n- \n\n## Findings\n\n## Conclusions',
      sort_order: 4,
    },
    {
      name: 'Documentation',
      description: 'Write or update documentation',
      icon: '📚',
      title: 'Docs: ',
      priority: 'LOW',
      quadrant: 'SCHEDULE',
      estimated_duration: '1hr',
      comments: '## Documentation\n**Topic:**\n\n**Audience:**\n\n## Outline\n1. \n2. \n3.',
      sort_order: 5,
    },
    {
      name: 'Deployment Task',
      description: 'Deploy an application or service',
      icon: '🚀',
      title: 'Deploy: ',
      priority: 'HIGH',
      quadrant: 'DO FIRST',
      estimated_duration: '1hr',
      comments: '## Deployment Checklist\n- [ ] Tests passing\n- [ ] Build successful\n- [ ] Staging verified\n- [ ] Rollback plan ready\n- [ ] Stakeholders notified\n- [ ] Monitor after deploy',
      sort_order: 6,
    },
    {
      name: 'Waiting For',
      description: 'Track something you are waiting on',
      icon: '⏳',
      title: 'Waiting for: ',
      priority: 'LOW',
      quadrant: 'DELEGATE',
      estimated_duration: null,
      comments: '## Waiting For\n**From:**\n**What:**\n**By when:**\n\n**Follow-up date:**',
      sort_order: 7,
    },
  ];
  const seedTemplates = db.transaction(() => {
    builtinTemplates.forEach((t) => {
      insertTemplate.run(
        t.name, t.description, t.icon, t.title, t.priority,
        t.quadrant, t.estimated_duration, t.comments, t.sort_order
      );
    });
  });
  seedTemplates();
}

// ============================================================
// Helper
// ============================================================

function getTagsForTask(taskId) {
  return db.prepare(`
    SELECT t.id, t.name, t.color, t.is_context
    FROM tags t
    JOIN task_tags tt ON tt.tag_id = t.id
    WHERE tt.task_id = ?
    ORDER BY t.is_context DESC, t.sort_order ASC
  `).all(taskId);
}

// ============================================================
// Projects
// ============================================================

function getAllProjectsWithTasks() {
  const projects = db.prepare(`
    SELECT code, name, description, status FROM projects ORDER BY
      CASE status WHEN 'In Progress' THEN 0 WHEN 'Completed' THEN 1 ELSE 2 END, name
  `).all();

  const taskStmt = db.prepare(`
    SELECT id, project_code, task_number, title, due_date, created_on, assigned_to,
           status, comments, priority, quadrant, progress, pinned, sort_order, deleted_at
    FROM tasks
    WHERE project_code = ? AND deleted_at IS NULL
    ORDER BY pinned DESC, sort_order ASC, id ASC
  `);

  const noteCountStmt = db.prepare(
    'SELECT COUNT(*) as c FROM task_notes WHERE task_id = ?'
  );
  const subtaskStmt = db.prepare(`
    SELECT COUNT(*) as total,
           SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed
    FROM subtasks WHERE task_id = ?
  `);

  return projects.map((p) => {
    const rawTasks = taskStmt.all(p.code);
    const tasks = rawTasks.map((t) => {
      const stats = subtaskStmt.get(t.id);
      return {
        id: t.id,
        taskNumber: t.task_number,
        title: t.title,
        dueDate: t.due_date,
        createdOn: t.created_on,
        assignedTo: t.assigned_to,
        status: t.status,
        comments: t.comments,
        priority: t.priority,
        quadrant: t.quadrant,
        progress: t.progress,
        pinned: t.pinned === 1,
        sortOrder: t.sort_order,
        tags: getTagsForTask(t.id),
        noteCount: noteCountStmt.get(t.id).c,
        subtaskStats: { total: stats.total || 0, completed: stats.completed || 0 },
      };
    });
    return { code: p.code, name: p.name, description: p.description, status: p.status, tasks };
  });
}

function createProject({ code, name, description, status }) {
  return db.prepare(
    'INSERT INTO projects (code, name, description, status) VALUES (?, ?, ?, ?)'
  ).run(code, name, description || null, status || 'In Progress');
}

function updateProject(code, { name, description, status }) {
  const sets = [];
  const params = [];
  if (name !== undefined) { sets.push('name = ?'); params.push(name); }
  if (description !== undefined) { sets.push('description = ?'); params.push(description); }
  if (status !== undefined) { sets.push('status = ?'); params.push(status); }
  if (sets.length === 0) return null;
  params.push(code);
  return db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE code = ?`).run(...params);
}

function archiveProject(code) {
  return db.prepare("UPDATE projects SET status = 'Archived' WHERE code = ?").run(code);
}

function restoreProject(code, status) {
  return db.prepare('UPDATE projects SET status = ? WHERE code = ?').run(status || 'In Progress', code);
}

function deleteProject(code) {
  return db.prepare('DELETE FROM projects WHERE code = ?').run(code);
}

// ============================================================
// Tasks
// ============================================================

function createTask(projectCode, { title, dueDate, assignedTo, status, comments, priority, quadrant, progress }) {
  const maxRow = db.prepare(
    'SELECT COALESCE(MAX(task_number), 0) as max FROM tasks WHERE project_code = ?'
  ).get(projectCode);
  const taskNumber = maxRow.max + 1;

  const maxOrder = db.prepare(
    'SELECT COALESCE(MAX(sort_order), 0) as max FROM tasks WHERE project_code = ?'
  ).get(projectCode);
  const sortOrder = maxOrder.max + 1;

  const resolvedStatus = status || 'PENDING';
  const resolvedProgress = (['COMPLETED', 'DONE'].includes(resolvedStatus)) ? 100 : (progress || 0);

  const result = db.prepare(`
    INSERT INTO tasks (project_code, task_number, title, due_date, created_on, assigned_to, status, comments, priority, quadrant, progress, sort_order)
    VALUES (?, ?, ?, ?, date('now'), ?, ?, ?, ?, ?, ?, ?)
  `).run(projectCode, taskNumber, title, dueDate || null, assignedTo || null, resolvedStatus, comments || null, priority || null, quadrant || null, resolvedProgress, sortOrder);

  return { taskId: result.lastInsertRowid, taskNumber };
}

function updateTask(id, data, user = 'System') {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!existing) return null;

  const fields = ['title', 'due_date', 'assigned_to', 'status', 'comments', 'priority', 'quadrant', 'progress', 'pinned'];
  const dataMap = {
    title: data.title,
    due_date: data.dueDate,
    assigned_to: data.assignedTo,
    status: data.status,
    comments: data.comments,
    priority: data.priority,
    quadrant: data.quadrant,
    progress: data.progress,
    pinned: data.pinned !== undefined ? (data.pinned ? 1 : 0) : undefined,
  };

  const sets = [];
  const params = [];
  const changes = {};

  for (const field of fields) {
    if (dataMap[field] !== undefined) {
      const oldVal = existing[field];
      const newVal = dataMap[field];
      if (String(oldVal) !== String(newVal)) {
        changes[field] = { old: oldVal, new: newVal };
      }
      sets.push(`${field} = ?`);
      params.push(newVal);
    }
  }

  // Auto-set progress=100 for completed/done status
  if (data.status && ['COMPLETED', 'DONE'].includes(data.status)) {
    if (!sets.includes('progress = ?')) {
      sets.push('progress = ?');
      params.push(100);
      changes['progress'] = { old: existing.progress, new: 100 };
    } else {
      const idx = sets.indexOf('progress = ?');
      params[idx] = 100;
    }
  }

  if (sets.length === 0) return existing;

  params.push(id);
  db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...params);

  if (Object.keys(changes).length > 0) {
    logActivity({
      entityType: 'task',
      entityId: String(id),
      entityName: existing.title,
      actionType: data.status && changes.status ? 'status_change' : 'update',
      user,
      changes,
      description: `Updated task "${existing.title}"`,
    });
  }

  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
}

function deleteTask(id, permanent = false, user = 'System') {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task) return null;

  if (permanent) {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    logActivity({
      entityType: 'task',
      entityId: String(id),
      entityName: task.title,
      actionType: 'delete',
      user,
      description: `Permanently deleted task "${task.title}"`,
    });
    return { canUndo: false };
  } else {
    const deletedAt = new Date().toISOString();
    db.prepare('UPDATE tasks SET deleted_at = ? WHERE id = ?').run(deletedAt, id);
    logActivity({
      entityType: 'task',
      entityId: String(id),
      entityName: task.title,
      actionType: 'delete',
      user,
      description: `Soft-deleted task "${task.title}"`,
    });
    return { canUndo: true };
  }
}

function restoreTask(id, user = 'System') {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task) return null;
  if (!task.deleted_at) return { error: 'not deleted' };
  db.prepare('UPDATE tasks SET deleted_at = NULL WHERE id = ?').run(id);
  logActivity({
    entityType: 'task',
    entityId: String(id),
    entityName: task.title,
    actionType: 'restore',
    user,
    description: `Restored task "${task.title}"`,
  });
  return task;
}

function togglePin(id, user = 'System') {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task) return null;
  const newPinned = task.pinned === 1 ? 0 : 1;
  db.prepare('UPDATE tasks SET pinned = ? WHERE id = ?').run(newPinned, id);
  logActivity({
    entityType: 'task',
    entityId: String(id),
    entityName: task.title,
    actionType: newPinned ? 'pin' : 'unpin',
    user,
    description: `${newPinned ? 'Pinned' : 'Unpinned'} task "${task.title}"`,
  });
  return { pinned: newPinned === 1 };
}

function moveTask(id, projectCode, user = 'System') {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task) return null;
  const project = db.prepare('SELECT * FROM projects WHERE code = ?').get(projectCode);
  if (!project) return null;

  const maxRow = db.prepare(
    'SELECT COALESCE(MAX(task_number), 0) as max FROM tasks WHERE project_code = ?'
  ).get(projectCode);
  const newTaskNumber = maxRow.max + 1;

  const maxOrder = db.prepare(
    'SELECT COALESCE(MAX(sort_order), 0) as max FROM tasks WHERE project_code = ?'
  ).get(projectCode);

  db.prepare(
    'UPDATE tasks SET project_code = ?, task_number = ?, sort_order = ? WHERE id = ?'
  ).run(projectCode, newTaskNumber, maxOrder.max + 1, id);

  logActivity({
    entityType: 'task',
    entityId: String(id),
    entityName: task.title,
    actionType: 'move',
    user,
    changes: { project_code: { old: task.project_code, new: projectCode } },
    description: `Moved task "${task.title}" to project ${projectCode}`,
  });

  return { newTaskNumber };
}

function bulkMoveTasks(taskIds, projectCode, user = 'System') {
  const project = db.prepare('SELECT * FROM projects WHERE code = ?').get(projectCode);
  if (!project) return { movedCount: 0, skippedCount: 0, errorCount: taskIds.length };

  let movedCount = 0, skippedCount = 0, errorCount = 0;

  const bulkMove = db.transaction(() => {
    for (const id of taskIds) {
      const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
      if (!task) { errorCount++; continue; }
      if (task.project_code === projectCode) { skippedCount++; continue; }

      const maxRow = db.prepare(
        'SELECT COALESCE(MAX(task_number), 0) as max FROM tasks WHERE project_code = ?'
      ).get(projectCode);
      const newTaskNumber = maxRow.max + 1;
      const maxOrder = db.prepare(
        'SELECT COALESCE(MAX(sort_order), 0) as max FROM tasks WHERE project_code = ?'
      ).get(projectCode);

      db.prepare(
        'UPDATE tasks SET project_code = ?, task_number = ?, sort_order = ? WHERE id = ?'
      ).run(projectCode, newTaskNumber, maxOrder.max + 1, id);
      movedCount++;
    }
  });
  bulkMove();

  logActivity({
    entityType: 'task',
    entityId: null,
    entityName: null,
    actionType: 'move',
    user,
    description: `Bulk moved ${movedCount} tasks to project ${projectCode}`,
  });

  return { movedCount, skippedCount, errorCount };
}

function reorderTasks(projectCode, taskOrders) {
  const stmt = db.prepare('UPDATE tasks SET sort_order = ? WHERE id = ? AND project_code = ?');
  const reorder = db.transaction(() => {
    for (const { id, sort_order } of taskOrders) {
      stmt.run(sort_order, id, projectCode);
    }
  });
  reorder();
}

function reorderAllTasks(taskOrders) {
  const stmt = db.prepare('UPDATE tasks SET sort_order = ? WHERE id = ?');
  const reorder = db.transaction(() => {
    for (const { id, sort_order } of taskOrders) {
      stmt.run(sort_order, id);
    }
  });
  reorder();
}

function getDeletedTasks(limit = 50) {
  return db.prepare(`
    SELECT t.id, t.project_code, t.task_number, t.title, t.status, t.priority, t.deleted_at
    FROM tasks t
    WHERE t.deleted_at IS NOT NULL
    ORDER BY t.deleted_at DESC
    LIMIT ?
  `).all(limit);
}

// ============================================================
// Tags
// ============================================================

function getAllTags() {
  return db.prepare('SELECT * FROM tags ORDER BY is_context DESC, sort_order ASC, name ASC').all();
}

function getContextTags() {
  return db.prepare('SELECT * FROM tags WHERE is_context = 1 ORDER BY sort_order ASC, name ASC').all();
}

function getRegularTags() {
  return db.prepare('SELECT * FROM tags WHERE is_context = 0 ORDER BY sort_order ASC, name ASC').all();
}

function createTag({ name, color, isContext }) {
  const is_context = isContext !== undefined ? (isContext ? 1 : 0) : (name.startsWith('@') ? 1 : 0);
  return db.prepare(
    'INSERT INTO tags (name, color, is_context) VALUES (?, ?, ?)'
  ).run(name, color || '#38bdf8', is_context);
}

function updateTag(id, { name, color }) {
  const sets = [];
  const params = [];
  if (name !== undefined) { sets.push('name = ?'); params.push(name); }
  if (color !== undefined) { sets.push('color = ?'); params.push(color); }
  if (sets.length === 0) return null;
  params.push(id);
  return db.prepare(`UPDATE tags SET ${sets.join(', ')} WHERE id = ?`).run(...params);
}

function deleteTag(id) {
  return db.prepare('DELETE FROM tags WHERE id = ?').run(id);
}

function setTaskTags(taskId, tagIds) {
  const setTags = db.transaction(() => {
    db.prepare('DELETE FROM task_tags WHERE task_id = ?').run(taskId);
    const insert = db.prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)');
    for (const tagId of tagIds) {
      insert.run(taskId, tagId);
    }
  });
  setTags();
  return getTagsForTask(taskId);
}

// ============================================================
// Subtasks
// ============================================================

function getSubtasks(taskId) {
  const subtasks = db.prepare(
    'SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order ASC, id ASC'
  ).all(taskId);
  const stats = db.prepare(
    'SELECT COUNT(*) as total, SUM(CASE WHEN is_completed=1 THEN 1 ELSE 0 END) as completed FROM subtasks WHERE task_id = ?'
  ).get(taskId);
  return { subtasks, stats: { total: stats.total || 0, completed: stats.completed || 0 } };
}

function createSubtask(taskId, title, user = 'System') {
  const maxOrder = db.prepare(
    'SELECT COALESCE(MAX(sort_order), 0) as max FROM subtasks WHERE task_id = ?'
  ).get(taskId);
  const result = db.prepare(
    'INSERT INTO subtasks (task_id, title, sort_order) VALUES (?, ?, ?)'
  ).run(taskId, title, maxOrder.max + 1);

  const subtask = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(result.lastInsertRowid);
  logActivity({
    entityType: 'task',
    entityId: String(taskId),
    entityName: title,
    actionType: 'subtask_add',
    user,
    description: `Added subtask "${title}"`,
  });
  return subtask;
}

function bulkCreateSubtasks(taskId, subtasks, user = 'System') {
  const maxOrder = db.prepare(
    'SELECT COALESCE(MAX(sort_order), 0) as max FROM subtasks WHERE task_id = ?'
  ).get(taskId);

  let order = maxOrder.max + 1;
  const insert = db.prepare(
    'INSERT INTO subtasks (task_id, title, is_completed, sort_order) VALUES (?, ?, ?, ?)'
  );
  const ids = [];
  const bulk = db.transaction(() => {
    for (const s of subtasks) {
      const title = typeof s === 'string' ? s : s.title;
      const isCompleted = typeof s === 'object' && s.is_completed ? 1 : 0;
      const r = insert.run(taskId, title, isCompleted, order++);
      ids.push(r.lastInsertRowid);
    }
  });
  bulk();

  logActivity({
    entityType: 'task',
    entityId: String(taskId),
    entityName: null,
    actionType: 'subtask_bulk_add',
    user,
    description: `Bulk added ${subtasks.length} subtasks`,
  });

  return db.prepare(`SELECT * FROM subtasks WHERE id IN (${ids.map(() => '?').join(',')})`)
    .all(...ids);
}

function updateSubtask(taskId, subtaskId, { title, isCompleted }, user = 'System') {
  const sub = db.prepare('SELECT * FROM subtasks WHERE id = ? AND task_id = ?').get(subtaskId, taskId);
  if (!sub) return null;

  const sets = [];
  const params = [];
  if (title !== undefined) { sets.push('title = ?'); params.push(title); }
  if (isCompleted !== undefined) { sets.push('is_completed = ?'); params.push(isCompleted ? 1 : 0); }
  sets.push("updated_at = datetime('now')");

  params.push(subtaskId);
  db.prepare(`UPDATE subtasks SET ${sets.join(', ')} WHERE id = ?`).run(...params);

  if (isCompleted !== undefined) {
    logActivity({
      entityType: 'task',
      entityId: String(taskId),
      entityName: sub.title,
      actionType: isCompleted ? 'subtask_complete' : 'subtask_uncomplete',
      user,
      description: `${isCompleted ? 'Completed' : 'Uncompleted'} subtask "${sub.title}"`,
    });
  } else {
    logActivity({
      entityType: 'task',
      entityId: String(taskId),
      entityName: sub.title,
      actionType: 'subtask_update',
      user,
      description: `Updated subtask`,
    });
  }

  return db.prepare('SELECT * FROM subtasks WHERE id = ?').get(subtaskId);
}

function toggleSubtask(taskId, subtaskId, user = 'System') {
  const sub = db.prepare('SELECT * FROM subtasks WHERE id = ? AND task_id = ?').get(subtaskId, taskId);
  if (!sub) return null;
  const newVal = sub.is_completed === 1 ? 0 : 1;
  db.prepare("UPDATE subtasks SET is_completed = ?, updated_at = datetime('now') WHERE id = ?").run(newVal, subtaskId);

  logActivity({
    entityType: 'task',
    entityId: String(taskId),
    entityName: sub.title,
    actionType: newVal ? 'subtask_complete' : 'subtask_uncomplete',
    user,
    description: `${newVal ? 'Completed' : 'Uncompleted'} subtask "${sub.title}"`,
  });

  const stats = db.prepare(
    'SELECT COUNT(*) as total, SUM(CASE WHEN is_completed=1 THEN 1 ELSE 0 END) as completed FROM subtasks WHERE task_id = ?'
  ).get(taskId);
  return { isCompleted: newVal === 1, stats: { total: stats.total || 0, completed: stats.completed || 0 } };
}

function reorderSubtasks(taskId, subtaskOrders) {
  const stmt = db.prepare('UPDATE subtasks SET sort_order = ? WHERE id = ? AND task_id = ?');
  const reorder = db.transaction(() => {
    for (const { id, sort_order } of subtaskOrders) {
      stmt.run(sort_order, id, taskId);
    }
  });
  reorder();
}

function deleteSubtask(taskId, subtaskId, user = 'System') {
  const sub = db.prepare('SELECT * FROM subtasks WHERE id = ? AND task_id = ?').get(subtaskId, taskId);
  if (!sub) return null;
  db.prepare('DELETE FROM subtasks WHERE id = ?').run(subtaskId);

  logActivity({
    entityType: 'task',
    entityId: String(taskId),
    entityName: sub.title,
    actionType: 'subtask_delete',
    user,
    description: `Deleted subtask "${sub.title}"`,
  });

  const stats = db.prepare(
    'SELECT COUNT(*) as total, SUM(CASE WHEN is_completed=1 THEN 1 ELSE 0 END) as completed FROM subtasks WHERE task_id = ?'
  ).get(taskId);
  return { stats: { total: stats.total || 0, completed: stats.completed || 0 } };
}

// ============================================================
// Notes
// ============================================================

function getTaskNotes(taskId) {
  const notes = db.prepare(
    'SELECT * FROM task_notes WHERE task_id = ? ORDER BY created_at DESC'
  ).all(taskId);
  return { taskId, notes, count: notes.length };
}

function createNote(taskId, content, user = 'System') {
  const result = db.prepare(
    'INSERT INTO task_notes (task_id, content) VALUES (?, ?)'
  ).run(taskId, content);
  const note = db.prepare('SELECT * FROM task_notes WHERE id = ?').get(result.lastInsertRowid);

  logActivity({
    entityType: 'task',
    entityId: String(taskId),
    entityName: null,
    actionType: 'note_add',
    user,
    description: `Added note to task`,
  });

  return note;
}

function updateNote(taskId, noteId, content, user = 'System') {
  const note = db.prepare('SELECT * FROM task_notes WHERE id = ? AND task_id = ?').get(noteId, taskId);
  if (!note) return null;
  db.prepare("UPDATE task_notes SET content = ?, updated_at = datetime('now') WHERE id = ?").run(content, noteId);

  logActivity({
    entityType: 'task',
    entityId: String(taskId),
    entityName: null,
    actionType: 'note_update',
    user,
    description: `Updated note on task`,
  });

  return db.prepare('SELECT * FROM task_notes WHERE id = ?').get(noteId);
}

function deleteNote(taskId, noteId, user = 'System') {
  const note = db.prepare('SELECT * FROM task_notes WHERE id = ? AND task_id = ?').get(noteId, taskId);
  if (!note) return null;
  db.prepare('DELETE FROM task_notes WHERE id = ?').run(noteId);

  logActivity({
    entityType: 'task',
    entityId: String(taskId),
    entityName: null,
    actionType: 'note_delete',
    user,
    description: `Deleted note from task`,
  });

  return { deleted: true };
}

// ============================================================
// Templates
// ============================================================

function getTemplates() {
  return db.prepare('SELECT * FROM task_templates ORDER BY sort_order ASC, name ASC').all();
}

function getTemplate(id) {
  return db.prepare('SELECT * FROM task_templates WHERE id = ?').get(id);
}

function createTemplate({ name, description, icon, title, priority, quadrant, estimatedDuration, defaultTags, comments }) {
  const result = db.prepare(`
    INSERT INTO task_templates (name, description, icon, title, priority, quadrant, estimated_duration, default_tags, comments, is_builtin)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(
    name, description || null, icon || '📋', title || name,
    priority || null, quadrant || null, estimatedDuration || null,
    defaultTags ? JSON.stringify(defaultTags) : null, comments || null
  );
  return db.prepare('SELECT * FROM task_templates WHERE id = ?').get(result.lastInsertRowid);
}

function createTemplateFromTask(taskId, name) {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!task) return null;
  const tags = getTagsForTask(taskId).map((t) => t.id);
  return createTemplate({
    name,
    description: `Created from task: ${task.title}`,
    icon: '📋',
    title: task.title,
    priority: task.priority,
    quadrant: task.quadrant,
    defaultTags: tags,
    comments: task.comments,
  });
}

function updateTemplate(id, data) {
  const template = db.prepare('SELECT * FROM task_templates WHERE id = ?').get(id);
  if (!template) return null;
  if (template.is_builtin) return { error: 'cannot edit built-in' };

  const fields = ['name', 'description', 'icon', 'title', 'priority', 'quadrant', 'estimated_duration', 'default_tags', 'comments'];
  const dataMap = {
    name: data.name,
    description: data.description,
    icon: data.icon,
    title: data.title,
    priority: data.priority,
    quadrant: data.quadrant,
    estimated_duration: data.estimatedDuration,
    default_tags: data.defaultTags !== undefined ? JSON.stringify(data.defaultTags) : undefined,
    comments: data.comments,
  };

  const sets = ["updated_at = datetime('now')"];
  const params = [];
  for (const f of fields) {
    if (dataMap[f] !== undefined) {
      sets.push(`${f} = ?`);
      params.push(dataMap[f]);
    }
  }
  params.push(id);
  db.prepare(`UPDATE task_templates SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  return db.prepare('SELECT * FROM task_templates WHERE id = ?').get(id);
}

function deleteTemplate(id) {
  const template = db.prepare('SELECT * FROM task_templates WHERE id = ?').get(id);
  if (!template) return null;
  if (template.is_builtin) return { error: 'cannot delete built-in' };
  db.prepare('DELETE FROM task_templates WHERE id = ?').run(id);
  return { deleted: true };
}

// ============================================================
// Activity
// ============================================================

function logActivity({ entityType, entityId, entityName, actionType, user = 'System', changes, description }) {
  db.prepare(`
    INSERT INTO activity_log (entity_type, entity_id, entity_name, action_type, user, changes, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    entityType,
    entityId || null,
    entityName || null,
    actionType,
    user,
    changes ? JSON.stringify(changes) : null,
    description
  );
}

function getActivity({ limit = 50, offset = 0, entityType, entityId } = {}) {
  const conditions = [];
  const params = [];
  if (entityType) { conditions.push('entity_type = ?'); params.push(entityType); }
  if (entityId) { conditions.push('entity_id = ?'); params.push(entityId); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const activities = db.prepare(
    `SELECT * FROM activity_log ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) as c FROM activity_log ${where}`).get(...params).c;
  return { activities, total, hasMore: offset + activities.length < total };
}

function getTaskActivity(taskId, limit = 20) {
  return db.prepare(
    'SELECT * FROM activity_log WHERE entity_type = ? AND entity_id = ? ORDER BY timestamp DESC LIMIT ?'
  ).all('task', String(taskId), limit);
}

// ============================================================
// Pomodoro
// ============================================================

function startSession(taskId, durationMinutes = 25) {
  const active = db.prepare("SELECT * FROM pomodoro_sessions WHERE status = 'active'").get();
  if (active) return { error: 'session already active', session: active };

  const result = db.prepare(
    'INSERT INTO pomodoro_sessions (task_id, duration_minutes, started_at, status) VALUES (?, ?, ?, ?)'
  ).run(taskId || null, durationMinutes, new Date().toISOString(), 'active');

  logActivity({
    entityType: 'task',
    entityId: taskId ? String(taskId) : null,
    entityName: null,
    actionType: 'pomodoro_start',
    description: `Started ${durationMinutes}min pomodoro session`,
  });

  return db.prepare('SELECT * FROM pomodoro_sessions WHERE id = ?').get(result.lastInsertRowid);
}

function completeSession(id, notes) {
  const session = db.prepare('SELECT * FROM pomodoro_sessions WHERE id = ?').get(id);
  if (!session) return null;
  if (session.status !== 'active') return { error: 'not active' };

  db.prepare(
    "UPDATE pomodoro_sessions SET status = 'completed', completed_at = ?, notes = ? WHERE id = ?"
  ).run(new Date().toISOString(), notes || null, id);

  logActivity({
    entityType: 'task',
    entityId: session.task_id ? String(session.task_id) : null,
    entityName: null,
    actionType: 'pomodoro_complete',
    description: `Completed ${session.duration_minutes}min pomodoro session`,
  });

  return db.prepare('SELECT * FROM pomodoro_sessions WHERE id = ?').get(id);
}

function cancelSession(id) {
  const session = db.prepare('SELECT * FROM pomodoro_sessions WHERE id = ?').get(id);
  if (!session) return null;
  if (session.status !== 'active') return { error: 'not active' };
  db.prepare("UPDATE pomodoro_sessions SET status = 'cancelled' WHERE id = ?").run(id);
  return db.prepare('SELECT * FROM pomodoro_sessions WHERE id = ?').get(id);
}

function getActiveSession() {
  const session = db.prepare("SELECT * FROM pomodoro_sessions WHERE status = 'active'").get();
  if (!session) return null;

  // Auto-complete if expired
  const startedAt = new Date(session.started_at);
  const expiresAt = new Date(startedAt.getTime() + session.duration_minutes * 60 * 1000);
  if (new Date() > expiresAt) {
    db.prepare(
      "UPDATE pomodoro_sessions SET status = 'completed', completed_at = ? WHERE id = ?"
    ).run(expiresAt.toISOString(), session.id);
    return null;
  }

  return session;
}

function getTodayStats() {
  const today = new Date().toISOString().slice(0, 10);
  const stats = db.prepare(`
    SELECT COUNT(*) as sessionCount, COALESCE(SUM(duration_minutes), 0) as totalMinutes
    FROM pomodoro_sessions
    WHERE status = 'completed' AND date(started_at) = ?
  `).get(today);
  return { ...stats, date: today };
}

function getRecentSessions(limit = 20) {
  return db.prepare(
    "SELECT * FROM pomodoro_sessions WHERE status != 'active' ORDER BY started_at DESC LIMIT ?"
  ).all(limit);
}

function getTaskPomodoro(taskId) {
  const stats = db.prepare(`
    SELECT COUNT(*) as sessionCount, COALESCE(SUM(duration_minutes), 0) as totalMinutes
    FROM pomodoro_sessions WHERE task_id = ? AND status = 'completed'
  `).get(taskId);
  const sessions = db.prepare(
    'SELECT * FROM pomodoro_sessions WHERE task_id = ? ORDER BY started_at DESC'
  ).all(taskId);
  return { stats, sessions };
}

function updateSessionTask(id, taskId) {
  return db.prepare('UPDATE pomodoro_sessions SET task_id = ? WHERE id = ?').run(taskId || null, id);
}

// ============================================================
// Stats / Summary
// ============================================================

function getStats() {
  const totalTasks = db.prepare('SELECT COUNT(*) as c FROM tasks WHERE deleted_at IS NULL').get().c;
  const totalProjects = db.prepare('SELECT COUNT(*) as c FROM projects').get().c;

  const byStatus = {};
  db.prepare("SELECT status, COUNT(*) as c FROM tasks WHERE deleted_at IS NULL GROUP BY status").all()
    .forEach((r) => { byStatus[r.status] = r.c; });

  const byPriority = {};
  db.prepare("SELECT priority, COUNT(*) as c FROM tasks WHERE deleted_at IS NULL GROUP BY priority").all()
    .forEach((r) => { byPriority[r.priority || 'none'] = r.c; });

  return { totalTasks, totalProjects, byStatus, byPriority };
}

function getSummaryData() {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const overdue = db.prepare(`
    SELECT t.*, p.name as project_name FROM tasks t
    JOIN projects p ON p.code = t.project_code
    WHERE t.deleted_at IS NULL AND t.status NOT IN ('COMPLETED','DONE','CANCELLED','NOT DOING')
    AND t.due_date IS NOT NULL AND t.due_date < ?
    ORDER BY t.due_date ASC
  `).all(todayStr);

  const upcoming = db.prepare(`
    SELECT t.*, p.name as project_name FROM tasks t
    JOIN projects p ON p.code = t.project_code
    WHERE t.deleted_at IS NULL AND t.status NOT IN ('COMPLETED','DONE','CANCELLED','NOT DOING')
    AND t.due_date IS NOT NULL AND t.due_date >= ? AND t.due_date <= ?
    ORDER BY t.due_date ASC
  `).all(todayStr, in7days);

  const highPriority = db.prepare(`
    SELECT t.*, p.name as project_name FROM tasks t
    JOIN projects p ON p.code = t.project_code
    WHERE t.deleted_at IS NULL AND t.priority = 'HIGH'
    AND t.status NOT IN ('COMPLETED','DONE','CANCELLED','NOT DOING')
    ORDER BY t.due_date ASC NULLS LAST
  `).all();

  const blockers = db.prepare(`
    SELECT t.*, p.name as project_name FROM tasks t
    JOIN projects p ON p.code = t.project_code
    WHERE t.deleted_at IS NULL AND t.status NOT IN ('COMPLETED','DONE','CANCELLED','NOT DOING')
    AND (
      lower(t.comments) LIKE '%blocked%' OR lower(t.comments) LIKE '%waiting%'
      OR lower(t.comments) LIKE '%stuck%' OR lower(t.comments) LIKE '%depends%'
    )
  `).all();

  const projects = db.prepare('SELECT * FROM projects').all();
  const projectBreakdown = projects.map((p) => {
    const counts = {};
    db.prepare("SELECT status, COUNT(*) as c FROM tasks WHERE project_code = ? AND deleted_at IS NULL GROUP BY status")
      .all(p.code).forEach((r) => { counts[r.status] = r.c; });
    return { ...p, statusCounts: counts };
  });

  const tasksWithSubtasks = db.prepare(`
    SELECT t.id, t.title, p.name as project_name,
           COUNT(s.id) as total,
           SUM(CASE WHEN s.is_completed=1 THEN 1 ELSE 0 END) as completed
    FROM tasks t
    JOIN projects p ON p.code = t.project_code
    JOIN subtasks s ON s.task_id = t.id
    WHERE t.deleted_at IS NULL
    GROUP BY t.id
    HAVING total > completed
  `).all();

  return { overdue, upcoming, highPriority, blockers, projectBreakdown, tasksWithSubtasks };
}

// ============================================================
// YAML Export
// ============================================================

function getYamlExport() {
  const projects = getAllProjectsWithTasks();
  return { projects, lastModified: new Date().toISOString() };
}

// ============================================================
// Users
// ============================================================

function createUser(username, passwordHash, displayName) {
  const stmt = db.prepare(
    'INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)'
  );
  const result = stmt.run(username, passwordHash, displayName || username);
  return { id: result.lastInsertRowid, username, display_name: displayName || username, role: 'user' };
}

function getUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function getUserById(id) {
  return db.prepare('SELECT id, username, display_name, role, created_at, last_login FROM users WHERE id = ?').get(id);
}

function updateLastLogin(id) {
  db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(id);
}

function getUserCount() {
  return db.prepare('SELECT COUNT(*) as c FROM users').get().c;
}

// ============================================================
// Exports
// ============================================================

module.exports = {
  // Projects
  getAllProjectsWithTasks,
  createProject,
  updateProject,
  archiveProject,
  restoreProject,
  deleteProject,
  // Tasks
  createTask,
  updateTask,
  deleteTask,
  restoreTask,
  togglePin,
  moveTask,
  bulkMoveTasks,
  reorderTasks,
  reorderAllTasks,
  getDeletedTasks,
  // Tags
  getAllTags,
  getContextTags,
  getRegularTags,
  createTag,
  updateTag,
  deleteTag,
  setTaskTags,
  // Subtasks
  getSubtasks,
  createSubtask,
  bulkCreateSubtasks,
  updateSubtask,
  toggleSubtask,
  reorderSubtasks,
  deleteSubtask,
  // Notes
  getTaskNotes,
  createNote,
  updateNote,
  deleteNote,
  // Templates
  getTemplates,
  getTemplate,
  createTemplate,
  createTemplateFromTask,
  updateTemplate,
  deleteTemplate,
  // Activity
  logActivity,
  getActivity,
  getTaskActivity,
  // Pomodoro
  startSession,
  completeSession,
  cancelSession,
  getActiveSession,
  getTodayStats,
  getRecentSessions,
  getTaskPomodoro,
  updateSessionTask,
  // Stats
  getStats,
  getSummaryData,
  getYamlExport,
  // Users
  createUser,
  getUserByUsername,
  getUserById,
  updateLastLogin,
  getUserCount,
  // Lifecycle
  close: () => db.close(),
};
