import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react';
import api from '../utils/api';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const typeColors = {
  event: 'bg-primary-500',
  meeting: 'bg-primary-500',
  milestone: 'bg-purple-500',
  reminder: 'bg-amber-500',
  deadline: 'bg-red-500',
};

export default function Calendar() {
  const [current, setCurrent] = useState(new Date());
  const [data, setData] = useState({ events: [], deadlines: [] });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [form, setForm] = useState({ title: '', startDate: '', eventType: 'meeting', description: '' });

  const year = current.getFullYear();
  const month = current.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  const loadCalendar = () => {
    setLoading(true);
    api.get('/calendar', { params: { month: monthKey } })
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCalendar();
  }, [monthKey]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const getItemsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const events = (data.events || []).filter((e) => e.start_date?.startsWith(dateStr));
    const deadlines = (data.deadlines || []).filter((d) => d.start_date === dateStr);
    return [...events, ...deadlines];
  };

  const handlePrev = () => setCurrent(new Date(year, month - 1, 1));
  const handleNext = () => setCurrent(new Date(year, month + 1, 1));

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      await api.post('/calendar/events', {
        title: form.title,
        startDate: form.startDate,
        eventType: form.eventType,
        description: form.description,
      });
      setShowModal(false);
      setForm({ title: '', startDate: '', eventType: 'meeting', description: '' });
      loadCalendar();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create event');
    }
  };

  const openAddEvent = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T09:00:00`;
    setForm({ title: '', startDate: dateStr, eventType: 'meeting', description: '' });
    setSelectedDay(day);
    setShowModal(true);
  };

  const allUpcoming = [...(data.events || []), ...(data.deadlines || [])]
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    .slice(0, 8);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
          <p className="text-slate-500 mt-1">Deadlines, meetings, and milestones</p>
        </div>
        <button onClick={() => { setSelectedDay(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Event
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={handlePrev} className="p-2 hover:bg-slate-100 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold">{MONTHS[month]} {year}</h2>
            <button onClick={handleNext} className="p-2 hover:bg-slate-100 rounded-lg">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-slate-500 py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const items = getItemsForDay(day);
              const isToday =
                today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

              return (
                <button
                  key={day}
                  onClick={() => openAddEvent(day)}
                  className={`h-24 p-1.5 border rounded-lg text-left hover:bg-slate-50 transition-colors ${
                    isToday ? 'border-primary-400 bg-primary-50' : 'border-slate-100'
                  }`}
                >
                  <span className={`text-sm font-medium ${isToday ? 'text-primary-700' : 'text-slate-700'}`}>
                    {day}
                  </span>
                  <div className="mt-1 space-y-0.5 overflow-hidden">
                    {items.slice(0, 2).map((item) => (
                      <div
                        key={item.id}
                        className={`text-[10px] text-white px-1 py-0.5 rounded truncate ${
                          typeColors[item.item_type] || typeColors[item.event_type] || 'bg-slate-400'
                        }`}
                        title={item.title}
                      >
                        {item.title}
                      </div>
                    ))}
                    {items.length > 2 && (
                      <span className="text-[10px] text-slate-400">+{items.length - 2} more</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-600" />
              Upcoming
            </h3>
            {loading ? (
              <p className="text-sm text-slate-400">Loading...</p>
            ) : allUpcoming.length === 0 ? (
              <p className="text-sm text-slate-400">No upcoming items this month</p>
            ) : (
              <ul className="space-y-3">
                {allUpcoming.map((item) => (
                  <li key={`${item.item_type}-${item.id}`} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      typeColors[item.item_type] || typeColors[item.event_type] || 'bg-slate-400'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(item.start_date).toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric',
                        })}
                        {item.board_title && ` · ${item.board_title}`}
                      </p>
                      {item.item_type === 'deadline' && (
                        <span className="text-[10px] text-red-600 font-medium">Deadline</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-slate-900 mb-3">Legend</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500" /> Task deadlines</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-primary-500" /> Meetings & events</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500" /> Milestones</div>
            </div>
            <p className="text-xs text-slate-400 mt-4">
              Deadline reminders are sent automatically 1 day before and on the due date.
            </p>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">
              {selectedDay ? `Add Event — ${MONTHS[month]} ${selectedDay}` : 'Add Event'}
            </h2>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input"
                  placeholder="Team Meeting"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date & time</label>
                <input
                  type="datetime-local"
                  value={form.startDate ? form.startDate.slice(0, 16) : ''}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={form.eventType}
                  onChange={(e) => setForm({ ...form, eventType: e.target.value })}
                  className="input"
                >
                  <option value="meeting">Meeting</option>
                  <option value="milestone">Milestone</option>
                  <option value="reminder">Reminder</option>
                  <option value="deadline">Deadline</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input resize-none"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create Event</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
