/**
 * NavigationControls.tsx
 * Bottom-left floating controls for Zoom In/Out/Reset, Undo, Redo, and Panning.
 */

import React from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Undo2,
  Redo2,
  Hand,
  Maximize2,
} from 'lucide-react';
import { Tooltip } from '../UI/Tooltip';

interface NavigationControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onUndo: () => void;
  onRedo: () => void;
  isPanning?: boolean;
}

export const NavigationControls: React.FC<NavigationControlsProps> = ({
  scale,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onUndo,
  onRedo,
}) => {
  const percentage = Math.round(scale * 100);

  return (
    <div className="absolute bottom-6 left-6 z-20 flex items-center gap-2 animate-slide-down">
      {/* Undo & Redo Group */}
      <div className="flex items-center gap-1 p-1.5 glass-panel rounded-2xl shadow-xl">
        <Tooltip content="Undo" shortcut="Ctrl+Z">
          <button
            onClick={onUndo}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <Undo2 className="w-4 h-4" />
          </button>
        </Tooltip>

        <Tooltip content="Redo" shortcut="Ctrl+Shift+Z">
          <button
            onClick={onRedo}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>

      {/* Zoom Controls Group */}
      <div className="flex items-center gap-1 p-1.5 glass-panel rounded-2xl shadow-xl">
        <Tooltip content="Zoom Out" shortcut="Ctrl+-">
          <button
            onClick={onZoomOut}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </Tooltip>

        <Tooltip content="Reset Zoom to 100%">
          <button
            onClick={onResetZoom}
            className="px-2.5 py-1 text-xs font-mono font-medium text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
          >
            {percentage}%
          </button>
        </Tooltip>

        <Tooltip content="Zoom In" shortcut="Ctrl++">
          <button
            onClick={onZoomIn}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
