/**
 * canvasRenderer.ts
 * Pure canvas rendering engine for CanvasConnect with high-DPI and smooth Bezier strokes
 */

import { DrawingElement, LiveStrokeChunk, Point, BoundingBox } from '../types/whiteboard';
import { getElementBoundingBox } from './geometryUtils';

/**
 * Draws a smooth freehand stroke using quadratic Bezier curves between midpoints
 */
export function drawStroke(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  width: number,
  opacity: number,
  isHighlighter: boolean = false
) {
  if (!points || points.length === 0) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.globalAlpha = isHighlighter ? Math.min(opacity, 0.4) : opacity;

  if (isHighlighter) {
    ctx.lineCap = 'square';
    ctx.lineJoin = 'bevel';
  }

  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, width / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
  } else {
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    // Final point
    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    ctx.quadraticCurveTo(prev.x, prev.y, last.x, last.y);
  }

  ctx.stroke();
  ctx.restore();
}

/**
 * Draws an arrowhead at the end of a line
 */
function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  headLength: number = 16,
  strokeWidth: number = 3
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(dy, dx);
  const adjustedHeadLength = Math.max(headLength, strokeWidth * 3.5);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(
    to.x - adjustedHeadLength * Math.cos(angle - Math.PI / 6),
    to.y - adjustedHeadLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    to.x - adjustedHeadLength * Math.cos(angle + Math.PI / 6),
    to.y - adjustedHeadLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fill();
  ctx.restore();
}

/**
 * Draws shape element
 */
export function drawShape(
  ctx: CanvasRenderingContext2D,
  shapeType: 'rectangle' | 'circle' | 'line' | 'arrow',
  start: Point,
  end: Point,
  strokeColor: string,
  fillColor: string,
  strokeWidth: number,
  opacity: number
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const minX = Math.min(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  if (shapeType === 'rectangle') {
    ctx.beginPath();
    ctx.rect(minX, minY, width, height);

    if (fillColor && fillColor !== 'transparent') {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    if (strokeWidth > 0 && strokeColor !== 'transparent') {
      ctx.stroke();
    }
  } else if (shapeType === 'circle') {
    const cx = (start.x + end.x) / 2;
    const cy = (start.y + end.y) / 2;
    const rx = width / 2;
    const ry = height / 2;

    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);

    if (fillColor && fillColor !== 'transparent') {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    if (strokeWidth > 0 && strokeColor !== 'transparent') {
      ctx.stroke();
    }
  } else if (shapeType === 'line') {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  } else if (shapeType === 'arrow') {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    drawArrowhead(ctx, start, end, 16, strokeWidth);
  }

  ctx.restore();
}

/**
 * Draws text element
 */
export function drawText(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  fontSize: number,
  color: string,
  fontFamily: string = 'Inter, sans-serif'
) {
  if (!text) return;

  ctx.save();
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';

  const lines = text.split('\n');
  const lineHeight = fontSize * 1.35;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, y + i * lineHeight);
  }

  ctx.restore();
}

/**
 * Draws selection bounding box with resize handles
 */
export function drawSelectionBox(ctx: CanvasRenderingContext2D, box: BoundingBox, scale: number = 1) {
  ctx.save();
  ctx.strokeStyle = '#38a9f6';
  ctx.lineWidth = 1.5 / scale;
  ctx.setLineDash([5 / scale, 5 / scale]);

  // Bounding rect
  ctx.strokeRect(box.minX, box.minY, box.width, box.height);

  // Corner Handles
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0e8ce7';
  ctx.lineWidth = 2 / scale;
  const handleSize = 8 / scale;
  const half = handleSize / 2;

  const handles = [
    { x: box.minX, y: box.minY },
    { x: box.maxX, y: box.minY },
    { x: box.minX, y: box.maxY },
    { x: box.maxX, y: box.maxY },
  ];

  for (const h of handles) {
    ctx.beginPath();
    ctx.rect(h.x - half, h.y - half, handleSize, handleSize);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Renders all elements onto the canvas
 */
export function renderCanvasScene(
  ctx: CanvasRenderingContext2D,
  elements: DrawingElement[],
  selectedElementId: string | null,
  liveStrokes: Map<string, LiveStrokeChunk>,
  activeDrawingElement: DrawingElement | null,
  scale: number = 1
) {
  // Render completed elements
  for (const el of elements) {
    if (el.type === 'stroke') {
      drawStroke(ctx, el.points, el.color, el.strokeWidth, el.opacity, el.isHighlighter);
    } else if (el.type === 'shape') {
      drawShape(
        ctx,
        el.shapeType,
        el.start,
        el.end,
        el.strokeColor,
        el.fillColor,
        el.strokeWidth,
        el.opacity
      );
    } else if (el.type === 'text') {
      drawText(ctx, el.x, el.y, el.text, el.fontSize, el.color, el.fontFamily);
    }
  }

  // Render remote live in-progress strokes
  liveStrokes.forEach((stroke) => {
    drawStroke(
      ctx,
      stroke.points,
      stroke.color,
      stroke.strokeWidth,
      stroke.opacity,
      stroke.tool === 'highlighter'
    );
  });

  // Render local active drawing element (e.g. previewing rectangle / line / live pen)
  if (activeDrawingElement) {
    if (activeDrawingElement.type === 'stroke') {
      drawStroke(
        ctx,
        activeDrawingElement.points,
        activeDrawingElement.color,
        activeDrawingElement.strokeWidth,
        activeDrawingElement.opacity,
        activeDrawingElement.isHighlighter
      );
    } else if (activeDrawingElement.type === 'shape') {
      drawShape(
        ctx,
        activeDrawingElement.shapeType,
        activeDrawingElement.start,
        activeDrawingElement.end,
        activeDrawingElement.strokeColor,
        activeDrawingElement.fillColor,
        activeDrawingElement.strokeWidth,
        activeDrawingElement.opacity
      );
    }
  }

  // Render selection box if an element is selected
  if (selectedElementId) {
    const selectedEl = elements.find((e) => e.id === selectedElementId);
    if (selectedEl) {
      const box = getElementBoundingBox(selectedEl);
      drawSelectionBox(ctx, box, scale);
    }
  }
}
