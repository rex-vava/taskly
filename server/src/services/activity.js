import pool from '../config/db.js';

export async function logActivity({ boardId, userId, action, entityType, entityId, details }) {
  await pool.query(
    `INSERT INTO activity_logs (board_id, user_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [boardId, userId, action, entityType, entityId, details ? JSON.stringify(details) : null]
  );
}

export async function createNotification({ userId, type, title, message, taskId, boardId }) {
  const { rows } = await pool.query(
    `INSERT INTO notifications (user_id, type, title, message, related_task_id, related_board_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [userId, type, title, message, taskId || null, boardId || null]
  );
  return rows[0];
}
