# Task Dashboard - Phased Build Plan

> **Purpose**: Step-by-step instructions for an AI agent (Claude Sonnet) to recreate the Task Dashboard application from scratch. Each phase is self-contained, testable, and builds on the previous one.

---

## Overview

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18 (CRA), plain CSS | No TypeScript, no external state library |
| Backend | Express 4, Node.js >= 16 | CommonJS (`require`), single `index.js` |
| Database | SQLite via `better-sqlite3` | Synchronous API, auto-migration on startup |
| Styling | Single `App.css` with CSS custom properties | Dark/light themes via `[data-theme]` |

**Monorepo layout**: `server/` and `client/` at root level. Database file `tasks.db` at project root.

---

## Phase 1: Project Scaffolding & Database Layer

**Goal**: Set up the monorepo structure, install dependencies, create the SQLite database module with all tables, indexes, seed data, and migration logic.

### Step 1.1 - Initialize project structure

```
TaskDashboard/
├── server/
│   ├── package.json
│   ├── index.js          (placeholder - just "hello world" express server)
│   └── database.js       (full DB module)
├── client/               (created by CRA in step 1.3)
└── package.json          (root - optional, for convenience scripts)
```

1. Create `server/package.json` with dependencies:
   - `express@^4.18.2`
   - `cors@^2.8.5`
   - `better-sqlite3@^11.0.0`
   - `js-yaml@^4.1.0`
   - Scripts: `"start": "node index.js"`, `"migrate": "node migrate-yaml.js"`

2. Run `npm install` in `server/`.

### Step 1.2 - Create `server/database.js`

This is the **most critical file** in the backend. It must:

1. **Open/create** `tasks.db` at the project root (`../tasks.db` relative to server/).
2. Enable `PRAGMA foreign_keys = ON`.
3. **Create all 9 tables** if they don't exist (use `CREATE TABLE IF NOT EXISTS`):
   - `projects` (PK: `code TEXT`)
   - `tasks` (PK: `id INTEGER AUTOINCREMENT`, FK: `project_code` -> `projects.code` ON DELETE CASCADE)
     - Unique constraint on `(project_code, task_number)`
   - `tags` (PK: `id INTEGER AUTOINCREMENT`, UNIQUE: `name`)
   - `task_tags` (composite PK: `task_id, tag_id`, FKs to `tasks.id` and `tags.id`, both ON DELETE CASCADE)
   - `subtasks` (PK: `id`, FK: `task_id` -> `tasks.id` ON DELETE CASCADE)
   - `task_notes` (PK: `id`, FK: `task_id` -> `tasks.id` ON DELETE CASCADE)
   - `task_templates` (PK: `id`)
   - `activity_log` (PK: `id`)
   - `pomodoro_sessions` (PK: `id`, FK: `task_id` -> `tasks.id` ON DELETE SET NULL)
4. **Create all indexes** as specified in app-spec.json.
5. **Seed data**:
   - 10 GTD context tags (`@computer`, `@calls`, `@email`, `@errands`, `@home`, `@office`, `@waiting`, `@read`, `@focus`, `@quick`) with specified colors and `is_context=1`.
   - 8 built-in task templates (Quick Task, Code Review, Bug Investigation, Meeting Follow-up, Research Task, Documentation, Deployment Task, Waiting For) with `is_builtin=1`. Each should have sensible defaults for priority, quadrant, icon, and comments.
   - Seed only if tables are empty (check count first).

6. **Export functions** (module.exports) for all CRUD operations:
   - **Projects**: `getAllProjectsWithTasks()`, `createProject()`, `updateProject()`, `archiveProject()`, `restoreProject()`, `deleteProject()`
   - **Tasks**: `createTask()`, `updateTask()`, `deleteTask()`, `restoreTask()`, `togglePin()`, `moveTask()`, `bulkMoveTasks()`, `reorderTasks()`, `reorderAllTasks()`, `getDeletedTasks()`
   - **Tags**: `getAllTags()`, `getContextTags()`, `getRegularTags()`, `createTag()`, `updateTag()`, `deleteTag()`, `setTaskTags()`
   - **Subtasks**: `getSubtasks()`, `createSubtask()`, `bulkCreateSubtasks()`, `updateSubtask()`, `toggleSubtask()`, `reorderSubtasks()`, `deleteSubtask()`
   - **Notes**: `getTaskNotes()`, `createNote()`, `updateNote()`, `deleteNote()`
   - **Templates**: `getTemplates()`, `getTemplate()`, `createTemplate()`, `createTemplateFromTask()`, `updateTemplate()`, `deleteTemplate()`
   - **Activity**: `logActivity()`, `getActivity()`, `getTaskActivity()`
   - **Pomodoro**: `startSession()`, `completeSession()`, `cancelSession()`, `getActiveSession()`, `getTodayStats()`, `getRecentSessions()`, `getTaskPomodoro()`, `updateSessionTask()`
   - **Stats/Summary**: `getStats()`, `getSummaryData()`
   - **YAML Export**: `getYamlExport()`

