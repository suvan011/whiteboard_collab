/**
 * useSocket.ts
 * Socket.IO lifecycle and room connection management
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { RoomUser, RemoteCursor, DrawingElement } from '../types/whiteboard';

interface UseSocketProps {
  onUserJoined?: (user: RoomUser, message: string) => void;
  onUserLeft?: (user: RoomUser, message: string) => void;
  onElementsSynced?: (elements: DrawingElement[]) => void;
  onElementAdded?: (element: DrawingElement) => void;
  onElementUpdated?: (element: DrawingElement) => void;
  onElementDeleted?: (id: string) => void;
  onCanvasCleared?: () => void;
  onConnectionChange?: (status: 'connected' | 'connecting' | 'reconnecting' | 'disconnected') => void;
}

export function useSocket(props: UseSocketProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentUser, setCurrentUser] = useState<RoomUser | null>(null);
  const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'connecting' | 'reconnecting' | 'disconnected'
  >('disconnected');

  const socketRef = useRef<Socket | null>(null);
  const lastCursorEmitRef = useRef<number>(0);

  // Initialize socket
  useEffect(() => {
    // Determine server URL: if in dev, use port 5000 or relative proxy
    const serverUrl =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000'
        : window.location.origin;

    const s = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketRef.current = s;
    setSocket(s);

    s.on('connect', () => {
      setConnectionStatus('connected');
      props.onConnectionChange?.('connected');
    });

    s.on('reconnecting', () => {
      setConnectionStatus('reconnecting');
      props.onConnectionChange?.('reconnecting');
    });

    s.on('disconnect', () => {
      setConnectionStatus('disconnected');
      props.onConnectionChange?.('disconnected');
    });

    s.on('connect_error', () => {
      setConnectionStatus('reconnecting');
      props.onConnectionChange?.('reconnecting');
    });

    // Remote presence listeners
    s.on('user:joined', ({ user, message }: { user: RoomUser; message: string }) => {
      setRoomUsers((prev) => {
        const filtered = prev.filter((u) => u.socketId !== user.socketId);
        return [...filtered, user];
      });
      props.onUserJoined?.(user, message);
    });

    s.on('user:left', ({ socketId, user, remainingUsers, message }: { socketId: string; user: RoomUser; remainingUsers: RoomUser[]; message: string }) => {
      setRoomUsers(remainingUsers || []);
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
      if (user) {
        props.onUserLeft?.(user, message);
      }
    });

    // Remote Cursor Tracking
    s.on('cursor:update', (cursor: RemoteCursor) => {
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.set(cursor.socketId, cursor);
        return next;
      });
    });

    s.on('cursor:remove', ({ socketId }: { socketId: string }) => {
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
    });

    // Whiteboard drawing synchronization listeners
    s.on('draw:sync-all', ({ elements }: { elements: DrawingElement[] }) => {
      props.onElementsSynced?.(elements);
    });

    s.on('draw:element-added', (element: DrawingElement) => {
      props.onElementAdded?.(element);
    });

    s.on('draw:element-updated', (element: DrawingElement) => {
      props.onElementUpdated?.(element);
    });

    s.on('draw:element-deleted', ({ id }: { id: string }) => {
      props.onElementDeleted?.(id);
    });

    s.on('draw:cleared', () => {
      props.onCanvasCleared?.();
    });

    return () => {
      s.disconnect();
    };
  }, []);

  // Join Room method
  const joinRoom = useCallback(
    (roomId: string, userName: string): Promise<{ success: boolean; elements: DrawingElement[]; error?: string }> => {
      return new Promise((resolve) => {
        if (!socketRef.current) {
          resolve({ success: false, elements: [], error: 'Socket not initialized' });
          return;
        }

        socketRef.current.emit(
          'room:join',
          { roomId, userName },
          (response: {
            success: boolean;
            user: RoomUser;
            roomId: string;
            users: RoomUser[];
            elements: DrawingElement[];
            error?: string;
          }) => {
            if (response && response.success) {
              setCurrentUser(response.user);
              setRoomUsers(response.users || []);
              resolve({
                success: true,
                elements: response.elements || [],
              });
            } else {
              resolve({
                success: false,
                elements: [],
                error: response?.error || 'Failed to join room',
              });
            }
          }
        );
      });
    },
    []
  );

  // Leave Room method
  const leaveRoom = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('room:leave');
      setCurrentUser(null);
      setRoomUsers([]);
      setRemoteCursors(new Map());
    }
  }, []);

  // Send local cursor position with throttling (approx 30fps max)
  const emitCursorMove = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - lastCursorEmitRef.current < 32) return; // ~30ms throttle

    lastCursorEmitRef.current = now;
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('cursor:move', { x, y });
    }
  }, []);

  return {
    socket,
    currentUser,
    roomUsers,
    setRoomUsers,
    remoteCursors,
    connectionStatus,
    joinRoom,
    leaveRoom,
    emitCursorMove,
  };
}
