/**
 * signalingHandler.js
 * WebRTC Mesh Signaling for low-latency peer-to-peer voice chat in CanvasConnect
 */

const roomManager = require('../roomManager');

module.exports = (io, socket) => {
  // User joins voice chat
  socket.on('voice:join', (callback) => {
    const roomId = roomManager.socketToRoom.get(socket.id);
    if (!roomId) {
      if (callback) callback({ success: false, error: 'Not in a room' });
      return;
    }

    const user = roomManager.getUser(socket.id);
    const existingPeers = roomManager.getVoiceParticipants(roomId).filter(p => p.socketId !== socket.id);
    
    roomManager.joinVoice(roomId, socket.id);

    // Broadcast to others in the room that this user joined voice
    socket.to(roomId).emit('voice:peer-joined', {
      socketId: socket.id,
      user,
    });

    if (callback) {
      callback({
        success: true,
        existingPeers,
      });
    }

    console.log(`[VOICE] User ${user?.name || socket.id} joined voice in room ${roomId}`);
  });

  // Relay WebRTC Offer
  socket.on('voice:offer', ({ to, offer }) => {
    if (!to || !offer) return;
    io.to(to).emit('voice:offer', {
      from: socket.id,
      offer,
    });
  });

  // Relay WebRTC Answer
  socket.on('voice:answer', ({ to, answer }) => {
    if (!to || !answer) return;
    io.to(to).emit('voice:answer', {
      from: socket.id,
      answer,
    });
  });

  // Relay WebRTC ICE Candidate
  socket.on('voice:ice-candidate', ({ to, candidate }) => {
    if (!to || !candidate) return;
    io.to(to).emit('voice:ice-candidate', {
      from: socket.id,
      candidate,
    });
  });

  // Mute / Unmute status toggle
  socket.on('voice:mute-status', ({ isMuted }) => {
    const roomId = roomManager.socketToRoom.get(socket.id);
    if (!roomId) return;

    roomManager.setVoiceMute(roomId, socket.id, isMuted);

    // Broadcast to room
    io.to(roomId).emit('voice:mute-updated', {
      socketId: socket.id,
      isMuted,
    });
  });

  // User leaves voice chat explicitly
  socket.on('voice:leave', () => {
    const roomId = roomManager.socketToRoom.get(socket.id);
    if (!roomId) return;

    roomManager.leaveVoice(roomId, socket.id);
    io.to(roomId).emit('voice:peer-left', { socketId: socket.id });
    console.log(`[VOICE] User ${socket.id} left voice in room ${roomId}`);
  });
};
