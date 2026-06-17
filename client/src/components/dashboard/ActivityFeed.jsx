import { formatRelative } from '../../utils/format';

const actionLabels = {
  created_task: 'added a new task',
  updated_task: 'updated a task',
  created_board: 'created a board',
  completed_task: 'completed a task',
  invited_member: 'invited a team member',
};

export default function ActivityFeed({ activities }) {
  if (!activities?.length) {
    return (
      <div className="card p-6 text-center text-slate-400 text-sm">
        No team activity yet
      </div>
    );
  }

  return (
    <div className="card divide-y divide-slate-100">
      {activities.map((item) => (
        <div key={item.id} className="flex items-start gap-3 p-4">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-xs shrink-0">
            {item.user_name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-700">
              <span className="font-medium text-slate-900">{item.user_name}</span>
              {' '}{actionLabels[item.action] || item.action}
              {item.details?.title && (
                <span className="font-medium"> "{item.details.title}"</span>
              )}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{formatRelative(item.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
