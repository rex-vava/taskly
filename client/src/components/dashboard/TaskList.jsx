import { StatusBadge } from '../ui/Badges';
import { formatDate } from '../../utils/format';

export default function TaskList({ tasks, onToggle }) {
  if (!tasks?.length) {
    return (
      <div className="card p-6 text-center text-slate-400 text-sm">
        No tasks assigned to you yet
      </div>
    );
  }

  return (
    <div className="card divide-y divide-slate-100">
      {tasks.map((task) => (
        <div key={task.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
          <input
            type="checkbox"
            checked={task.status === 'completed'}
            onChange={() => onToggle?.(task)}
            className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
              {task.title}
            </p>
            {task.category && (
              <p className="text-xs text-slate-500 mt-0.5">{task.category}</p>
            )}
          </div>
          {task.due_date && (
            <span className="text-xs text-slate-500">{formatDate(task.due_date)}</span>
          )}
          <StatusBadge status={task.status} />
        </div>
      ))}
    </div>
  );
}
