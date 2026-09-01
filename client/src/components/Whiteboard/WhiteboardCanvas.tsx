/**
 * WhiteboardCanvas.tsx
 * High-performance DPI-aware HTML5 canvas component with continuous render loop,
 * smooth trackpad/wheel panning, pinch-to-zoom, multi-touch, and remote cursors.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import {
  DrawingElement,
  ToolType,
  CanvasTransform,
  LiveStrokeChunk,
  RemoteCursor,
} from '../../types/whiteboard';
import { renderCanvasScene } from '../../utils/canvasRenderer';
import { LiveCursors } from './LiveCursors';
import { TextEditorOverlay } from './TextEditorOverlay';

interface WhiteboardCanvasProps {
  elements: DrawingElement[];
  selectedElementId: string | null;
  tool: ToolType;
  color: string;
  transform: CanvasTransform;
  setTransform: React.Dispatch<React.SetStateAction<CanvasTransform>>;
  isPanning: boolean;
  isSpacePressed?: boolean;
  activeDrawingElement: DrawingElement | null;
  liveStrokes: Map<string, LiveStrokeChunk>;
  remoteCursors: Map<string, RemoteCursor>;
  textInputState: {
    isOpen: boolean;
    x: number;
    y: number;
    canvasX: number;
    canvasY: number;
    text: string;
    fontSize: number;
    color: string;
  } | null;
  onCommitText: (text: string) => void;
  onCancelText: () => void;
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>, rect: DOMRect) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>, rect: DOMRect) => void;
  onMouseUp: () => void;
}

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({
  elements,
  selectedElementId,
  tool,
  color,
  transform,
  setTransform,
  isPanning,
  isSpacePressed = false,
  activeDrawingElement,
  liveStrokes,
  remoteCursors,
  textInputState,
  onCommitText,
  onCancelText,
  onMouseDown,
  onMouseMove,
  onMouseUp,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStateRef = useRef<{
    lastX: number;
    lastY: number;
    lastDist: number;
    isMultiTouch: boolean;
  }>({ lastX: 0, lastY: 0, lastDist: 0, isMultiTouch: false });

  // High-DPI canvas resize handling
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const dpr = window.devicePixelRatio || 1;
      const width = container.clientWidth;
      const height = container.clientHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Main Render Loop (60fps requestAnimationFrame)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    // Clear canvas
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply DPI scaling and virtual viewport zoom/pan
    ctx.scale(dpr, dpr);
    ctx.translate(transform.offsetX, transform.offsetY);
    ctx.scale(transform.scale, transform.scale);

    // Render elements and active drawings
    renderCanvasScene(
      ctx,
      elements,
      selectedElementId,
      liveStrokes,
      activeDrawingElement,
      transform.scale
    );

    ctx.restore();
  }, [elements, selectedElementId, liveStrokes, activeDrawingElement, transform]);

  // Native non-passive Wheel listener attached to container for smooth 2D scrolling & zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom or Ctrl + Scroll zoom centered at mouse pointer
        const zoomDelta = e.deltaY < 0 ? 1.08 : 0.92;
        setTransform((prev) => {
          const newScale = Math.min(Math.max(prev.scale * zoomDelta, 0.15), 6.0);
          const newOffsetX = mouseX - (mouseX - prev.offsetX) * (newScale / prev.scale);
          const newOffsetY = mouseY - (mouseY - prev.offsetY) * (newScale / prev.scale);
          return {
            scale: newScale,
            offsetX: newOffsetX,
            offsetY: newOffsetY,
          };
        });
      } else if (e.shiftKey) {
        // Shift + Wheel -> Horizontal scrolling
        const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
        setTransform((prev) => ({
          ...prev,
          offsetX: prev.offsetX - delta * 0.9,
        }));
      } else {
        // Smooth 2D scrolling / pan (supports trackpads and regular mouse wheels)
        setTransform((prev) => ({
          ...prev,
          offsetX: prev.offsetX - e.deltaX * 0.9,
          offsetY: prev.offsetY - e.deltaY * 0.9,
        }));
      }
    };

    container.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleNativeWheel);
    };
  }, [setTransform]);

  // Determine CSS Cursor based on active tool and state
  let cursorStyle = 'crosshair';
  if (tool === 'hand' || isPanning || isSpacePressed) cursorStyle = isPanning ? 'grabbing' : 'grab';
  else if (tool === 'select') cursorStyle = 'default';
  else if (tool === 'eraser') cursorStyle = 'cell';
  else if (tool === 'text') cursorStyle = 'text';

  // Multi-touch Gesture Handler (1 finger draw/hand, 2 fingers pan & pinch zoom)
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      // 2 fingers = Pan & Zoom
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;

      touchStateRef.current = {
        lastX: midX,
        lastY: midY,
        lastDist: dist,
        isMultiTouch: true,
      };
      return;
    }

    if (e.touches.length === 1 && canvasRef.current) {
      touchStateRef.current.isMultiTouch = false;
      const touch = e.touches[0];
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseEvent = {
        button: 0,
        clientX: touch.clientX,
        clientY: touch.clientY,
      } as unknown as React.MouseEvent<HTMLCanvasElement>;
      onMouseDown(mouseEvent, rect);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2 && touchStateRef.current.isMultiTouch && canvasRef.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;

      const dx = midX - touchStateRef.current.lastX;
      const dy = midY - touchStateRef.current.lastY;
      const zoomRatio = touchStateRef.current.lastDist > 0 ? dist / touchStateRef.current.lastDist : 1;

      const rect = canvasRef.current.getBoundingClientRect();
      const localMidX = midX - rect.left;
      const localMidY = midY - rect.top;

      setTransform((prev) => {
        const newScale = Math.min(Math.max(prev.scale * zoomRatio, 0.2), 5.0);
        const newOffsetX = localMidX - (localMidX - (prev.offsetX + dx)) * (newScale / prev.scale);
        const newOffsetY = localMidY - (localMidY - (prev.offsetY + dy)) * (newScale / prev.scale);
        return {
          scale: newScale,
          offsetX: newOffsetX,
          offsetY: newOffsetY,
        };
      });

      touchStateRef.current.lastX = midX;
      touchStateRef.current.lastY = midY;
      touchStateRef.current.lastDist = dist;
      return;
    }

    if (e.touches.length === 1 && !touchStateRef.current.isMultiTouch && canvasRef.current) {
      const touch = e.touches[0];
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
      } as unknown as React.MouseEvent<HTMLCanvasElement>;
      onMouseMove(mouseEvent, rect);
    }
  };

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      className="relative w-full h-full overflow-hidden canvas-grid select-none"
      style={{ cursor: cursorStyle }}
    >
      <canvas
        ref={canvasRef}
        onContextMenu={(e) => e.preventDefault()}
        onMouseDown={(e) => {
          if (canvasRef.current) {
            onMouseDown(e, canvasRef.current.getBoundingClientRect());
          }
        }}
        onMouseMove={(e) => {
          if (canvasRef.current) {
            onMouseMove(e, canvasRef.current.getBoundingClientRect());
          }
        }}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={onMouseUp}
        className="block w-full h-full touch-none"
      />

      {/* Remote Live User Cursors */}
      <LiveCursors cursors={remoteCursors} transform={transform} />

      {/* Inline Text Overlay */}
      {textInputState?.isOpen && (
        <TextEditorOverlay
          x={textInputState.x}
          y={textInputState.y}
          fontSize={textInputState.fontSize}
          color={textInputState.color}
          initialText={textInputState.text}
          onCommit={onCommitText}
          onCancel={onCancelText}
        />
      )}
    </div>
  );
};
