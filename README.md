# 🎨 CanvasConnect — Live Collaborative Drawing & Voice Canvas

> **Think Together. Draw Together. Create Together.**  
> A complete, production-grade, real-time collaborative whiteboard and voice communication workspace built with modern **React**, **HTML5 Canvas API**, **Socket.IO**, and **WebRTC audio mesh**.

---

## ✨ Features Overview

### 1. 🖌️ Rich Collaborative Whiteboard
- **Organic Freehand Pen Tool**: Ultra-smooth freehand drawing with quadratic Bezier curve interpolation and sub-pixel antialiasing.
- **Highlighter Tool**: Semi-transparent highlighter with custom blend modes.
- **Precision Eraser**: Interactive hit-testing stroke and element eraser.
- **Geometric Shapes**: Rectangles (with aspect ratio lock via `Shift`), Circles / Ellipses, Straight Lines, and Directional Arrows with automatic vector arrowheads.
- **Inline Text Notes**: Click anywhere to open inline styled notes with custom font size and typography.
- **Selection & Transform Tool**: Select elements, drag to translate across the virtual workspace, and delete with `Delete` or `Backspace`.
- **Sub-30ms Real-Time Stroke Streaming**: Watch collaborators' strokes appear live in real time before they even release the mouse!

### 2. 👥 Real-Time User Presence & Live Cursors
- **Dynamic Colored Cursors**: Every collaborator has their own unique vibrant cursor with their display name tag moving smoothly at 60fps.
- **Collaborator Presence Avatars**: Active user list in the top navbar with live status badges and speaking rings.
- **Collaborative Undo / Redo**: Room-wide synchronized action stacks (`Ctrl + Z` and `Ctrl + Shift + Z`).
- **Clear Canvas with Safeguard**: Global whiteboard clearing with an interactive confirmation modal.

### 3. 🎙️ WebRTC Peer-to-Peer Voice Chat
- **Mesh Peer-to-Peer Audio**: Low-latency voice communication directly between browsers in the same room.
- **Microphone Controls**: One-click Join Voice, Mute/Unmute microphone, and Leave Voice.
- **Speaking Visualizer**: Real-time `AudioContext AnalyserNode` volume detection that triggers animated audio pulse rings around active speakers.
- **Graceful Error Handling**: Non-blocking permission handling with helpful troubleshooting toasts if microphone access is blocked.

### 4. 🚀 Room System & Landing Page
- **Clean Landing Page**: Modern hero interface with animated vector background canvas and feature highlights.
- **1-Click Room Creation**: Auto-generates unique 6-character room codes (e.g., `ABC123`).
- **Direct Share Links**: One-click copy for room ID and direct URL invite links (`?room=ABC123`).

### 5. 📥 Multi-Format High-Res Canvas Export
- **Export as PNG**: Crisp, high-resolution image format.
- **Export as JPEG**: Compact image format with custom quality presets.
- **Export as PDF**: Vectorized PDF document generation powered by `jsPDF`.
- **Theme Selection**: Choose between Light (Print-Friendly) and Dark backgrounds.

### 6. 🔍 Infinite Viewport Zoom & Pan
- **Smooth Zoom**: Zoom in up to 500% and Zoom out to 20% with 1-click 100% Reset.
- **Spacebar Pan / Middle Click**: Hold `Spacebar` + Drag or use the mouse wheel to pan across the whiteboard.

---

## 🏗️ Architecture & Project Structure

