#!/usr/bin/env node

/**
 * YAML Migration Script for Task Dashboard
 * 
 * Reads PendingTasks.yaml from project root and imports into the database.
 * 
 * Usage:
 *   node migrate-yaml.js           # Import from YAML
 *   node migrate-yaml.js --fresh   # Drop and recreate all tables before import
 *   node migrate-yaml.js --help    # Show help
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Database path
const DB_PATH = path.join(__dirname, '..', 'tasks.db');
const YAML_PATH = path.join(__dirname, '..', 'PendingTasks.yaml');

// Load better-sqlite3
let db;
try {
    const Database = require('better-sqlite3');
    db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');
} catch (err) {
    console.error('Error loading database:', err.message);
    process.exit(1);
}

/**
 * Drop all tables (for --fresh mode)
 */
function dropAllTables() {
    console.log('Dropping all tables...');
    
    const tables = [
        'pomodoro_sessions',
        'activity_log',
        'task_templates',
        'task_notes',
        'subtasks',
        'task_tags',
        'tags',
        'tasks',
        'projects'
    ];
    
    const dropTransaction = db.transaction(() => {
        for (const table of tables) {
            db.exec(`DROP TABLE IF EXISTS ${table}`);
            console.log(`  Dropped table: ${table}`);
        }
    });
    
    dropTransaction();
    console.log('All tables dropped.\n');
}

/**
 * Create tables if they don't exist
 */
function createTables() {
    console.log('Creating tables if not exist...');
    
    db.exec(`
        -- Projects table
        CREATE TABLE IF NOT EXISTS projects (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'In Progress',
            color TEXT DEFAULT '#3b82f6',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            archived_at TEXT
        );

        -- Tasks table
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_code TEXT NOT NULL,
            task_number INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'PENDING',
            priority TEXT DEFAULT 'MEDIUM',
            quadrant TEXT DEFAULT 'Q4',
            progress INTEGER DEFAULT 0,
            due_date TEXT,
            assigned_to TEXT,
            comments TEXT,
            is_pinned INTEGER DEFAULT 0,
            sort_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            deleted_at TEXT,
            completed_at TEXT,
            FOREIGN KEY (project_code) REFERENCES projects(code) ON DELETE CASCADE,
            UNIQUE(project_code, task_number)
        );

        -- Tags table
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            color TEXT DEFAULT '#64748b',
            is_context INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- Task-Tags junction table
        CREATE TABLE IF NOT EXISTS task_tags (
            task_id INTEGER NOT NULL,
            tag_id INTEGER NOT NULL,
            PRIMARY KEY (task_id, tag_id),
            FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        );

        -- Subtasks table
        CREATE TABLE IF NOT EXISTS subtasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            is_completed INTEGER DEFAULT 0,
            sort_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
        );

        -- Task notes table
        CREATE TABLE IF NOT EXISTS task_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
        );

        -- Task templates table
        CREATE TABLE IF NOT EXISTS task_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            icon TEXT DEFAULT '📋',
            default_priority TEXT DEFAULT 'MEDIUM',
            default_quadrant TEXT DEFAULT 'Q4',
            default_status TEXT DEFAULT 'PENDING',
            default_comments TEXT,
            subtask_templates TEXT,
            is_builtin INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- Activity log table
        CREATE TABLE IF NOT EXISTS activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_type TEXT NOT NULL,
            entity_id TEXT,
            entity_name TEXT,
            action TEXT NOT NULL,
            changes TEXT,
            description TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- Pomodoro sessions table
        CREATE TABLE IF NOT EXISTS pomodoro_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER,
            duration_minutes INTEGER NOT NULL,
            mode TEXT DEFAULT 'work',
            started_at TEXT NOT NULL,
            completed_at TEXT,
            cancelled_at TEXT,
            status TEXT DEFAULT 'active',
            FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_code);
        CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
        CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
        CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
        CREATE INDEX IF NOT EXISTS idx_tasks_deleted ON tasks(deleted_at);
        CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);
        CREATE INDEX IF NOT EXISTS idx_task_tags_task ON task_tags(task_id);
        CREATE INDEX IF NOT EXISTS idx_task_tags_tag ON task_tags(tag_id);
        CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log(entity_type, entity_id);
        CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);
        CREATE INDEX IF NOT EXISTS idx_pomodoro_task ON pomodoro_sessions(task_id);
        CREATE INDEX IF NOT EXISTS idx_pomodoro_status ON pomodoro_sessions(status);
    `);
    
    console.log('Tables created/verified.\n');
}