**Key business logic in database functions:**
- `createTask()`: Auto-assign next `task_number` for the project. Auto-set `progress=100` when status is COMPLETED/DONE.
- `updateTask()`: Auto-set `progress=100` when status changed to COMPLETED/DONE. Log field-level changes to `activity_log`.
- `deleteTask(permanent)`: If `permanent=false`, set `deleted_at` to ISO timestamp. If `permanent=true`, DELETE row.
- `getAllProjectsWithTasks()`: Return projects with nested tasks (excluding soft-deleted), each task with its tags array, noteCount, and subtaskStats `{total, completed}`.
- `logActivity()`: Insert into `activity_log` with timestamp, entity info, action type, changes JSON, and description.
- `setTaskTags()`: Use a transaction to DELETE existing task_tags, then INSERT new ones.

### Step 1.3 - Create React app

```bash
cd client && npx create-react-app . --template default
```

Then in `client/package.json`, add the proxy:
```json
"proxy": "http://localhost:3001"
```

Install additional client dependency:
```bash
npm install react-markdown@^9.0.1
```

### Step 1.4 - Verify

- Start server: `cd server && npm start` — should listen on port 3001, auto-create `tasks.db`.
- Hit `GET /api/health` — should return `{ status: "ok", database: "connected", timestamp: "..." }`.
- Verify tables exist: check that `tasks.db` has all 9 tables.
- Verify seed data: context tags and built-in templates should exist.

---

## Phase 2: Backend API (Express Routes)

**Goal**: Implement all REST API endpoints in `server/index.js`.

### Step 2.1 - Server setup in `index.js`

```javascript
const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;
```

### Step 2.2 - Health & read endpoints

| Route | Handler |
|-------|---------|
| `GET /api/health` | Return `{ status, database, timestamp }` |
| `GET /api/tasks` | Call `db.getAllProjectsWithTasks()`, return `{ projects, tags, lastUpdated }` |
| `GET /api/stats` | Call `db.getStats()`, return `{ totalTasks, totalProjects, byStatus, byPriority }` |
| `POST /api/summary` | Call `db.getSummaryData()`, generate markdown summary string, return `{ summary, generatedAt }` |

**Summary generation logic** (server-side markdown):
- Health status (based on overdue ratio)
- Section: Overdue tasks list
- Section: Upcoming deadlines (next 7 days)
- Section: High priority tasks
- Section: Potential blockers (scan comments for keywords: "blocked", "waiting", "stuck", "depends")
- Section: Subtask progress (tasks with incomplete subtasks)
- Section: Per-project breakdown (task counts by status)

### Step 2.3 - Project CRUD endpoints

| Route | Handler |
|-------|---------|
| `POST /api/projects` | Validate `code` and `name` required. Call `db.createProject()`. Log activity. Return 201. |
| `PUT /api/projects/:code` | Call `db.updateProject()`. Log activity with changes. Return 200 or 404. |
| `PUT /api/projects/:code/archive` | Call `db.archiveProject()`. Log activity. Return `{ canUndo: true }`. |
| `PUT /api/projects/:code/restore` | Call `db.restoreProject()`. Log activity. Return 200. |
| `DELETE /api/projects/:code` | Call `db.deleteProject()`. Log activity. Return 200. |

### Step 2.4 - Task CRUD endpoints

| Route | Handler |
|-------|---------|
| `POST /api/projects/:projectCode/tasks` | Validate `title` required. Call `db.createTask()`. Log activity. Return `{ taskId, taskNumber }`. |
| `PUT /api/tasks/:id` | Call `db.updateTask()` (handles change logging internally). Return 200 or 404. |
| `DELETE /api/tasks/:id` | Check `?permanent` query param. Call `db.deleteTask()`. Log activity. Return `{ canUndo }`. |
| `POST /api/tasks/:id/restore` | Call `db.restoreTask()`. Log activity. Return 200. |
| `PUT /api/tasks/:id/pin` | Call `db.togglePin()`. Log activity. Return `{ pinned }`. |
| `PUT /api/tasks/:id/move` | Call `db.moveTask()`. Log activity. Return `{ newTaskNumber }`. |
| `PUT /api/tasks/bulk-move` | Call `db.bulkMoveTasks()`. Log activity. Return `{ movedCount, skippedCount, errorCount }`. |
| `PUT /api/projects/:projectCode/tasks/reorder` | Call `db.reorderTasks()`. Log activity. Return 200. |
| `PUT /api/tasks/reorder` | Call `db.reorderAllTasks()`. Log activity. Return 200. |
| `PUT /api/tasks/:id/tags` | Call `db.setTaskTags()`. Return `{ tags }`. |
| `GET /api/tasks/deleted` | Call `db.getDeletedTasks()`. Return `{ tasks, count }`. |
| `GET /api/tasks/:id/activity` | Call `db.getTaskActivity()`. Return `{ activities }`. |

### Step 2.5 - Tags endpoints

| Route | Handler |
|-------|---------|
| `GET /api/tags` | Return `{ tags }` (all). |
| `GET /api/tags/context` | Return context tags only. |
| `GET /api/tags/regular` | Return regular tags only. |
| `POST /api/tags` | Auto-detect `is_context` if name starts with `@`. Return 201 or 409. |
| `PUT /api/tags/:id` | Update name/color. Return 200 or 404/409. |
| `DELETE /api/tags/:id` | Delete (cascades to task_tags). Return 200. |

### Step 2.6 - Subtask endpoints

