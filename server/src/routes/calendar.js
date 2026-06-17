import { Router } from 'express';
import { body } from 'express-validator';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { month } = req.query;
    const start = month ? new Date(`${month}-01`) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);

    const { rows: events } = await pool.query(
      `SELECT e.*, b.title AS board_title, 'event' AS item_type
       FROM events e
       LEFT JOIN boards b ON e.board_id = b.id
       WHERE e.user_id = $1
         AND e.start_date >= $2 AND e.start_date <= $3
       ORDER BY e.start_date`,
      [req.user.id, start, end]
    );

    const { rows: deadlines } = await pool.query(
      `SELECT t.id, t.title, t.due_date AS start_date, t.priority, t.status,
              b.title AS board_title, b.id AS board_id, 'deadline' AS item_type
       FROM tasks t
       JOIN boards b ON t.board_id = b.id
       WHERE (t.assignee_id = $1 OR t.created_by = $1)
         AND t.due_date IS NOT NULL
         AND t.due_date >= $2::date AND t.due_date <= $3::date
         AND t.status != 'completed'
       ORDER BY t.due_date`,
      [req.user.id, start.toISOString().split('T')[0], end.toISOString().split('T')[0]]
    );

    res.json({ events, deadlines, month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch calendar data' });
  }
});

router.get('/upcoming', async (req, res) => {
  try {
    const { rows: events } = await pool.query(
      `SELECT e.*, 'event' AS item_type FROM events e
       WHERE e.user_id = $1 AND e.start_date >= NOW()
       ORDER BY e.start_date LIMIT 10`,
      [req.user.id]
    );

    const { rows: deadlines } = await pool.query(
      `SELECT t.id, t.title, t.due_date AS start_date, t.priority, t.status,
              b.title AS board_title, 'deadline' AS item_type
       FROM tasks t JOIN boards b ON t.board_id = b.id
       WHERE (t.assignee_id = $1 OR t.created_by = $1)
         AND t.due_date >= CURRENT_DATE
         AND t.status != 'completed'
       ORDER BY t.due_date LIMIT 10`,
      [req.user.id]
    );

    const combined = [...events, ...deadlines].sort(
      (a, b) => new Date(a.start_date) - new Date(b.start_date)
    );
    res.json(combined);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch upcoming items' });
  }
});

router.post(
  '/events',
  [
    body('title').trim().notEmpty(),
    body('startDate').isISO8601(),
    body('eventType').optional().isIn(['meeting', 'deadline', 'milestone', 'reminder']),
  ],
  validate,
  async (req, res) => {
    try {
      const { title, description, startDate, endDate, eventType, boardId } = req.body;
      const { rows } = await pool.query(
        `INSERT INTO events (user_id, board_id, title, description, start_date, end_date, event_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [req.user.id, boardId || null, title, description || null, startDate, endDate || null, eventType || 'meeting']
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to create event' });
    }
  }
);

router.delete('/events/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM events WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Event deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete event' });
  }
});

export default router;
