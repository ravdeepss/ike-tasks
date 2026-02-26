# Task Dashboard

A React + Node.js task management dashboard powered by SQLite.

> **Looking for technical details?** See the [Architecture Guide](ARCHITECTURE.md) for system design, component relationships, and sequence diagrams.

## Table of Contents

- [Architecture Guide](ARCHITECTURE.md) - System design & sequence diagrams
- [Features](#features)
  - [Core Features](#core-features)
  - [User Experience](#user-experience)
  - [Productivity Tools](#productivity-tools)
  - [Notifications & Reminders](#notifications--reminders)
- [View Modes](#view-modes)
  - [Kanban Board](#kanban-board)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
  - [Option A: One-Click Start (WSL/Linux)](#option-a-one-click-start-wsllinux)
  - [Option B: Manual Start](#option-b-manual-start)
- [Using the Dashboard](#using-the-dashboard)
  - [Managing Projects](#managing-projects)
  - [Managing Tasks](#managing-tasks)
  - [Task Fields](#task-fields)
  - [Search & Filter](#search--filter)
  - [Move Tasks](#move-tasks)
  - [Project Restore](#project-restore)
  - [Task Duplication](#task-duplication)
  - [Subtasks/Checklists](#subtaskschecklists)
  - [Project Templates](#project-templates)
  - [Sidebar Navigation](#sidebar-navigation)
  - [Keyboard Shortcuts](#keyboard-shortcuts)
  - [Quick Inbox](#quick-inbox)
  - [Task Templates](#task-templates)
  - [Natural Language Dates](#natural-language-dates)
  - [Pomodoro Timer](#pomodoro-timer)
  - [Focus Mode](#focus-mode)
  - [Review Mode](#review-mode)
  - [Browser Notifications](#browser-notifications)
  - [Snooze (Remind Me Later)](#snooze-remind-me-later)
  - [Pin Tasks](#pin-tasks)
  - [Undo Delete](#undo-delete)
  - [Theme Toggle](#theme-toggle)
  - [Relative Date Display](#relative-date-display)
  - [Refresh Button](#refresh-button)
  - [Activity Log](#activity-log)
  - [Smart Summary](#smart-summary)
  - [Feature Help Guide](#feature-help-guide)
  - [YAML Export](#yaml-export)
  - [Task Notes / Journal](#task-notes--journal)
  - [GTD Context Tags](#gtd-context-tags)
  - [Drag-and-Drop Reordering](#drag-and-drop-reordering)
- [API Endpoints](#api-endpoints)
  - [Read Operations](#read-operations)
  - [Project CRUD](#project-crud)
  - [Task CRUD](#task-crud)
  - [Tags CRUD](#tags-crud)
  - [Activity Log API](#activity-log-api)
  - [Pomodoro Sessions](#pomodoro-sessions)
  - [YAML Export API](#yaml-export-api)
- [Database Schema](#database-schema)
- [YAML Import Format (Optional)](#yaml-import-format-optional)
- [Task Statuses](#task-statuses)
- [Priority Matrix (Covey Quadrants)](#priority-matrix-covey-quadrants)
  - [Quadrant Values](#quadrant-values)
  - [Matrix Layout](#matrix-layout)
- [User Preferences (localStorage)](#user-preferences-localstorage)
- [Troubleshooting](#troubleshooting)
  - [Database Issues](#database-issues)
  - [Port Conflicts](#port-conflicts)
- [Pending Feature Improvements](#pending-feature-improvements)

## Features

### Core Features

- **Full CRUD operations** - Create, edit, archive, restore, and delete projects and tasks
- **SQLite database** - Fast, reliable data storage with proper querying
- **Search & Filter** - Full-text search across titles and comments with filters for status, priority, due date range, and assignee
- **Multiple view modes** - Toggle between Projects, Tasks, Priority Matrix, and Kanban Board views
- **Priority Matrix** - Covey's Urgent/Important quadrant view for task prioritization
- **Kanban Board** - Drag-and-drop columns by status for visual workflow management
- **Status badges** - Color-coded task status (Pending, In Progress, Completed)
- **Tags system** - Create and assign colored tags to tasks for filtering
- **GTD Context Tags** - Pre-defined context tags (@computer, @calls, @errands, etc.) for Getting Things Done workflow
- **Pin Tasks** - Pin important tasks to always show at top regardless of filters or sorting
- **Subtasks/Checklists** - Nested checklist items within tasks for breaking down work into smaller steps
- **Task Notes/Journal** - Rich text notes per task for detailed progress tracking and documentation
- **Activity Log** - Track all changes with full audit trail and change history
- **Smart Summary** - Server-generated markdown summary with health status, overdue tasks, upcoming deadlines, potential blockers (keyword detection), subtask progress, and project breakdown
- **YAML Export** - Export all projects and tasks as YAML-formatted text
- **Responsive design** - Works on desktop and mobile

### User Experience

- **Dark/Light Theme** - Toggle between dark and light themes (persists between sessions)
- **Collapsible Sidebar** - Quick project navigation with colored avatars when collapsed
- **Task Duplication** - Clone tasks with all fields for quick task creation
- **Project Templates** - Create new projects from predefined templates
- **Relative Date Display** - Shows "Due in 2 days" / "3 days overdue" alongside dates
- **Manual Refresh** - Refresh button with loading spinner as alternative to browser refresh
- **Empty State Onboarding** - Welcoming first-time user experience with feature highlights
- **Favicon Badge** - Shows count of overdue/due-today tasks in browser tab
- **Activity Feed** - View recent changes in the Summary panel's Activity tab
- **Drag-and-Drop Reordering** - Manually reorder tasks within projects or across the All Tasks view
- **Move Tasks** - Move individual tasks or bulk-move multiple tasks between projects
- **Undo Delete** - Soft delete with 5-second undo toast for accidental task deletions
- **Feature Help Guide** - Interactive feature tour explaining all capabilities with tips and usage instructions (`Alt+Shift+/`)

### Productivity Tools

- **Pomodoro Timer** - Built-in focus timer with task linking and session tracking
- **Focus Mode** - Distraction-free full-screen view showing only the current task
- **Review Mode** - Guided daily/weekly review walkthrough for overdue tasks, progress updates, and planning
- **Quick Inbox** - Rapid task capture with `Alt+I` hotkey; triage later into projects
- **Task Templates** - Reusable task blueprints for common work patterns (press `Alt+T`)
- **Keyboard Shortcuts** - Global hotkeys for common actions (press `Alt+/` or `?` to see all)
- **Natural Language Dates** - Type "tomorrow", "next friday", "in 3 days" instead of picking from calendar

### Notifications & Reminders

- **Browser Notifications** - Push notifications for overdue and due-today tasks on page load; scheduled alerts for tasks due within 1 hour
- **Snooze** - "Remind me later" for attention banner items with flexible duration options (15 min to end of day)
- **Snooze All** - Dismiss all attention items at once with a single click

## Prerequisites

- Node.js 16+ installed
- npm or yarn

## Project Structure

```
TaskDashboard/
├── server/                    # Express backend
│   ├── index.js               # API server with CRUD endpoints
│   ├── database.js            # SQLite database module
│   ├── migrate-yaml.js        # Optional: YAML import script
│   └── package.json
├── client/                    # React frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── components/
│   │   │   ├── Dashboard.jsx          # Main dashboard with view toggle
│   │   │   ├── ProjectCard.jsx        # Project cards with CRUD actions
│   │   │   ├── TaskTable.jsx          # Task table with CRUD actions
│   │   │   ├── AllTasksView.jsx       # Flat cross-project task list
│   │   │   ├── FormModal.jsx          # Modal forms for create/edit
│   │   │   ├── PriorityMatrix.jsx     # Priority view - Covey quadrants
│   │   │   ├── KanbanBoard.jsx        # Kanban board with drag-and-drop
│   │   │   ├── SliderPanel.jsx        # Summary side panel
│   │   │   ├── Sidebar.jsx            # Collapsible project navigation
│   │   │   ├── SearchFilterBar.jsx    # Search and filter controls
│   │   │   ├── ContextFilterBar.jsx   # GTD context tag filter bar
│   │   │   ├── PomodoroTimer.jsx      # Focus timer component
│   │   │   ├── QuickAddTaskModal.jsx  # New task with project selection
│   │   │   ├── QuickInboxModal.jsx    # Rapid task capture to inbox
│   │   │   ├── NaturalDateInput.jsx   # Natural language date input
│   │   │   ├── InlineTagEditor.jsx    # Inline tag management popover
│   │   │   ├── TaskNotesPanel.jsx     # Task notes slide-out panel
│   │   │   ├── KeyboardShortcutsHelp.jsx # Shortcuts help overlay
│   │   │   ├── FeatureHelpGuide.jsx   # Feature tour/guide modal
│   │   │   ├── ReviewMode.jsx         # Daily/weekly review walkthrough
│   │   │   ├── SubtasksChecklist.jsx  # Nested checklist items within tasks
│   │   │   ├── UndoToast.jsx          # Undo toast for soft delete actions
│   │   │   └── TaskTemplatesModal.jsx # Task template selection modal
│   │   └── hooks/
│   │       ├── useFaviconBadge.js     # Favicon badge for attention count
│   │       ├── useHotkeys.js          # Global keyboard shortcuts
│   │       ├── useNaturalDate.js      # Natural language date parsing
│   │       ├── useNotifications.js    # Browser push notifications
│   │       ├── usePomodoro.js         # Pomodoro timer state management
│   │       ├── useSnooze.js           # Snooze/remind-later for attention items
│   │       └── useTheme.js            # Theme toggle hook
│   ├── public/
│   └── package.json
├── tasks.db                   # SQLite database (auto-created on first run)
└── README.md
```

## Quick Start

### Option A: One-Click Start (WSL/Linux)

```bash
cd TaskDashboard
chmod +x start-dashboard.sh
./start-dashboard.sh
```

This script:

- Checks for Node.js/npm
- Auto-installs dependencies if missing
- Starts both server and client
- Shows colored status output
- Press `Ctrl+C` to stop both servers

To stop manually:

```bash
./stop-dashboard.sh
```

### Option B: Manual Start

**1. Install dependencies**

```bash
# Install server dependencies
cd TaskDashboard/server
npm install

# Install client dependencies
cd ../client
npm install
```

**2. Initialize the database (first time only)**

The SQLite database (`tasks.db`) is created automatically when the server starts. For a fresh checkout:

**Option A: Start with empty database**

```bash
cd TaskDashboard/server
npm start
```

The database will be created with empty tables. Use the UI to add projects and tasks.

**Option B: Import from existing YAML file (optional)**

If you have a `PendingTasks.yaml` file with existing data:

```bash
cd TaskDashboard/server
npm run migrate
```

To re-import and replace existing data:

```bash
npm run migrate:fresh
```

See [YAML Import Format](#yaml-import-format-optional) for the expected file structure.

**3. Start the servers**

**Terminal 1 - Start backend:**

```bash
cd TaskDashboard/server
npm start
```

Server runs at http://localhost:3001

**Terminal 2 - Start frontend:**

```bash
cd TaskDashboard/client
npm start
```

App opens at http://localhost:3000

**4. View Dashboard**

Open http://localhost:3000 in your browser.

## Using the Dashboard

### Managing Projects

- **Add Project**: Click "Add Project" button in the header
- **Edit Project**: Expand a project card, click "Edit" button
- **Archive Project**: Click "Archive" to soft-delete (preserves data)
- **Delete Project**: Click "Delete" to permanently remove project and all tasks

### Managing Tasks

- **Add Task**: Expand a project, click "Add Task" button in the task table
- **Edit Task**: Click the pencil icon on any task row
- **Delete Task**: Click the trash icon on any task row

### Task Fields

| Field | Description |
|-------|-------------|
| Title | Task description (required) |
| Due Date | Target completion date |
| Assigned To | Person responsible |
| Status | PENDING, INPROGRESS, COMPLETED, DONE, CANCELLED, NOT DOING |
| Priority | HIGH, MEDIUM, LOW |
| Quadrant | DO FIRST, SCHEDULE, DELEGATE, ELIMINATE |
| Progress | Completion percentage (0-100%) |
| Comments | Additional notes |
| Tags | Colored labels for categorization |
| Pinned | Keep task at top of lists (toggle via pin button) |
| Subtasks | Nested checklist items for breaking down work |
| Notes | Rich text journal entries for progress tracking |

### Search & Filter

Find tasks quickly using full-text search and multiple filter dimensions:

**Search:**

- Use the search bar (`Ctrl+K` or `/` to focus) to search across task titles and comments
- Results update as you type

**Filters:**

- **Status** - Filter by PENDING, INPROGRESS, COMPLETED, DONE, CANCELLED, NOT DOING
- **Priority** - Filter by HIGH, MEDIUM, LOW
- **Due Date Range** - Filter tasks within a date range
- **Assigned To** - Filter by assignee

**Context Filter Bar:**

- A collapsible bar below the search shows all GTD context tags as clickable buttons
- Click a context tag to show only tasks tagged with that context
- Combine with other filters for precise task lists

### Move Tasks

Move individual tasks or bulk-move multiple tasks between projects:

**Single Task Move:**

1. Use the task's context menu or action buttons to select "Move to..."
2. Choose the destination project
3. The task is re-assigned a new task number in the target project

**Bulk Move:**

1. Select multiple tasks using checkboxes in the All Tasks view
2. Click the "Move" action in the bulk operations toolbar
3. Choose the destination project
4. All selected tasks are moved at once

**API:**

- `PUT /api/tasks/:id/move` - Move a single task
- `PUT /api/tasks/bulk-move` - Bulk move multiple tasks

### Project Restore

Restore a previously archived project to active status:

1. Show archived projects (toggle "Show Archived" in settings)
2. Find the archived project
3. Click "Restore" to bring it back to active status

**API:** `PUT /api/projects/:code/restore`

### Task Duplication

Clone any task by clicking the **copy icon** in the task row actions. The duplicated task:

- Opens a pre-filled form with "(Copy)" appended to the title
- Resets status to PENDING
- Resets progress to 0%
- Preserves all other fields including tags

### Subtasks/Checklists

Break down tasks into smaller, actionable steps with nested subtasks. Each task can have multiple checklist items that track completion progress.

**Accessing Subtasks:**

1. In the task table, click the **checklist icon** (checkbox with list) in the task's action buttons
2. A count badge shows how many subtasks exist for each task (e.g., "3/5" for 3 of 5 completed)
3. The subtasks panel opens as a modal or inline view

**What You Can Do:**

- **Add Subtasks**: Type in the input field at the bottom and press `Enter` or click "Add"
- **Toggle Complete**: Click the checkbox to mark a subtask as done
- **Edit Subtasks**: Click on the subtask text to edit inline
- **Delete Subtasks**: Hover over a subtask and click the X button
- **Reorder Subtasks**: Drag and drop using the handle on the left side

**Progress Tracking:**

- A progress bar shows completion percentage (e.g., "3/5 completed")
- The parent task displays subtask stats in the task list view
- Helps visualize task breakdown at a glance

**Use Cases:**

- Breaking down complex tasks into manageable steps
- Creating deployment checklists
- Tracking multi-step processes (e.g., code review checklist)
- Meeting preparation or follow-up items
- Research tasks with multiple investigation points

**Visual Indicators:**

- Tasks with subtasks show a **subtask count badge** on the checklist button
- Completed subtasks display with strikethrough text
- Progress bar fills based on completion percentage

### Project Templates

When creating a new project, choose from predefined templates:

| Template | Description | Tasks Included |
|----------|-------------|----------------|
| **Blank Project** | Start from scratch | None |
| **Feature Development** | Standard feature workflow | 7 tasks (requirements, design, implementation, review, testing, docs, deploy) |
| **Bug Fix Sprint** | Bug tracking workflow | 5 tasks (triage, root cause, fix, testing, deploy) |
| **Research & POC** | Research initiatives | 6 tasks (objectives, research, prototype, evaluation, documentation, report) |
| **System Migration** | Migration workflow | 8 tasks (assessment, backup, setup, migration, validation, cutover, verification, decommission) |

### Sidebar Navigation

The collapsible sidebar on the left provides quick project navigation:

- Projects grouped by status (Active, Completed, Archived)
- Click a project to scroll to it with highlight animation
- **Expanded view**: Shows project code, name, and completion percentage
- **Collapsed view**: Shows colored avatar badges with project initials
- Collapse/expand state persists between sessions
- Toggle with the arrow button in the sidebar header

### Keyboard Shortcuts

The dashboard supports global keyboard shortcuts for power users. Press `Alt+/` or `?` to view all shortcuts.

| Shortcut | Action |
|----------|--------|
| `Alt+I` | Quick Inbox - rapid task capture |
| `Alt+N` | New Task (with project selection) |
| `Alt+P` | New Project |
| `Alt+T` | Task Templates - create from blueprints |
| `Alt+R` | Refresh data |
| `Alt+Shift+R` | Open Review Mode (type selection) |
| `Alt+D` | Daily Review (direct) |
| `Alt+W` | Weekly Review (direct) |
| `Ctrl+K` or `/` | Focus search |
| `Alt+L` | Toggle theme (dark/light) |
| `Alt+1` | Switch to Projects view |
| `Alt+2` | Switch to Tasks view |
| `Alt+3` | Switch to Priority Matrix view |
| `Alt+4` | Switch to Kanban Board view |
| `Alt+S` | Toggle Summary panel |
| `Alt+H` | Toggle header toolbar |
| `Alt+Shift+S` | Toggle stats panel |
| `Alt+O` | Toggle Focus Mode |
| `Alt+/` or `?` | Show keyboard shortcuts help |
| `Alt+Shift+/` | Open Feature Help Guide |
| `Escape` | Close modal/panel/Focus Mode |

### Quick Inbox

Rapidly capture tasks without interrupting your workflow:

1. Press `Alt+I` anywhere in the app
2. Type your task and press `Enter`
3. Task is added to the **INBOX** project (auto-created if needed)
4. Continue adding more tasks or press `Esc` to close
5. Triage tasks later by editing them and moving to appropriate projects

**Features:**

- Command palette-style interface
- Shows recently added tasks for visual feedback
- No project selection needed - captures to inbox for later organization
- Ideal for brainstorming, meeting notes, or quick thoughts

### Task Templates

Create tasks from reusable blueprints for common work patterns:

1. Press `Alt+T` anywhere in the app (or click the "Templates" button)
2. Select a template from the grid
3. Choose a project and customize the task details
4. Click "Create Task" to add it to your project

**Built-in Templates:**

| Template | Description | Default Priority |
|----------|-------------|-----------------|
| **Quick Task** | Simple task for rapid captures | None |
| **Code Review** | Review code changes / pull requests | MEDIUM |
| **Bug Investigation** | Investigate and document bugs | HIGH |
| **Meeting Follow-up** | Action items from meetings | MEDIUM |
| **Research Task** | Research and document findings | MEDIUM |
| **Documentation** | Write or update documentation | LOW |
| **Deployment Task** | Deploy to staging/production | HIGH |
| **Waiting For** | Blocked task waiting on someone | LOW |

**Creating Custom Templates:**

1. Press `Alt+T` to open the templates modal
2. Click "New Template" button
3. Fill in the template details:
   - Name and icon
   - Default task title (can be a prefix like "Review: ")
   - Default priority and quadrant
   - Estimated duration
   - Default comments/checklist (supports markdown)
4. Click "Save Template"

**Features:**

- Search and filter templates by name or description
- Custom templates can be edited or deleted
- Built-in templates cannot be modified
- Templates can include markdown checklists in comments

### Natural Language Dates

Enter due dates using natural language instead of clicking through a calendar:

**Supported Formats:**

| Input | Result |
|-------|--------|
| `today` | Today's date |
| `tomorrow`, `tom`, `tmr` | Tomorrow |
| `friday`, `mon` | Next occurrence of that day |
| `next monday` | Monday of next week |
| `this friday` | Friday of current week |
| `in 3 days` | 3 days from now |
| `in 2 weeks` | 2 weeks from now |
| `in 1 month` | 1 month from now |
| `+5` or `+5d` | 5 days from now |
| `+2w` | 2 weeks from now |
| `+1m` | 1 month from now |
| `end of week` or `eow` | This Friday |
| `end of month` or `eom` | Last day of current month |
| `next week` | 7 days from now |
| `next month` | 1 month from now |

**How to Use:**

1. Click into any Due Date field
2. Type a natural language expression (e.g., "tomorrow")
3. A preview shows the parsed date
4. Press `Enter` to confirm, or click the calendar icon to use the date picker

**Where Available:**

- Quick Add Task modal (`Alt+N`)
- Task edit forms
- All task creation dialogs

### Pomodoro Timer

Built-in focus timer based on the Pomodoro Technique:

**Accessing the Timer:**

- Click the timer icon in the sidebar (minimized view)
- Expand to see full controls and stats

**Features:**

- **Duration presets**: 15, 25, 45, or 60 minute sessions
- **Task linking**: Optionally associate a session with a specific task
- **Session tracking**: View today's completed sessions and focus time
- **Break reminders**: Prompts for short (5 min) or long (15 min) breaks
- **Audio notifications**: Sound alert when timer completes
- **Browser notifications**: Desktop notifications (with permission)
- **Persistent sessions**: Sessions survive page refresh - timer continues from where you left off

**Workflow:**

1. Select a duration (default 25 minutes)
2. Optionally select a task to work on
3. Click "Start Focus"
4. Work until the timer completes
5. Take a break, then start another session

**Session Recovery:** If you refresh the page during an active session:

- The timer automatically restores and continues counting down
- If the session timer has elapsed, it's automatically completed
- Your focus time is preserved in the daily stats

### Focus Mode

Enter a distraction-free full-screen view to concentrate on a single task:

**Entering Focus Mode:**

1. Click the **focus icon** (concentric circles/target) on any task in the task list
2. Or select a task in the Pomodoro timer and click "Focus Mode"
3. The screen transitions to show only that task

**What's Displayed:**

- Task title and description
- Project name and code
- Priority and status badges
- Due date and assignee
- Tags
- Notes section
- Motivational footer

**Exiting Focus Mode:**

- Press `Escape`
- Click the X button in the top-right corner
- Press `Alt+O` to toggle off

**Re-entering Focus Mode:**

- After using Focus Mode once, press `Alt+O` to re-enter with the same task
- The last focused task is remembered for quick re-entry

**Keyboard Shortcut:**

| Shortcut | Action |
|----------|--------|
| `Alt+O` | Toggle Focus Mode (after first use) |
| `Ctrl+Shift+F` | Alternative shortcut |
| `Escape` | Exit Focus Mode |

**Ideal Use Cases:**

- Deep work sessions with the Pomodoro timer
- Reviewing task details without distractions
- Presenting task information in meetings

### Review Mode

A guided walkthrough for daily or weekly reviews to help you stay on top of tasks, update progress, and plan ahead.

**Accessing Review Mode:**

- Click the **review icon** (clipboard with checkmark) in the header quick actions
- Press `Alt+Shift+R` to open with type selection
- Press `Alt+D` for direct Daily Review
- Press `Alt+W` for direct Weekly Review

**Review Types:**

| Type | Description |
|------|-------------|
| **Daily Review** | Quick check-in focusing on today and tomorrow |
| **Weekly Review** | Full review covering the next 7 days |

**Review Steps:**

1. **Review Overdue** - Address tasks past their due date
   - See all overdue tasks sorted by due date
   - Quick actions: Mark Complete, Mark In Progress, or Cancel
   - Shows how many days each task is overdue

2. **Update Progress** - Check on in-progress work
   - Review all tasks currently in progress
   - Update progress percentage with inline slider
   - Mark tasks complete when finished

3. **Plan Ahead** - Prepare for upcoming work
   - View tasks due within your review horizon (1 or 7 days)
   - See high-priority tasks without due dates that need scheduling
   - Start working on upcoming tasks directly from the review

**Features:**

- Step-by-step wizard with progress indicator
- Click any step to jump directly to it
- Task counts shown for each step
- Empty states with encouraging messages when sections are clear
- Keyboard shortcuts for quick access to specific review types

**Keyboard Shortcuts:**

| Shortcut | Action |
|----------|--------|
| `Alt+Shift+R` | Open Review Mode with type selection |
| `Alt+D` | Start Daily Review directly |
| `Alt+W` | Start Weekly Review directly |
| `Escape` | Close Review Mode |

**Ideal Use Cases:**

- Morning routine to plan your day
- End-of-week review to prepare for next week
- Getting back on track after time away
- Regular GTD-style weekly reviews

### Browser Notifications

The dashboard can send browser push notifications to keep you informed about upcoming deadlines:

**Notification Types:**

- **Overdue tasks** - Notified on page load if you have overdue tasks
- **Due today** - Notified on page load for tasks due today
- **Due in 1 hour** - Scheduled notification for tasks with specific due times

**Features:**

- Auto-requests permission on first visit (after 3 second delay)
- Notifications are de-duplicated per day (won't spam for same task)
- Click notification to focus the dashboard window
- Auto-closes after 10 seconds

**Permission:**

- Grant permission when prompted, or manually enable in browser settings
- Notifications work across browser tabs when the dashboard is open

### Snooze (Remind Me Later)

Temporarily dismiss attention banners for overdue, due-today, or upcoming high-priority tasks:

**How to Snooze:**

1. In the attention banners at the top of the dashboard, click the "Snooze" button on any item
2. Select a duration from the dropdown:
   - 15 minutes
   - 30 minutes
   - 1 hour
   - 3 hours
   - Until tomorrow (8 AM next day)
   - End of day (11:59 PM)
3. The item disappears from the banner until the snooze expires

**Snooze All:**

- Click "Snooze All (N)" to dismiss all visible attention items at once
- Useful for clearing notifications during focused work sessions

**Snooze Indicator:**

- Shows count of currently snoozed items (e.g., "3 items snoozed")
- Snoozed items automatically reappear when their snooze expires

**Persistence:**

- Snooze state is saved to localStorage
- Survives page refresh and browser restart
- Expired snoozes are automatically cleaned up

### Pin Tasks

Pin important tasks to keep them at the top of task lists, regardless of any filters or sorting applied.

**How to Pin:**

1. In either the **Projects view** or **All Tasks view**, find the task you want to pin
2. Click the **pin icon** in the task's action buttons (first button)
3. The task is now pinned and will appear at the top of the list

**Visual Indicators:**

- **Pinned row**: Light blue background with left border highlight
- **Pin icon**: Filled pin icon next to the task title
- **Pin button**: Highlighted/active state when task is pinned

**Behavior:**

- Pinned tasks always appear at the top of task lists
- Works with all filters (status, tags, projects)
- Works with all sorting options (priority, due date, project)
- Pin status persists in the database (survives refresh)
- Available in both Projects view and All Tasks view

**Unpinning:**

- Click the pin button again to unpin a task
- Task returns to its normal position based on current filters/sorting

**Activity Log:**

- Pin/unpin actions are logged in the activity feed
- Shows who pinned/unpinned and when

### Undo Delete

When you delete a task, it's soft-deleted and can be restored within 5 seconds using the undo toast notification.

**How It Works:**

1. Delete a task using the trash icon
2. An undo toast appears at the bottom of the screen
3. Click "Undo" within 5 seconds to restore the task
4. The toast auto-dismisses after 5 seconds if not acted upon

**Features:**

- **Progress Bar**: Visual countdown showing time remaining to undo
- **Multiple Toasts**: Multiple deletions queue up as stacked toasts
- **Soft Delete**: Deleted tasks are marked with a `deleted_at` timestamp rather than permanently removed
- **Data Preservation**: All task data (tags, notes, subtasks) is preserved until permanently purged

**Permanent Deletion:**

- Soft-deleted tasks older than 30 days are automatically purged
- Use the `?permanent=true` query parameter on the delete endpoint for immediate permanent deletion

**API Support:**

- `DELETE /api/tasks/:id` - Soft delete (default)
- `DELETE /api/tasks/:id?permanent=true` - Permanent delete
- `POST /api/tasks/:id/restore` - Restore a soft-deleted task
- `GET /api/tasks/deleted` - List all soft-deleted tasks (for trash view)

### Drag-and-Drop Reordering

Manually reorder tasks by dragging them to a new position:

**How to Reorder:**

1. Hover over a task row to reveal the drag handle (six dots on the left)
2. Click and hold the drag handle
3. Drag the task to its new position
4. Release to drop the task

**Visual Indicators:**

- **Drag handle**: Six-dot icon appears on hover on the left side of each task
- **Dragging**: Task row becomes semi-transparent while being dragged
- **Drop target**: Blue line indicator shows where the task will be placed

**Features:**

- Works in both **Projects view** (per-project ordering) and **All Tasks view** (global ordering)
- Custom sort order is persisted in the database (`sort_order` column)
- Reorder is logged in the activity feed
- Pinned tasks remain at the top regardless of custom ordering

**API Endpoints:**

- `PUT /api/projects/:code/tasks/reorder` - Reorder tasks within a project
- `PUT /api/tasks/reorder` - Reorder tasks globally (All Tasks view)

### Theme Toggle

Switch between **Dark** and **Light** themes using the sun/moon button in the header:

- Dark theme: Professional slate/charcoal color palette (default)
- Light theme: Clean, bright interface
- Theme preference saved to localStorage
- Respects system color scheme preference on first load

### Relative Date Display

Due dates show relative time information:

- "Due today" / "Due tomorrow"
- "Due in X days" (up to 7 days)
- "Due in ~X weeks" (up to 30 days)
- "X days overdue" for past dates
- Color-coded: red for overdue, amber for today

### Refresh Button

Manual refresh button in the header:

- Click to reload all data from the server
- Shows spinning animation during refresh
- Alternative to browser refresh (F5)
- Useful after external database changes

### Activity Log

Track all changes to projects and tasks with a comprehensive audit trail:

**Accessing the Activity Log:**

1. Click the "Summary" button in the dashboard header
2. Select the "Activity" tab in the slider panel

**What's Tracked:**

- **Create** - New projects, tasks, tags, and templates
- **Update** - Field changes with old and new values
- **Delete** - Removed projects, tasks, tags, notes, and subtasks
- **Archive/Restore** - Archived and restored projects
- **Move/Reorder** - Tasks moved between projects or reordered
- **Pin/Unpin** - Task pin status changes
- **Status Changes** - Task status transitions
- **Pomodoro** - Session start and completion
- **Notes** - Note add, update, and delete
- **Subtasks** - Subtask add, bulk add, complete, uncomplete, update, and delete

**Activity Feed Features:**

- Color-coded icons for each action type
- Field-level change details (e.g., status: PENDING → COMPLETED)
- User attribution and timestamps
- Pagination with "Load More" for older entries
- Refresh button to fetch latest activity

### Smart Summary

A server-generated markdown report providing an overview of your task landscape:

**Accessing the Summary:**

- Click the "Summary" button in the dashboard header
- Press `Alt+S` to toggle the Summary panel

**What's Included:**

- **Health Status** - Overall dashboard health based on overdue/upcoming ratios
- **Overdue Tasks** - List of tasks past their due date, sorted by urgency
- **Upcoming Deadlines** - Tasks due in the near future
- **Potential Blockers** - Tasks flagged via keyword detection in comments (e.g., "blocked", "waiting")
- **Subtask Progress** - Aggregate progress across tasks with subtasks
- **Project Breakdown** - Per-project task counts and completion rates

**API:** `POST /api/summary` returns a markdown summary with a `generatedAt` timestamp.

### Feature Help Guide

An interactive guide explaining all dashboard features with tips and usage instructions:

- Press `Alt+Shift+/` to open the Feature Help Guide
- Covers all major features grouped by category
- Includes tips, keyboard shortcuts, and workflow suggestions

### YAML Export

Export all your projects and tasks as a YAML-formatted text file:

- **API:** `GET /api/yaml` returns `{ content: "YAML string", lastModified: "timestamp" }`
- Useful for backups, sharing, or migrating data to other tools

### Task Notes / Journal

Keep detailed notes and journal entries for each task beyond the single comments field. Perfect for tracking progress, decisions, research findings, meeting notes related to a task.

**Accessing Task Notes:**

1. In the task table, click the **notes icon** (document with lines) in the task's action buttons
2. A count badge shows how many notes exist for each task
3. The notes panel opens as a modal

**What You Can Do:**

- **Add Notes**: Type in the text area at the top and click "Add Note"
- **Edit Notes**: Hover over a note and click the edit icon to modify it
- **Delete Notes**: Hover over a note and click the delete icon
- **View History**: Notes are displayed newest-first with timestamps

**Markdown Formatting:** Notes support basic markdown formatting:

| Format | Syntax | Result |
|--------|--------|--------|
| Bold | `**text**` | **text** |
| Italic | `*text*` | *text* |
| Inline Code | `` `code` `` | `code` |
| Checkbox | `- [ ]` or `- [x]` | Unchecked/checked box |

**Use Cases:**

- Documenting research findings for a task
- Recording decisions made during task execution
- Tracking blockers and their resolutions
- Meeting notes specific to a task
- Progress updates over time
- Lessons learned

**Visual Indicators:**

- Tasks with notes show a **note count badge** on the notes button
- The notes button is highlighted in green when a task has notes

### GTD Context Tags

The dashboard includes built-in support for David Allen's "Getting Things Done" (GTD) methodology through context tags. Context tags help you filter tasks based on what you can act on in your current situation.

**Pre-defined Context Tags:**

| Tag | Color | Description |
|-----|-------|-------------|
| `@computer` | Blue | Tasks requiring a computer or laptop |
| `@calls` | Green | Phone calls to make |
| `@email` | Purple | Emails to send or respond to |
| `@errands` | Orange | Tasks to do while out (shopping, bank, etc.) |
| `@home` | Pink | Tasks that can only be done at home |
| `@office` | Cyan | Tasks requiring office presence |
| `@waiting` | Yellow | Tasks blocked on someone else |
| `@read` | Slate | Articles, documents, or books to read |
| `@focus` | Red | Deep work requiring concentration |
| `@quick` | Teal | Quick tasks under 5 minutes |

**Using Context Tags:**

1. **Context Filter Bar** - A collapsible bar below the search shows all context tags as clickable buttons
2. **Quick Filtering** - Click a context tag to show only tasks with that context
3. **Assign to Tasks** - When creating/editing tasks, context tags appear in a separate "Context (GTD)" group
4. **Visual Indicators** - Context tags display with a marker to distinguish them from regular labels

**GTD Workflow Example:**

- Sitting at your desk? Click `@computer` to see all computer-based tasks
- Have 10 minutes between meetings? Click `@calls` to batch your phone calls
- Running errands? Click `@errands` to see everything you can do while out

## View Modes

The dashboard offers four distinct view modes, each optimized for different workflows. Switch between them using the view toggle buttons in the header or keyboard shortcuts (`Alt+1` through `Alt+4`).

| View | Shortcut | Description |
|------|----------|-------------|
| **Projects** | `Alt+1` | Tasks grouped by project with collapsible cards |
| **Tasks** | `Alt+2` | Flat list of all tasks with sorting and filtering |
| **Priority** | `Alt+3` | Covey's Urgent/Important matrix (4 quadrants) |
| **Kanban** | `Alt+4` | Drag-and-drop board organized by status |

### Kanban Board

A visual workflow board that organizes tasks into columns by status, with drag-and-drop functionality to quickly update task progress.

**Accessing the Kanban Board:**

- Click the "Kanban" button in the view toggle (header)
- Press `Alt+4` keyboard shortcut

**Columns:**

| Column | Description | Color |
|--------|-------------|-------|
| **Pending** | Tasks waiting to be started | Amber |
| **In Progress** | Tasks currently being worked on | Blue |
| **Completed** | Finished tasks | Green |
| **Cancelled** | Abandoned tasks | Red |

**Task Cards Display:**

- Project badge and priority indicator
- Task title and description preview
- Progress bar (if progress > 0%)
- Due date with overdue/today indicators
- Assignee name
- Tags (up to 3 shown, with +N for overflow)
- Pinned indicator for pinned tasks

**Drag-and-Drop:**

1. Hover over a task card to see the drag handle (six dots)
2. Click and drag the card to another column
3. Drop to update the task's status automatically
4. Visual feedback shows valid drop targets

**Visual Indicators:**

- **Overdue tasks**: Red left border with gradient background
- **Due today tasks**: Amber left border with gradient background
- **Pinned tasks**: Purple top border
- **Drop target**: Blue glow around column when dragging over

**Column Features:**

- **Collapse/Expand**: Click column header to toggle collapse
- **Task count**: Badge showing number of tasks in each column
- **Description**: Hover text explaining the column's purpose

**Task Sorting Within Columns:** Tasks are automatically sorted within each column:

1. Pinned tasks first
2. Then by priority (HIGH → MEDIUM → LOW)
3. Then by due date (earliest first)

**Actions:** Hover over a task card to reveal action buttons:

- **Focus** - Enter Focus Mode with this task
- **Edit** - Open task edit modal
- **Delete** - Delete the task (with confirmation)

**Stats Footer:** The bottom of the Kanban board shows:

- Total task count
- Per-column counts with color indicators

**Keyboard Shortcuts:**

| Shortcut | Action |
|----------|--------|
| `Alt+4` | Switch to Kanban Board view |
| `Escape` | Close any open modal |

**Responsive Design:**

- Desktop: 4 columns side by side
- Tablet (< 1200px): 2x2 grid layout
- Mobile (< 768px): Single column, stacked vertically

## API Endpoints

### Read Operations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tasks` | GET | Returns all projects and tasks |
| `/api/stats` | GET | Returns task statistics |
| `/api/summary` | POST | Generates markdown summary report |
| `/api/health` | GET | Health check endpoint |

### Project CRUD

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects` | POST | Create a new project |
| `/api/projects/:code` | PUT | Update a project |
| `/api/projects/:code/archive` | PUT | Archive a project (soft delete) |
| `/api/projects/:code/restore` | PUT | Restore an archived project |
| `/api/projects/:code` | DELETE | Delete project and all tasks (CASCADE) |

### Task CRUD

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects/:code/tasks` | POST | Create a new task |
| `/api/tasks/:id` | PUT | Update a task |
| `/api/tasks/:id` | DELETE | Delete a task |
| `/api/tasks/:id/tags` | PUT | Update task's tags |
| `/api/tasks/:id/pin` | PUT | Toggle pin status for a task |
| `/api/tasks/:id/move` | PUT | Move a task to a different project |
| `/api/tasks/bulk-move` | PUT | Bulk move multiple tasks to a different project |
| `/api/projects/:code/tasks/reorder` | PUT | Reorder tasks within a project |
| `/api/tasks/reorder` | PUT | Reorder tasks globally |

### Tags CRUD

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tags` | GET | Get all tags (context + regular) |
| `/api/tags/context` | GET | Get only GTD context tags (@-prefixed) |
| `/api/tags/regular` | GET | Get only regular (non-context) tags |
| `/api/tags` | POST | Create a new tag (auto-detects context if name starts with @) |
| `/api/tags/:id` | PUT | Update a tag |
| `/api/tags/:id` | DELETE | Delete a tag (cascades to task_tags) |

### Activity Log API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/activity` | GET | Get activity log (supports `limit`, `offset`, `entityType`, `entityId` query params) |
| `/api/tasks/:id/activity` | GET | Get activity for a specific task |

### Pomodoro Sessions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/pomodoro/active` | GET | Get currently active session (if any) |
| `/api/pomodoro/start` | POST | Start a new pomodoro session |
| `/api/pomodoro/:id/complete` | POST | Complete a session |
| `/api/pomodoro/:id/cancel` | POST | Cancel a session |
| `/api/pomodoro/:id/task` | PUT | Update the task linked to a session |
| `/api/pomodoro/stats/today` | GET | Get today's session count and total minutes |
| `/api/pomodoro/sessions` | GET | Get recent sessions (supports `limit` param) |
| `/api/tasks/:id/pomodoro` | GET | Get pomodoro stats for a specific task |

### Task Templates

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/task-templates` | GET | Get all task templates |
| `/api/task-templates/:id` | GET | Get a single template by ID |
| `/api/task-templates` | POST | Create a new task template |
| `/api/task-templates/from-task/:taskId` | POST | Create template from existing task |
| `/api/task-templates/:id` | PUT | Update a template (user-created only) |
| `/api/task-templates/:id` | DELETE | Delete a template (user-created only) |

### Task Notes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tasks/:id/notes` | GET | Get all notes for a task |
| `/api/tasks/:id/notes` | POST | Create a new note for a task |
| `/api/tasks/:taskId/notes/:noteId` | PUT | Update a note |
| `/api/tasks/:taskId/notes/:noteId` | DELETE | Delete a note |

### Subtasks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tasks/:id/subtasks` | GET | Get all subtasks for a task (with stats) |
| `/api/tasks/:id/subtasks` | POST | Create a new subtask |
| `/api/tasks/:id/subtasks/bulk` | POST | Bulk create multiple subtasks |
| `/api/tasks/:taskId/subtasks/:subtaskId` | PUT | Update a subtask (title, completion) |
| `/api/tasks/:taskId/subtasks/:subtaskId/toggle` | POST | Toggle subtask completion status |
| `/api/tasks/:id/subtasks/reorder` | PUT | Reorder subtasks within a task |
| `/api/tasks/:taskId/subtasks/:subtaskId` | DELETE | Delete a subtask |

### Deleted Tasks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tasks/deleted` | GET | Get all soft-deleted tasks (supports `limit` param) |
| `/api/tasks/:id/restore` | POST | Restore a soft-deleted task |

### YAML Export API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/yaml` | GET | Export all projects and tasks as YAML-formatted text |

## Database Schema

The SQLite database (`tasks.db`) contains the following tables:

### projects

| Column | Type | Description |
|--------|------|-------------|
| `code` | TEXT (PK) | Project identifier |
| `name` | TEXT | Project name |
| `description` | TEXT | Project description |
| `status` | TEXT | In Progress, Completed, Archived |

### tasks

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER (PK) | Auto-incrementing ID |
| `project_code` | TEXT (FK) | Links to project |
| `task_number` | INTEGER | Task number within project |
| `title` | TEXT | Task description |
| `due_date` | TEXT | Due date (YYYY-MM-DD) |
| `created_on` | TEXT | Creation date |
| `assigned_to` | TEXT | Assignee name |
| `status` | TEXT | PENDING, INPROGRESS, COMPLETED, DONE, CANCELLED, NOT DOING |
| `comments` | TEXT | Optional notes (supports markdown) |
| `priority` | TEXT | HIGH, MEDIUM, LOW |
| `quadrant` | TEXT | DO FIRST, SCHEDULE, DELEGATE, ELIMINATE |
| `progress` | INTEGER | Completion percentage (0-100) |
| `pinned` | INTEGER | Pin status (0=unpinned, 1=pinned) |
| `sort_order` | INTEGER | Custom display ordering |
| `deleted_at` | TEXT | Soft delete timestamp (NULL if active) |

### tags

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER (PK) | Auto-incrementing ID |
| `name` | TEXT (UNIQUE) | Tag name (context tags prefixed with @, e.g. `@computer`) |
| `color` | TEXT | Hex color code (e.g., #38bdf8) |
| `is_context` | INTEGER | GTD context tag flag (0=regular tag, 1=context tag) |
| `sort_order` | INTEGER | Display ordering |

### task_tags (junction table)

| Column | Type | Description |
|--------|------|-------------|
| `task_id` | INTEGER (FK) | Links to task |
| `tag_id` | INTEGER (FK) | Links to tag |

### activity_log

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER (PK) | Auto-incrementing ID |
| `timestamp` | TEXT | When the action occurred (ISO 8601) |
| `entity_type` | TEXT | Type of entity (project, task, tag, task_template) |
| `entity_id` | TEXT | ID of the affected entity |
| `entity_name` | TEXT | Human-readable name |
| `action_type` | TEXT | create, update, delete, archive, restore, move, reorder, pin, unpin, status_change, pomodoro_start, pomodoro_complete, note_add, note_update, note_delete, subtask_add, subtask_bulk_add, subtask_complete, subtask_uncomplete, subtask_update, subtask_delete |
| `user` | TEXT | Who made the change |
| `changes` | TEXT | JSON object with field changes |
| `description` | TEXT | Human-readable description |

### pomodoro_sessions

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER (PK) | Auto-incrementing ID |
| `task_id` | INTEGER (FK) | Optional link to task |
| `duration_minutes` | INTEGER | Session duration (default 25) |
| `started_at` | TEXT | When session started (ISO 8601) |
| `completed_at` | TEXT | When session ended |
| `status` | TEXT | active, completed, cancelled |
| `notes` | TEXT | Optional session notes |

### task_templates

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER (PK) | Auto-incrementing ID |
| `name` | TEXT | Template name |
| `description` | TEXT | Brief description |
| `icon` | TEXT | Emoji icon (default 📋) |
| `title` | TEXT | Default task title |
| `priority` | TEXT | Default priority (HIGH, MEDIUM, LOW) |
| `quadrant` | TEXT | Default quadrant |
| `estimated_duration` | TEXT | Estimated time (e.g., "30min", "1hr") |
| `default_tags` | TEXT | JSON array of default tag IDs |
| `comments` | TEXT | Default comments/notes (supports markdown) |
| `is_builtin` | INTEGER | 1 for built-in templates, 0 for user-created |
| `sort_order` | INTEGER | Display order |
| `created_at` | TEXT | When template was created |
| `updated_at` | TEXT | When template was last modified |

### task_notes

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER (PK) | Auto-incrementing ID |
| `task_id` | INTEGER (FK) | Links to task |
| `content` | TEXT | Note content (supports markdown) |
| `created_at` | TEXT | When note was created (ISO 8601) |
| `updated_at` | TEXT | When note was last modified (ISO 8601) |

### subtasks

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER (PK) | Auto-incrementing ID |
| `task_id` | INTEGER (FK) | Links to parent task |
| `title` | TEXT | Subtask title/description |
| `is_completed` | INTEGER | Completion status (0=incomplete, 1=completed) |
| `sort_order` | INTEGER | Order within the parent task |
| `created_at` | TEXT | When subtask was created (ISO 8601) |
| `updated_at` | TEXT | When subtask was last modified (ISO 8601) |

## YAML Import Format (Optional)

If migrating from an existing YAML file, create `PendingTasks.yaml` in the project root:

```yaml
PROJECT_CODE:
  NAME: Project Name
  DESCRIPTION: Project description
  STATUS: In Progress
  TASKS:
    - Task 1: Task description
      Due Date: 2026-01-15
      Created on: 2026-01-12
      Assigned to: Person Name
      Status: PENDING
      Comments: Optional comments
      Priority: HIGH
      Quadrant: DO FIRST
      Progress: 50%
```

Then run `npm run migrate` from the server directory.

## Task Statuses

| Status | Badge Color | Description |
|--------|-------------|-------------|
| PENDING | Amber/Orange | Not yet started |
| INPROGRESS | Blue | Currently being worked on |
| COMPLETED | Green | Finished |
| DONE | Green | Finished (alternative to COMPLETED) |
| CANCELLED | Red | No longer needed |
| NOT DOING | Purple | Decided against doing this task |

## Priority Matrix (Covey Quadrants)

The Priority Matrix view organizes tasks using Stephen Covey's Urgent/Important matrix (also known as the Eisenhower Matrix). Toggle between Tasks and Priority view using the buttons in the dashboard header.

### Quadrant Values

| Quadrant | Description | Color |
|----------|-------------|-------|
| `DO FIRST` | Urgent & Important - Crisis, deadlines | Red |
| `SCHEDULE` | Important, Not Urgent - Planning, prevention | Blue |
| `DELEGATE` | Urgent, Not Important - Interruptions | Amber |
| `ELIMINATE` | Neither Urgent nor Important - Time wasters | Gray |

Tasks without a `Quadrant` attribute default to **ELIMINATE** (Q4).

### Matrix Layout

```
┌─────────────────────┬─────────────────────┐
│ Q1: DO FIRST        │ Q2: SCHEDULE        │
│ Urgent+Important    │ Important only      │
├─────────────────────┼─────────────────────┤
│ Q3: DELEGATE        │ Q4: ELIMINATE       │
│ Urgent only         │ Neither             │
└─────────────────────┴─────────────────────┘
```

## User Preferences (localStorage)

The dashboard persists user preferences in the browser's localStorage:

| Key | Description |
|-----|-------------|
| `taskDashboard_theme` | Selected theme (dark/light) |
| `taskDashboard_defaultView` | Default view mode (projects/tasks/priority/kanban) |
| `taskDashboard_showArchived` | Whether to show archived projects |
| `taskDashboard_headerCollapsed` | Header toolbar collapsed state |
| `taskDashboard_statsCollapsed` | Stats panel collapsed state |
| `taskDashboard_sidebarCollapsed` | Sidebar collapsed state |
| `taskDashboard_projectExpanded_[CODE]` | Expanded state per project |
| `taskDashboard_pomodoroState` | Active pomodoro session state (for page refresh recovery) |
| `taskDashboard_snoozedItems` | Snoozed attention items with expiration times |
| `taskDashboard_notifiedTasks` | Tasks already notified today (prevents duplicate notifications) |
| `taskDashboard_notificationPermission` | Cached browser notification permission state |

To reset all preferences, clear localStorage in browser DevTools.

## Troubleshooting

### Database Issues

**Reset the database:**

```bash
cd TaskDashboard
rm tasks.db
cd server && npm start
```

**View database contents:**

```bash
sqlite3 tasks.db ".tables"
sqlite3 -header -column tasks.db "SELECT * FROM projects;"
sqlite3 -header -column tasks.db "SELECT * FROM tasks;"
```

### Port Conflicts

If ports 3000 or 3001 are in use:

```bash
# Find and kill processes
lsof -i :3000
lsof -i :3001
kill -9 <PID>
```

## Pending Feature Improvements

Features and enhancements to consider for future development.

### Time & Productivity

| Feature | Description |
|---------|-------------|
| Time Tracking | Add `time_spent` field to tasks; log work sessions with start/stop timer |
| Recurring Tasks | Auto-generate tasks (daily standup, weekly reviews) with recurrence patterns |
| Task Dependencies | Mark tasks as "blocked by" other tasks; visualize dependency chains |
| Time Estimates | Add `estimated_hours` field; compare estimate vs actual for planning accuracy |
| ~~Pomodoro Timer~~ | ~~Built-in focus timer that auto-logs work sessions to the current task~~ **IMPLEMENTED** |

### Views & Organization

| Feature | Description |
|---------|-------------|
| ~~Subtasks/Checklists~~ | ~~Nested items within tasks (e.g., "Deploy feature" → staging, prod, docs)~~ **IMPLEMENTED** |
| Calendar View | Month/week view showing tasks by due date |
| "Today" / "This Week" View | Dedicated views for short-term focus; aggregate across all projects |
| ~~Kanban Board~~ | ~~Drag-and-drop columns by status or custom workflows~~ **IMPLEMENTED** |
| ~~Drag-and-Drop Reordering~~ | ~~Manual task ordering within projects (add `sort_order` column)~~ **IMPLEMENTED** |

### Keyboard Shortcuts & Quick Entry

| Feature | Description |
|---------|-------------|
| ~~Global Hotkeys~~ | ~~n → new task, p → new project, / → focus search, ? → help overlay~~ **IMPLEMENTED** |
| ~~Quick Add Inbox~~ | ~~Global input bar for rapid task capture; triage later into projects~~ **IMPLEMENTED** |
| ~~Natural Language Dates~~ | ~~Parse "tomorrow", "next Friday", "in 3 days" into due dates~~ **IMPLEMENTED** |
| ~~Task Templates~~ | ~~Reusable task blueprints (like project templates, but for individual tasks)~~ **IMPLEMENTED** |

### Analytics & Insights

| Feature | Description |
|---------|-------------|
| Completion Trends | Chart showing tasks completed per week/month |
| Project Velocity | Burndown/burnup charts per project |
| Time Analysis | Where time is spent by project/tag (requires time tracking) |
| Productivity Score | Simple metric: tasks completed vs overdue ratio |
| Weekly Summary | Auto-generated "this week" report comparing to last week |

### Notifications & Reminders

| Feature | Description |
|---------|-------------|
| ~~Browser Notifications~~ | ~~Push notifications for tasks due in 1 hour, due today on page load~~ **IMPLEMENTED** |
| ~~Snooze~~ | ~~"Remind me later" for attention banner items~~ **IMPLEMENTED** |
| Daily Digest | Optional: generate a "today's plan" view each morning |

### Data Management

| Feature | Description |
|---------|-------------|
| ~~Bulk Move~~ | ~~Multi-select tasks → bulk move to different project~~ **IMPLEMENTED** (via `PUT /api/tasks/bulk-move`) |
| Bulk Operations (extended) | Bulk status change, bulk delete, bulk tag assign (bulk move is implemented) |
| ~~YAML Export~~ | ~~Export projects and tasks as YAML~~ **IMPLEMENTED** (via `GET /api/yaml`) |
| CSV/JSON Export | Beyond YAML; export filtered results for spreadsheets |
| Database Backup Scheduler | Auto-backup SQLite file daily to a configured location |
| ~~Trash/Recycle Bin~~ | ~~Soft delete with undo toast; API for browsing deleted tasks~~ **IMPLEMENTED** (UI via undo toast; API: `GET /api/tasks/deleted`) |

### Personal Workflow

| Feature | Description |
|---------|-------------|
| ~~Daily/Weekly Review Mode~~ | ~~Guided walkthrough: review overdue, update progress, plan next week~~ **IMPLEMENTED** |
| ~~Focus Mode~~ | ~~Hide all UI except the current task; minimize distractions~~ **IMPLEMENTED** |
| ~~Pin Tasks~~ | ~~Pin important tasks to always show at top regardless of filters~~ **IMPLEMENTED** |
| ~~Task Notes/Journal~~ | ~~Rich text notes per task (beyond single comments field)~~ **IMPLEMENTED** |
| ~~Context Tags~~ | ~~Tags like `@calls`, `@computer`, `@errands` for GTD-style filtering~~ **IMPLEMENTED** |