| Route | Handler |
|-------|---------|
| `GET /api/tasks/:id/subtasks` | Return `{ taskId, subtasks, stats: { total, completed } }`. |
| `POST /api/tasks/:id/subtasks` | Create subtask. Log activity. Return 201 with subtask. |
| `POST /api/tasks/:id/subtasks/bulk` | Bulk create. Log activity. Return 201 with subtasks array. |
| `PUT /api/tasks/:taskId/subtasks/:subtaskId` | Update title or completion. Log activity. Return 200. |
| `POST /api/tasks/:taskId/subtasks/:subtaskId/toggle` | Toggle completion. Log activity. Return `{ isCompleted, stats }`. |
| `PUT /api/tasks/:id/subtasks/reorder` | Reorder subtasks. Return 200. |
| `DELETE /api/tasks/:taskId/subtasks/:subtaskId` | Delete. Log activity. Return `{ stats }`. |

### Step 2.7 - Notes endpoints

| Route | Handler |
|-------|---------|
| `GET /api/tasks/:id/notes` | Return `{ taskId, notes, count }`. |
| `POST /api/tasks/:id/notes` | Create note. Log activity. Return 201 with note. |
| `PUT /api/tasks/:taskId/notes/:noteId` | Update note. Log activity. Return 200. |
| `DELETE /api/tasks/:taskId/notes/:noteId` | Delete note. Log activity. Return 200. |

### Step 2.8 - Pomodoro endpoints

| Route | Handler |
|-------|---------|
| `GET /api/pomodoro/active` | Get active session (auto-complete if expired). |
| `GET /api/pomodoro/stats/today` | Return `{ sessionCount, totalMinutes, date }`. |
| `GET /api/pomodoro/sessions` | Return recent sessions. |
| `POST /api/pomodoro/start` | Start session. Return 409 if one already active. Log activity. |
| `POST /api/pomodoro/:id/complete` | Complete session. Log activity. |
| `POST /api/pomodoro/:id/cancel` | Cancel session. |
| `PUT /api/pomodoro/:id/task` | Update linked task. |
| `GET /api/tasks/:id/pomodoro` | Get task-specific pomodoro stats. |

### Step 2.9 - Template endpoints

| Route | Handler |
|-------|---------|
| `GET /api/task-templates` | Return `{ templates }`. |
| `GET /api/task-templates/:id` | Return single template or 404. |
| `POST /api/task-templates` | Create custom template. Return 201. |
| `POST /api/task-templates/from-task/:taskId` | Create template from task. Return 201. |
| `PUT /api/task-templates/:id` | Update (reject built-in with 403). |
| `DELETE /api/task-templates/:id` | Delete (reject built-in with 403). |

### Step 2.10 - Activity & YAML endpoints

| Route | Handler |
|-------|---------|
| `GET /api/activity` | Paginated activity log with optional `entityType`, `entityId` filters. Return `{ activities, total, hasMore }`. |
| `GET /api/yaml` | Export as YAML using `js-yaml`. Return `{ content, lastModified }`. |

### Step 2.11 - Verify backend

Test all endpoints with curl or a REST client. Ensure:
- Creating a project, adding tasks, updating, deleting all work.
- Activity log captures all changes.
- Tags assignment works (many-to-many).
- Soft delete + restore works for tasks.
- Pomodoro sessions can be started/completed/cancelled.

---

## Phase 3: Frontend Foundation (App Shell, Theme, Data Fetching)

**Goal**: Build the root App component, theme system, basic CSS framework, and data fetching layer.

### Step 3.1 - Styling setup: `client/src/App.css`

Create the complete CSS file with:

1. **Google Fonts import**: Outfit (300-700) and JetBrains Mono (400-500).
2. **CSS custom properties** on `:root` (dark theme defaults):
   - `--bg-primary: #0f172a`, `--bg-secondary: #1e293b`, `--bg-card: #1e293b`
   - `--bg-card-hover: #283548`, `--bg-table-header: #334155`, `--bg-table-row-alt: #263244`
   - `--text-primary: #f1f5f9`, `--text-secondary: #94a3b8`, `--text-muted: #64748b`
   - `--accent-primary: #38bdf8`, `--accent-secondary: #818cf8`
   - `--border-color: #334155`
   - `--border-radius: 12px`, `--border-radius-sm: 6px`
3. **Light theme overrides** under `[data-theme='light']`:
   - `--bg-primary: #f8fafc`, `--bg-secondary: #ffffff`, `--bg-card: #ffffff`
   - `--text-primary: #0f172a`, `--text-secondary: #475569`
   - `--accent-primary: #0284c7`, `--accent-secondary: #6366f1`
   - `--border-color: #e2e8f0`
4. **Status color classes**: `.status-pending`, `.status-inprogress`, `.status-completed`, `.status-cancelled`, `.status-not-doing` with appropriate background and text colors.
5. **Priority color classes**: `.priority-high` (red), `.priority-medium` (amber), `.priority-low` (slate).
6. **Base styles**: body, *, scrollbar styling, font-family: Outfit.
7. **Layout**: `.app-container`, `.dashboard`, `.main-content` with flexbox.
8. **Component styles**: Add incrementally as components are built (Phases 3-8).

### Step 3.2 - Custom hooks

**`client/src/hooks/useTheme.js`**:
- Initialize from `localStorage.getItem('taskDashboard_theme')` or system `prefers-color-scheme`.
- Set `data-theme` attribute on `document.documentElement`.
- Return `{ theme, toggleTheme }`.

