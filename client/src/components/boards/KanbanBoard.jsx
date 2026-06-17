import { useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import api from '../../utils/api';
import { PriorityBadge } from '../ui/Badges';
import { formatDate } from '../../utils/format';

const STATUS_MAP = {
  'To Do': 'todo',
  'In Progress': 'in_progress',
  Review: 'review',
  Testing: 'testing',
  Completed: 'completed',
};

function SortableTask({ task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task, type: 'task' },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="card p-3 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing touch-none"
    >
      <p className="text-sm font-medium text-slate-900">{task.title}</p>
      <div className="flex items-center justify-between mt-2">
        <PriorityBadge priority={task.priority} />
        {task.due_date && <span className="text-xs text-slate-400">{formatDate(task.due_date)}</span>}
      </div>
      {task.assignee_name && (
        <div className="mt-2 flex items-center gap-1">
          <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs flex items-center justify-center font-medium">
            {task.assignee_name.charAt(0)}
          </div>
          <span className="text-xs text-slate-500">{task.assignee_name}</span>
        </div>
      )}
    </div>
  );
}

function TaskCardOverlay({ task }) {
  if (!task) return null;
  return (
    <div className="card p-3 shadow-lg rotate-2 w-72">
      <p className="text-sm font-medium text-slate-900">{task.title}</p>
      <div className="flex items-center justify-between mt-2">
        <PriorityBadge priority={task.priority} />
      </div>
    </div>
  );
}

function KanbanColumn({ list, tasks }) {
  const { setNodeRef, isOver } = useDroppable({
    id: list.id,
    data: { list, type: 'column' },
  });

  return (
    <div className="w-72 shrink-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-slate-700">{list.title}</h3>
        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-2 min-h-[300px] rounded-lg p-2 transition-colors ${
          isOver ? 'bg-primary-50 ring-2 ring-primary-200' : 'bg-slate-50/50'
        }`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTask key={task.id} task={task} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export default function KanbanBoard({ lists, tasks, onTasksChange }) {
  const [activeTask, setActiveTask] = useState(null);
  const [localTasks, setLocalTasks] = useState(tasks);

  useEffect(() => {
    if (!activeTask) setLocalTasks(tasks);
  }, [tasks, activeTask]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const getTasksForList = (listId) =>
    localTasks.filter((t) => t.list_id === listId).sort((a, b) => a.position - b.position);

  const handleDragStart = (event) => {
    const task = localTasks.find((t) => t.id === event.active.id);
    setActiveTask(task);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const taskId = active.id;
    const task = localTasks.find((t) => t.id === taskId);
    if (!task) return;

    let targetListId = task.list_id;
    let newPosition = task.position;

    if (over.data.current?.type === 'column') {
      targetListId = over.id;
      newPosition = getTasksForList(targetListId).length;
    } else {
      const overTask = localTasks.find((t) => t.id === over.id);
      if (overTask) {
        targetListId = overTask.list_id;
        const listTasks = getTasksForList(targetListId);
        newPosition = listTasks.findIndex((t) => t.id === over.id);
      }
    }

    if (targetListId === task.list_id && newPosition === task.position) return;

    const targetList = lists.find((l) => l.id === targetListId);
    const newStatus = STATUS_MAP[targetList?.title] || task.status;

    const updated = localTasks.map((t) =>
      t.id === taskId ? { ...t, list_id: targetListId, position: newPosition, status: newStatus } : t
    );
    setLocalTasks(updated);

    try {
      await api.patch('/tasks/reorder', {
        taskId,
        listId: targetListId,
        position: newPosition,
        status: newStatus,
      });
      onTasksChange?.();
    } catch (err) {
      console.error(err);
      setLocalTasks(tasks);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {lists.map((list) => (
          <KanbanColumn key={list.id} list={list} tasks={getTasksForList(list.id)} />
        ))}
      </div>
      <DragOverlay>{activeTask ? <TaskCardOverlay task={activeTask} /> : null}</DragOverlay>
    </DndContext>
  );
}
