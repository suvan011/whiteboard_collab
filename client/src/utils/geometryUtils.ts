/**
 * geometryUtils.ts
 * Geometric calculation helpers, hit testing, and bounding boxes for canvas elements
 */

import { DrawingElement, Point, BoundingBox } from '../types/whiteboard';

/**
 * Calculates Euclidean distance between two points
 */
export function getDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates shortest distance from a point to a line segment
 */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (l2 === 0) return getDistance(p, a);

  // Projection of p onto segment ab: clamp t between 0 and 1
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));

  const proj: Point = {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
  };

  return getDistance(p, proj);
}

/**
 * Computes bounding box for any element
 */
export function getElementBoundingBox(element: DrawingElement): BoundingBox {
  const padding = 6;

  if (element.type === 'stroke') {
    if (element.points.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const pt of element.points) {
      minX = Math.min(minX, pt.x);
      minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x);
      maxY = Math.max(maxY, pt.y);
    }

    const strokePad = (element.strokeWidth || 4) / 2 + padding;
    return {
      minX: minX - strokePad,
      minY: minY - strokePad,
      maxX: maxX + strokePad,
      maxY: maxY + strokePad,
      width: maxX - minX + strokePad * 2,
      height: maxY - minY + strokePad * 2,
    };
  }

  if (element.type === 'shape') {
    const minX = Math.min(element.start.x, element.end.x);
    const minY = Math.min(element.start.y, element.end.y);
    const maxX = Math.max(element.start.x, element.end.x);
    const maxY = Math.max(element.start.y, element.end.y);
    const strokePad = (element.strokeWidth || 4) / 2 + padding;

    return {
      minX: minX - strokePad,
      minY: minY - strokePad,
      maxX: maxX + strokePad,
      maxY: maxY + strokePad,
      width: maxX - minX + strokePad * 2,
      height: maxY - minY + strokePad * 2,
    };
  }

  if (element.type === 'text') {
    const lines = element.text.split('\n');
    const lineCount = lines.length;
    const maxLineLength = Math.max(...lines.map(l => l.length), 1);
    const approxWidth = element.width || Math.max(maxLineLength * (element.fontSize * 0.6), 60);
    const approxHeight = element.height || lineCount * (element.fontSize * 1.3);

    return {
      minX: element.x - padding,
      minY: element.y - padding,
      maxX: element.x + approxWidth + padding,
      maxY: element.y + approxHeight + padding,
      width: approxWidth + padding * 2,
      height: approxHeight + padding * 2,
    };
  }

  return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
}

/**
 * Checks if a point hits an element (for Selection and Eraser)
 */
export function isPointHittingElement(point: Point, element: DrawingElement, threshold: number = 8): boolean {
  const box = getElementBoundingBox(element);

  // Fast rejection: outside expanded bounding box
  if (
    point.x < box.minX - threshold ||
    point.x > box.maxX + threshold ||
    point.y < box.minY - threshold ||
    point.y > box.maxY + threshold
  ) {
    return false;
  }

  if (element.type === 'stroke') {
    const radius = (element.strokeWidth / 2) + threshold;
    const pts = element.points;
    if (pts.length === 1) {
      return getDistance(point, pts[0]) <= radius;
    }
    for (let i = 0; i < pts.length - 1; i++) {
      if (distanceToSegment(point, pts[i], pts[i + 1]) <= radius) {
        return true;
      }
    }
    return false;
  }

  if (element.type === 'shape') {
    const { shapeType, start, end, strokeWidth, fillColor } = element;
    const radius = strokeWidth / 2 + threshold;
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    if (shapeType === 'line' || shapeType === 'arrow') {
      return distanceToSegment(point, start, end) <= radius;
    }

    const hasFill = fillColor && fillColor !== 'transparent';

    if (shapeType === 'rectangle') {
      if (hasFill) {
        return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
      }
      // Stroke hit test (border distance)
      const topDist = distanceToSegment(point, { x: minX, y: minY }, { x: maxX, y: minY });
      const botDist = distanceToSegment(point, { x: minX, y: maxY }, { x: maxX, y: maxY });
      const leftDist = distanceToSegment(point, { x: minX, y: minY }, { x: minX, y: maxY });
      const rightDist = distanceToSegment(point, { x: maxX, y: minY }, { x: maxX, y: maxY });
      return Math.min(topDist, botDist, leftDist, rightDist) <= radius;
    }

    if (shapeType === 'circle') {
      const cx = (start.x + end.x) / 2;
      const cy = (start.y + end.y) / 2;
      const rx = Math.abs(end.x - start.x) / 2;
      const ry = Math.abs(end.y - start.y) / 2;
      if (rx === 0 || ry === 0) return false;

      const normDist = ((point.x - cx) ** 2) / (rx ** 2) + ((point.y - cy) ** 2) / (ry ** 2);
      if (hasFill) {
        return normDist <= 1.05;
      }
      // Stroke hit test: close to border
      return Math.abs(normDist - 1) < 0.25 || (normDist <= 1 && Math.min(rx, ry) < 20);
    }
  }

  if (element.type === 'text') {
    return (
      point.x >= box.minX &&
      point.x <= box.maxX &&
      point.y >= box.minY &&
      point.y <= box.maxY
    );
  }

  return false;
}