```
alexa/
├── package.json               # Root workspace orchestrator (concurrent dev scripts)
├── server/                    # Backend Node.js & Socket.IO Server
│   ├── package.json
│   ├── server.js              # Express app, HTTP & Socket.IO server setup
│   ├── roomManager.js         # Room state, element stores, voice peers, undo/redo
│   └── socketHandlers/
│       ├── roomHandler.js     # Room lifecycle, join/leave, presence, live cursors
│       ├── whiteboardHandler.js # Collaborative strokes, shapes, text, undo/redo, clear
│       └── signalingHandler.js  # WebRTC mesh signaling (Offer/Answer/ICE candidates)
└── client/                    # Frontend React + Vite + TypeScript Application
    ├── package.json
    ├── vite.config.ts         # Vite server proxy configuration
    ├── tailwind.config.js     # Modern glassmorphic theme styling
    ├── index.html
    └── src/
        ├── types/whiteboard.ts      # TypeScript interfaces and data models
        ├── utils/
        │   ├── canvasRenderer.ts    # High-DPI canvas rendering pipeline & Bezier curves
        │   ├── geometryUtils.ts     # Hit testing, bounding boxes, distance formulas
        │   ├── exportUtils.ts       # Canvas to PNG, JPEG, and jsPDF exporter
        │   └── colorUtils.ts        # Color palettes and sizing presets
        ├── hooks/
        │   ├── useSocket.ts         # Socket.IO connection & room synchronization
        │   ├── useWhiteboard.ts     # Canvas state, tools, undo/redo, transform
        │   ├── useWebRTC.ts         # WebRTC audio mesh, mic stream, speaking detection
        │   └── useToast.ts          # Toast alert notifications
        ├── components/
        │   ├── LandingPage/         # Hero section & room creation modal
        │   ├── Whiteboard/          # Canvas engine, live cursors, text editor
        │   ├── Toolbar/             # Top navigation, tool dock, style properties
        │   ├── VoiceChat/           # Floating voice widget & speaker visualizer
        │   ├── Modals/              # Clear, Share, Export, and Shortcut modals
        │   └── UI/                  # Toasts and tooltips
        ├── App.tsx                  # Root state orchestration
        ├── main.tsx                 # DOM entry point
        └── index.css                # Glassmorphism, animations, canvas grid
```

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action |
| :--- | :--- |
| <kbd>P</kbd> | Pen Tool |
| <kbd>H</kbd> | Highlighter Tool |
| <kbd>E</kbd> | Eraser Tool |
| <kbd>S</kbd> or <kbd>V</kbd> | Select & Move Tool |
| <kbd>R</kbd> | Rectangle Shape |
| <kbd>C</kbd> | Circle / Ellipse Shape |
| <kbd>L</kbd> | Straight Line |
| <kbd>A</kbd> | Directional Arrow |
| <kbd>T</kbd> | Text Note Tool |
| <kbd>Ctrl</kbd> + <kbd>Z</kbd> | Collaborative Undo |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> | Collaborative Redo |
| <kbd>Delete</kbd> / <kbd>Backspace</kbd> | Delete Selected Object |
| <kbd>Space</kbd> + Drag | Pan Canvas |
| <kbd>Ctrl</kbd> + Scroll | Zoom In / Out |
| <kbd>Shift</kbd> + Drag | Lock 1:1 Aspect Ratio for Shapes |

---

## 🚀 Getting Started Locally

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 1. Installation
Install root, backend, and frontend dependencies:
```bash
# In the project root
npm run install:all
```
*Alternatively, install each individually:*
```bash
cd server && npm install
cd ../client && npm install
```

### 2. Running in Development Mode
Start both the backend server (Port 5000) and frontend client (Port 3000) concurrently:
```bash
# In the project root
npm run dev
```
Or start them in separate terminal tabs:
```bash
# Terminal 1: Backend Server
cd server
npm run dev

# Terminal 2: Frontend Client
cd client
npm run dev
```

Open your browser at **`http://localhost:3000`**.

### 3. Production Build & Execution
```bash
# Build the client production bundle
npm run build

# Start the Node.js production server
npm start
```
The application will be served directly at **`http://localhost:5000`**.

---

## 🧪 Testing Multi-User Collaboration
1. Open `http://localhost:3000` in Browser Tab 1.
2. Enter your name (e.g. `Suvan`) and click **"Create New Room"**.
3. Copy the Room ID or click **"Share"** in the top navbar.
4. Open a second browser tab (or Incognito / second device) and enter the Room ID with a second name (e.g. `Rahul`).
5. Draw with different tools, test voice chat, move elements, test undo/redo, and export your completed whiteboard!
