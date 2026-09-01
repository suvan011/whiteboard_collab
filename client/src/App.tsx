/**
 * App.tsx
 * Main application container orchestrating the Landing Page,
 * Collaborative Whiteboard Workspace, Voice Chat, Toasts, and Modals.
 */

import React, { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import { useWhiteboard } from './hooks/useWhiteboard';
import { useWebRTC } from './hooks/useWebRTC';
import { useToast } from './hooks/useToast';
import { LandingPage } from './components/LandingPage/LandingPage';
import { TopNav } from './components/Toolbar/TopNav';
import { MainToolbar } from './components/Toolbar/MainToolbar';
import { StylePropertiesBar } from './components/Toolbar/StylePropertiesBar';
import { NavigationControls } from './components/Toolbar/NavigationControls';
import { VoiceChatPanel } from './components/VoiceChat/VoiceChatPanel';
import { WhiteboardCanvas } from './components/Whiteboard/WhiteboardCanvas';
import { ClearConfirmationModal } from './components/Modals/ClearConfirmationModal';
import { ShareRoomModal } from './components/Modals/ShareRoomModal';
import { ExportModal } from './components/Modals/ExportModal';
import { KeyboardShortcutsModal } from './components/Modals/KeyboardShortcutsModal';
import { ToastContainer } from './components/UI/ToastContainer';

export function App() {
  const [inRoom, setInRoom] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState('');
  const [initialRoomParam, setInitialRoomParam] = useState('');

  // Modals state
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Toast notification manager
  const { toasts, addToast, removeToast } = useToast();

  // Read URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setInitialRoomParam(roomParam.toUpperCase());
    }
  }, []);

  // Socket Hook
  const {
    socket,
    currentUser,
    roomUsers,
    remoteCursors,
    connectionStatus,
    joinRoom,
    leaveRoom: socketLeaveRoom,
    emitCursorMove,
  } = useSocket({
    onUserJoined: (user, message) => {
      addToast({
        type: 'info',
        title: 'User Joined',
        message: message || `${user.name} joined the room`,
      });
    },
    onUserLeft: (user, message) => {
      addToast({
        type: 'warning',
        title: 'User Left',
        message: message || `${user.name} left the room`,
      });
    },
    onElementsSynced: (syncedElements) => {
      whiteboard.setElements(syncedElements);
    },
    onElementAdded: (el) => {
      whiteboard.setElements((prev) => {
        if (prev.some((e) => e.id === el.id)) return prev;
        return [...prev, el];
      });
      whiteboard.removeLiveStroke(el.createdBy);
    },
    onElementUpdated: (el) => {
      whiteboard.setElements((prev) =>
        prev.map((e) => (e.id === el.id ? el : e))
      );
    },
    onElementDeleted: (id) => {
      whiteboard.setElements((prev) => prev.filter((e) => e.id !== id));
    },
    onCanvasCleared: () => {
      whiteboard.setElements([]);
      whiteboard.setSelectedElementId(null);
      addToast({
        type: 'info',
        message: 'The whiteboard was cleared by a collaborator.',
      });
    },
    onConnectionChange: (status) => {
      if (status === 'reconnecting') {
        addToast({
          type: 'warning',
          title: 'Connection Lost',
          message: 'Reconnecting to collaboration server...',
        });
      } else if (status === 'connected' && inRoom) {
        addToast({
          type: 'success',
          title: 'Connected',
          message: 'Synced with room.',
        });
      }
    },
  });

  // Whiteboard Hook
  const whiteboard = useWhiteboard({
    socket,
    currentUser,
    onEmitCursor: emitCursorMove,
  });

  // WebRTC Voice Chat Hook
  const webRTC = useWebRTC({
    socket,
    currentUser,
    onError: (errMessage) => {
      addToast({
        type: 'error',
        title: 'Voice Chat Notice',
        message: errMessage,
      });
    },
  });

  // Handle Joining Room from Landing Page
  const handleJoinRoom = async (roomId: string, userName: string) => {
    const res = await joinRoom(roomId, userName);
    if (res.success) {
      setCurrentRoomId(roomId);
      setInRoom(true);
      whiteboard.setElements(res.elements);

      // Update URL query string without reloading
      const newUrl = `${window.location.pathname}?room=${roomId}`;
      window.history.pushState({ path: newUrl }, '', newUrl);

      addToast({
        type: 'success',
        title: 'Welcome to CanvasConnect',
        message: `Joined room ${roomId} as ${userName}.`,
      });
    } else {
      addToast({
        type: 'error',
        title: 'Join Failed',
        message: res.error || 'Failed to connect to room.',
      });
    }
  };

  // Leave room and return to landing page
  const handleLeaveRoom = () => {
    webRTC.leaveVoice();
    socketLeaveRoom();
    setInRoom(false);
    setCurrentRoomId('');

    // Reset URL
    window.history.pushState({}, '', window.location.pathname);
  };

  // If not inside a room, display Landing Page
  if (!inRoom) {
    return (
      <>
        <LandingPage onJoinRoom={handleJoinRoom} initialRoomId={initialRoomParam} />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Top Header Navigation */}
      <TopNav
        roomId={currentRoomId}
        currentUser={currentUser}
        roomUsers={roomUsers}
        connectionStatus={connectionStatus}
        isInVoice={webRTC.isInVoice}
        isMuted={webRTC.isMuted}
        localSpeaking={webRTC.localSpeaking}
        isVoiceConnecting={webRTC.isConnecting}
        onJoinVoice={webRTC.joinVoice}
        onLeaveVoice={webRTC.leaveVoice}
        onToggleMute={webRTC.toggleMute}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenHelpModal={() => setIsHelpModalOpen(true)}
        onLeaveRoom={handleLeaveRoom}
      />

      {/* Insecure Remote Context Notice Banner (browsers require HTTPS for mic access on non-localhost) */}
      {window.location.protocol === 'http:' &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1' && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-200 flex items-center justify-between z-30">
            <span>
              ⚠️ <strong>Microphone Access Notice:</strong> Browsers require HTTPS to connect audio devices over live tunnels.
            </span>
            <button
              onClick={() => {
                window.location.href = window.location.href.replace('http:', 'https:');
              }}
              className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg hover:bg-amber-400 transition-colors shrink-0 ml-3"
            >
              Switch to HTTPS
            </button>
          </div>
        )}

      {/* Main Collaborative Canvas Workspace */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* Floating Top Tool Palette */}
        <MainToolbar
          currentTool={whiteboard.tool}
          onSelectTool={whiteboard.setTool}
          onOpenClearModal={() => setIsClearModalOpen(true)}
        />

        {/* Floating Left Style Properties Dock */}
        <StylePropertiesBar
          tool={whiteboard.tool}
          color={whiteboard.color}
          strokeWidth={whiteboard.strokeWidth}
          opacity={whiteboard.opacity}
          fontSize={whiteboard.fontSize}
          onChangeColor={whiteboard.setColor}
          onChangeStrokeWidth={whiteboard.setStrokeWidth}
          onChangeOpacity={whiteboard.setOpacity}
          onChangeFontSize={whiteboard.setFontSize}
        />

        {/* Floating Bottom-Left Zoom and Undo/Redo Navigation */}
        <NavigationControls
          scale={whiteboard.transform.scale}
          onZoomIn={whiteboard.zoomIn}
          onZoomOut={whiteboard.zoomOut}
          onResetZoom={whiteboard.resetZoom}
          onUndo={whiteboard.undo}
          onRedo={whiteboard.redo}
          isPanning={whiteboard.isPanning}
        />

        {/* Floating Bottom-Right Voice Chat Status Panel */}
        <VoiceChatPanel
          isInVoice={webRTC.isInVoice}
          isMuted={webRTC.isMuted}
          localSpeaking={webRTC.localSpeaking}
          micVolumeLevel={webRTC.micVolumeLevel}
          audioInputDevices={webRTC.audioInputDevices}
          audioOutputDevices={webRTC.audioOutputDevices}
          selectedAudioInputId={webRTC.selectedAudioInputId}
          selectedAudioOutputId={webRTC.selectedAudioOutputId}
          currentUser={currentUser}
          voiceParticipants={webRTC.voiceParticipants}
          onJoinVoice={webRTC.joinVoice}
          onLeaveVoice={webRTC.leaveVoice}
          onToggleMute={webRTC.toggleMute}
          onSwitchAudioInput={webRTC.switchAudioInput}
          onSwitchAudioOutput={webRTC.switchAudioOutput}
        />

        {/* High-DPI Canvas Rendering Engine */}
        <WhiteboardCanvas
          elements={whiteboard.elements}
          selectedElementId={whiteboard.selectedElementId}
          tool={whiteboard.tool}
          color={whiteboard.color}
          transform={whiteboard.transform}
          setTransform={whiteboard.setTransform}
          isPanning={whiteboard.isPanning}
          isSpacePressed={whiteboard.isSpacePressed}
          activeDrawingElement={whiteboard.activeDrawingElement}
          liveStrokes={whiteboard.liveStrokes}
          remoteCursors={remoteCursors}
          textInputState={whiteboard.textInputState}
          onCommitText={whiteboard.commitText}
          onCancelText={() => whiteboard.setTextInputState(null)}
          onMouseDown={whiteboard.handleMouseDown}
          onMouseMove={whiteboard.handleMouseMove}
          onMouseUp={whiteboard.handleMouseUp}
        />
      </div>

      {/* Modals */}
      <ClearConfirmationModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={whiteboard.clearCanvas}
      />

      <ShareRoomModal
        isOpen={isShareModalOpen}
        roomId={currentRoomId}
        onClose={() => setIsShareModalOpen(false)}
        onCopySuccess={() =>
          addToast({
            type: 'success',
            message: 'Room link copied to clipboard!',
          })
        }
      />

      <ExportModal
        isOpen={isExportModalOpen}
        roomId={currentRoomId}
        elements={whiteboard.elements}
        onClose={() => setIsExportModalOpen(false)}
        onSuccess={(msg) =>
          addToast({
            type: 'success',
            title: 'Export Complete',
            message: msg,
          })
        }
        onError={(msg) =>
          addToast({
            type: 'error',
            title: 'Export Failed',
            message: msg,
          })
        }
      />

      <KeyboardShortcutsModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      {/* Global Toast Notification System */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
export default App;
