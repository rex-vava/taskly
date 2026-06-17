import { useEffect, useState } from 'react';
import { UserPlus, X, Crown, Shield } from 'lucide-react';
import api from '../../utils/api';

const roleIcons = { owner: Crown, admin: Shield };

export default function BoardMembers({ boardId, members: initialMembers, onUpdate }) {
  const [members, setMembers] = useState(initialMembers || []);
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMembers(initialMembers || []);
  }, [initialMembers]);

  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post(`/team/boards/${boardId}/invite`, { email, role });
      const { data } = await api.get(`/team/boards/${boardId}/members`);
      setMembers(data);
      setEmail('');
      setShowInvite(false);
      onUpdate?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to invite member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId) => {
    if (!confirm('Remove this member from the board?')) return;
    try {
      await api.delete(`/team/boards/${boardId}/members/${userId}`);
      setMembers((m) => m.filter((x) => x.id !== userId));
      onUpdate?.();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member');
    }
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900">Team ({members.length})</h3>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Invite
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {members.map((m) => {
          const RoleIcon = roleIcons[m.role];
          return (
            <div
              key={m.id}
              className="flex items-center gap-2 bg-slate-50 rounded-full pl-1 pr-2 py-1 group"
              title={`${m.name} (${m.role})`}
            >
              <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs flex items-center justify-center font-semibold">
                {m.name.charAt(0)}
              </div>
              <span className="text-xs text-slate-700 max-w-[80px] truncate">{m.name.split(' ')[0]}</span>
              {RoleIcon && <RoleIcon className="w-3 h-3 text-amber-500" />}
              {m.role !== 'owner' && (
                <button
                  onClick={() => handleRemove(m.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {showInvite && (
        <form onSubmit={handleInvite} className="border-t border-slate-100 pt-3 space-y-2">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@email.com"
            className="input text-sm py-1.5"
            required
          />
          <div className="flex gap-2">
            <select value={role} onChange={(e) => setRole(e.target.value)} className="input text-sm py-1.5 flex-1">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" disabled={loading} className="btn-primary text-sm py-1.5 px-3">
              {loading ? '...' : 'Add'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
