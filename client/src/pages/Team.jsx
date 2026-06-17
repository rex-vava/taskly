import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { UserPlus, Mail, Users } from 'lucide-react';
import api from '../utils/api';
import { fetchBoards } from '../store/slices/boardsSlice';

export default function Team() {
  const dispatch = useDispatch();
  const { items: boards } = useSelector((s) => s.boards);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ boardId: '', email: '', role: 'member' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    dispatch(fetchBoards());
    api.get('/team')
      .then((res) => setTeam(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [dispatch]);

  const handleInvite = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const { data } = await api.post(`/team/boards/${inviteForm.boardId}/invite`, {
        email: inviteForm.email,
        role: inviteForm.role,
      });
      setSuccess(data.message);
      setInviteForm({ boardId: '', email: '', role: 'member' });
      setShowInvite(false);
      const { data: updated } = await api.get('/team');
      setTeam(updated);
    } catch (err) {
      setError(err.response?.data?.message || 'Invite failed');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team</h1>
          <p className="text-slate-500 mt-1">Manage collaborators across your boards</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="btn-primary flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Invite Member
        </button>
      </div>

      {success && (
        <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg mb-4">{success}</div>
      )}

      {loading ? (
        <p className="text-slate-500">Loading team...</p>
      ) : team.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No team members yet</p>
          <p className="text-sm text-slate-400 mt-1">Invite colleagues to your boards to collaborate</p>
          <button onClick={() => setShowInvite(true)} className="btn-primary mt-4">
            Invite your first teammate
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Member</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Email</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Boards</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {team.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm">
                        {member.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-slate-900">{member.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      {member.email}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(member.boards || []).map((board) => (
                        <span key={board} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {board}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-400">{member.board_count} board(s)</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showInvite && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Invite Team Member</h2>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Board</label>
                <select
                  value={inviteForm.boardId}
                  onChange={(e) => setInviteForm({ ...inviteForm, boardId: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Select a board...</option>
                  {boards.map((b) => (
                    <option key={b.id} value={b.id}>{b.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="input"
                  placeholder="colleague@company.com"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">User must already have a Taskly account</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="input"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowInvite(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Send Invite</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
