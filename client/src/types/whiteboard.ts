/**
 * whiteboard.ts
 * Core type definitions for CanvasConnect
 */

export type ToolType =
  | 'select'
  | 'pen'
  | 'highlighter'
  | 'eraser'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'text';

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface BaseElement {
  id: string;
  createdBy: string; // socketId
  createdAt: number;
  updatedAt?: number;
}

export interface StrokeElement extends BaseElement {
  type: 'stroke';
  points: Point[];
  color: string;
  strokeWidth: number;
  opacity: number;
  isHighlighter?: boolean;
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: 'rectangle' | 'circle' | 'line' | 'arrow';
  start: Point;
  end: Point;
  strokeColor: string;
  fillColor: string; // 'transparent' or hex
  strokeWidth: number;
  opacity: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  fontFamily?: string;
  width?: number;
  height?: number;
}

export type DrawingElement = StrokeElement | ShapeElement | TextElement;

export interface RoomUser {
  socketId: string;
  name: string;
  color: string;
  joinedAt: number;
  isVoiceActive: boolean;
  isMuted: boolean;
  isSpeaking?: boolean;
}

export interface RemoteCursor {
  socketId: string;
  name: string;
  color: string;
  x: number;
  y: number;
  timestamp: number;
}

export interface CanvasTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  duration?: number;
}

export interface LiveStrokeChunk {
  socketId: string;
  tool: 'pen' | 'highlighter';
  points: Point[];
  color: string;
  strokeWidth: number;
  opacity: number;
}
