import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Kanban } from 'lucide-react';
import { fetchBoards, createBoard } from '../store/slices/boardsSlice';

export default function Boards() {
  const dispatch = useDispatch();
  const { items } = useSelector((s) => s.boards);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    dispatch(fetchBoards());
  }, [dispatch]);

  const handleCreate = async (e) => {
    e.preventDefault();
    await dispatch(createBoard({ title, description }));
    setTitle('');
    setDescription('');
    setShowModal(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Boards</h1>
          <p className="text-slate-500 mt-1">Organize projects with Kanban boards</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Board
        </button>
      </div>

      {!items.length ? (
        <div className="card p-12 text-center">
          <Kanban className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No boards yet</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-4">
            Create your first board
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((board) => (
            <Link
              key={board.id}
              to={`/boards/${board.id}`}
              className="card p-6 hover:shadow-md transition-shadow group"
            >
              <div
                className="w-full h-2 rounded-full mb-4"
                style={{ backgroundColor: board.color || '#6366f1' }}
              />
              <h3 className="font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">
                {board.title}
              </h3>
              {board.description && (
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{board.description}</p>
              )}
              <div className="flex gap-4 mt-4 text-xs text-slate-400">
                <span>{board.task_count || 0} tasks</span>
                <span>{board.member_count || 1} members</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Create New Board</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Board name</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input"
                  placeholder="Website Redesign"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input resize-none"
                  rows={3}
                  placeholder="Optional description..."
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">Create Board</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
