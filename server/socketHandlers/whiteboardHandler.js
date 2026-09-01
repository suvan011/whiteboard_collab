/**
 * whiteboardHandler.js
 * Real-time collaborative drawing synchronization, streaming strokes,
 * shapes, text, eraser, undo/redo, and canvas clearing.
 */

const roomManager = require('../roomManager');

module.exports = (io, socket) => {
  // Live in-progress stroke streaming (for ultra-smooth 60fps real-time pen strokes)
  socket.on('draw:live-stroke', (strokeData) => {
    const roomId = roomManager.socketToRoom.get(socket.id);
    if (!roomId) return;

    socket.to(roomId).emit('draw:live-stroke', {
      socketId: socket.id,
      ...strokeData,
    });
  });

  // Finalized element added (stroke finished, shape drawn, text committed)
  socket.on('draw:element-add', (element, callback) => {
    const roomId = roomManager.socketToRoom.get(socket.id);
    if (!roomId || !element) return;

    const savedElement = roomManager.addElement(roomId, element);
    if (savedElement) {
      // Broadcast to all other peers in the room
      socket.to(roomId).emit('draw:element-added', savedElement);

      if (callback) callback({ success: true, element: savedElement });
    }
  });

  // Element moved, resized, or updated
  socket.on('draw:element-update', ({ id, updates }, callback) => {
    const roomId = roomManager.socketToRoom.get(socket.id);
    if (!roomId || !id) return;

    const updated = roomManager.updateElement(roomId, id, updates);
    if (updated) {
      socket.to(roomId).emit('draw:element-updated', updated);
      if (callback) callback({ success: true, element: updated });
    }
  });

  // Element deleted
  socket.on('draw:element-delete', ({ id }, callback) => {
    const roomId = roomManager.socketToRoom.get(socket.id);
    if (!roomId || !id) return;

    const deleted = roomManager.deleteElement(roomId, id);
    if (deleted) {
      socket.to(roomId).emit('draw:element-deleted', { id });
      if (callback) callback({ success: true, id });
    }
  });

  // Collaborative Undo
  socket.on('draw:undo', (callback) => {
    const roomId = roomManager.socketToRoom.get(socket.id);
    if (!roomId) return;

    const result = roomManager.undo(roomId);
    if (result) {
      // Broadcast updated full canvas elements to everyone in room
      io.to(roomId).emit('draw:sync-all', { elements: result.elements });
      if (callback) callback({ success: true, elements: result.elements });
    } else {
      if (callback) callback({ success: false, message: 'Nothing to undo' });
    }
  });

  // Collaborative Redo
  socket.on('draw:redo', (callback) => {
    const roomId = roomManager.socketToRoom.get(socket.id);
    if (!roomId) return;

    const result = roomManager.redo(roomId);
    if (result) {
      io.to(roomId).emit('draw:sync-all', { elements: result.elements });
      if (callback) callback({ success: true, elements: result.elements });
    } else {
      if (callback) callback({ success: false, message: 'Nothing to redo' });
    }
  });

  // Clear Whiteboard
  socket.on('draw:clear', (callback) => {
    const roomId = roomManager.socketToRoom.get(socket.id);
    if (!roomId) return;

    const cleared = roomManager.clearRoom(roomId);
    if (cleared) {
      io.to(roomId).emit('draw:cleared');
      if (callback) callback({ success: true });
      console.log(`[WHITEBOARD] Room ${roomId} canvas cleared by ${socket.id}`);
    }
  });
};
