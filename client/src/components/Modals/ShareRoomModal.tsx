/**
 * ShareRoomModal.tsx
 * Modal for sharing the Room ID and invite link with one-click copy
 */

import React, { useState } from 'react';
import { Copy, Check, Share2, X, Users, Sparkles } from 'lucide-react';

interface ShareRoomModalProps {
  isOpen: boolean;
  roomId: string;
  onClose: () => void;
  onCopySuccess?: () => void;
}

export const ShareRoomModal: React.FC<ShareRoomModalProps> = ({
  isOpen,
  roomId,
  onClose,
  onCopySuccess,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const isLocal =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const origin =
    !isLocal && window.location.protocol === 'http:'
      ? window.location.origin.replace('http:', 'https:')
      : window.location.origin;

  const roomLink = `${origin}?room=${roomId}`;

  const copyToClipboard = (text: string, isLink: boolean) => {
    navigator.clipboard.writeText(text);
    if (isLink) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
    onCopySuccess?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md p-6 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl animate-scale-in text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-5">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Invite Collaborators</h3>
            <p className="text-xs text-slate-400">Share your room to draw and talk together in real time.</p>
          </div>
        </div>

        {/* Room Code Card */}
        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Room Code
          </label>
          <div className="flex items-center justify-between p-3.5 bg-slate-800/80 border border-slate-700 rounded-xl">
            <span className="font-mono text-xl font-bold tracking-widest text-blue-400">{roomId}</span>
            <button
              onClick={() => copyToClipboard(roomId, false)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-md transition-all"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              {copiedCode ? 'Copied' : 'Copy Code'}
            </button>
          </div>
        </div>

        {/* Room Link Card */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Direct Invite Link
          </label>
          <div className="flex items-center gap-2 p-2.5 bg-slate-800/80 border border-slate-700 rounded-xl">
            <input
              type="text"
              readOnly
              value={roomLink}
              className="flex-1 bg-transparent text-xs text-slate-300 outline-none px-1 overflow-hidden text-ellipsis whitespace-nowrap"
            />
            <button
              onClick={() => copyToClipboard(roomLink, true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors shrink-0"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLink ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Collaboration tip */}
        <div className="flex items-center gap-2.5 p-3 bg-blue-950/40 border border-blue-800/30 rounded-xl text-xs text-blue-300">
          <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
          <span>Anyone with the room code or link can join the whiteboard and voice chat immediately.</span>
        </div>
      </div>
    </div>
  );
};
