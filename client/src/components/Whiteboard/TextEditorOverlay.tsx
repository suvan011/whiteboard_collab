/**
 * TextEditorOverlay.tsx
 * Floating editable text overlay for entering notes directly on canvas click.
 */

import React, { useState, useEffect, useRef } from 'react';

interface TextEditorOverlayProps {
  x: number;
  y: number;
  fontSize: number;
  color: string;
  initialText?: string;
  onCommit: (text: string) => void;
  onCancel: () => void;
}

export const TextEditorOverlay: React.FC<TextEditorOverlayProps> = ({
  x,
  y,
  fontSize,
  color,
  initialText = '',
  onCommit,
  onCancel,
}) => {
  const [text, setText] = useState(initialText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      onCommit(text);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 40,
      }}
      className="animate-scale-in"
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => onCommit(text)}
        placeholder="Type text note..."
        rows={2}
        style={{
          fontSize: `${fontSize}px`,
          color: color,
          caretColor: color,
          lineHeight: 1.35,
        }}
        className="bg-slate-900/90 border border-blue-500 rounded-xl p-2.5 outline-none resize min-w-[200px] shadow-2xl backdrop-blur-md font-sans text-white placeholder-slate-500"
      />
      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
        <span>Click outside or Press Ctrl+Enter to save</span>
      </div>
    </div>
  );
};
