/**
 * KeyboardShortcutsModal.tsx
 * Keyboard shortcut guide for power users
 */

import React from 'react';
import { Keyboard, X, Sparkles } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { section: 'Tools', items: [
    { label: 'Pen Tool', keys: ['P'] },
    { label: 'Highlighter', keys: ['H'] },
    { label: 'Eraser', keys: ['E'] },
    { label: 'Select / Move', keys: ['S', 'or', 'V'] },
    { label: 'Rectangle', keys: ['R'] },
    { label: 'Circle / Ellipse', keys: ['C'] },
    { label: 'Line', keys: ['L'] },
    { label: 'Arrow', keys: ['A'] },
    { label: 'Text Note', keys: ['T'] },
  ]},
  { section: 'Actions & Navigation', items: [
    { label: 'Undo', keys: ['Ctrl', 'Z'] },
    { label: 'Redo', keys: ['Ctrl', 'Shift', 'Z'] },
    { label: 'Delete Selected', keys: ['Del', 'or', 'Backspace'] },
    { label: 'Pan Canvas', keys: ['Space', '+', 'Drag'] },
    { label: 'Zoom In / Out', keys: ['Ctrl', '+', 'Scroll'] },
    { label: 'Lock Aspect Ratio', keys: ['Shift', '+', 'Drag'] },
  ]}
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg p-6 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl animate-scale-in text-slate-100 max-h-[85vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-5">
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
            <Keyboard className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Keyboard Shortcuts</h3>
            <p className="text-xs text-slate-400">Boost your brainstorming speed with quick keys.</p>
          </div>
        </div>

        <div className="space-y-5">
          {SHORTCUTS.map((cat, idx) => (
            <div key={idx}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                {cat.section}
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {cat.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl text-xs"
                  >
                    <span className="text-slate-300 font-medium">{item.label}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, kIdx) => (
                        <span key={kIdx}>
                          {k === 'or' || k === '+' ? (
                            <span className="text-slate-500 text-[10px] mx-0.5">{k}</span>
                          ) : (
                            <kbd className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[11px] font-mono font-semibold text-slate-200 shadow-sm">
                              {k}
                            </kbd>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
