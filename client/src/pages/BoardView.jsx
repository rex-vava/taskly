import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Plus } from 'lucide-react';
import { fetchBoard, clearCurrentBoard } from '../store/slices/boardsSlice';
import { createTask } from '../store/slices/tasksSlice';
import { connectSocket } from '../utils/socket';
import KanbanBoard from '../components/boards/KanbanBoard';
import BoardMembers from '../components/boards/BoardMembers';

export default function BoardView() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { current, loading } = useSelector((s) => s.boards);
  const [showModal, setShowModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', listId: '', priority: 'medium', dueDate: '' });

  useEffect(() => {
    dispatch(fetchBoard(id));
    const socket = connectSocket();
    socket.emit('join:board', id);

    const onTaskUpdate = () => dispatch(fetchBoard(id));
    socket.on('task:created', onTaskUpdate);
    socket.on('task:updated', onTaskUpdate);
    socket.on('task:deleted', onTaskUpdate);

    return () => {
      socket.emit('leave:board', id);
      socket.off('task:created', onTaskUpdate);
      socket.off('task:updated', onTaskUpdate);
      socket.off('task:deleted', onTaskUpdate);
      dispatch(clearCurrentBoard());
    };
  }, [id, dispatch]);

  const lists = current?.lists || [];
  const tasks = current?.tasks || [];

  const handleCreateTask = async (e) => {
    e.preventDefault();
    await dispatch(createTask({
      title: newTask.title,
      boardId: id,
      listId: newTask.listId,
      priority: newTask.priority,
      dueDate: newTask.dueDate || null,
    }));
    dispatch(fetchBoard(id));
    setShowModal(false);
    setNewTask({ title: '', listId: '', priority: 'medium', dueDate: '' });
  };

  if (loading || !current) {
    return <div className="text-slate-500">Loading board...</div>;
  }

  return (
    <div>
      <div className="flex items-start gap-4 mb-6">
        <Link to="/boards" className="text-slate-400 hover:text-slate-600 mt-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{current.title}</h1>
          {current.description && <p className="text-slate-500 text-sm mt-0.5">{current.description}</p>}
        </div>
        <div className="flex items-start gap-4">
          <BoardMembers
            boardId={id}
            members={current.members}
            onUpdate={() => dispatch(fetchBoard(id))}
          />
          <button
            onClick={() => {
              setNewTask((t) => ({ ...t, listId: lists[0]?.id || '' }));
              setShowModal(true);
            }}
            className="btn-primary flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>

      <KanbanBoard
        lists={lists}
        tasks={tasks}
        onTasksChange={() => dispatch(fetchBoard(id))}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Add Task</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="input"
                  placeholder="Design Landing Page"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">List</label>
                <select
                  value={newTask.listId}
                  onChange={(e) => setNewTask({ ...newTask, listId: e.target.value })}
                  className="input"
                  required
                >
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>{l.title}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="input"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due date</label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
