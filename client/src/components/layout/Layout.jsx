import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import Sidebar from './Sidebar';
import { connectSocket } from '../../utils/socket';
import { addNotification } from '../../store/slices/notificationsSlice';
import { fetchUnreadCount } from '../../store/slices/notificationsSlice';

export default function Layout() {
  const dispatch = useDispatch();

  useEffect(() => {
    const socket = connectSocket();
    dispatch(fetchUnreadCount());

    socket.on('notification', (notification) => {
      dispatch(addNotification(notification));
    });

    return () => {
      socket.off('notification');
    };
  }, [dispatch]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <Outlet />
      </main>
    </div>
  );
}
