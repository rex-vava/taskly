import { Router } from 'express';
import { body } from 'express-validator';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createNotification, logActivity } from '../services/activity.js';

const router = Router();
router.use(authenticate);

async function canManageBoard(boardId, userId) {
  const { rows } = await pool.query(
    `SELECT 1 FROM boards b
     LEFT JOIN board_members bm ON bm.board_id = b.id AND bm.user_id = $2
     WHERE b.id = $1 AND (b.owner_id = $2 OR bm.role IN ('owner', 'admin'))`,
    [boardId, userId]
  );
  return rows.length > 0;
}

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT u.id, u.name, u.email, u.avatar_url, u.role AS global_role,
        COUNT(DISTINCT bm.board_id)::int AS board_count,
        ARRAY_AGG(DISTINCT b.title) FILTER (WHERE b.title IS NOT NULL) AS boards
       FROM users u
       JOIN board_members bm ON bm.user_id = u.id
       JOIN boards b ON b.id = bm.board_id
       WHERE bm.board_id IN (
         SELECT board_id FROM board_members WHERE user_id = $1
         UNION SELECT id FROM boards WHERE owner_id = $1
       )
       AND u.id != $1
       GROUP BY u.id, u.name, u.email, u.avatar_url, u.role
       ORDER BY u.name`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch team' });
  }
});

router.get('/boards/:boardId/members', async (req, res) => {
  try {
    const { rows: access } = await pool.query(
      `SELECT 1 FROM boards b
       WHERE b.id = $1 AND (b.owner_id = $2 OR b.id IN (
         SELECT board_id FROM board_members WHERE user_id = $2
       ))`,
      [req.params.boardId, req.user.id]
    );
    if (!access.length) return res.status(404).json({ message: 'Board not found' });

    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.avatar_url, bm.role, bm.joined_at
       FROM board_members bm JOIN users u ON bm.user_id = u.id
       WHERE bm.board_id = $1
       ORDER BY CASE bm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, u.name`,
      [req.params.boardId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch members' });
  }
});

router.post(
  '/boards/:boardId/invite',
  [body('email').isEmail(), body('role').optional().isIn(['member', 'admin'])],
  validate,
  async (req, res) => {
    try {
      const { boardId } = req.params;
      if (!(await canManageBoard(boardId, req.user.id))) {
        return res.status(403).json({ message: 'Only board owners/admins can invite members' });
      }

      const { email, role = 'member' } = req.body;
      const { rows: users } = await pool.query('SELECT id, name, email FROM users WHERE email = $1', [email.toLowerCase()]);
      if (!users[0]) {
        return res.status(404).json({ message: 'No user found with that email. They must register first.' });
      }

      const invitee = users[0];
      if (invitee.id === req.user.id) {
        return res.status(400).json({ message: 'You are already on this board' });
      }

      const existing = await pool.query(
        'SELECT id FROM board_members WHERE board_id = $1 AND user_id = $2',
        [boardId, invitee.id]
      );
      if (existing.rows.length) {
        return res.status(400).json({ message: 'User is already a member of this board' });
      }

      const { rows: board } = await pool.query('SELECT title FROM boards WHERE id = $1', [boardId]);
      await pool.query(
        'INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, $3)',
        [boardId, invitee.id, role]
      );

      await logActivity({
        boardId,
        userId: req.user.id,
        action: 'invited_member',
        entityType: 'user',
        entityId: invitee.id,
        details: { name: invitee.name, email: invitee.email },
      });

      const notification = await createNotification({
        userId: invitee.id,
        type: 'board_invite',
        title: 'Added to a board',
        message: `${req.user.name} added you to "${board[0].title}"`,
        boardId,
      });
      req.io?.to(`user:${invitee.id}`).emit('notification', notification);

      res.status(201).json({ message: `${invitee.name} added to the board`, member: invitee });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to invite member' });
    }
  }
);

router.patch('/boards/:boardId/members/:userId', async (req, res) => {
  try {
    const { boardId, userId } = req.params;
    if (!(await canManageBoard(boardId, req.user.id))) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const { role } = req.body;
    if (!['member', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const { rows: owner } = await pool.query('SELECT owner_id FROM boards WHERE id = $1', [boardId]);
    if (owner[0]?.owner_id === userId) {
      return res.status(400).json({ message: 'Cannot change owner role' });
    }

    await pool.query(
      'UPDATE board_members SET role = $1 WHERE board_id = $2 AND user_id = $3',
      [role, boardId, userId]
    );
    res.json({ message: 'Role updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update role' });
  }
});

router.delete('/boards/:boardId/members/:userId', async (req, res) => {
  try {
    const { boardId, userId } = req.params;
    const isSelf = userId === req.user.id;

    if (!isSelf && !(await canManageBoard(boardId, req.user.id))) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const { rows: board } = await pool.query('SELECT owner_id FROM boards WHERE id = $1', [boardId]);
    if (board[0]?.owner_id === userId) {
      return res.status(400).json({ message: 'Cannot remove the board owner' });
    }

    await pool.query('DELETE FROM board_members WHERE board_id = $1 AND user_id = $2', [boardId, userId]);
    res.json({ message: 'Member removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to remove member' });
  }
});

export default router;
