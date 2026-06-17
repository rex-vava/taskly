import pool from '../config/db.js';
import { createNotification } from './activity.js';

const REMINDER_SENT = new Set();

export function startReminderScheduler(io) {
  const checkReminders = async () => {
    try {
      const { rows: dueTomorrow } = await pool.query(
        `SELECT t.*, u.name AS assignee_name, b.title AS board_title
         FROM tasks t
         JOIN users u ON t.assignee_id = u.id
         JOIN boards b ON t.board_id = b.id
         WHERE t.due_date = CURRENT_DATE + INTERVAL '1 day'
           AND t.status != 'completed'
           AND t.assignee_id IS NOT NULL`
      );

      for (const task of dueTomorrow) {
        const key = `tomorrow:${task.id}:${task.assignee_id}`;
        if (REMINDER_SENT.has(key)) continue;
        REMINDER_SENT.add(key);

        const notification = await createNotification({
          userId: task.assignee_id,
          type: 'deadline_reminder',
          title: 'Deadline tomorrow',
          message: `"${task.title}" is due tomorrow`,
          taskId: task.id,
          boardId: task.board_id,
        });
        io?.to(`user:${task.assignee_id}`).emit('notification', notification);
      }

      const { rows: dueToday } = await pool.query(
        `SELECT t.*, b.title AS board_title
         FROM tasks t JOIN boards b ON t.board_id = b.id
         WHERE t.due_date = CURRENT_DATE
           AND t.status != 'completed'
           AND t.assignee_id IS NOT NULL`
      );

      for (const task of dueToday) {
        const key = `today:${task.id}:${task.assignee_id}`;
        if (REMINDER_SENT.has(key)) continue;
        REMINDER_SENT.add(key);

        const notification = await createNotification({
          userId: task.assignee_id,
          type: 'deadline_today',
          title: 'Due today',
          message: `"${task.title}" is due today`,
          taskId: task.id,
          boardId: task.board_id,
        });
        io?.to(`user:${task.assignee_id}`).emit('notification', notification);
      }

      const { rows: overdue } = await pool.query(
        `SELECT t.*, b.title AS board_title
         FROM tasks t JOIN boards b ON t.board_id = b.id
         WHERE t.due_date < CURRENT_DATE
           AND t.status != 'completed'
           AND t.assignee_id IS NOT NULL`
      );

      for (const task of overdue) {
        const key = `overdue:${task.id}:${task.assignee_id}:${task.due_date}`;
        if (REMINDER_SENT.has(key)) continue;
        REMINDER_SENT.add(key);

        const notification = await createNotification({
          userId: task.assignee_id,
          type: 'overdue',
          title: 'Task overdue',
          message: `"${task.title}" is past its due date`,
          taskId: task.id,
          boardId: task.board_id,
        });
        io?.to(`user:${task.assignee_id}`).emit('notification', notification);
      }
    } catch (err) {
      console.error('Reminder check failed:', err);
    }
  };

  checkReminders();
  setInterval(checkReminders, 60 * 60 * 1000);
  console.log('Deadline reminder scheduler started');
}
