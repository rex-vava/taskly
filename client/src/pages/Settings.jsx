import { useSelector } from 'react-redux';
import PlaceholderPage from './PlaceholderPage';

export default function Settings() {
  const { user } = useSelector((s) => s.auth);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your profile and preferences</p>
      </div>
      <div className="card p-6 max-w-lg">
        <h2 className="font-semibold text-slate-900 mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input className="input" value={user?.name || ''} readOnly />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input className="input" value={user?.email || ''} readOnly />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <input className="input capitalize" value={user?.role || 'member'} readOnly />
          </div>
        </div>
      </div>
    </div>
  );
}
