const path = require('path');
const fs = require('fs');

// Use a temp database for API tests
const TEST_DB_PATH = path.join(__dirname, 'test-api-tasks.db');
process.env.DATABASE_PATH = TEST_DB_PATH;
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';

// Clean up previous test DB
if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);

const request = require('supertest');
const app = require('../index');
const db = require('../database');

let agent; // cookie-aware agent for auth

beforeAll(() => {
  agent = request.agent(app);
});

afterAll(() => {
  db.close();
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  if (fs.existsSync(TEST_DB_PATH + '-wal')) fs.unlinkSync(TEST_DB_PATH + '-wal');
  if (fs.existsSync(TEST_DB_PATH + '-shm')) fs.unlinkSync(TEST_DB_PATH + '-shm');
});

describe('Health endpoint', () => {
  test('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.needsSetup).toBe(true);
  });
});

describe('Auth flow', () => {
  test('GET /api/tasks without auth returns 401', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(401);
  });

  test('POST /api/auth/register creates user and sets session', async () => {
    const res = await agent
      .post('/api/auth/register')
      .send({ username: 'admin', password: 'password123', displayName: 'Admin User' });
    expect(res.status).toBe(201);
    expect(res.body.username).toBe('admin');
  });

  test('GET /api/auth/me returns current user', async () => {
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('admin');
  });

  test('POST /api/auth/register rejects duplicate username', async () => {
    const res = await agent
      .post('/api/auth/register')
      .send({ username: 'admin', password: 'password123' });
    expect(res.status).toBe(409);
  });

  test('POST /api/auth/register validates input', async () => {
    const res = await agent
      .post('/api/auth/register')
      .send({ username: '', password: '' });
    expect(res.status).toBe(400);
  });

  test('POST /api/auth/logout clears session', async () => {
    const res = await agent.post('/api/auth/logout');
    expect(res.status).toBe(200);
    // Verify logged out
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(401);
  });

  test('POST /api/auth/login with valid credentials', async () => {
    const res = await agent
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('admin');
  });

  test('POST /api/auth/login with invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
  });
});

describe('Projects CRUD (authenticated)', () => {
  test('POST /api/projects creates a project', async () => {
    const res = await agent
      .post('/api/projects')
      .send({ code: 'API', name: 'API Test Project' });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe('API');
  });

  test('GET /api/tasks returns projects', async () => {
    const res = await agent.get('/api/tasks');
    expect(res.status).toBe(200);
    expect(res.body.projects).toBeDefined();
    expect(Array.isArray(res.body.projects)).toBe(true);
  });

  test('POST /api/projects rejects missing name', async () => {
    const res = await agent
      .post('/api/projects')
      .send({ code: 'BAD' });
    expect(res.status).toBe(400);
  });

  test('PUT /api/projects/:code updates a project', async () => {
    const res = await agent
      .put('/api/projects/API')
      .send({ name: 'Updated API Project' });
    expect(res.status).toBe(200);
  });

  test('PUT /api/projects/:code/archive archives a project', async () => {
    const res = await agent.put('/api/projects/API/archive').send({});
    expect(res.status).toBe(200);
  });

  test('PUT /api/projects/:code/restore restores a project', async () => {
    const res = await agent
      .put('/api/projects/API/restore')
      .send({ status: 'In Progress' });
    expect(res.status).toBe(200);
  });
});

describe('Tasks CRUD (authenticated)', () => {
  let taskId;

  test('POST /api/projects/:code/tasks creates a task', async () => {
    const res = await agent
      .post('/api/projects/API/tasks')
      .send({ title: 'API Test Task', priority: 'HIGH' });
    expect(res.status).toBe(201);
    expect(res.body.taskId).toBeDefined();
    taskId = res.body.taskId;
  });

  test('PUT /api/tasks/:id updates a task', async () => {
    const res = await agent
      .put(`/api/tasks/${taskId}`)
      .send({ title: 'Updated API Task', status: 'INPROGRESS' });
    expect(res.status).toBe(200);
  });

  test('PUT /api/tasks/:id/pin toggles pin', async () => {
    const res = await agent.put(`/api/tasks/${taskId}/pin`).send({});
    expect(res.status).toBe(200);
    expect(res.body.pinned).toBeDefined();
  });

  test('DELETE /api/tasks/:id soft-deletes', async () => {
    const res = await agent.delete(`/api/tasks/${taskId}`);
    expect(res.status).toBe(200);
  });

  test('POST /api/tasks/:id/restore restores', async () => {
    const res = await agent.post(`/api/tasks/${taskId}/restore`).send({});
    expect(res.status).toBe(200);
  });

  test('DELETE /api/tasks/:id?permanent=true hard-deletes', async () => {
    const res = await agent.delete(`/api/tasks/${taskId}?permanent=true`);
    expect(res.status).toBe(200);
  });
});

describe('Tags CRUD (authenticated)', () => {
  let tagId;

  test('POST /api/tags creates a tag', async () => {
    const res = await agent
      .post('/api/tags')
      .send({ name: 'api-tag', color: '#00ff00' });
    expect(res.status).toBe(201);
    tagId = res.body.id;
  });

  test('PUT /api/tags/:id updates a tag', async () => {
    const res = await agent
      .put(`/api/tags/${tagId}`)
      .send({ name: 'updated-api-tag' });
    expect(res.status).toBe(200);
  });

  test('DELETE /api/tags/:id removes a tag', async () => {
    const res = await agent.delete(`/api/tags/${tagId}`);
    expect(res.status).toBe(200);
  });
});

describe('Error handling', () => {
  test('PUT /api/projects/NONEXISTENT returns 404', async () => {
    const res = await agent
      .put('/api/projects/NONEXISTENT')
      .send({ name: 'Nope' });
    expect(res.status).toBe(404);
  });

  test('PUT /api/tasks/999999 returns 404', async () => {
    const res = await agent
      .put('/api/tasks/999999')
      .send({ title: 'Nope' });
    expect(res.status).toBe(404);
  });

  test('Responses include X-Request-ID header', async () => {
    const res = await agent.get('/api/health');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  test('Security headers are present', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });
});
