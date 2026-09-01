/**
 * MainToolbar.tsx
 * Floating primary tool palette for selecting drawing and shape tools
 */

import React from 'react';
import {
  MousePointer,
  Pencil,
  Highlighter,
  Eraser,
  Square,
  Circle,
  Minus,
  MoveUpRight,
  Type,
  Trash2,
} from 'lucide-react';
import { ToolType } from '../../types/whiteboard';
import { Tooltip } from '../UI/Tooltip';

interface MainToolbarProps {
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  onOpenClearModal: () => void;
}

export const MainToolbar: React.FC<MainToolbarProps> = ({
  currentTool,
  onSelectTool,
  onOpenClearModal,
}) => {
  const tools = [
    { id: 'select' as ToolType, label: 'Select / Move', icon: MousePointer, shortcut: 'S' },
    { id: 'pen' as ToolType, label: 'Pen', icon: Pencil, shortcut: 'P' },
    { id: 'highlighter' as ToolType, label: 'Highlighter', icon: Highlighter, shortcut: 'H' },
    { id: 'eraser' as ToolType, label: 'Eraser', icon: Eraser, shortcut: 'E' },
    { id: 'rectangle' as ToolType, label: 'Rectangle', icon: Square, shortcut: 'R' },
    { id: 'circle' as ToolType, label: 'Circle', icon: Circle, shortcut: 'C' },
    { id: 'line' as ToolType, label: 'Line', icon: Minus, shortcut: 'L' },
    { id: 'arrow' as ToolType, label: 'Arrow', icon: MoveUpRight, shortcut: 'A' },
    { id: 'text' as ToolType, label: 'Text Note', icon: Type, shortcut: 'T' },
  ];

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 p-1.5 glass-panel rounded-2xl shadow-2xl animate-slide-down">
      {tools.map((item) => {
        const Icon = item.icon;
        const isActive = currentTool === item.id;

        return (
          <Tooltip key={item.id} content={item.label} shortcut={item.shortcut}>
            <button
              onClick={() => onSelectTool(item.id)}
              className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-400/50 scale-105'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          </Tooltip>
        );
      })}

      <div className="h-6 w-px bg-slate-700/60 mx-1" />

      {/* Clear Canvas Button */}
      <Tooltip content="Clear Whiteboard">
        <button
          onClick={onOpenClearModal}
          className="p-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all flex items-center justify-center"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </Tooltip>
    </div>
  );
};
