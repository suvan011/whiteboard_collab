/**
 * Tooltip.tsx
 * Subtle hover tooltip for tool buttons and shortcuts
 */

import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  shortcut?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  shortcut,
  position = 'top',
  children,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  let posClasses = '-top-9 left-1/2 -translate-x-1/2';
  if (position === 'bottom') posClasses = '-bottom-9 left-1/2 -translate-x-1/2';
  if (position === 'left') posClasses = 'top-1/2 -translate-y-1/2 -left-2 -translate-x-full';
  if (position === 'right') posClasses = 'top-1/2 -translate-y-1/2 -right-2 translate-x-full';

  return (
    <div
      className="relative flex items-center justify-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={`absolute ${posClasses} z-50 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/95 text-slate-100 border border-slate-700/60 rounded-lg text-xs font-medium whitespace-nowrap shadow-xl backdrop-blur-md animate-fade-in`}
        >
          <span>{content}</span>
          {shortcut && (
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono">
              {shortcut}
            </kbd>
          )}
        </div>
      )}
    </div>
  );
};
