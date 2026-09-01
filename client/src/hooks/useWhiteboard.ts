/**
 * useWhiteboard.ts
 * Core whiteboard state, element manipulation, drawing engine,
 * undo/redo synchronization, transform (zoom/pan), and tool management.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import {
  DrawingElement,
  ToolType,
  Point,
  CanvasTransform,
  LiveStrokeChunk,
  RoomUser,
} from '../types/whiteboard';
import { isPointHittingElement, getElementBoundingBox } from '../utils/geometryUtils';

interface UseWhiteboardProps {
  socket: Socket | null;
  currentUser: RoomUser | null;
  onEmitCursor?: (x: number, y: number) => void;
}

export function useWhiteboard({ socket, currentUser, onEmitCursor }: UseWhiteboardProps) {
  // Elements state
  const [elements, setElements] = useState<DrawingElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Active tool & styling options
  const [tool, setTool] = useState<ToolType>('pen');
  const [color, setColor] = useState<string>('#ffffff');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [opacity, setOpacity] = useState<number>(1);
  const [fontSize, setFontSize] = useState<number>(24);

  // Zoom & Pan transforms
  const [transform, setTransform] = useState<CanvasTransform>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);

  // In-progress active local drawing element
  const [activeDrawingElement, setActiveDrawingElement] = useState<DrawingElement | null>(null);

  // Remote in-progress live strokes
  const [liveStrokes, setLiveStrokes] = useState<Map<string, LiveStrokeChunk>>(new Map());

  // Text overlay input state
  const [textInputState, setTextInputState] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    canvasX: number;
    canvasY: number;
    text: string;
    fontSize: number;
    color: string;
  } | null>(null);

  // Interaction tracking refs (synchronous to prevent race conditions during fast drags)
  const isMouseDownRef = useRef<boolean>(false);
  const isPanningRef = useRef<boolean>(false);
  const isSpacePressedRef = useRef<boolean>(false);
  const startPointRef = useRef<Point | null>(null);
  const dragStartElementPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastLiveEmitTimeRef = useRef<number>(0);
  const panStartRef = useRef<{ mouseX: number; mouseY: number; offsetX: number; offsetY: number } | null>(null);

  // Helper: Convert screen client coordinates to virtual canvas coordinates
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number, canvasRect: DOMRect): Point => {
      return {
        x: (screenX - canvasRect.left - transform.offsetX) / transform.scale,
        y: (screenY - canvasRect.top - transform.offsetY) / transform.scale,
      };
    },
    [transform]
  );

  // Helper: Convert virtual canvas coordinates to screen client coordinates
  const canvasToScreen = useCallback(
    (canvasX: number, canvasY: number, canvasRect: DOMRect): Point => {
      return {
        x: canvasX * transform.scale + transform.offsetX + canvasRect.left,
        y: canvasY * transform.scale + transform.offsetY + canvasRect.top,
      };
    },
    [transform]
  );

  // Zoom controls
  const zoomIn = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(prev.scale * 1.2, 5.0),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(prev.scale / 1.2, 0.2),
    }));
  }, []);

  const resetZoom = useCallback(() => {
    setTransform({ scale: 1, offsetX: 0, offsetY: 0 });
  }, []);

  // Socket listener for remote live strokes
  useEffect(() => {
    if (!socket) return;

    const handleRemoteLiveStroke = (chunk: LiveStrokeChunk) => {
      setLiveStrokes((prev) => {
        const next = new Map(prev);
        if (chunk.points && chunk.points.length > 0) {
          next.set(chunk.socketId, chunk);
        } else {
          next.delete(chunk.socketId);
        }
        return next;
      });
    };

    socket.on('draw:live-stroke', handleRemoteLiveStroke);

    return () => {
      socket.off('draw:live-stroke', handleRemoteLiveStroke);
    };
  }, [socket]);

  // Clean remote live stroke when final element is added
  const removeLiveStroke = useCallback((socketId: string) => {
    setLiveStrokes((prev) => {
      const next = new Map(prev);
      next.delete(socketId);
      return next;
    });
  }, []);

  // Add Element
  const addElement = useCallback(
    (element: DrawingElement) => {
      setElements((prev) => [...prev, element]);

      if (socket && socket.connected) {
        socket.emit('draw:element-add', element);
        // Clear local live stroke
        socket.emit('draw:live-stroke', { points: [] });
      }
    },
    [socket]
  );

  // Update Element
  const updateElement = useCallback(
    (id: string, updates: Partial<DrawingElement>) => {
      setElements((prev) =>
        prev.map((el) => (el.id === id ? ({ ...el, ...updates } as DrawingElement) : el))
      );

      if (socket && socket.connected) {
        socket.emit('draw:element-update', { id, updates });
      }
    },
    [socket]
  );

  // Delete Element
  const deleteElement = useCallback(
    (id: string) => {
      setElements((prev) => prev.filter((el) => el.id !== id));
      if (selectedElementId === id) setSelectedElementId(null);

      if (socket && socket.connected) {
        socket.emit('draw:element-delete', { id });
      }
    },
    [socket, selectedElementId]
  );

  // Delete currently selected element
  const deleteSelectedElement = useCallback(() => {
    if (selectedElementId) {
      deleteElement(selectedElementId);
    }
  }, [selectedElementId, deleteElement]);

  // Collaborative Undo
  const undo = useCallback(() => {
    if (socket && socket.connected) {
      socket.emit('draw:undo');
    }
  }, [socket]);

  // Collaborative Redo
  const redo = useCallback(() => {
    if (socket && socket.connected) {
      socket.emit('draw:redo');
    }
  }, [socket]);

  // Clear Canvas
  const clearCanvas = useCallback(() => {
    setElements([]);
    setSelectedElementId(null);
    if (socket && socket.connected) {
      socket.emit('draw:clear');
    }
  }, [socket]);

  // Text submit handler
  const commitText = useCallback(
    (text: string) => {
      if (!textInputState || !text.trim()) {
        setTextInputState(null);
        return;
      }

      const newTextElement: DrawingElement = {
        id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type: 'text',
        x: textInputState.canvasX,
        y: textInputState.canvasY,
        text: text.trim(),
        fontSize: textInputState.fontSize,
        color: textInputState.color,
        createdBy: currentUser?.socketId || 'local',
        createdAt: Date.now(),
      };

      addElement(newTextElement);
      setTextInputState(null);
    },
    [textInputState, currentUser, addElement]
  );

  // Handle Mouse Down
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>, canvasRect: DOMRect) => {
      // Prevent default on middle and right clicks so they don't scroll or trigger context menu
      if (e.button === 1 || e.button === 2) {
        e.preventDefault();
      }

      // Hand tool, Middle click (button 1), Right click (button 2), or Spacebar held -> Start Canvas Pan
      if (tool === 'hand' || e.button === 1 || e.button === 2 || isSpacePressedRef.current) {
        isPanningRef.current = true;
        setIsPanning(true);
        panStartRef.current = {
          mouseX: e.clientX,
          mouseY: e.clientY,
          offsetX: transform.offsetX,
          offsetY: transform.offsetY,
        };
        return;
      }

      if (e.button !== 0) return; // Only primary left click for drawing

      const canvasPoint = screenToCanvas(e.clientX, e.clientY, canvasRect);
      isMouseDownRef.current = true;
      startPointRef.current = canvasPoint;

      // Tool: Select
      if (tool === 'select') {
        let hitId: string | null = null;
        for (let i = elements.length - 1; i >= 0; i--) {
          if (isPointHittingElement(canvasPoint, elements[i])) {
            hitId = elements[i].id;
            break;
          }
        }

        setSelectedElementId(hitId);

        if (hitId) {
          const hitEl = elements.find((el) => el.id === hitId);
          if (hitEl) {
            if (hitEl.type === 'text') {
              dragStartElementPosRef.current = { x: hitEl.x, y: hitEl.y };
            } else if (hitEl.type === 'shape') {
              dragStartElementPosRef.current = { x: hitEl.start.x, y: hitEl.start.y };
            }
          }
        }
        return;
      }

      // Tool: Eraser
      if (tool === 'eraser') {
        for (let i = elements.length - 1; i >= 0; i--) {
          if (isPointHittingElement(canvasPoint, elements[i], 14)) {
            deleteElement(elements[i].id);
            break;
          }
        }
        return;
      }

      // Tool: Text Note
      if (tool === 'text') {
        setTextInputState({
          isOpen: true,
          x: e.clientX,
          y: e.clientY,
          canvasX: canvasPoint.x,
          canvasY: canvasPoint.y,
          text: '',
          fontSize: fontSize,
          color: color,
        });
        return;
      }

      // Tool: Pen or Highlighter
      if (tool === 'pen' || tool === 'highlighter') {
        const isHigh = tool === 'highlighter';
        const newStroke: DrawingElement = {
          id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          type: 'stroke',
          points: [canvasPoint],
          color: isHigh ? color : color,
          strokeWidth: isHigh ? Math.max(strokeWidth * 3, 16) : strokeWidth,
          opacity: isHigh ? 0.35 : opacity,
          isHighlighter: isHigh,
          createdBy: currentUser?.socketId || 'local',
          createdAt: Date.now(),
        };
        setActiveDrawingElement(newStroke);
        return;
      }

      // Tool: Shape (Rectangle, Circle, Line, Arrow)
      if (tool === 'rectangle' || tool === 'circle' || tool === 'line' || tool === 'arrow') {
        const newShape: DrawingElement = {
          id: `shape-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          type: 'shape',
          shapeType: tool,
          start: canvasPoint,
          end: canvasPoint,
          strokeColor: color,
          fillColor: 'transparent',
          strokeWidth: strokeWidth,
          opacity: opacity,
          createdBy: currentUser?.socketId || 'local',
          createdAt: Date.now(),
        };
        setActiveDrawingElement(newShape);
      }
    },
    [
      tool,
      color,
      strokeWidth,
      opacity,
      fontSize,
      elements,
      screenToCanvas,
      transform,
      currentUser,
      deleteElement,
    ]
  );

  // Handle Mouse Move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>, canvasRect: DOMRect) => {
      // Broadcast cursor coordinates
      const canvasPoint = screenToCanvas(e.clientX, e.clientY, canvasRect);
      onEmitCursor?.(canvasPoint.x, canvasPoint.y);

      // Handle Pan dragging (Hand tool, Right-click, Middle-click, or Spacebar drag)
      if (isPanningRef.current && panStartRef.current) {
        const dx = e.clientX - panStartRef.current.mouseX;
        const dy = e.clientY - panStartRef.current.mouseY;
        setTransform((prev) => ({
          ...prev,
          offsetX: panStartRef.current!.offsetX + dx,
          offsetY: panStartRef.current!.offsetY + dy,
        }));
        return;
      }

      if (!isMouseDownRef.current || !startPointRef.current) return;

      // Tool: Eraser continuous swipe
      if (tool === 'eraser') {
        for (let i = elements.length - 1; i >= 0; i--) {
          if (isPointHittingElement(canvasPoint, elements[i], 14)) {
            deleteElement(elements[i].id);
          }
        }
        return;
      }

      // Tool: Select dragging an element
      if (tool === 'select' && selectedElementId) {
        const selectedEl = elements.find((el) => el.id === selectedElementId);
        if (!selectedEl) return;

        const dx = canvasPoint.x - startPointRef.current.x;
        const dy = canvasPoint.y - startPointRef.current.y;

        if (selectedEl.type === 'stroke') {
          const movedPoints = selectedEl.points.map((pt) => ({
            x: pt.x + (canvasPoint.x - startPointRef.current!.x),
            y: pt.y + (canvasPoint.y - startPointRef.current!.y),
          }));
          updateElement(selectedElementId, { points: movedPoints });
          startPointRef.current = canvasPoint;
        } else if (selectedEl.type === 'shape') {
          const w = selectedEl.end.x - selectedEl.start.x;
          const h = selectedEl.end.y - selectedEl.start.y;
          const newStart = {
            x: selectedEl.start.x + dx,
            y: selectedEl.start.y + dy,
          };
          const newEnd = { x: newStart.x + w, y: newStart.y + h };
          updateElement(selectedElementId, { start: newStart, end: newEnd });
          startPointRef.current = canvasPoint;
        } else if (selectedEl.type === 'text') {
          updateElement(selectedElementId, {
            x: selectedEl.x + dx,
            y: selectedEl.y + dy,
          });
          startPointRef.current = canvasPoint;
        }
        return;
      }

      // Tool: Pen or Highlighter freehand update
      if (activeDrawingElement && activeDrawingElement.type === 'stroke') {
        const updatedPoints = [...activeDrawingElement.points, canvasPoint];
        const updatedStroke: DrawingElement = {
          ...activeDrawingElement,
          points: updatedPoints,
        };
        setActiveDrawingElement(updatedStroke);

        // Throttle emit live stroke (~30ms)
        const now = Date.now();
        if (now - lastLiveEmitTimeRef.current > 30 && socket && socket.connected) {
          lastLiveEmitTimeRef.current = now;
          socket.emit('draw:live-stroke', {
            tool: activeDrawingElement.isHighlighter ? 'highlighter' : 'pen',
            points: updatedPoints,
            color: activeDrawingElement.color,
            strokeWidth: activeDrawingElement.strokeWidth,
            opacity: activeDrawingElement.opacity,
          });
        }
        return;
      }

      // Tool: Shapes preview update
      if (activeDrawingElement && activeDrawingElement.type === 'shape') {
        let endPt = canvasPoint;
        if (e.shiftKey && (activeDrawingElement.shapeType === 'rectangle' || activeDrawingElement.shapeType === 'circle')) {
          const dx = canvasPoint.x - activeDrawingElement.start.x;
          const dy = canvasPoint.y - activeDrawingElement.start.y;
          const size = Math.max(Math.abs(dx), Math.abs(dy));
          endPt = {
            x: activeDrawingElement.start.x + (dx >= 0 ? size : -size),
            y: activeDrawingElement.start.y + (dy >= 0 ? size : -size),
          };
        }

        setActiveDrawingElement({
          ...activeDrawingElement,
          end: endPt,
        });
      }
    },
    [
      tool,
      selectedElementId,
      elements,
      activeDrawingElement,
      screenToCanvas,
      onEmitCursor,
      deleteElement,
      updateElement,
      socket,
    ]
  );

  // Handle Mouse Up
  const handleMouseUp = useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      setIsPanning(false);
      panStartRef.current = null;
    }

    if (!isMouseDownRef.current) return;
    isMouseDownRef.current = false;
    startPointRef.current = null;
    dragStartElementPosRef.current = null;

    if (activeDrawingElement) {
      addElement(activeDrawingElement);
      setActiveDrawingElement(null);
    }
  }, [activeDrawingElement, addElement]);

  // Global window mouseup listener to release stuck drags anywhere on screen
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        setIsPanning(false);
        panStartRef.current = null;
      }
      if (isMouseDownRef.current) {
        isMouseDownRef.current = false;
        startPointRef.current = null;
        dragStartElementPosRef.current = null;
        if (activeDrawingElement) {
          addElement(activeDrawingElement);
          setActiveDrawingElement(null);
        }
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [activeDrawingElement, addElement]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable) return;

      // Spacebar hold for pan (prevent window scroll)
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        isSpacePressedRef.current = true;
        setIsSpacePressed(true);
      }

      // Undo: Ctrl + Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl + Shift + Z or Ctrl + Y
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault();
        redo();
        return;
      }

      // Delete: Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId) {
          e.preventDefault();
          deleteSelectedElement();
        }
        return;
      }

      // Zoom keys: +/= and -/_ and 0
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        zoomIn();
        return;
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomOut();
        return;
      }
      if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        resetZoom();
        return;
      }

      // Tool shortcut keys
      const key = e.key.toLowerCase();
      if (key === 'v' || key === 's') setTool('select');
      else if (key === 'h' && !e.ctrlKey) setTool('hand');
      else if (key === 'p') setTool('pen');
      else if (key === 'i') setTool('highlighter');
      else if (key === 'e') setTool('eraser');
      else if (key === 'r') setTool('rectangle');
      else if (key === 'c') setTool('circle');
      else if (key === 'l') setTool('line');
      else if (key === 'a') setTool('arrow');
      else if (key === 't') setTool('text');
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false;
        setIsSpacePressed(false);
        if (tool !== 'hand') {
          isPanningRef.current = false;
          setIsPanning(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [undo, redo, selectedElementId, deleteSelectedElement, zoomIn, zoomOut, resetZoom, tool]);

  return {
    elements,
    setElements,
    selectedElementId,
    setSelectedElementId,
    tool,
    setTool,
    color,
    setColor,
    strokeWidth,
    setStrokeWidth,
    opacity,
    setOpacity,
    fontSize,
    setFontSize,
    transform,
    setTransform,
    isPanning,
    isSpacePressed,
    activeDrawingElement,
    liveStrokes,
    textInputState,
    setTextInputState,
    zoomIn,
    zoomOut,
    resetZoom,
    addElement,
    updateElement,
    deleteElement,
    deleteSelectedElement,
    undo,
    redo,
    clearCanvas,
    commitText,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    removeLiveStroke,
  };
}
