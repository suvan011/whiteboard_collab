/**
 * LiveCursors.tsx
 * Renders real-time remote user cursor pointers and name tags on the canvas.
 */

import React from 'react';
import { RemoteCursor, CanvasTransform } from '../../types/whiteboard';

interface LiveCursorsProps {
  cursors: Map<string, RemoteCursor>;
  transform: CanvasTransform;
}

export const LiveCursors: React.FC<LiveCursorsProps> = ({ cursors, transform }) => {
  const cursorList = Array.from(cursors.values());

  if (cursorList.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {cursorList.map((cursor) => {
        // Map virtual canvas coordinates to screen viewport coordinates
        const screenX = cursor.x * transform.scale + transform.offsetX;
        const screenY = cursor.y * transform.scale + transform.offsetY;

        return (
          <div
            key={cursor.socketId}
            style={{
              transform: `translate3d(${screenX}px, ${screenY}px, 0)`,
              transition: 'transform 0.08s ease-out',
            }}
            className="absolute top-0 left-0 pointer-events-none flex flex-col items-start"
          >
            {/* Custom SVG Pointer */}
            <svg
              className="w-5 h-5 drop-shadow-md"
              viewBox="0 0 24 24"
              fill={cursor.color}
              stroke="#ffffff"
              strokeWidth="1.5"
            >
              <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35z" />
            </svg>

            {/* Name Badge */}
            <div
              style={{ backgroundColor: cursor.color }}
              className="mt-0.5 ml-3 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white shadow-lg whitespace-nowrap"
            >
              {cursor.name}
            </div>
          </div>
        );
      })}
    </div>
  );
};
