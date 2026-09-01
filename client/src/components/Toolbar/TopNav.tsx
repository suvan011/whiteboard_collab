/**
 * TopNav.tsx
 * Top navigation bar featuring room information, live user presence avatars,
 * connection status, voice controls, export actions, and room sharing.
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Share2,
  Download,
  HelpCircle,
  LogOut,
  Mic,
  MicOff,
  PhoneOff,
  Users,
  Activity,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { RoomUser } from '../../types/whiteboard';
import { Tooltip } from '../UI/Tooltip';

interface TopNavProps {
  roomId: string;
  currentUser: RoomUser | null;
  roomUsers: RoomUser[];
  connectionStatus: 'connected' | 'connecting' | 'reconnecting' | 'disconnected';
  isInVoice: boolean;
  isMuted: boolean;
  localSpeaking: boolean;
  isVoiceConnecting: boolean;
  onJoinVoice: () => void;
  onLeaveVoice: () => void;
  onToggleMute: () => void;
  onOpenShareModal: () => void;
  onOpenExportModal: () => void;
  onOpenHelpModal: () => void;
  onLeaveRoom: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  roomId,
  currentUser,
  roomUsers,
  connectionStatus,
  isInVoice,
  isMuted,
  localSpeaking,
  isVoiceConnecting,
  onJoinVoice,
  onLeaveVoice,
  onToggleMute,
  onOpenShareModal,
  onOpenExportModal,
  onOpenHelpModal,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);
  const [showUsersDropdown, setShowUsersDropdown] = useState(false);

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-16 w-full px-4 flex items-center justify-between glass-panel border-b border-white/10 z-30 shrink-0">
      {/* Left: Brand + Room Code */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pr-3 border-r border-slate-700/60">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight text-white tracking-tight flex items-center gap-1.5">
              CanvasConnect
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded">
                Live
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Collaborative Workspace</p>
          </div>
        </div>

        {/* Room Code Badge */}
        <Tooltip content="Click to copy Room Code" shortcut="Copy">
          <button
            onClick={handleCopyRoomId}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl text-xs font-mono font-medium text-slate-200 transition-all group"
          >
            <span className="text-slate-400 text-[11px] font-sans uppercase font-bold">Room:</span>
            <span className="text-blue-400 font-bold tracking-wider">{roomId}</span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-white ml-0.5" />
            )}
          </button>
        </Tooltip>

        {/* Connection Status Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 text-[11px]">
          {connectionStatus === 'connected' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 font-medium">Connected</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-amber-400 font-medium">Reconnecting...</span>
            </>
          )}
        </div>
      </div>

      {/* Center / Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Active Users Avatar Stack */}
        <div className="relative">
          <button
            onClick={() => setShowUsersDropdown((prev) => !prev)}
            className="flex items-center gap-1.5 p-1.5 px-2.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all"
          >
            <div className="flex -space-x-2 overflow-hidden">
              {roomUsers.slice(0, 4).map((u) => (
                <div
                  key={u.socketId}
                  style={{ backgroundColor: u.color }}
                  className={`inline-block h-6 w-6 rounded-full ring-2 ring-slate-900 text-[10px] font-bold text-white flex items-center justify-center uppercase shadow-sm ${
                    u.isVoiceActive && !u.isMuted ? 'speaking-ring' : ''
                  }`}
                  title={`${u.name}${u.socketId === currentUser?.socketId ? ' (You)' : ''}`}
                >
                  {u.name.slice(0, 1)}
                </div>
              ))}
            </div>
            <span className="text-xs font-medium text-slate-300 ml-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              {roomUsers.length}
            </span>
          </button>

          {/* Active Users Dropdown */}
          {showUsersDropdown && (
            <div className="absolute top-12 right-0 w-56 p-3 bg-slate-900/95 border border-slate-700 rounded-2xl shadow-2xl backdrop-blur-xl z-50 animate-scale-in text-slate-100">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 px-1 flex items-center justify-between">
                <span>In this Room ({roomUsers.length})</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {roomUsers.map((u) => {
                  const isCurrent = u.socketId === currentUser?.socketId;
                  return (
                    <div
                      key={u.socketId}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          style={{ backgroundColor: u.color }}
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase shrink-0"
                        >
                          {u.name.slice(0, 1)}
                        </div>
                        <span className="font-medium text-slate-200 truncate max-w-[100px]">
                          {u.name} {isCurrent && <span className="text-[10px] text-blue-400 font-semibold">(You)</span>}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {u.isVoiceActive ? (
                          u.isMuted ? (
                            <span title="Muted"><MicOff className="w-3.5 h-3.5 text-rose-400" /></span>
                          ) : (
                            <span title="In Voice"><Mic className="w-3.5 h-3.5 text-emerald-400" /></span>
                          )
                        ) : null}
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* WebRTC Voice Chat Controls */}
        {!isInVoice ? (
          <Tooltip content="Connect voice chat with peers in room">
            <button
              onClick={onJoinVoice}
              disabled={isVoiceConnecting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50"
            >
              <Mic className="w-4 h-4" />
              <span className="hidden sm:inline">{isVoiceConnecting ? 'Connecting...' : 'Join Voice'}</span>
            </button>
          </Tooltip>
        ) : (
          <div className="flex items-center gap-1 p-1 bg-slate-800/90 border border-slate-700 rounded-xl">
            {/* Mute Toggle */}
            <Tooltip content={isMuted ? 'Unmute microphone' : 'Mute microphone'}>
              <button
                onClick={onToggleMute}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isMuted
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                } ${localSpeaking && !isMuted ? 'speaking-ring' : ''}`}
              >
                {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span className="hidden md:inline text-[11px]">{isMuted ? 'Muted' : 'Speaking'}</span>
              </button>
            </Tooltip>

            {/* Leave Voice */}
            <Tooltip content="Disconnect from voice chat">
              <button
                onClick={onLeaveVoice}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 rounded-lg transition-colors"
              >
                <PhoneOff className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          </div>
        )}

        {/* Share Room Button */}
        <Tooltip content="Invite team & share room link">
          <button
            onClick={onOpenShareModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl transition-all"
          >
            <Share2 className="w-4 h-4 text-blue-400" />
            <span className="hidden md:inline">Share</span>
          </button>
        </Tooltip>

        {/* Export Button */}
        <Tooltip content="Export canvas as PNG, JPEG, or PDF">
          <button
            onClick={onOpenExportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl transition-all"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </Tooltip>

        {/* Keyboard Shortcuts Help */}
        <Tooltip content="Keyboard Shortcuts">
          <button
            onClick={onOpenHelpModal}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </Tooltip>

        {/* Leave Room Button */}
        <Tooltip content="Leave this whiteboard">
          <button
            onClick={onLeaveRoom}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>
    </header>
  );
};
