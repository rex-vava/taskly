import { Router } from 'express';
import { body } from 'express-validator';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { logActivity } from '../services/activity.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.*, 
        (SELECT COUNT(*) FROM tasks t WHERE t.board_id = b.id) AS task_count,
        (SELECT COUNT(*) FROM board_members bm WHERE bm.board_id = b.id) AS member_count
       FROM boards b
       WHERE b.owner_id = $1
          OR b.id IN (SELECT board_id FROM board_members WHERE user_id = $1)
       ORDER BY b.updated_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch boards' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows: boards } = await pool.query(
      `SELECT b.* FROM boards b
       WHERE b.id = $1 AND (b.owner_id = $2 OR b.id IN (
         SELECT board_id FROM board_members WHERE user_id = $2
       ))`,
      [req.params.id, req.user.id]
    );
    if (!boards[0]) return res.status(404).json({ message: 'Board not found' });

    const { rows: lists } = await pool.query(
      'SELECT * FROM lists WHERE board_id = $1 ORDER BY position',
      [req.params.id]
    );

    const { rows: tasks } = await pool.query(
      `SELECT t.*, u.name AS assignee_name, u.avatar_url AS assignee_avatar
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE t.board_id = $1
       ORDER BY t.position`,
      [req.params.id]
    );

    const { rows: members } = await pool.query(
      `SELECT u.id, u.name, u.email, u.avatar_url, bm.role
       FROM board_members bm JOIN users u ON bm.user_id = u.id
       WHERE bm.board_id = $1`,
      [req.params.id]
    );

    res.json({ ...boards[0], lists, tasks, members });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch board' });
  }
});

router.post(
  '/',
  [body('title').trim().notEmpty()],
  validate,
  async (req, res) => {
    try {
      const { title, description, color } = req.body;
      const { rows } = await pool.query(
        'INSERT INTO boards (title, description, color, owner_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [title, description || null, color || '#6366f1', req.user.id]
      );
      const board = rows[0];

      const defaultLists = ['To Do', 'In Progress', 'Review', 'Completed'];
      for (let i = 0; i < defaultLists.length; i++) {
        await pool.query(
          'INSERT INTO lists (board_id, title, position) VALUES ($1, $2, $3)',
          [board.id, defaultLists[i], i]
        );
      }

      await pool.query(
        'INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, $3)',
        [board.id, req.user.id, 'owner']
      );

      await logActivity({
        boardId: board.id,
        userId: req.user.id,
        action: 'created_board',
        entityType: 'board',
        entityId: board.id,
        details: { title },
      });

      res.status(201).json(board);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to create board' });
    }
  }
);

router.post('/:id/lists', [body('title').trim().notEmpty()], validate, async (req, res) => {
  try {
    const { rows: count } = await pool.query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM lists WHERE board_id = $1',
      [req.params.id]
    );
    const { rows } = await pool.query(
      'INSERT INTO lists (board_id, title, position) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, req.body.title, count[0].next_pos]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create list' });
  }
});

export default router;
