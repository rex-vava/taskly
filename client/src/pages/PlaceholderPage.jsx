export default function PlaceholderPage({ title, description }) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-slate-500 mt-1">{description}</p>
      </div>
      <div className="card p-12 text-center">
        <p className="text-slate-400">This section is coming soon</p>
        <p className="text-sm text-slate-300 mt-1">Part of the Taskly roadmap</p>
      </div>
    </div>
  );
}
