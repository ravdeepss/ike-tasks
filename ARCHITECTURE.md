# Task Dashboard - Architecture Guide

This document provides a high-level overview of the Task Dashboard architecture, component relationships, and key interaction sequences.

## Table of Contents

- [System Overview](#system-overview)
- [Technology Stack](#technology-stack)
- [Architecture Diagram](#architecture-diagram)
- [Frontend Architecture](#frontend-architecture)
  - [Component Hierarchy](#component-hierarchy)
  - [State Management](#state-management)
  - [Custom Hooks](#custom-hooks)
- [Backend Architecture](#backend-architecture)
  - [API Layer](#api-layer)
  - [Database Layer](#database-layer)
- [Data Flow](#data-flow)
- [Key Sequences](#key-sequences)
  - [Application Startup](#1-application-startup)
  - [Create Task](#2-create-task)
  - [Update Task Status (Inline)](#3-update-task-status-inline)
  - [Delete Task with Undo](#4-delete-task-with-undo)
  - [Pomodoro Timer Session](#5-pomodoro-timer-session)
  - [Generate Summary Report](#6-generate-summary-report)
- [Database Entity Relationships](#database-entity-relationships)
- [Error Handling Strategy](#error-handling-strategy)
- [Performance Considerations](#performance-considerations)

## System Overview

Task Dashboard is a full-stack task management application following a **client-server architecture** with:

- **Frontend**: React Single Page Application (SPA)
- **Backend**: Express.js REST API server
- **Database**: SQLite for persistent storage
- **Communication**: JSON over HTTP (proxied in development)

```
┌─────────────────────────────────────────────────┐
│                    Browser                       │
│  ┌─────────────────────────────────────────────┐ │
│  │            React Application                │ │
│  │  ┌─────────┐  ┌───────────┐  ┌───────────┐ │ │
│  │  │ App.jsx │──│ Dashboard │──│ProjectCard/│ │ │
│  │  │         │  │           │  │ TaskTable  │ │ │
│  │  └─────────┘  └───────────┘  └───────────┘ │ │
│  └─────────────────────┬───────────────────────┘ │
│                        │                         │
│               fetch('/api/...')                   │
└────────────────────────┬─────────────────────────┘
                         │
              HTTP (port 3000 → proxy → 3001)
                         │
┌────────────────────────┴─────────────────────────┐
│           Express Server (port 3001)              │
│  ┌─────────────────────────────────────────────┐ │
│  │              index.js (Routes)              │ │
│  │  /api/tasks  /api/projects  /api/pomodoro   │ │
│  │  /api/activity                              │ │
│  └─────────────────────┬───────────────────────┘ │
│                        │                         │
│  ┌─────────────────────┴───────────────────────┐ │
│  │           database.js (SQLite)              │ │
│  │  Projects │ Tasks │ Tags │ Activity Log │   │ │
│  │  Pomodoro Sessions                          │ │
│  └─────────────────────┬───────────────────────┘ │
└────────────────────────┬─────────────────────────┘
                         │
                  ┌──────┴──────┐
                  │  tasks.db   │
                  │  (SQLite)   │
                  └─────────────┘
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 | UI components and state management |
| **Styling** | CSS3 (Custom) | Theming, responsive design |
| **Backend** | Express.js | REST API server |
| **Database** | SQLite (better-sqlite3) | Persistent data storage |
| **Dev Proxy** | Create React App | Proxy API requests to backend |

## Architecture Diagram

### High-Level Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         App.jsx                             │
│  • Global state (projects, tags, loading)                   │
│  • Data fetching (fetchTasks, refreshData)                  │
│  • Undo toast management                                    │
│  • Favicon badge (attention count)                          │
├─────────────────────────────────────────────────────────────┤
│                       Dashboard.jsx                         │
│  • View mode toggle (Tasks/Priority)                        │
│  • Search & filtering                                       │
│  • Project creation                                         │
│  • Attention banners (overdue, due today)                   │
├───────────┬────────────┬──────────────┬───────────┬─────────┤
│  Sidebar  │ProjectCard │PriorityMatrix│ Pomodoro  │ Slider  │
│           │            │              │  Timer    │  Panel  │
│• Project  │• Project   │• Quadrant    │• Timer    │• Summary│
│  navigation│  CRUD     │  view        │  state    │  report │
│• Status   │• TaskTable │• Drag/drop   │• Task     │• Activity│
│  grouping │  component │  (future)    │  select   │  log    │
│           │            │              │• Auto-log │         │
│           │            │              │  sessions │         │
├───────────┴────────────┴──────────────┴───────────┴─────────┤
│                                                             │
│                        TaskTable                            │
│                                                             │
│  • Task CRUD                                                │
│  • Inline edit                                              │
│  • Filtering                                                │
│  • Sorting                                                  │
└─────────────────────────────────────────────────────────────┘
```

## Frontend Architecture

### Component Hierarchy

```
App.jsx
├── Dashboard.jsx
│   ├── Sidebar.jsx              # Project navigation
│   ├── SearchFilterBar.jsx      # Global search & filters
│   ├── PomodoroTimer.jsx        # Focus timer
│   ├── ProjectCard.jsx          # Project container
│   │   └── TaskTable.jsx        # Task list with CRUD
│   │       └── FormModal.jsx    # Task/Project forms
│   ├── PriorityMatrix.jsx       # Quadrant view
│   └── SliderPanel.jsx          # Summary & Activity
└── UndoToast.jsx                # Undo notifications
```

### State Management

The application uses **React's built-in state management** (useState, useCallback, useMemo) rather than external libraries:

| State Location | Purpose | Persistence |
|---------------|---------|-------------|
| `App.jsx` | Global data (projects, tags), loading state | Memory |
| `Dashboard.jsx` | View mode, filters, UI state | localStorage |
| `ProjectCard.jsx` | Expanded state, edit modals | localStorage |
| `TaskTable.jsx` | Sort/filter state, inline editing | Memory |
| `usePomodoro.js` | Timer state, active session | localStorage + API |
| `useTheme.js` | Dark/Light theme | localStorage |

### Custom Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useTheme` | `hooks/useTheme.js` | Theme toggle with system preference detection |
| `useFaviconBadge` | `hooks/useFaviconBadge.js` | Dynamic favicon with attention count |
| `usePomodoro` | `hooks/usePomodoro.js` | Pomodoro timer state and API sync |
| `useUndoToasts` | `components/UndoToast.jsx` | Toast queue management with undo support |

## Backend Architecture

### API Layer

The Express server (`server/index.js`) provides RESTful endpoints organized by resource:

```
/api
├── /tasks                    # GET: All projects with tasks
├── /stats                    # GET: Task statistics
├── /summary                  # POST: Generate markdown report
├── /health                   # GET: Health check
│
├── /projects
│   ├── POST                  # Create project
│   ├── /:code PUT            # Update project
│   ├── /:code DELETE         # Delete project
│   ├── /:code/archive PUT    # Archive project
│   ├── /:code/restore PUT    # Restore project
│   └── /:code/tasks POST     # Create task in project
│
├── /tasks
│   ├── /:id PUT              # Update task
│   ├── /:id DELETE           # Soft delete task
│   ├── /:id/restore POST    # Restore deleted task
│   ├── /:id/tags PUT         # Update task tags
│   ├── /:id/activity GET     # Task activity history
│   └── /:id/pomodoro GET     # Task pomodoro stats
│
├── /tags
│   ├── GET                   # All tags
│   ├── POST                  # Create tag
│   ├── /:id PUT              # Update tag
│   └── /:id DELETE           # Delete tag
│
├── /activity
│   └── GET                   # Activity log (paginated)
│
└── /pomodoro
    ├── /active GET           # Get active session
    ├── /stats/today GET      # Today's stats
    ├── /sessions GET         # Recent sessions
    ├── /start POST           # Start session
    ├── /:id/complete POST    # Complete session
    ├── /:id/cancel POST      # Cancel session
    └── /:id/task PUT         # Update session task
```

### Database Layer

The database module (`server/database.js`) provides:

- **Connection management**: Singleton pattern with lazy initialization
- **Table creation**: Auto-creates tables on first run
- **CRUD operations**: Prepared statements for all entities
- **Transaction support**: For complex operations (e.g., setTaskTags)
- **Activity logging**: Automatic audit trail for all changes

## Data Flow

### Unidirectional Data Flow

```
┌──────────┐    ┌───────────┐    ┌──────────┐    ┌──────────┐
│   User   │───>│ Component │───>│ API Call │───>│ Database │
│  Action  │    │  Handler  │    │  (fetch) │    │ (SQLite) │
└──────────┘    └───────────┘    └──────────┘    └────┬─────┘
                                                      │
┌──────────┐    ┌───────────┐    ┌──────────┐         │
│    UI    │<───│   State   │<───│ Response │<────────┘
│  Update  │    │   Update  │    │  (JSON)  │
└──────────┘    └───────────┘    └──────────┘
```

### Data Refresh Pattern

After any mutation (create/update/delete), the application:

1. Calls the API endpoint
2. On success, calls `onRefresh()` passed from `App.jsx`
3. `App.jsx` re-fetches all data via `GET /api/tasks`
4. React re-renders with updated state

This ensures data consistency at the cost of extra API calls (acceptable for this scale).

## Key Sequences

### 1. Application Startup

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌──────────┐
│ Browser │     │ App.jsx │     │ Server  │     │ Database │
└────┬────┘     └────┬────┘     └────┬────┘     └────┬─────┘
     │               │               │               │
     │  Load page    │               │               │
     │──────────────>│               │               │
     │               │               │               │
     │               │ GET /api/tasks│               │
     │               │──────────────>│               │
     │               │               │               │
     │               │               │ Query projects │
     │               │               │──────────────>│
     │               │               │               │
     │               │               │ Query tasks/tags
     │               │               │──────────────>│
     │               │               │               │
     │               │               │  Return data  │
     │               │               │<──────────────│
     │               │               │               │
     │               │ { projects, tags, lastUpdated }
     │               │<──────────────│               │
     │               │               │               │
     │ Render Dashboard              │               │
     │<──────────────│               │               │
     │               │               │               │
```

### 2. Create Task

```
┌──────┐   ┌───────────┐   ┌─────────┐   ┌─────────┐   ┌──────────┐
│ User │   │ TaskTable │   │ App.jsx │   │ Server  │   │ Database │
└──┬───┘   └─────┬─────┘   └────┬────┘   └────┬────┘   └────┬─────┘
   │             │               │              │              │
   │ Click Add Task              │              │              │
   │────────────>│               │              │              │
   │             │               │              │              │
   │   Show TaskFormModal        │              │              │
   │<────────────│               │              │              │
   │             │               │              │              │
   │ Fill form,  │               │              │              │
   │ click Save  │               │              │              │
   │────────────>│               │              │              │
   │             │               │              │              │
   │             │ POST /api/projects/:code/tasks│             │
   │             │──────────────────────────────>│              │
   │             │               │              │              │
   │             │               │              │ INSERT task  │
   │             │               │              │─────────────>│
   │             │               │              │              │
   │             │               │              │ Log activity │
   │             │               │              │─────────────>│
   │             │               │              │              │
   │             │ { taskId, taskNumber }        │              │
   │             │<──────────────────────────────│              │
   │             │               │              │              │
   │             │  onRefresh()  │              │              │
   │             │──────────────>│              │              │
   │             │               │              │              │
   │             │               │GET /api/tasks│              │
   │             │               │─────────────>│              │
   │             │               │              │              │
   │             │               │ Updated data │              │
   │             │               │<─────────────│              │
   │             │               │              │              │
   │ UI refreshed with new task  │              │              │
   │<────────────│               │              │              │
   │             │               │              │              │
```

### 3. Update Task Status (Inline)

```
┌──────┐     ┌───────────┐     ┌─────────┐     ┌──────────┐
│ User │     │ TaskTable │     │ Server  │     │ Database │
└──┬───┘     └─────┬─────┘     └────┬────┘     └────┬─────┘
   │               │                │                │
   │ Click status  │                │                │
   │ badge         │                │                │
   │──────────────>│                │                │
   │               │                │                │
   │ Show dropdown │                │                │
   │<──────────────│                │                │
   │               │                │                │
   │ Select new    │                │                │
   │ status        │                │                │
   │──────────────>│                │                │
   │               │                │                │
   │               │ PUT /api/tasks/:id              │
   │               │ { status: 'COMPLETED' }         │
   │               │───────────────>│                │
   │               │                │                │
   │               │                │  UPDATE task   │
   │               │                │───────────────>│
   │               │                │                │
   │               │                │  Log activity  │
   │               │                │ (status change)│
   │               │                │───────────────>│
   │               │                │                │
   │               │  { success }   │                │
   │               │<───────────────│                │
   │               │                │                │
   │ Status updated│                │                │
   │ (optimistic UI)               │                │
   │<──────────────│                │                │
   │               │                │                │
```

### 4. Delete Task with Undo

```
┌──────┐  ┌───────────┐  ┌─────────┐  ┌───────────┐  ┌─────────┐  ┌──────────┐
│ User │  │ TaskTable │  │ App.jsx │  │ UndoToast │  │ Server  │  │ Database │
└──┬───┘  └─────┬─────┘  └────┬────┘  └─────┬─────┘  └────┬────┘  └────┬─────┘
   │            │              │              │              │            │
   │ Click delete              │              │              │            │
   │───────────>│              │              │              │            │
   │            │              │              │              │            │
   │            │ DELETE /api/tasks/:id (soft)│              │            │
   │            │─────────────────────────────────────────-->│            │
   │            │              │              │              │            │
   │            │              │              │              │ SET        │
   │            │              │              │              │ deleted_at │
   │            │              │              │              │───────────>│
   │            │              │              │              │            │
   │            │ { taskId, canUndo: true }   │              │            │
   │            │<─────────────────────────────────────────── │            │
   │            │              │              │              │            │
   │            │ showDeleteToast()           │              │            │
   │            │─────────────>│              │              │            │
   │            │              │              │              │            │
   │            │              │  Add toast   │              │            │
   │            │              │─────────────>│              │            │
   │            │              │              │              │            │
   │ See toast  │              │  Show toast  │              │            │
   │ "Task deleted"            │  (5s timer)  │              │            │
   │<──────────────────────────│<─────────────│              │            │
   │            │              │              │              │            │
   │ Click "Undo"             │              │              │            │
   │──────────────────────────────────────────>│              │            │
   │            │              │              │              │            │
   │            │              │ handleUndo() │              │            │
   │            │              │<─────────────│              │            │
   │            │              │              │              │            │
   │            │              │ POST /api/tasks/:id/restore │            │
   │            │              │─────────────────────────────>│            │
   │            │              │              │              │            │
   │            │              │              │              │ SET        │
   │            │              │              │              │ deleted_at │
   │            │              │              │              │ = NULL     │
   │            │              │              │              │───────────>│
   │            │              │              │              │            │
   │            │              │              │              │<───────────│
   │            │              │              │              │            │
   │            │              │ refreshData()│              │            │
   │            │              │─────────────────────────────>│            │
   │            │              │              │              │            │
   │ Task restored             │              │              │            │
   │<───────────│              │              │              │            │
   │            │              │              │              │            │
```

### 5. Pomodoro Timer Session

```
┌──────┐  ┌───────────────┐  ┌─────────────┐  ┌─────────┐  ┌──────────┐
│ User │  │PomodoroTimer │  │ usePomodoro │  │ Server  │  │ Database │
└──┬───┘  └──────┬────────┘  └──────┬──────┘  └────┬────┘  └────┬─────┘
   │             │                  │               │            │
   │ Select task │                  │               │            │
   │────────────>│                  │               │            │
   │             │  selectTask()    │               │            │
   │             │─────────────────>│               │            │
   │             │                  │               │            │
   │ Click Start │                  │               │            │
   │────────────>│                  │               │            │
   │             │  startTimer()    │               │            │
   │             │─────────────────>│               │            │
   │             │                  │               │            │
   │             │                  │POST /api/pomodoro/start    │
   │             │                  │──────────────>│            │
   │             │                  │               │            │
   │             │                  │               │INSERT      │
   │             │                  │               │session     │
   │             │                  │               │───────────>│
   │             │                  │               │            │
   │             │                  │  { sessionId }│            │
   │             │                  │<──────────────│            │
   │             │                  │               │            │
   │             │ Start countdown  │               │            │
   │             │ (setInterval)    │               │            │
   │             │<─────────────────│               │            │
   │             │                  │               │            │
   │Timer running│                  │               │            │
   │(25:00...0:00)                  │               │            │
   │<────────────│                  │               │            │
   │             │                  │               │            │
   │             │  🔴 Timer reaches 0:00          │            │
   │             │                  │               │            │
   │             │handleTimerComplete()             │            │
   │             │─────────────────>│               │            │
   │             │                  │               │            │
   │             │                  │POST /api/pomodoro/:id/complete
   │             │                  │──────────────>│            │
   │             │                  │               │            │
   │             │                  │               │UPDATE      │
   │             │                  │               │session     │
   │             │                  │               │(completed) │
   │             │                  │               │───────────>│
   │             │                  │               │            │
   │             │                  │               │Log activity│
   │             │                  │               │───────────>│
   │             │                  │               │            │
   │  🔔 Notification              │               │            │
   │  + Sound    │                  │               │            │
   │<────────────│                  │               │            │
   │             │                  │               │            │
   │Stats updated│                  │               │            │
   │(sessions +1)│                  │               │            │
   │<────────────│                  │               │            │
   │             │                  │               │            │
```

### 6. Generate Summary Report

```
┌──────┐     ┌─────────────┐     ┌─────────┐     ┌──────────┐
│ User │     │ SliderPanel │     │ Server  │     │ Database │
└──┬───┘     └──────┬──────┘     └────┬────┘     └────┬─────┘
   │                │                  │               │
   │ Click Summary  │                  │               │
   │───────────────>│                  │               │
   │                │                  │               │
   │  Panel opens   │                  │               │
   │<───────────────│                  │               │
   │                │                  │               │
   │                │ POST /api/summary│               │
   │                │─────────────────>│               │
   │                │                  │               │
   │                │                  │ getTaskStats  │
   │                │                  │──────────────>│
   │                │                  │               │
   │                │                  │ getOverdue    │
   │                │                  │──────────────>│
   │                │                  │               │
   │                │                  │ getUpcoming   │
   │                │                  │──────────────>│
   │                │                  │               │
   │                │                  │ getHighPri    │
   │                │                  │──────────────>│
   │                │                  │               │
   │                │                  │<──────────────│
   │                │                  │               │
   │                │                  │ Generate      │
   │                │                  │ Markdown      │
   │                │                  │               │
   │                │   { summary }    │               │
   │                │<─────────────────│               │
   │                │                  │               │
   │ Display markdown                  │               │
   │<───────────────│                  │               │
   │                │                  │               │
```

## Database Entity Relationships

```
┌──────────────┐        ┌──────────────────┐        ┌──────────┐
│   projects   │        │      tasks       │        │   tags   │
├──────────────┤        ├──────────────────┤        ├──────────┤
│ code (PK)    │◄───┐   │ project_code(FK) │        │ id (PK)  │
│ name         │ 1:N│   │ id (PK)          │        │ name     │
│ description  │    └───│ task_number      │        │ color    │
│ status       │        │ title            │        └────┬─────┘
└──────────────┘        │ due_date         │             │
                        │ status           │             │
                        │ priority         │  ┌──────────┴───┐
                        │ progress         │  │  task_tags    │
                        │ deleted_at       │  ├──────────────┤
                        └────────┬─────────┘  │ task_id (FK) │
                                 │       N:M  │ tag_id (FK)  │
                                 └────────────┤              │
                                              └──────────────┘

┌──────────────────┐    ┌──────────────────────┐
│  activity_log    │    │  pomodoro_sessions   │
├──────────────────┤    ├──────────────────────┤
│ id (PK)          │    │ id (PK)              │
│ timestamp        │    │ task_id (FK)─────────────► tasks.id
│ entity_type      │    │ duration_minutes     │
│ entity_id        │    │ started_at           │
│ action_type      │    │ completed_at         │
│ changes (JSON)   │    │ status               │
│ description      │    │ notes                │
└──────────────────┘    └──────────────────────┘
```

## Error Handling Strategy

### Frontend

| Layer | Strategy |
|-------|----------|
| API Calls | try/catch with user-friendly error messages |
| Form Validation | Client-side validation before submission |
| Loading States | Disable buttons, show spinners during async ops |
| Network Errors | Display error UI with retry option |

### Backend

| Layer | Strategy |
|-------|----------|
| Route Handlers | try/catch with appropriate HTTP status codes |
| Database Errors | Log to console, return 500 with message |
| Validation | Return 400 for missing/invalid data |
| Not Found | Return 404 for missing resources |
| Conflicts | Return 409 for duplicate keys |

## Performance Considerations

### Current Optimizations

1. **Prepared Statements**: SQLite queries use prepared statements for efficiency
2. **Indexes**: Database indexes on frequently queried columns (project_code, status, due_date)
3. **Memoization**: React `useMemo` for computed values (filtered tasks, stats)
4. **Lazy Loading**: Activity log uses pagination (load more)
5. **Local Storage**: User preferences cached client-side

### Scaling Considerations

For larger deployments, consider:

1. **Database**: Migrate to PostgreSQL for concurrent access
2. **Caching**: Add Redis for session/frequently accessed data
3. **API**: Implement cursor-based pagination for large datasets
4. **Frontend**: Virtualized lists for 1000+ tasks
5. **Real-time**: WebSocket for multi-user sync

## Further Reading

- [README.md](README.md) - Setup guide and feature documentation
- [React Documentation](https://react.dev) - Frontend framework
- [Express.js Guide](https://expressjs.com) - Backend routing
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - Database driver