**`client/src/hooks/useFaviconBadge.js`**:
- Accept a count number.
- Draw a red circle with white count text on a canvas, convert to favicon.
- Update `document.title` with `(N)` prefix when count > 0.

### Step 3.3 - `client/src/App.jsx`

Root component responsibilities:
- State: `projects`, `tags`, `loading`, `error`.
- `fetchTasks()`: GET `/api/tasks`, set state.
- Call `fetchTasks()` on mount via `useEffect`.
- Use `useTheme()` hook.
- Use `useFaviconBadge()` with count of overdue + due-today tasks.
- Render: loading spinner, error state, or `<Dashboard>` with props: `projects`, `tags`, `onRefresh={fetchTasks}`.
- Include `<UndoToast>` provider/component.

### Step 3.4 - Verify

- `npm start` in client should show a loading state, then either empty dashboard or error.
- Theme toggle should switch between dark and light.
- Network tab should show successful GET `/api/tasks` call.

---

## Phase 4: Dashboard Layout & Navigation

**Goal**: Build the Dashboard component with header, sidebar, stats bar, and view switching.

### Step 4.1 - `Dashboard.jsx`

This is the **largest component**. It manages:

**State:**
- `viewMode`: 'projects' | 'tasks' | 'priority' | 'kanban' (persisted to `localStorage: taskDashboard_defaultView`)
- `searchQuery`, `statusFilter`, `priorityFilter`, `dateFilter`, `assigneeFilter`
- `showSummary` (slider panel toggle)
- `showArchived` (persisted to localStorage)
- `headerCollapsed`, `statsCollapsed`, `sidebarCollapsed` (all persisted)
- `selectedProject` (for sidebar scroll-to)
- `showQuickAdd`, `showQuickInbox`, `showTemplates`, `showReview`, `showKeyboardHelp`, `showFeatureGuide`
- `focusMode`, `focusTask`

**Layout structure:**
```
<div className="dashboard">
  <Sidebar />
  <div className="main-content">
    <header> (view toggle buttons, action buttons, search) </header>
    <StatsBar /> (collapsible task counts by status)
    <SearchFilterBar />
    <ContextFilterBar />
    <AttentionBanners /> (overdue, due-today alerts)
    {viewMode === 'projects' && <ProjectCards />}
    {viewMode === 'tasks' && <AllTasksView />}
    {viewMode === 'priority' && <PriorityMatrix />}
    {viewMode === 'kanban' && <KanbanBoard />}
  </div>
  <SliderPanel /> (summary/activity - conditionally rendered)
  <PomodoroTimer /> (floating widget)
  {/* Modals */}
  <QuickAddTaskModal />
  <QuickInboxModal />
  <TaskTemplatesModal />
  <ReviewMode />
  <KeyboardShortcutsHelp />
  <FeatureHelpGuide />
</div>
```

**CRUD handler functions** (all call API then `onRefresh()`):
- `handleCreateProject(data)` -> POST `/api/projects`
- `handleUpdateProject(code, data)` -> PUT `/api/projects/:code`
- `handleArchiveProject(code)` -> PUT `/api/projects/:code/archive`
- `handleRestoreProject(code, status)` -> PUT `/api/projects/:code/restore`
- `handleDeleteProject(code)` -> DELETE `/api/projects/:code`
- `handleCreateTask(projectCode, data)` -> POST `/api/projects/:code/tasks`
- `handleUpdateTask(id, data)` -> PUT `/api/tasks/:id`
- `handleDeleteTask(id, permanent)` -> DELETE `/api/tasks/:id`
- `handleRestoreTask(id)` -> POST `/api/tasks/:id/restore`
- `handleTogglePin(id)` -> PUT `/api/tasks/:id/pin`
- `handleMoveTask(id, projectCode)` -> PUT `/api/tasks/:id/move`
- `handleUpdateTags(taskId, tagIds)` -> PUT `/api/tasks/:id/tags`
- `handleReorderTasks(projectCode, taskOrders)` -> PUT `/api/projects/:code/tasks/reorder`

**Filtering logic** (apply in `useMemo`):
- Filter projects/tasks by searchQuery (match title, comments)
- Filter by status, priority, date range, assignee
- Filter by context tag if selected

### Step 4.2 - `Sidebar.jsx`

- Collapsible sidebar (width transitions between ~240px and ~60px).
- Projects grouped into 3 sections: Active (`In Progress`), Completed, Archived.
- Each project shows: color-coded avatar (first 2 chars of code), name, task completion %.
- When collapsed: show only avatars.
- Click project -> scroll to its card in main content + highlight animation.
- Collapse state persisted to `localStorage: taskDashboard_sidebarCollapsed`.

### Step 4.3 - `SearchFilterBar.jsx`

- Search input with `Ctrl+K` focus support.
- Dropdowns for: Status filter, Priority filter, Due date range (start/end date inputs), Assigned-to text input.
- "Clear filters" button when any filter is active.
- Emit filter values up to Dashboard via callback props.

### Step 4.4 - `ContextFilterBar.jsx`

- Horizontal scrollable bar of context tag buttons.
- Each button shows tag name with colored dot.
- Click to toggle filter; active tag highlighted.
- Collapsible (can hide the bar).

### Step 4.5 - Stats bar (inline in Dashboard)

