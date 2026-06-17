import { Router } from 'express';
import { body } from 'express-validator';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { logActivity, createNotification } from '../services/activity.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { status, boardId, assignee } = req.query;
    let query = `
      SELECT t.*, b.title AS board_title, u.name AS assignee_name,
             l.title AS list_title
      FROM tasks t
      JOIN boards b ON t.board_id = b.id
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN lists l ON t.list_id = l.id
      WHERE (t.assignee_id = $1 OR t.created_by = $1
        OR t.board_id IN (SELECT board_id FROM board_members WHERE user_id = $1))`;
    const params = [req.user.id];
    let paramIndex = 2;

    if (status) {
      query += ` AND t.status = $${paramIndex++}`;
      params.push(status);
    }
    if (boardId) {
      query += ` AND t.board_id = $${paramIndex++}`;
      params.push(boardId);
    }
    if (assignee === 'me') {
      query += ` AND t.assignee_id = $1`;
    }

    query += ' ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

const LIST_STATUS_MAP = {
  'To Do': 'todo',
  'In Progress': 'in_progress',
  'Review': 'review',
  'Testing': 'testing',
  'Completed': 'completed',
};

router.patch('/reorder', async (req, res) => {
  try {
    const { taskId, listId, position, status } = req.body;
    if (!taskId || !listId || position === undefined) {
      return res.status(400).json({ message: 'taskId, listId, and position are required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE tasks SET position = position + 1
         WHERE list_id = $1 AND position >= $2 AND id != $3`,
        [listId, position, taskId]
      );

      const updates = ['list_id = $1', 'position = $2', 'updated_at = NOW()'];
      const values = [listId, position];
      if (status) {
        updates.push(`status = $${values.length + 1}`);
        values.push(status);
      }
      values.push(taskId);

      const { rows } = await client.query(
        `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
        values
      );

      await client.query('COMMIT');
      if (!rows[0]) return res.status(404).json({ message: 'Task not found' });

      const task = rows[0];
      req.io?.to(`board:${task.board_id}`).emit('task:updated', task);
      res.json(task);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to reorder task' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*, u.name AS assignee_name, b.title AS board_title
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       JOIN boards b ON t.board_id = b.id
       WHERE t.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Task not found' });

    const { rows: comments } = await pool.query(
      `SELECT c.*, u.name AS user_name, u.avatar_url
       FROM comments c JOIN users u ON c.user_id = u.id
       WHERE c.task_id = $1 ORDER BY c.created_at`,
      [req.params.id]
    );

    const { rows: checklists } = await pool.query(
      'SELECT * FROM checklists WHERE task_id = $1 ORDER BY position',
      [req.params.id]
    );

    const { rows: attachments } = await pool.query(
      'SELECT * FROM attachments WHERE task_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );

    res.json({ ...rows[0], comments, checklists, attachments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch task' });
  }
});

router.post(
  '/',
  [
    body('title').trim().notEmpty(),
    body('boardId').isUUID(),
    body('listId').isUUID(),
  ],
  validate,
  async (req, res) => {
    try {
      const { title, description, boardId, listId, priority, assigneeId, dueDate, status } = req.body;
      const { rows: pos } = await pool.query(
        'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM tasks WHERE list_id = $1',
        [listId]
      );

      const { rows } = await pool.query(
        `INSERT INTO tasks (title, description, board_id, list_id, priority, assignee_id, created_by, due_date, status, position)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [
          title,
          description || null,
          boardId,
          listId,
          priority || 'medium',
          assigneeId || null,
          req.user.id,
          dueDate || null,
          status || 'todo',
          pos[0].next_pos,
        ]
      );

      const task = rows[0];

      await logActivity({
        boardId,
        userId: req.user.id,
        action: 'created_task',
        entityType: 'task',
        entityId: task.id,
        details: { title },
      });

      if (assigneeId && assigneeId !== req.user.id) {
        const notification = await createNotification({
          userId: assigneeId,
          type: 'task_assigned',
          title: 'New task assigned',
          message: `${req.user.name} assigned you "${title}"`,
          taskId: task.id,
          boardId,
        });
        req.io?.to(`user:${assigneeId}`).emit('notification', notification);
      }

      req.io?.to(`board:${boardId}`).emit('task:created', task);
      res.status(201).json(task);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to create task' });
    }
  }
);

router.patch('/:id', async (req, res) => {
  try {
    const fields = ['title', 'description', 'priority', 'status', 'assignee_id', 'due_date', 'list_id', 'position'];
    const updates = [];
    const values = [];
    let i = 1;

    const fieldMap = {
      assigneeId: 'assignee_id',
      dueDate: 'due_date',
      listId: 'list_id',
    };

    for (const [key, value] of Object.entries(req.body)) {
      const col = fieldMap[key] || key;
      if (fields.includes(col) && value !== undefined) {
        updates.push(`${col} = $${i++}`);
        values.push(value);
      }
    }

    if (!updates.length) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    updates.push('updated_at = NOW()');
    values.push(req.params.id);

    const { rows } = await pool.query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    if (!rows[0]) return res.status(404).json({ message: 'Task not found' });

    const task = rows[0];
    await logActivity({
      boardId: task.board_id,
      userId: req.user.id,
      action: 'updated_task',
      entityType: 'task',
      entityId: task.id,
    });

    req.io?.to(`board:${task.board_id}`).emit('task:updated', task);
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update task' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING board_id', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Task not found' });
    req.io?.to(`board:${rows[0].board_id}`).emit('task:deleted', { id: req.params.id });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete task' });
  }
});

router.post('/:id/comments', [body('content').trim().notEmpty()], validate, async (req, res) => {
  try {
    const { rows: task } = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!task[0]) return res.status(404).json({ message: 'Task not found' });

    const { rows } = await pool.query(
      `INSERT INTO comments (task_id, user_id, content) VALUES ($1, $2, $3)
       RETURNING *, (SELECT name FROM users WHERE id = $2) AS user_name`,
      [req.params.id, req.user.id, req.body.content]
    );

    if (task[0].assignee_id && task[0].assignee_id !== req.user.id) {
      const notification = await createNotification({
        userId: task[0].assignee_id,
        type: 'comment',
        title: 'New comment on task',
        message: `${req.user.name} commented on "${task[0].title}"`,
        taskId: task[0].id,
        boardId: task[0].board_id,
      });
      req.io?.to(`user:${task[0].assignee_id}`).emit('notification', notification);
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add comment' });
  }
});

export { LIST_STATUS_MAP };
export default router;
