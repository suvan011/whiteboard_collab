/**
 * VoiceChatPanel.tsx
 * Floating live voice chat overlay widget displaying speaking indicators,
 * microphone mute toggle, audio visualizer, and voice participant list.
 */

import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  Users,
  ChevronDown,
  ChevronUp,
  Activity,
  Radio,
} from 'lucide-react';
import { RoomUser } from '../../types/whiteboard';
import { Tooltip } from '../UI/Tooltip';

interface VoiceChatPanelProps {
  isInVoice: boolean;
  isMuted: boolean;
  localSpeaking: boolean;
  currentUser: RoomUser | null;
  voiceParticipants: Map<string, { user?: RoomUser; isSpeaking?: boolean }>;
  onJoinVoice: () => void;
  onLeaveVoice: () => void;
  onToggleMute: () => void;
}

export const VoiceChatPanel: React.FC<VoiceChatPanelProps> = ({
  isInVoice,
  isMuted,
  localSpeaking,
  currentUser,
  voiceParticipants,
  onJoinVoice,
  onLeaveVoice,
  onToggleMute,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!isInVoice) return null;

  const participantsList = Array.from(voiceParticipants.values());

  return (
    <div className="absolute bottom-6 right-6 z-20 w-72 glass-panel rounded-2xl shadow-2xl animate-slide-down border border-white/10 overflow-hidden text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 bg-slate-900/80 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio className="w-4 h-4 text-emerald-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-white">Voice Connected</span>
        </div>

        <button
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
        >
          {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="p-3.5 space-y-3.5">
          {/* Active Speakers & Participants */}
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {/* Current User Voice Item */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/40">
              <div className="flex items-center gap-2">
                <div
                  style={{ backgroundColor: currentUser?.color || '#3B82F6' }}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase ${
                    localSpeaking && !isMuted ? 'speaking-ring' : ''
                  }`}
                >
                  {currentUser?.name ? currentUser.name.slice(0, 1) : 'U'}
                </div>
                <span className="text-xs font-medium text-slate-200">
                  {currentUser?.name || 'You'} <span className="text-[10px] text-blue-400">(You)</span>
                </span>
              </div>

              {/* Status */}
              {isMuted ? (
                <span className="flex items-center gap-1 text-[11px] text-rose-400 font-medium bg-rose-500/10 px-2 py-0.5 rounded-full">
                  <MicOff className="w-3 h-3" /> Muted
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <Mic className="w-3 h-3" /> Live
                </span>
              )}
            </div>

            {/* Remote Voice Peers */}
            {participantsList.map((p, idx) => {
              const userName = p.user?.name || `Peer ${idx + 1}`;
              const userColor = p.user?.color || '#8B5CF6';

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-slate-700/30"
                >
                  <div className="flex items-center gap-2">
                    <div
                      style={{ backgroundColor: userColor }}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase"
                    >
                      {userName.slice(0, 1)}
                    </div>
                    <span className="text-xs font-medium text-slate-300 truncate max-w-[120px]">{userName}</span>
                  </div>

                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <Volume2 className="w-3 h-3 text-emerald-400" /> Connected
                  </span>
                </div>
              );
            })}
          </div>

          {/* Quick Voice Actions */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-700/50">
            <button
              onClick={onToggleMute}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700'
              }`}
            >
              {isMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
              <span>{isMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
            </button>

            <button
              onClick={onLeaveVoice}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Leave</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