- Row of stat cards: Total Tasks, Pending, In Progress, Completed, Overdue.
- Each with count and color.
- Collapsible via `Alt+Shift+S`.

### Step 4.6 - Verify

- Dashboard renders with header, sidebar, empty content area.
- View toggle buttons switch between placeholder views.
- Sidebar collapses/expands, persists state.
- Search bar focuses on `Ctrl+K`.
- Stats bar shows correct counts.

---

## Phase 5: Core Views - Projects & Task Table

**Goal**: Build the Projects view with ProjectCard and TaskTable - the main CRUD interface.

### Step 5.1 - `ProjectCard.jsx`

- Expandable card (click header to toggle).
- Expanded state persisted to `localStorage: taskDashboard_projectExpanded_[CODE]`.
- **Header shows**: project code badge, project name, status badge, task count (e.g., "5/12 done"), expand arrow.
- **Action buttons** (in header): Edit, Archive, Delete (with ConfirmDialog).
- **Expanded content**: `<TaskTable>` component with the project's tasks.
- **Edit mode**: Opens `<ProjectFormModal>` for editing project name/description/status.

### Step 5.2 - `FormModal.jsx`

Export two components:

**`ProjectFormModal`**:
- Fields: Code (text, uppercase, required, disabled when editing), Name (required), Description (textarea), Status (dropdown).
- Mode: create or edit.
- Validation: code and name required for create.

**`ConfirmDialog`**:
- Title, message, confirm button (red for destructive), cancel button.
- Used for delete confirmations.

### Step 5.3 - `TaskTable.jsx`

This is the **most complex frontend component**. It renders a table of tasks with:

**Table columns**: Drag handle | Pin | # | Title | Due Date | Status | Priority | Progress | Tags | Actions

**Features to implement:**
1. **Sortable columns**: Click column header to sort (by title, due date, status, priority, progress).
2. **Inline status editing**: Click status badge -> dropdown to change status.
3. **Inline priority editing**: Click priority badge -> dropdown.
4. **Progress bar**: Visual bar 0-100%, clickable to edit.
5. **Tag pills**: Colored tag badges, click to open InlineTagEditor.
6. **Pin button**: Toggle pin (pinned tasks always at top).
7. **Due date display**: Show date + relative text ("Due in 2 days", "3 days overdue"). Color red if overdue, amber if today.
8. **Action buttons per row**: Pin, Focus, Subtasks (with count badge), Notes (with count badge), Edit, Duplicate, Move, Delete.
9. **Add Task button**: Opens task form modal at bottom of table.
10. **Drag-and-drop reordering**: Drag handle on left side of each row. On drop, call reorder API.
11. **Subtask stats**: Show "2/5" badge on subtask button.
12. **Note count**: Show count badge on notes button.

**Task form modal fields**: Title (required), Due Date (NaturalDateInput), Assigned To, Status (dropdown), Priority (dropdown), Quadrant (dropdown), Progress (slider), Comments (textarea, markdown).

**Row styling**:
- Pinned rows: light blue background with left border.
- Overdue rows: subtle red tint.
- Alternating row backgrounds.
- Completed/cancelled tasks: muted/strikethrough title.

### Step 5.4 - `NaturalDateInput.jsx`

- Text input that accepts natural language OR date picker.
- Supported inputs: `today`, `tomorrow`/`tom`/`tmr`, day names (`monday`, `fri`), `next monday`, `this friday`, `in N days/weeks/months`, `+Nd`/`+Nw`/`+Nm`, `end of week`/`eow`, `end of month`/`eom`, `next week`, `next month`.
- Show preview of parsed date below input.
- Fallback to standard date picker (calendar icon).

### Step 5.5 - `InlineTagEditor.jsx`

- Popover that appears when clicking tags on a task row.
- Shows all available tags as checkboxes (grouped: Context tags, Regular tags).
- Check/uncheck to add/remove tags from the task.
- "Create new tag" inline form (name + color picker).
- On change, call `PUT /api/tasks/:id/tags` with updated tag ID array.

### Step 5.6 - `UndoToast.jsx`

- Fixed position at bottom-center of screen.
- Shows message like "Task deleted" with Undo button.
- Progress bar showing 5-second countdown.
- Multiple toasts stack vertically.
- On "Undo" click -> call restore API -> refresh data.
- Auto-dismiss after 5 seconds.
- Export `useUndoToasts()` hook for managing toast queue.

### Step 5.7 - Verify

- Projects display as expandable cards.
- Task table renders with all columns.
- Create/edit/delete tasks works end-to-end.
- Inline status and priority changes work.
- Tags can be assigned via InlineTagEditor.
- Undo toast appears on delete.
- Drag-and-drop reorder persists.
- Natural date input parses "tomorrow", "+3d", etc.

---

## Phase 6: Additional Views - All Tasks, Priority Matrix, Kanban

**Goal**: Implement the remaining three view modes.

### Step 6.1 - `AllTasksView.jsx`

- Flat table of ALL tasks across all projects (reuse TaskTable column structure).
- Additional "Project" column showing project code badge.
- Sorting by any column (including project).
- Global drag-and-drop reorder (calls `PUT /api/tasks/reorder`).
- Bulk operations toolbar: select tasks with checkboxes, then Move or change status.
- Uses same filtering from Dashboard (search, status, priority, etc.).

