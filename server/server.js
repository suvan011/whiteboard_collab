/**
 * server.js
 * Main entry point for CanvasConnect backend server
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const roomHandler = require('./socketHandlers/roomHandler');
const whiteboardHandler = require('./socketHandlers/whiteboardHandler');
const signalingHandler = require('./socketHandlers/signalingHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for dev/testing
  methods: ['GET', 'POST'],
}));
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 30000,
  pingInterval: 10000,
  maxHttpBufferSize: 1e7, // 10MB payload limit for dense drawing data
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'CanvasConnect Backend Server',
    timestamp: new Date().toISOString(),
  });
});

// Socket connection lifecycle
io.on('connection', (socket) => {
  console.log(`[SOCKET] Client connected: ${socket.id}`);

  // Register modular handlers
  roomHandler(io, socket);
  whiteboardHandler(io, socket);
  signalingHandler(io, socket);

  socket.on('error', (err) => {
    console.error(`[SOCKET ERROR] ${socket.id}:`, err);
  });
});

// Serve client build if available (for production standalone deployment)
const clientBuildPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('CanvasConnect API Server is running. Client build not found in /client/dist.');
    }
  });
});

// Start listening
server.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`🚀 CanvasConnect Server running on port ${PORT}`);
  console.log(`📡 WebSocket and WebRTC signaling ready`);
  console.log(`=============================================`);
});
