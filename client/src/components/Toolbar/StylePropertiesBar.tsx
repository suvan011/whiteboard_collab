/**
 * StylePropertiesBar.tsx
 * Dockable styling bar for selecting active color, brush stroke width,
 * opacity, and font sizes.
 */

import React, { useState } from 'react';
import { PRESET_COLORS, BRUSH_SIZES, FONT_SIZES } from '../../utils/colorUtils';
import { ToolType } from '../../types/whiteboard';
import { Palette, Sliders, Type, Check } from 'lucide-react';
import { Tooltip } from '../UI/Tooltip';

interface StylePropertiesBarProps {
  tool: ToolType;
  color: string;
  strokeWidth: number;
  opacity: number;
  fontSize: number;
  onChangeColor: (color: string) => void;
  onChangeStrokeWidth: (width: number) => void;
  onChangeOpacity: (opacity: number) => void;
  onChangeFontSize: (fontSize: number) => void;
}

export const StylePropertiesBar: React.FC<StylePropertiesBarProps> = ({
  tool,
  color,
  strokeWidth,
  opacity,
  fontSize,
  onChangeColor,
  onChangeStrokeWidth,
  onChangeOpacity,
  onChangeFontSize,
}) => {
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // If eraser or select without color context, we can still show properties or hide gracefully
  if (tool === 'eraser') return null;

  const isText = tool === 'text';

  return (
    <div className="absolute left-6 top-20 z-20 hidden lg:flex flex-col gap-3.5 p-3.5 glass-panel rounded-2xl shadow-2xl animate-fade-in w-64 max-h-[calc(100vh-120px)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-blue-400" />
          Style & Colors
        </span>
      </div>

      {/* Preset Swatches */}
      <div>
        <div className="text-[11px] font-medium text-slate-400 mb-2">Preset Colors</div>
        <div className="grid grid-cols-6 gap-2">
          {PRESET_COLORS.map((c) => {
            const isSelected = color.toLowerCase() === c.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                onClick={() => onChangeColor(c)}
                style={{ backgroundColor: c }}
                className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${
                  isSelected
                    ? 'border-blue-500 scale-110 shadow-md ring-2 ring-blue-400/50'
                    : 'border-white/20 hover:scale-105'
                }`}
              >
                {isSelected && (
                  <Check
                    className={`w-3.5 h-3.5 ${
                      c === '#ffffff' || c === '#fef08a' || c === '#facc15' ? 'text-slate-900' : 'text-white'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Custom Hex Color Picker Input */}
        <div className="mt-3 flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => onChangeColor(e.target.value)}
            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
            title="Custom Hex Picker"
          />
          <input
            type="text"
            value={color}
            onChange={(e) => onChangeColor(e.target.value)}
            placeholder="#ffffff"
            className="flex-1 px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 uppercase outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Stroke Width or Font Size */}
      {!isText ? (
        <div className="border-t border-slate-700/60 pt-3">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-2">
            <span>Stroke Size</span>
            <span className="font-mono text-slate-300">{strokeWidth}px</span>
          </div>

          <div className="flex items-center justify-between gap-1.5">
            {BRUSH_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => onChangeStrokeWidth(size)}
                className={`flex-1 h-8 rounded-lg flex items-center justify-center transition-all ${
                  strokeWidth === size
                    ? 'bg-blue-600/30 border border-blue-500 text-blue-300'
                    : 'bg-slate-800 hover:bg-slate-750 text-slate-400 border border-slate-700/60'
                }`}
              >
                <span
                  style={{
                    width: Math.min(size, 16),
                    height: Math.min(size, 16),
                    backgroundColor: color,
                  }}
                  className="rounded-full inline-block"
                />
              </button>
            ))}
          </div>

          <input
            type="range"
            min={1}
            max={48}
            value={strokeWidth}
            onChange={(e) => onChangeStrokeWidth(Number(e.target.value))}
            className="w-full mt-2.5 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      ) : (
        <div className="border-t border-slate-700/60 pt-3">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-2">
            <span className="flex items-center gap-1">
              <Type className="w-3.5 h-3.5 text-blue-400" />
              Font Size
            </span>
            <span className="font-mono text-slate-300">{fontSize}px</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {FONT_SIZES.map((fSize) => (
              <button
                key={fSize}
                type="button"
                onClick={() => onChangeFontSize(fSize)}
                className={`py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                  fontSize === fSize
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700/60'
                }`}
              >
                {fSize}px
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Opacity slider */}
      <div className="border-t border-slate-700/60 pt-3">
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-1.5">
          <span>Opacity</span>
          <span className="font-mono text-slate-300">{Math.round(opacity * 100)}%</span>
        </div>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={opacity}
          onChange={(e) => onChangeOpacity(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>
    </div>
  );
};