### Step 6.2 - `PriorityMatrix.jsx`

- 2x2 CSS Grid layout:
  - Q1 (top-left): DO FIRST - red header
  - Q2 (top-right): SCHEDULE - blue header
  - Q3 (bottom-left): DELEGATE - amber header
  - Q4 (bottom-right): ELIMINATE - gray header
- Each quadrant shows task cards (title, project badge, priority, due date).
- Tasks without quadrant default to ELIMINATE.
- Drag-and-drop between quadrants to reassign (calls `PUT /api/tasks/:id` with new quadrant).
- Task card click -> edit modal.

### Step 6.3 - `KanbanBoard.jsx`

- Horizontal swim lanes (columns) by status:
  - PENDING (amber), INPROGRESS (blue), COMPLETED (green), CANCELLED (red).
- Each column: header with count badge, collapsible, scrollable card list.
- **Task cards show**: project badge, priority indicator, title, progress bar, due date (with overdue/today styling), assignee, tags (max 3 + "+N"), pin indicator.
- **Drag-and-drop**: Drag cards between columns to change status (calls `PUT /api/tasks/:id` with new status).
- **Card actions on hover**: Focus, Edit, Delete.
- **Sorting within columns**: Pinned first, then priority (HIGH > MEDIUM > LOW), then due date (earliest first).
- **Stats footer**: Total count + per-column counts.
- **Responsive**: 4 columns on desktop, 2x2 on tablet, stacked on mobile.

### Step 6.4 - Verify

- All four views render correctly and switch cleanly.
- All Tasks view shows tasks from all projects.
- Priority Matrix shows tasks in correct quadrants.
- Kanban drag-and-drop changes task status.
- Filtering applies to all views.

---

## Phase 7: Productivity Features

**Goal**: Build Pomodoro timer, Subtasks, Notes, Templates, Quick Inbox, and Review Mode.

### Step 7.1 - `usePomodoro.js` hook

- State: `isRunning`, `timeRemaining`, `mode` ('work'|'shortBreak'|'longBreak'), `sessionId`, `taskId`, `sessionsCompleted`.
- Sync with backend: `POST /api/pomodoro/start`, `POST /api/pomodoro/:id/complete`, `GET /api/pomodoro/active`.
- `setInterval` for countdown.
- Persist state to `localStorage: taskDashboard_pomodoroState` for page refresh recovery.
- On timer complete: play audio chime (Web Audio API - generate a simple tone), send browser notification.
- Duration presets: 25min (work), 15min (short work), 5min (short break), 15min (long break after 4 sessions).

### Step 7.2 - `PomodoroTimer.jsx`

- Compact floating widget (bottom-right or sidebar).
- Shows: circular/linear timer display, time remaining, current mode.
- Controls: Start/Pause, Stop/Cancel, duration preset buttons (25/15/5 min).
- Task selector dropdown (optional - link session to a task).
- Today's stats: "3 sessions, 75 min focused".
- Expand/collapse between mini and full view.

### Step 7.3 - `SubtasksChecklist.jsx`

- Modal or inline expandable panel.
- List of subtask items, each with: checkbox, title text, edit/delete buttons, drag handle.
- Add subtask input at bottom (Enter to add).
- Progress bar: "3/5 completed (60%)".
- Toggle checkbox -> calls `POST /api/tasks/:taskId/subtasks/:subtaskId/toggle`.
- Drag-and-drop reorder.
- Inline title editing (click to edit).

### Step 7.4 - `TaskNotesPanel.jsx`

- Slide-out panel (or modal).
- Shows task title at top.
- "Add Note" section: textarea with markdown support, "Add" button.
- Notes list (newest first): each note shows content (rendered with react-markdown), timestamp, edit/delete buttons.
- Edit mode: textarea replaces rendered content.

### Step 7.5 - `QuickInboxModal.jsx`

