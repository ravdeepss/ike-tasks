const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Use a temp database for tests
const TEST_DB_PATH = path.join(__dirname, 'test-tasks.db');

// Set env before requiring database module
process.env.DATABASE_PATH = TEST_DB_PATH;

let db;

beforeAll(() => {
  // Clean up any previous test DB
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  // Require database module — it initializes the DB on import
  db = require('../database');
});

afterAll(() => {
  db.close();
  // Clean up
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  if (fs.existsSync(TEST_DB_PATH + '-wal')) fs.unlinkSync(TEST_DB_PATH + '-wal');
  if (fs.existsSync(TEST_DB_PATH + '-shm')) fs.unlinkSync(TEST_DB_PATH + '-shm');
});

describe('Projects', () => {
  test('createProject creates a project and getAllProjectsWithTasks returns it', () => {
    db.createProject({ code: 'TEST', name: 'Test Project', description: 'A test project' });
    const projects = db.getAllProjectsWithTasks();
    const proj = projects.find(p => p.code === 'TEST');
    expect(proj).toBeDefined();
    expect(proj.name).toBe('Test Project');
    expect(proj.description).toBe('A test project');
    expect(proj.status).toBe('In Progress');
  });

  test('createProject rejects duplicate code', () => {
    expect(() => {
      db.createProject({ code: 'TEST', name: 'Duplicate' });
    }).toThrow(/UNIQUE/);
  });

  test('updateProject updates fields', () => {
    db.updateProject('TEST', { name: 'Updated Project' });
    const projects = db.getAllProjectsWithTasks();
    const proj = projects.find(p => p.code === 'TEST');
    expect(proj.name).toBe('Updated Project');
  });

  test('archiveProject sets status to Archived', () => {
    db.archiveProject('TEST');
    const projects = db.getAllProjectsWithTasks();
    const proj = projects.find(p => p.code === 'TEST');
    expect(proj.status).toBe('Archived');
  });

  test('restoreProject sets status back', () => {
    db.restoreProject('TEST', 'In Progress');
    const projects = db.getAllProjectsWithTasks();
    const proj = projects.find(p => p.code === 'TEST');
    expect(proj.status).toBe('In Progress');
  });
});

describe('Tasks', () => {
  let taskId;

  test('createTask creates a task in a project', () => {
    const result = db.createTask('TEST', { title: 'Test Task', priority: 'HIGH' });
    expect(result).toBeDefined();
    expect(result.taskId).toBeDefined();
    taskId = result.taskId;
  });

  test('getAllProjectsWithTasks includes the task', () => {
    const projects = db.getAllProjectsWithTasks();
    const proj = projects.find(p => p.code === 'TEST');
    expect(proj.tasks.length).toBeGreaterThanOrEqual(1);
    const task = proj.tasks.find(t => t.id === taskId);
    expect(task.title).toBe('Test Task');
    expect(task.priority).toBe('HIGH');
  });

  test('updateTask updates fields', () => {
    db.updateTask(taskId, { title: 'Updated Task', status: 'INPROGRESS' }, 'tester');
    const projects = db.getAllProjectsWithTasks();
    const proj = projects.find(p => p.code === 'TEST');
    const task = proj.tasks.find(t => t.id === taskId);
    expect(task.title).toBe('Updated Task');
    expect(task.status).toBe('INPROGRESS');
  });

  test('togglePin toggles pinned state', () => {
    const result = db.togglePin(taskId, 'tester');
    expect(result).toBeDefined();
    expect(result.pinned).toBe(true);
  });

  test('deleteTask soft-deletes (sets deleted_at)', () => {
    const result = db.deleteTask(taskId, false, 'tester');
    expect(result).toBeDefined();
    // Task should not appear in projects anymore
    const projects = db.getAllProjectsWithTasks();
    const proj = projects.find(p => p.code === 'TEST');
    const task = (proj.tasks || []).find(t => t.id === taskId);
    expect(task).toBeUndefined();
  });

  test('getDeletedTasks shows soft-deleted task', () => {
    const deleted = db.getDeletedTasks(50);
    const task = deleted.find(t => t.id === taskId);
    expect(task).toBeDefined();
  });

  test('restoreTask restores a soft-deleted task', () => {
    const result = db.restoreTask(taskId, 'tester');
    expect(result).toBeDefined();
    const projects = db.getAllProjectsWithTasks();
    const proj = projects.find(p => p.code === 'TEST');
    const task = proj.tasks.find(t => t.id === taskId);
    expect(task).toBeDefined();
  });

  test('deleteTask permanent removes from DB', () => {
    const result = db.deleteTask(taskId, true, 'tester');
    expect(result).toBeDefined();
  });
});

