/**
 * roomManager.js
 * In-memory room and collaborative state management for CanvasConnect
 */

const USER_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#14B8A6', // Teal
  '#6366F1', // Indigo
  '#EF4444', // Rose
];

class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomId -> RoomObject
    this.socketToRoom = new Map(); // socketId -> roomId
  }

  getOrCreateRoom(roomId) {
    const cleanRoomId = roomId.trim().toUpperCase();
    if (!this.rooms.has(cleanRoomId)) {
      this.rooms.set(cleanRoomId, {
        id: cleanRoomId,
        createdAt: Date.now(),
        users: new Map(), // socketId -> UserObject
        elements: [], // Array of DrawingElement
        undoStack: [], // Array of reversible actions
        redoStack: [], // Array of redoable actions
        voicePeers: new Set(), // Set of socketIds in voice chat
      });
    }
    return this.rooms.get(cleanRoomId);
  }

  getRoom(roomId) {
    if (!roomId) return null;
    return this.rooms.get(roomId.trim().toUpperCase()) || null;
  }

  addUser(roomId, socketId, name) {
    const room = this.getOrCreateRoom(roomId);
    
    // Pick color based on current user count
    const colorIndex = room.users.size % USER_COLORS.length;
    const color = USER_COLORS[colorIndex];

    const user = {
      socketId,
      name: name && name.trim() ? name.trim() : `User-${socketId.slice(0, 4)}`,
      color,
      joinedAt: Date.now(),
      isVoiceActive: false,
      isMuted: false,
    };

    room.users.set(socketId, user);
    this.socketToRoom.set(socketId, room.id);

    return { room, user };
  }

  removeUser(socketId) {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) {
      this.socketToRoom.delete(socketId);
      return null;
    }

    const user = room.users.get(socketId);
    room.users.delete(socketId);
    room.voicePeers.delete(socketId);
    this.socketToRoom.delete(socketId);

    // If room is empty, clean up after 1 hour (keep memory clean but allow quick refresh)
    if (room.users.size === 0) {
      setTimeout(() => {
        const currentRoom = this.rooms.get(roomId);
        if (currentRoom && currentRoom.users.size === 0) {
          this.rooms.delete(roomId);
        }
      }, 60 * 60 * 1000);
    }

    return { roomId, user, remainingUsers: Array.from(room.users.values()) };
  }

  getUser(socketId) {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return null;
    const room = this.rooms.get(roomId);
    return room ? room.users.get(socketId) : null;
  }

  getRoomUsers(roomId) {
    const room = this.getRoom(roomId);
    return room ? Array.from(room.users.values()) : [];
  }

  getRoomElements(roomId) {
    const room = this.getRoom(roomId);
    return room ? room.elements : [];
  }

  addElement(roomId, element) {
    const room = this.getRoom(roomId);
    if (!room) return null;

    // Push element to state
    room.elements.push(element);
    
    // Push action to undo stack, clear redo
    room.undoStack.push({
      type: 'ADD',
      element,
    });
    room.redoStack = [];

    // Cap elements history to 5000 to prevent unbounded memory growth
    if (room.elements.length > 5000) {
      room.elements.shift();
    }

    return element;
  }

  updateElement(roomId, elementId, updates) {
    const room = this.getRoom(roomId);
    if (!room) return null;

    const index = room.elements.findIndex(el => el.id === elementId);
    if (index === -1) return null;

    const prevElement = { ...room.elements[index] };
    const updatedElement = { ...prevElement, ...updates, updatedAt: Date.now() };
    room.elements[index] = updatedElement;

    room.undoStack.push({
      type: 'UPDATE',
      elementId,
      before: prevElement,
      after: updatedElement,
    });
    room.redoStack = [];

    return updatedElement;
  }

  deleteElement(roomId, elementId) {
    const room = this.getRoom(roomId);
    if (!room) return null;

    const index = room.elements.findIndex(el => el.id === elementId);
    if (index === -1) return null;

    const deletedElement = room.elements[index];
    room.elements.splice(index, 1);

    room.undoStack.push({
      type: 'DELETE',
      element: deletedElement,
      index,
    });
    room.redoStack = [];

    return deletedElement;
  }

  undo(roomId) {
    const room = this.getRoom(roomId);
    if (!room || room.undoStack.length === 0) return null;

    const action = room.undoStack.pop();
    room.redoStack.push(action);

    if (action.type === 'ADD') {
      room.elements = room.elements.filter(el => el.id !== action.element.id);
    } else if (action.type === 'DELETE') {
      if (action.index !== undefined && action.index <= room.elements.length) {
        room.elements.splice(action.index, 0, action.element);
      } else {
        room.elements.push(action.element);
      }
    } else if (action.type === 'UPDATE') {
      const idx = room.elements.findIndex(el => el.id === action.elementId);
      if (idx !== -1) {
        room.elements[idx] = action.before;
      }
    } else if (action.type === 'CLEAR') {
      room.elements = [...action.elements];
    }

    return { action, elements: room.elements };
  }

  redo(roomId) {
    const room = this.getRoom(roomId);
    if (!room || room.redoStack.length === 0) return null;

    const action = room.redoStack.pop();
    room.undoStack.push(action);

    if (action.type === 'ADD') {
      room.elements.push(action.element);
    } else if (action.type === 'DELETE') {
      room.elements = room.elements.filter(el => el.id !== action.element.id);
    } else if (action.type === 'UPDATE') {
      const idx = room.elements.findIndex(el => el.id === action.elementId);
      if (idx !== -1) {
        room.elements[idx] = action.after;
      }
    } else if (action.type === 'CLEAR') {
      room.elements = [];
    }

    return { action, elements: room.elements };
  }

  clearRoom(roomId) {
    const room = this.getRoom(roomId);
    if (!room) return null;

    const prevElements = [...room.elements];
    room.elements = [];
    room.undoStack.push({
      type: 'CLEAR',
      elements: prevElements,
    });
    room.redoStack = [];

    return true;
  }

  // Voice Chat helpers
  joinVoice(roomId, socketId) {
    const room = this.getRoom(roomId);
    if (!room) return null;

    room.voicePeers.add(socketId);
    const user = room.users.get(socketId);
    if (user) {
      user.isVoiceActive = true;
      user.isMuted = false;
    }
    return Array.from(room.voicePeers);
  }

  leaveVoice(roomId, socketId) {
    const room = this.getRoom(roomId);
    if (!room) return null;

    room.voicePeers.delete(socketId);
    const user = room.users.get(socketId);
    if (user) {
      user.isVoiceActive = false;
      user.isMuted = false;
    }
    return Array.from(room.voicePeers);
  }

  setVoiceMute(roomId, socketId, isMuted) {
    const room = this.getRoom(roomId);
    if (!room) return null;

    const user = room.users.get(socketId);
    if (user) {
      user.isMuted = isMuted;
    }
    return user;
  }

  getVoiceParticipants(roomId) {
    const room = this.getRoom(roomId);
    if (!room) return [];
    return Array.from(room.voicePeers)
      .map(sid => room.users.get(sid))
      .filter(Boolean);
  }
}

module.exports = new RoomManager();
