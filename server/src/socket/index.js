import jwt from 'jsonwebtoken';

export function setupSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);

    socket.on('join:board', (boardId) => {
      socket.join(`board:${boardId}`);
    });

    socket.on('leave:board', (boardId) => {
      socket.leave(`board:${boardId}`);
    });

    socket.on('disconnect', () => {});
  });
}
