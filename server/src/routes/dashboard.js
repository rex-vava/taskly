import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    const { rows } = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE assignee_id = $1 OR created_by = $1) AS my_tasks,
        COUNT(*) FILTER (WHERE (assignee_id = $1 OR created_by = $1) AND status = 'in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE (assignee_id = $1 OR created_by = $1) AND status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE (assignee_id = $1 OR created_by = $1) AND status != 'completed' AND due_date < CURRENT_DATE) AS overdue,
        COUNT(*) FILTER (WHERE (assignee_id = $1 OR created_by = $1) AND status = 'todo') AS todo
       FROM tasks
       WHERE assignee_id = $1 OR created_by = $1`,
      [userId]
    );

    const { rows: recentTasks } = await pool.query(
      `SELECT t.id, t.title, t.status, t.due_date, t.priority, b.title AS category
       FROM tasks t JOIN boards b ON t.board_id = b.id
       WHERE t.assignee_id = $1
       ORDER BY t.due_date ASC NULLS LAST
       LIMIT 8`,
      [userId]
    );

    const { rows: activity } = await pool.query(
      `SELECT al.*, u.name AS user_name
       FROM activity_logs al JOIN users u ON al.user_id = u.id
       WHERE al.board_id IN (
         SELECT id FROM boards WHERE owner_id = $1
         UNION SELECT board_id FROM board_members WHERE user_id = $1
       )
       ORDER BY al.created_at DESC LIMIT 10`,
      [userId]
    );

    const { rows: events } = await pool.query(
      `SELECT * FROM events
       WHERE user_id = $1 AND start_date >= NOW()
       ORDER BY start_date ASC LIMIT 5`,
      [userId]
    );

    res.json({
      stats: rows[0],
      recentTasks,
      activity,
      upcomingEvents: events,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
});

export default router;
