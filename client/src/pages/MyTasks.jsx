import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTasks, updateTask } from '../store/slices/tasksSlice';
import { StatusBadge, PriorityBadge } from '../components/ui/Badges';
import { formatDate } from '../utils/format';

export default function MyTasks() {
  const dispatch = useDispatch();
  const { items, loading } = useSelector((s) => s.tasks);

  useEffect(() => {
    dispatch(fetchTasks({ assignee: 'me' }));
  }, [dispatch]);

  const handleStatusChange = (task, status) => {
    dispatch(updateTask({ id: task.id, status }));
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">My Tasks</h1>
        <p className="text-slate-500 mt-1">All tasks assigned to you</p>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading tasks...</p>
      ) : !items.length ? (
        <div className="card p-12 text-center">
          <p className="text-slate-500">No tasks assigned yet</p>
          <p className="text-sm text-slate-400 mt-1">Tasks assigned to you will appear here</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Task</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Board</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Priority</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Due Date</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((task) => (
                <tr key={task.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-900">{task.title}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{task.board_title}</td>
                  <td className="px-6 py-4"><PriorityBadge priority={task.priority} /></td>
                  <td className="px-6 py-4 text-sm text-slate-500">{formatDate(task.due_date) || '—'}</td>
                  <td className="px-6 py-4">
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task, e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white"
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="testing">Testing</option>
                      <option value="completed">Completed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
