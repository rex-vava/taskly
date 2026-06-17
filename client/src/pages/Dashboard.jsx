import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { CheckSquare, Clock, AlertCircle, ListTodo } from 'lucide-react';
import api from '../utils/api';
import { StatCard } from '../components/ui/Badges';
import TaskChart from '../components/dashboard/TaskChart';
import TaskList from '../components/dashboard/TaskList';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import { updateTask } from '../store/slices/tasksSlice';
import { formatDate } from '../utils/format';

export default function Dashboard() {
  const dispatch = useDispatch();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (task) => {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    await dispatch(updateTask({ id: task.id, status: newStatus }));
    setData((prev) => ({
      ...prev,
      recentTasks: prev.recentTasks.map((t) =>
        t.id === task.id ? { ...t, status: newStatus } : t
      ),
      stats: {
        ...prev.stats,
        completed: Number(prev.stats.completed) + (newStatus === 'completed' ? 1 : -1),
      },
    }));
  };

  if (loading) {
    return <div className="text-slate-500">Loading dashboard...</div>;
  }

  const { stats, recentTasks, activity, upcomingEvents } = data || {};

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of your tasks and team activity</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="My Tasks" value={stats?.my_tasks} icon={ListTodo} color="primary" />
        <StatCard title="In Progress" value={stats?.in_progress} icon={Clock} color="blue" />
        <StatCard title="Completed" value={stats?.completed} icon={CheckSquare} color="green" />
        <StatCard title="Overdue" value={stats?.overdue} icon={AlertCircle} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">My Tasks</h2>
            <TaskList tasks={recentTasks} onToggle={handleToggle} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Team Activity</h2>
            <ActivityFeed activities={activity} />
          </div>
        </div>

        <div className="space-y-6">
          <TaskChart stats={stats} />
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Events</h3>
            {upcomingEvents?.length ? (
              <ul className="space-y-3">
                {upcomingEvents.map((event) => (
                  <li key={event.id} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{event.title}</p>
                      <p className="text-xs text-slate-500">{formatDate(event.start_date)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">No upcoming events</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