describe('Tags', () => {
  let tagId;

  test('createTag creates a tag', () => {
    const result = db.createTag({ name: 'test-tag', color: '#ff0000' });
    expect(result).toBeDefined();
    expect(result.lastInsertRowid).toBeDefined();
    tagId = Number(result.lastInsertRowid);
  });

  test('getAllTags includes the created tag', () => {
    const tags = db.getAllTags();
    const tag = tags.find(t => t.id === tagId);
    expect(tag).toBeDefined();
    expect(tag.name).toBe('test-tag');
  });

  test('updateTag updates the tag', () => {
    db.updateTag(tagId, { name: 'updated-tag' });
    const tags = db.getAllTags();
    const tag = tags.find(t => t.id === tagId);
    expect(tag).toBeDefined();
    expect(tag.name).toBe('updated-tag');
  });

  test('deleteTag removes the tag', () => {
    const result = db.deleteTag(tagId);
    expect(result).toBeDefined();
    const tags = db.getAllTags();
    const tag = tags.find(t => t.id === tagId);
    expect(tag).toBeUndefined();
  });
});

describe('Subtasks', () => {
  let taskId, subtaskId;

  beforeAll(() => {
    const result = db.createTask('TEST', { title: 'Subtask Parent' });
    taskId = result.taskId;
  });

  test('createSubtask creates a subtask', () => {
    const subtask = db.createSubtask(taskId, 'Child Task', 'tester');
    expect(subtask).toBeDefined();
    expect(subtask.title).toBe('Child Task');
    subtaskId = subtask.id;
  });

  test('getSubtasks returns subtasks with stats', () => {
    const result = db.getSubtasks(taskId);
    expect(result.subtasks.length).toBeGreaterThanOrEqual(1);
    expect(result.stats).toBeDefined();
  });

  test('toggleSubtask toggles completed state', () => {
    const result = db.toggleSubtask(taskId, subtaskId);
    expect(result).toBeDefined();
    expect(result.isCompleted).toBe(true);
  });

  test('deleteSubtask removes the subtask', () => {
    const result = db.deleteSubtask(taskId, subtaskId);
    expect(result).toBeDefined();
  });
});

describe('Notes', () => {
  let taskId, noteId;

  beforeAll(() => {
    const result = db.createTask('TEST', { title: 'Notes Parent' });
    taskId = result.taskId;
  });

  test('createNote creates a note', () => {
    const note = db.createNote(taskId, 'Test note content', 'tester');
    expect(note).toBeDefined();
    expect(note.content).toBe('Test note content');
    noteId = note.id;
  });

  test('getTaskNotes returns the note', () => {
    const result = db.getTaskNotes(taskId);
    expect(result.notes.length).toBeGreaterThanOrEqual(1);
  });

  test('updateNote updates content', () => {
    const note = db.updateNote(taskId, noteId, 'Updated content', 'tester');
    expect(note.content).toBe('Updated content');
  });

  test('deleteNote removes the note', () => {
    const result = db.deleteNote(taskId, noteId);
    expect(result).toBeDefined();
  });
});

describe('Users', () => {
  test('createUser creates a user', () => {
    const user = db.createUser('testuser', 'hashed_pw', 'Test User');
    expect(user.id).toBeDefined();
    expect(user.username).toBe('testuser');
  });

  test('getUserByUsername returns user with password hash', () => {
    const user = db.getUserByUsername('testuser');
    expect(user).toBeDefined();
    expect(user.password_hash).toBe('hashed_pw');
  });

  test('getUserById returns user without password hash', () => {
    const full = db.getUserByUsername('testuser');
    const user = db.getUserById(full.id);
    expect(user).toBeDefined();
    expect(user.username).toBe('testuser');
    expect(user.password_hash).toBeUndefined();
  });

  test('getUserCount returns count', () => {
    const count = db.getUserCount();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('createUser rejects duplicate username', () => {
    expect(() => {
      db.createUser('testuser', 'hashed_pw2', 'Duplicate');
    }).toThrow(/UNIQUE/);
  });
});

describe('Activity Log', () => {
  test('logActivity and getActivity work', () => {
    db.logActivity({
      entityType: 'task',
      entityId: '999',
      entityName: 'Test Activity',
      actionType: 'create',
      user: 'tester',
      description: 'Created for testing',
    });
    const result = db.getActivity({ limit: 10, offset: 0 });
    expect(result.activities.length).toBeGreaterThanOrEqual(1);
    expect(result.total).toBeGreaterThanOrEqual(1);
  });
});

describe('Stats', () => {
  test('getStats returns statistics', () => {
    const stats = db.getStats();
    expect(stats).toBeDefined();
    expect(typeof stats.totalProjects).toBe('number');
    expect(typeof stats.totalTasks).toBe('number');
  });
});

describe('Project deletion', () => {
  test('deleteProject removes project and its tasks', () => {
    db.createProject({ code: 'DEL', name: 'To Delete' });
    db.createTask('DEL', { title: 'Will be deleted' });
    const result = db.deleteProject('DEL');
    expect(result.changes).toBe(1);
    const projects = db.getAllProjectsWithTasks();
    expect(projects.find(p => p.code === 'DEL')).toBeUndefined();
  });
});
