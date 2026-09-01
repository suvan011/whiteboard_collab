/**
 * WhiteboardCanvas.tsx
 * High-performance DPI-aware HTML5 canvas component with continuous render loop,
 * zoom/pan matrix, remote cursors, and touch/mouse interaction handlers.
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
  isPanning: boolean;
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
  onWheel: (e: React.WheelEvent<HTMLCanvasElement>, rect: DOMRect) => void;
}

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({
  elements,
  selectedElementId,
  tool,
  color,
  transform,
  isPanning,
  activeDrawingElement,
  liveStrokes,
  remoteCursors,
  textInputState,
  onCommitText,
  onCancelText,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onWheel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Determine CSS Cursor based on active tool
  let cursorStyle = 'crosshair';
  if (isPanning) cursorStyle = 'grabbing';
  else if (tool === 'select') cursorStyle = 'default';
  else if (tool === 'eraser') cursorStyle = 'cell';
  else if (tool === 'text') cursorStyle = 'text';

  // Touch event adapter
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1 && canvasRef.current) {
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
    if (e.touches.length === 1 && canvasRef.current) {
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
      className="relative w-full h-full overflow-hidden canvas-grid select-none"
      style={{ cursor: cursorStyle }}
    >
      <canvas
        ref={canvasRef}
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
        onWheel={(e) => {
          if (canvasRef.current) {
            onWheel(e, canvasRef.current.getBoundingClientRect());
          }
        }}
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
