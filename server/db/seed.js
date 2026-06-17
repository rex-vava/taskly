import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const PASSWORD = 'password123';

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function dateTimeFromNow(days, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

async function seed() {
  const client = await pool.connect();
  try {
    const { rows: existing } = await client.query('SELECT id FROM users LIMIT 1');
    if (existing.length) {
      console.log('Database already seeded — skipping.');
      return;
    }

    console.log('Seeding Taskly demo data...');
    const hash = await bcrypt.hash(PASSWORD, 12);

    const users = [
      { name: 'Alex Chen', email: 'alex@taskly.demo', role: 'admin' },
      { name: 'Sara Williams', email: 'sara@taskly.demo', role: 'member' },
      { name: 'Ali Hassan', email: 'ali@taskly.demo', role: 'member' },
      { name: 'Jordan Lee', email: 'jordan@taskly.demo', role: 'member' },
    ];

    const userIds = {};
    for (const u of users) {
      const { rows } = await client.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [u.name, u.email, hash, u.role]
      );
      userIds[u.email] = rows[0].id;
    }

    const boards = [
      { title: 'Website Redesign', description: 'Complete overhaul of the company website', color: '#6366f1', owner: 'alex@taskly.demo' },
      { title: 'Mobile App Development', description: 'iOS and Android app for Taskly', color: '#8b5cf6', owner: 'alex@taskly.demo' },
      { title: 'Marketing Campaign', description: 'Q2 product launch campaign', color: '#ec4899', owner: 'sara@taskly.demo' },
    ];

    const boardIds = {};
    for (const b of boards) {
      const { rows } = await client.query(
        'INSERT INTO boards (title, description, color, owner_id) VALUES ($1, $2, $3, $4) RETURNING id',
        [b.title, b.description, b.color, userIds[b.owner]]
      );
      boardIds[b.title] = rows[0].id;

      const defaultLists = ['To Do', 'In Progress', 'Review', 'Completed'];
      for (let i = 0; i < defaultLists.length; i++) {
        await client.query(
          'INSERT INTO lists (board_id, title, position) VALUES ($1, $2, $3)',
          [rows[0].id, defaultLists[i], i]
        );
      }
    }

    const { rows: allLists } = await client.query('SELECT id, board_id, title FROM lists ORDER BY board_id, position');
    const listMap = {};
    for (const l of allLists) {
      if (!listMap[l.board_id]) listMap[l.board_id] = {};
      listMap[l.board_id][l.title] = l.id;
    }

    const memberships = [
      { board: 'Website Redesign', members: [
        { email: 'alex@taskly.demo', role: 'owner' },
        { email: 'sara@taskly.demo', role: 'admin' },
        { email: 'ali@taskly.demo', role: 'member' },
        { email: 'jordan@taskly.demo', role: 'member' },
      ]},
      { board: 'Mobile App Development', members: [
        { email: 'alex@taskly.demo', role: 'owner' },
        { email: 'ali@taskly.demo', role: 'admin' },
        { email: 'jordan@taskly.demo', role: 'member' },
      ]},
      { board: 'Marketing Campaign', members: [
        { email: 'sara@taskly.demo', role: 'owner' },
        { email: 'alex@taskly.demo', role: 'member' },
      ]},
    ];

    for (const { board, members } of memberships) {
      for (const m of members) {
        await client.query(
          'INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [boardIds[board], userIds[m.email], m.role]
        );
      }
    }

    const tasks = [
      { board: 'Website Redesign', list: 'In Progress', title: 'Design Landing Page', assignee: 'sara@taskly.demo', priority: 'high', status: 'in_progress', due: 3 },
      { board: 'Website Redesign', list: 'In Progress', title: 'Develop Authentication', assignee: 'ali@taskly.demo', priority: 'high', status: 'in_progress', due: 5 },
      { board: 'Website Redesign', list: 'To Do', title: 'Fix Dashboard Bugs', assignee: 'ali@taskly.demo', priority: 'medium', status: 'todo', due: 7 },
      { board: 'Website Redesign', list: 'Review', title: 'User Testing', assignee: 'jordan@taskly.demo', priority: 'medium', status: 'review', due: 10 },
      { board: 'Website Redesign', list: 'Completed', title: 'Login Page Design', assignee: 'sara@taskly.demo', priority: 'high', status: 'completed', due: -5 },
      { board: 'Website Redesign', list: 'To Do', title: 'SEO Optimization', assignee: 'sara@taskly.demo', priority: 'low', status: 'todo', due: 14 },
      { board: 'Mobile App Development', list: 'In Progress', title: 'Build Push Notifications', assignee: 'ali@taskly.demo', priority: 'high', status: 'in_progress', due: 4 },
      { board: 'Mobile App Development', list: 'To Do', title: 'Offline Mode Support', assignee: 'ali@taskly.demo', priority: 'medium', status: 'todo', due: 12 },
      { board: 'Mobile App Development', list: 'Review', title: 'App Store Screenshots', assignee: 'sara@taskly.demo', priority: 'medium', status: 'review', due: 8 },
      { board: 'Mobile App Development', list: 'Completed', title: 'API Integration', assignee: 'ali@taskly.demo', priority: 'high', status: 'completed', due: -3 },
      { board: 'Marketing Campaign', list: 'In Progress', title: 'Social Media Content', assignee: 'sara@taskly.demo', priority: 'high', status: 'in_progress', due: 2 },
      { board: 'Marketing Campaign', list: 'To Do', title: 'Email Newsletter', assignee: 'sara@taskly.demo', priority: 'medium', status: 'todo', due: 6 },
      { board: 'Marketing Campaign', list: 'To Do', title: 'Launch Event Planning', assignee: 'alex@taskly.demo', priority: 'urgent', status: 'todo', due: 1 },
      { board: 'Marketing Campaign', list: 'Completed', title: 'Brand Guidelines', assignee: 'sara@taskly.demo', priority: 'medium', status: 'completed', due: -7 },
      { board: 'Website Redesign', list: 'To Do', title: 'Update Privacy Policy', assignee: 'alex@taskly.demo', priority: 'low', status: 'todo', due: -2 },
    ];

    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const boardId = boardIds[t.board];
      const listId = listMap[boardId][t.list];
      await client.query(
        `INSERT INTO tasks (title, board_id, list_id, priority, status, assignee_id, created_by, due_date, position)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [t.title, boardId, listId, t.priority, t.status, userIds[t.assignee], userIds['alex@taskly.demo'], daysFromNow(t.due), i]
      );
    }

    const events = [
      { user: 'alex@taskly.demo', board: 'Website Redesign', title: 'Team Meeting', type: 'meeting', days: 2 },
      { user: 'alex@taskly.demo', board: 'Website Redesign', title: 'Project Deadline', type: 'milestone', days: 14 },
      { user: 'sara@taskly.demo', board: 'Marketing Campaign', title: 'Launch Review', type: 'meeting', days: 5 },
      { user: 'ali@taskly.demo', board: 'Mobile App Development', title: 'Sprint Planning', type: 'meeting', days: 1 },
    ];

    for (const e of events) {
      await client.query(
        'INSERT INTO events (user_id, board_id, title, event_type, start_date) VALUES ($1, $2, $3, $4, $5)',
        [userIds[e.user], boardIds[e.board], e.title, e.type, dateTimeFromNow(e.days)]
      );
    }

    const activities = [
      { user: 'sara@taskly.demo', board: 'Website Redesign', action: 'completed_task', details: { title: 'Login Page Design' } },
      { user: 'sara@taskly.demo', board: 'Marketing Campaign', action: 'created_task', details: { title: 'Social Media Content' } },
      { user: 'ali@taskly.demo', board: 'Website Redesign', action: 'updated_task', details: { title: 'Develop Authentication' } },
      { user: 'alex@taskly.demo', board: 'Website Redesign', action: 'created_board', details: { title: 'Website Redesign' } },
      { user: 'jordan@taskly.demo', board: 'Website Redesign', action: 'updated_task', details: { title: 'User Testing' } },
    ];

    for (const a of activities) {
      await client.query(
        'INSERT INTO activity_logs (board_id, user_id, action, details) VALUES ($1, $2, $3, $4)',
        [boardIds[a.board], userIds[a.user], a.action, JSON.stringify(a.details)]
      );
    }

    for (const n of [
      { email: 'sara@taskly.demo', type: 'task_assigned', title: 'New task assigned', message: 'Alex assigned you "Design Landing Page"' },
      { email: 'ali@taskly.demo', type: 'deadline_reminder', title: 'Deadline tomorrow', message: '"Build Push Notifications" is due tomorrow' },
      { email: 'alex@taskly.demo', type: 'board_invite', title: 'Added to a board', message: 'Sara added you to "Marketing Campaign"' },
    ]) {
      await client.query(
        'INSERT INTO notifications (user_id, type, title, message) VALUES ($1, $2, $3, $4)',
        [userIds[n.email], n.type, n.title, n.message]
      );
    }

    console.log('Seed complete!');
    console.log('');
    console.log('Demo accounts (password: password123):');
    for (const u of users) {
      console.log(`  ${u.email} — ${u.name}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
