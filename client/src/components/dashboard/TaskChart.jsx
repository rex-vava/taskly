import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#22c55e', '#3b82f6', '#94a3b8', '#ef4444'];

export default function TaskChart({ stats }) {
  const data = [
    { name: 'Completed', value: Number(stats?.completed) || 0 },
    { name: 'In Progress', value: Number(stats?.in_progress) || 0 },
    { name: 'To Do', value: Number(stats?.todo) || 0 },
    { name: 'Overdue', value: Number(stats?.overdue) || 0 },
  ].filter((d) => d.value > 0);

  const isEmpty = data.every((d) => d.value === 0);

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Task Overview</h3>
      {isEmpty ? (
        <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
          No tasks yet — create your first task to see the chart
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
