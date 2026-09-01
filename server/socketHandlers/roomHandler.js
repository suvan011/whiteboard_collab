/**
 * roomHandler.js
 * Handles room joining, leaving, user presence, and live cursor tracking
 */

const roomManager = require('../roomManager');

module.exports = (io, socket) => {
  // Join Room
  socket.on('room:join', ({ roomId, userName }, callback) => {
    try {
      if (!roomId || !roomId.trim()) {
        if (callback) callback({ success: false, error: 'Room ID is required.' });
        return;
      }

      const cleanRoomId = roomId.trim().toUpperCase();
      const { room, user } = roomManager.addUser(cleanRoomId, socket.id, userName);

      // Join Socket.IO room channel
      socket.join(cleanRoomId);

      // Broadcast to other users in the room
      socket.to(cleanRoomId).emit('user:joined', {
        user,
        message: `${user.name} joined the room`,
      });

      // Send initial room state back to joining client
      const initialUsers = Array.from(room.users.values());
      const initialElements = room.elements;
      const voiceParticipants = roomManager.getVoiceParticipants(cleanRoomId);

      if (callback) {
        callback({
          success: true,
          user,
          roomId: cleanRoomId,
          users: initialUsers,
          elements: initialElements,
          voiceParticipants,
        });
      }

      console.log(`[ROOM] User ${user.name} (${socket.id}) joined room ${cleanRoomId}`);
    } catch (err) {
      console.error('[ROOM ERROR] join error:', err);
      if (callback) callback({ success: false, error: 'Failed to join room.' });
    }
  });

  // Cursor Move (throttled from client)
  socket.on('cursor:move', ({ x, y }) => {
    const user = roomManager.getUser(socket.id);
    if (!user) return;

    const roomId = roomManager.socketToRoom.get(socket.id);
    if (!roomId) return;

    // Broadcast cursor position to others in room
    socket.to(roomId).emit('cursor:update', {
      socketId: socket.id,
      name: user.name,
      color: user.color,
      x,
      y,
      timestamp: Date.now(),
    });
  });

  // Leave Room explicitly
  socket.on('room:leave', () => {
    handleUserDisconnect(io, socket);
  });

  // Socket Disconnect
  socket.on('disconnect', () => {
    handleUserDisconnect(io, socket);
  });
};

function handleUserDisconnect(io, socket) {
  const result = roomManager.removeUser(socket.id);
  if (!result) return;

  const { roomId, user, remainingUsers } = result;

  // Notify remaining room members
  io.to(roomId).emit('user:left', {
    socketId: socket.id,
    user,
    message: `${user.name} left the room`,
    remainingUsers,
  });

  // Also remove cursor
  io.to(roomId).emit('cursor:remove', { socketId: socket.id });

  // If in voice, notify voice peers
  io.to(roomId).emit('voice:peer-left', { socketId: socket.id });

  console.log(`[ROOM] User ${user.name} (${socket.id}) left room ${roomId}`);
}