- Command-palette style overlay (triggered by `Alt+I`).
- Single text input, focused on open.
- Enter to add task to INBOX project (auto-created if doesn't exist).
- Shows list of recently added tasks below input for feedback.
- Esc to close.

### Step 7.6 - `QuickAddTaskModal.jsx`

- Triggered by `Alt+N`.
- Similar to task form but with project dropdown selector.
- Title + project are minimum required fields.
- Quick and lightweight for fast task creation.

### Step 7.7 - `TaskTemplatesModal.jsx`

- Triggered by `Alt+T`.
- Grid of template cards (icon, name, description).
- Search/filter templates.
- Click template -> opens task creation form pre-filled with template defaults.
- "New Template" button -> template creation form.
- "Create from existing task" option.
- Built-in templates show lock icon (not editable/deletable).

### Step 7.8 - `ReviewMode.jsx`

- Full-screen overlay.
- Step-by-step wizard with 3 steps:
  1. **Review Overdue**: List overdue tasks with quick actions (Complete, In Progress, Cancel).
  2. **Update Progress**: In-progress tasks with progress slider.
  3. **Plan Ahead**: Upcoming tasks + unscheduled high-priority items.
- Progress indicator at top (Step 1/2/3).
- Daily review: looks at today + tomorrow.
- Weekly review: looks at next 7 days.
- Triggered by `Alt+Shift+R` (type selection), `Alt+D` (daily), `Alt+W` (weekly).

### Step 7.9 - Verify

- Pomodoro timer counts down, plays sound, sends notification.
- Subtasks can be added/toggled/reordered.
- Notes can be created with markdown rendering.
- Quick Inbox captures tasks to INBOX project.
- Templates pre-fill task forms.
- Review Mode walks through all steps.

---

## Phase 8: Utility Features & Polish

**Goal**: Implement remaining hooks, keyboard shortcuts, notifications, summary panel, and polish.

### Step 8.1 - `useHotkeys.js` hook

Register global keyboard event listener with all shortcuts:

| Keys | Action |
|------|--------|
| `Alt+I` | Open Quick Inbox |
| `Alt+N` | Open Quick Add Task |
| `Alt+P` | Open New Project |
| `Alt+T` | Open Task Templates |
| `Alt+R` | Refresh data |
| `Alt+Shift+R` | Open Review Mode |
| `Alt+W` | Weekly Review |
| `Alt+D` | Daily Review |
| `Ctrl+K` | Focus search |
| `Escape` | Close active modal/panel |
| `Alt+L` | Toggle theme |
| `Alt+1/2/3/4` | Switch view |
| `Alt+S` | Toggle summary |
| `Alt+H` | Toggle header toolbar |
| `Alt+Shift+S` | Toggle stats |
| `Alt+O` | Focus mode |
| `Alt+/` | Keyboard shortcuts help |
| `Alt+Shift+/` | Feature guide |

**Important**: Ignore shortcuts when focus is in `<input>`, `<textarea>`, `<select>`, or `[contenteditable]`.

### Step 8.2 - `useNotifications.js` hook

- Request notification permission after 3-second delay on first load.
- On data load, check for overdue and due-today tasks.
- Send browser notification for each (deduplicated per day via `localStorage: taskDashboard_notifiedTasks`).
- Schedule 1-hour-before notifications for tasks with specific due times.
- Notifications auto-close after 10 seconds.

### Step 8.3 - `useSnooze.js` hook

- Track snoozed items in `localStorage: taskDashboard_snoozedItems`.
- Each snooze entry: `{ taskId, expiresAt }`.
- Durations: 15min, 30min, 1hr, 3hrs, end-of-day (11:59 PM), tomorrow (8 AM).
- Auto-expire: filter out expired snoozes on each check.
- `snoozeItem(taskId, duration)`, `isItemSnoozed(taskId)`, `snoozeAll(taskIds, duration)`.

### Step 8.4 - `useNaturalDate.js` hook

- Export `parseNaturalDate(input)` function.
- Returns `{ date: Date | null, preview: string }`.
- Handles all formats listed in NaturalDateInput spec.

### Step 8.5 - `SliderPanel.jsx`

- Slide-out panel from right side.
- Two tabs: **Summary** and **Activity**.
- **Summary tab**: Calls `POST /api/summary`, renders returned markdown using `react-markdown`.
- **Activity tab**: Calls `GET /api/activity` with pagination. Shows activity entries with:
  - Color-coded action icons
  - Entity name and type
  - Human-readable description
  - Timestamp (relative)
  - Expandable change details (old -> new values)
  - "Load More" button for pagination.

### Step 8.6 - `KeyboardShortcutsHelp.jsx`

- Modal overlay (triggered by `Alt+/`).
- Grid of shortcuts grouped by category: Actions, Navigation, View, Help.
- Platform-aware key display (show `Cmd` on Mac, `Ctrl` on Windows).

### Step 8.7 - `FeatureHelpGuide.jsx`

- Modal with feature descriptions grouped by category.
- Each feature: name, description, tips, related shortcuts.
- Scrollable with sections.

### Step 8.8 - Attention Banners (in Dashboard)

- Show at top of main content area.
- **Overdue banner**: Red, lists tasks past due date with "X days overdue".
- **Due Today banner**: Amber, lists tasks due today.
- Each item: task title, project, snooze button (dropdown with duration options).
- "Snooze All" button.
- Hide snoozed items.

### Step 8.9 - Focus Mode (in Dashboard)

- Full-screen overlay showing single task details.
- Display: title, project, priority/status badges, due date, assignee, tags, comments/notes.
- Minimal chrome - just the task info and an X/Escape to exit.
- `Alt+O` to toggle (remembers last focused task).

### Step 8.10 - Final CSS polish

- Responsive breakpoints: desktop (>1200px), tablet (768-1200px), mobile (<768px).
- Transitions and animations: sidebar collapse, card expand, modal open/close, toast slide-in.
- Scrollbar styling for dark theme.
- Print-friendly styles (optional).
- Ensure all components follow the design tokens (CSS variables).

### Step 8.11 - Verify everything

Run through complete feature checklist:
- [ ] All 4 views work (Projects, Tasks, Priority, Kanban)
- [ ] Project CRUD (create, edit, archive, restore, delete)
- [ ] Task CRUD (create, edit, delete with undo, restore)
- [ ] Drag-and-drop in all applicable views
- [ ] Tags (create, assign, filter by context)
- [ ] Subtasks (add, toggle, reorder, delete)
- [ ] Notes (add, edit, delete, markdown rendering)
- [ ] Pomodoro timer (start, complete, stats)
- [ ] Templates (use built-in, create custom)
- [ ] Quick Inbox and Quick Add
- [ ] Review Mode (daily and weekly)
- [ ] Keyboard shortcuts (all 20+)
- [ ] Theme toggle (dark/light)
- [ ] Search and filters
- [ ] Activity log with changes
- [ ] Smart summary
- [ ] Favicon badge
- [ ] Browser notifications
- [ ] Snooze attention items
- [ ] Focus mode
- [ ] Pin tasks
- [ ] Natural date input
- [ ] YAML export
- [ ] Responsive layout

---

## Phase 9 (Optional): Shell Scripts & Convenience

### Step 9.1 - `start-dashboard.sh`

```bash
#!/bin/bash
# Check Node.js, install deps if needed, start server + client
```

### Step 9.2 - `stop-dashboard.sh`

```bash
#!/bin/bash
# Kill processes on ports 3000 and 3001
```

### Step 9.3 - `server/migrate-yaml.js` (optional)

- Read `PendingTasks.yaml` from project root.
- Parse with `js-yaml`.
- Insert projects and tasks into database.
- Support `--fresh` flag to drop and recreate.

---

## Execution Notes for AI Agent

1. **Work in order**: Complete each phase before moving to the next. Each phase ends with a verification step.
2. **One file at a time**: Write complete files - don't leave TODOs or placeholders in code.
3. **Test after each step**: Run the app after each sub-step to catch errors early.
4. **CSS incrementally**: Add styles for each component as you build it, all in `App.css`.
5. **Error handling**: Every API call in the frontend should have try/catch. Every route handler in the backend should have try/catch with appropriate HTTP status codes.
6. **Activity logging**: Every mutation endpoint must log to `activity_log`.
7. **State refresh pattern**: After every mutation, call `onRefresh()` to re-fetch all data from the server.
8. **No TypeScript**: This is a JavaScript-only project (CommonJS on server, JSX on client).
9. **No external state library**: Use only React's built-in useState, useCallback, useMemo, useEffect.
10. **Refer to `app-spec.json`** for exact field names, enum values, and API response schemas.

---

## Gap Analysis & Implementation Status (Feb 2026)

### Completed Gap Fixes

| Gap | Status | Implementation |
|-----|--------|----------------|
| QuickAddTaskModal not connected | ✅ Fixed | Connected in Dashboard.jsx with proper callbacks |
| QuickInboxModal not connected | ✅ Fixed | Connected in Dashboard.jsx with proper callbacks |
| TaskTemplatesModal not connected | ✅ Fixed | Connected in Dashboard.jsx with proper callbacks |
| ReviewMode not connected | ✅ Fixed | Connected in Dashboard.jsx with daily/weekly support |
| Trash/Recycle Bin UI | ✅ Fixed | Added TrashModal component + trash button in header |
| Weekly Review keyboard shortcuts | ✅ Fixed | Added Alt+D (daily) and Alt+W (weekly) shortcuts |

### Features Already Implemented (Verified)

- ✅ Task Duplication Button (in TaskTable.jsx action buttons)
- ✅ Bulk Move UI (in AllTasksView.jsx with checkbox selection)
- ✅ All CRUD operations for projects and tasks
- ✅ Drag-and-drop reordering
- ✅ Pomodoro Timer with backend sync
- ✅ Subtasks/Checklists
- ✅ Task Notes/Journal
- ✅ Activity Log
- ✅ Smart Summary
- ✅ Keyboard Shortcuts (20+)
- ✅ Theme Toggle (dark/light)
- ✅ Focus Mode
- ✅ Pin Tasks
- ✅ Natural Date Input
- ✅ GTD Context Tags
- ✅ Kanban Board
- ✅ Priority Matrix
- ✅ Browser Notifications
- ✅ Favicon Badge
- ✅ Snooze Attention Items
- ✅ Search & Filter
- ✅ YAML Export API

### No Critical Gaps Found

The codebase was thoroughly reviewed against `app-spec.json`, `README.md`, and `ARCHITECTURE.md`. All major features documented in the specification are implemented and functional. The only issues found were:

1. **Modal Connection Issues**: Some modals (QuickAddTask, QuickInbox, TaskTemplates, ReviewMode) existed as components but weren't properly wired in Dashboard.jsx. These have been fixed.

2. **Minor UI Additions**: Added Trash Modal for viewing/restoring deleted tasks, and enhanced keyboard shortcuts for weekly review.

---

## File Count Summary

| Directory | Files | Key Files |
|-----------|-------|-----------|
| `server/` | 3 | `index.js`, `database.js`, `migrate-yaml.js` |
| `client/src/` | 3 | `index.jsx`, `App.jsx`, `App.css` |
| `client/src/components/` | 18 | Dashboard, ProjectCard, TaskTable, AllTasksView, PriorityMatrix, KanbanBoard, Sidebar, SearchFilterBar, ContextFilterBar, SliderPanel, FormModal, QuickAddTaskModal, QuickInboxModal, TaskTemplatesModal, PomodoroTimer, InlineTagEditor, NaturalDateInput, TaskNotesPanel, SubtasksChecklist, ReviewMode, KeyboardShortcutsHelp, FeatureHelpGuide, UndoToast |
| `client/src/hooks/` | 7 | useTheme, useHotkeys, usePomodoro, useNotifications, useFaviconBadge, useSnooze, useNaturalDate |
| Root | 2-3 | start-dashboard.sh, stop-dashboard.sh |