/**
 * Seed default data (context tags and built-in templates)
 */
function seedDefaultData() {
    console.log('Seeding default data...');
    
    // Check if tags already exist
    const tagCount = db.prepare('SELECT COUNT(*) as count FROM tags').get();
    if (tagCount.count === 0) {
        const contextTags = [
            { name: '@computer', color: '#3b82f6', is_context: 1 },
            { name: '@calls', color: '#22c55e', is_context: 1 },
            { name: '@email', color: '#8b5cf6', is_context: 1 },
            { name: '@errands', color: '#f59e0b', is_context: 1 },
            { name: '@home', color: '#ec4899', is_context: 1 },
            { name: '@office', color: '#06b6d4', is_context: 1 },
            { name: '@waiting', color: '#6b7280', is_context: 1 },
            { name: '@read', color: '#84cc16', is_context: 1 },
            { name: '@focus', color: '#ef4444', is_context: 1 },
            { name: '@quick', color: '#f97316', is_context: 1 }
        ];
        
        const insertTag = db.prepare('INSERT INTO tags (name, color, is_context) VALUES (?, ?, ?)');
        for (const tag of contextTags) {
            insertTag.run(tag.name, tag.color, tag.is_context);
        }
        console.log(`  Inserted ${contextTags.length} context tags`);
    }
    
    // Check if templates already exist
    const templateCount = db.prepare('SELECT COUNT(*) as count FROM task_templates').get();
    if (templateCount.count === 0) {
        const templates = [
            { name: 'Quick Task', description: 'A simple, quick task to complete', icon: '⚡', default_priority: 'MEDIUM', default_quadrant: 'Q4', default_status: 'PENDING', is_builtin: 1 },
            { name: 'Code Review', description: 'Review code changes or pull requests', icon: '🔍', default_priority: 'MEDIUM', default_quadrant: 'Q2', default_status: 'PENDING', default_comments: '## Code Review Checklist\n- [ ] Code follows style guidelines\n- [ ] No security vulnerabilities\n- [ ] Tests pass\n- [ ] Documentation updated', is_builtin: 1 },
            { name: 'Bug Investigation', description: 'Investigate and document a bug', icon: '🐛', default_priority: 'HIGH', default_quadrant: 'Q1', default_status: 'INPROGRESS', default_comments: '## Bug Details\n- **Reported by:** \n- **Steps to reproduce:**\n- **Expected behavior:**\n- **Actual behavior:**\n- **Environment:**', is_builtin: 1 },
            { name: 'Meeting Follow-up', description: 'Tasks from a meeting', icon: '📝', default_priority: 'MEDIUM', default_quadrant: 'Q2', default_status: 'PENDING', default_comments: '## Meeting Notes\n- **Date:** \n- **Attendees:**\n- **Action items:**', is_builtin: 1 },
            { name: 'Research Task', description: 'Research and document findings', icon: '🔬', default_priority: 'MEDIUM', default_quadrant: 'Q2', default_status: 'PENDING', default_comments: '## Research Questions\n- \n\n## Findings\n- \n\n## Recommendations\n- ', is_builtin: 1 },
            { name: 'Documentation', description: 'Write or update documentation', icon: '📚', default_priority: 'LOW', default_quadrant: 'Q3', default_status: 'PENDING', is_builtin: 1 },
            { name: 'Deployment Task', description: 'Deploy to an environment', icon: '🚀', default_priority: 'HIGH', default_quadrant: 'Q1', default_status: 'PENDING', default_comments: '## Deployment Checklist\n- [ ] All tests pass\n- [ ] Code reviewed\n- [ ] Changelog updated\n- [ ] Stakeholders notified', is_builtin: 1 },
            { name: 'Waiting For', description: 'Task waiting on someone else', icon: '⏳', default_priority: 'MEDIUM', default_quadrant: 'Q3', default_status: 'PENDING', default_comments: '## Waiting Details\n- **Waiting on:** \n- **Expected response:** \n- **Follow-up date:', is_builtin: 1 }
        ];
        
        const insertTemplate = db.prepare(`
            INSERT INTO task_templates (name, description, icon, default_priority, default_quadrant, default_status, default_comments, is_builtin)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const template of templates) {
            insertTemplate.run(
                template.name,
                template.description,
                template.icon,
                template.default_priority,
                template.default_quadrant,
                template.default_status,
                template.default_comments || null,
                template.is_builtin
            );
        }
        console.log(`  Inserted ${templates.length} built-in templates`);
    }
    
    console.log('Default data seeded.\n');
}

/**
 * Parse and import YAML file
 */
function importYaml(yamlPath, options = {}) {
    console.log(`Importing from: ${yamlPath}`);
    
    // Check if file exists
    if (!fs.existsSync(yamlPath)) {
        console.error(`Error: YAML file not found at ${yamlPath}`);
        console.log('\nExpected YAML format:');
        console.log(`
projects:
  - code: PROJ1
    name: Project One
    description: Description here
    status: In Progress
    color: '#3b82f6'
    tasks:
      - title: Task title
        description: Task description
        status: PENDING
        priority: MEDIUM
        quadrant: Q2
        progress: 0
        due_date: 2024-12-31
        assigned_to: John
        comments: |
          Multi-line comments
        tags:
          - '@computer'
          - 'custom-tag'
        subtasks:
          - title: Subtask 1
          - title: Subtask 2
        notes:
          - content: |
              Note content here
        `);
        return false;
    }
    
    // Read and parse YAML
    let data;
    try {
        const yamlContent = fs.readFileSync(yamlPath, 'utf8');
        data = yaml.load(yamlContent);
    } catch (err) {
        console.error(`Error parsing YAML: ${err.message}`);
        return false;
    }
    
    if (!data || !data.projects || !Array.isArray(data.projects)) {
        console.error('Error: YAML must contain a "projects" array');
        return false;
    }
    
    console.log(`Found ${data.projects.length} projects to import.\n`);
    
    // Begin transaction
    const importTransaction = db.transaction(() => {
        let totalTasks = 0;
        let totalSubtasks = 0;
        let totalNotes = 0;
        let totalTags = 0;
        
        for (const project of data.projects) {
            // Validate project
            if (!project.code || !project.name) {
                console.warn(`  Skipping project without code or name`);
                continue;
            }
            
            // Check if project exists
            const existingProject = db.prepare('SELECT code FROM projects WHERE code = ?').get(project.code);
            
            if (existingProject) {
                console.log(`  Project ${project.code} already exists, updating...`);
                db.prepare(`
                    UPDATE projects SET
                        name = ?,
                        description = ?,
                        status = ?,
                        color = ?,
                        updated_at = datetime('now')
                    WHERE code = ?
                `).run(
                    project.name,
                    project.description || null,
                    project.status || 'In Progress',
                    project.color || '#3b82f6',
                    project.code
                );
            } else {
                console.log(`  Creating project: ${project.code} - ${project.name}`);
                db.prepare(`
                    INSERT INTO projects (code, name, description, status, color)
                    VALUES (?, ?, ?, ?, ?)
                `).run(
                    project.code,
                    project.name,
                    project.description || null,
                    project.status || 'In Progress',
                    project.color || '#3b82f6'
                );
            }
            
            // Import tasks
            if (project.tasks && Array.isArray(project.tasks)) {
                // Get current max task number for this project
                let taskNumber = (db.prepare('SELECT COALESCE(MAX(task_number), 0) as max FROM tasks WHERE project_code = ?').get(project.code)?.max || 0);
                
                for (const task of project.tasks) {
                    if (!task.title) {
                        console.warn(`    Skipping task without title in project ${project.code}`);
                        continue;
                    }
                    
                    taskNumber++;
                    
                    // Auto-set progress to 100 for completed/done tasks
                    let progress = task.progress || 0;
                    if (task.status === 'COMPLETED' || task.status === 'DONE') {
                        progress = 100;
                    }
                    
                    // Insert task
                    const result = db.prepare(`
                        INSERT INTO tasks (project_code, task_number, title, description, status, priority, quadrant, progress, due_date, assigned_to, comments)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `).run(
                        project.code,
                        taskNumber,
                        task.title,
                        task.description || null,
                        task.status || 'PENDING',
                        task.priority || 'MEDIUM',
                        task.quadrant || 'Q4',
                        progress,
                        task.due_date || null,
                        task.assigned_to || null,
                        task.comments || null
                    );
                    
                    const taskId = result.lastInsertRowid;
                    totalTasks++;
                    
                    // Import tags
                    if (task.tags && Array.isArray(task.tags)) {
                        for (const tagName of task.tags) {
                            // Find or create tag
                            let tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(tagName);
                            if (!tag) {
                                const tagResult = db.prepare('INSERT INTO tags (name, is_context) VALUES (?, ?)').run(tagName, tagName.startsWith('@') ? 1 : 0);
                                tag = { id: tagResult.lastInsertRowid };
                                totalTags++;
                            }
                            
                            // Link tag to task
                            db.prepare('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)').run(taskId, tag.id);
                        }
                    }
                    
                    // Import subtasks
                    if (task.subtasks && Array.isArray(task.subtasks)) {
                        let subtaskOrder = 0;
                        for (const subtask of task.subtasks) {
                            if (subtask.title) {
                                db.prepare(`
                                    INSERT INTO subtasks (task_id, title, is_completed, sort_order)
                                    VALUES (?, ?, ?, ?)
                                `).run(
                                    taskId,
                                    subtask.title,
                                    subtask.is_completed ? 1 : 0,
                                    subtaskOrder++
                                );
                                totalSubtasks++;
                            }
                        }
                    }
                    
                    // Import notes
                    if (task.notes && Array.isArray(task.notes)) {
                        for (const note of task.notes) {
                            if (note.content) {
                                db.prepare(`
                                    INSERT INTO task_notes (task_id, content)
                                    VALUES (?, ?)
                                `).run(taskId, note.content);
                                totalNotes++;
                            }
                        }
                    }
                }
            }
        }
        
        console.log(`\nImport complete:`);
        console.log(`  Projects: ${data.projects.length}`);
        console.log(`  Tasks: ${totalTasks}`);
        console.log(`  Subtasks: ${totalSubtasks}`);
        console.log(`  Notes: ${totalNotes}`);
        console.log(`  New tags: ${totalTags}`);
    });
    
    importTransaction();
    return true;
}

/**
 * Log migration activity
 */
function logMigration() {
    db.prepare(`
        INSERT INTO activity_log (entity_type, action, description)
        VALUES ('system', 'yaml_import', 'Imported data from PendingTasks.yaml')
    `).run();
}

/**
 * Main function
 */
function main() {
    const args = process.argv.slice(2);
    
    console.log('╔════════════════════════════════════════╗');
    console.log('║   Task Dashboard YAML Migration Tool   ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    // Handle --help
    if (args.includes('--help') || args.includes('-h')) {
        console.log('Usage: node migrate-yaml.js [options]\n');
        console.log('Options:');
        console.log('  --fresh    Drop and recreate all tables before import');
        console.log('  --help     Show this help message\n');
        console.log('The script reads PendingTasks.yaml from the project root.');
        db.close();
        return;
    }
    
    // Handle --fresh
    if (args.includes('--fresh')) {
        console.log('⚠️  --fresh mode: All existing data will be deleted!\n');
        dropAllTables();
    }
    
    // Create tables
    createTables();
    
    // Seed default data
    seedDefaultData();
    
    // Import YAML
    const success = importYaml(YAML_PATH);
    
    if (success) {
        logMigration();
        console.log('\n✅ Migration completed successfully!');
    } else {
        console.log('\n❌ Migration failed.');
    }
    
    db.close();
}

main();