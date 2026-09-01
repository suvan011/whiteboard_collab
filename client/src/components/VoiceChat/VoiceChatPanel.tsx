/**
 * VoiceChatPanel.tsx
 * Floating live voice chat overlay widget displaying speaking indicators,
 * microphone mute toggle, audio visualizer, device selection, and voice participant list.
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
  Settings,
  Headphones,
  Sparkles,
  Radio,
  Sliders,
} from 'lucide-react';
import { RoomUser } from '../../types/whiteboard';
import { Tooltip } from '../UI/Tooltip';

interface VoiceChatPanelProps {
  isInVoice: boolean;
  isMuted: boolean;
  localSpeaking: boolean;
  micVolumeLevel?: number;
  audioInputDevices?: MediaDeviceInfo[];
  audioOutputDevices?: MediaDeviceInfo[];
  selectedAudioInputId?: string;
  selectedAudioOutputId?: string;
  currentUser: RoomUser | null;
  voiceParticipants: Map<string, { user?: RoomUser; isSpeaking?: boolean }>;
  onJoinVoice: () => void;
  onLeaveVoice: () => void;
  onToggleMute: () => void;
  onSwitchAudioInput?: (deviceId: string) => void;
  onSwitchAudioOutput?: (deviceId: string) => void;
}

export const VoiceChatPanel: React.FC<VoiceChatPanelProps> = ({
  isInVoice,
  isMuted,
  localSpeaking,
  micVolumeLevel = 0,
  audioInputDevices = [],
  audioOutputDevices = [],
  selectedAudioInputId,
  selectedAudioOutputId,
  currentUser,
  voiceParticipants,
  onJoinVoice,
  onLeaveVoice,
  onToggleMute,
  onSwitchAudioInput,
  onSwitchAudioOutput,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  if (!isInVoice) return null;

  const participantsList = Array.from(voiceParticipants.values());

  return (
    <div className="absolute bottom-6 right-6 z-20 w-80 glass-panel rounded-2xl shadow-2xl animate-slide-down border border-white/10 overflow-hidden text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 bg-slate-900/85 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio className="w-4 h-4 text-emerald-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-white">Voice Connected</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings((prev) => !prev)}
            title="Audio Device Settings"
            className={`p-1.5 rounded-lg transition-colors ${
              showSettings ? 'bg-blue-600/30 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-3.5 space-y-3.5">
          {/* Audio Device Settings Modal / Section */}
          {showSettings && (
            <div className="p-3 bg-slate-900/90 border border-blue-500/30 rounded-xl space-y-3 animate-fade-in text-xs">
              <div className="flex items-center gap-1.5 text-blue-400 font-semibold uppercase tracking-wider text-[11px]">
                <Sliders className="w-3.5 h-3.5" />
                <span>Audio Device Setup</span>
              </div>

              {/* Microphone Select */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                  <Mic className="w-3 h-3 text-emerald-400" /> Microphone Input
                </label>
                <select
                  value={selectedAudioInputId}
                  onChange={(e) => onSwitchAudioInput?.(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs outline-none focus:border-blue-500"
                >
                  {audioInputDevices.length > 0 ? (
                    audioInputDevices.map((device, idx) => (
                      <option key={device.deviceId || idx} value={device.deviceId}>
                        {device.label || `Microphone ${idx + 1}`}
                      </option>
                    ))
                  ) : (
                    <option value="">Default Microphone</option>
                  )}
                </select>
              </div>

              {/* Output / Headphone Select */}
              {audioOutputDevices.length > 0 && (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                    <Headphones className="w-3 h-3 text-purple-400" /> Audio Output
                  </label>
                  <select
                    value={selectedAudioOutputId}
                    onChange={(e) => onSwitchAudioOutput?.(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs outline-none focus:border-blue-500"
                  >
                    {audioOutputDevices.map((device, idx) => (
                      <option key={device.deviceId || idx} value={device.deviceId}>
                        {device.label || `Speaker ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Real-time Mic Level Indicator */}
              <div className="pt-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span>Input Mic Level</span>
                  <span className="font-mono text-emerald-400">{isMuted ? 'Muted' : `${micVolumeLevel}%`}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${isMuted ? 0 : micVolumeLevel}%` }}
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500 transition-all duration-75"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Active Speakers & Participants */}
          <div className="space-y-2 max-h-44 overflow-y-auto">
            {/* Current User Voice Item */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/40">
              <div className="flex items-center gap-2">
                <div
                  style={{ backgroundColor: currentUser?.color || '#3B82F6' }}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase shrink-0 ${
                    localSpeaking && !isMuted ? 'speaking-ring' : ''
                  }`}
                >
                  {currentUser?.name ? currentUser.name.slice(0, 1) : 'U'}
                </div>
                <span className="text-xs font-medium text-slate-200 truncate max-w-[120px]">
                  {currentUser?.name || 'You'} <span className="text-[10px] text-blue-400">(You)</span>
                </span>
              </div>

              {/* Status */}
              {isMuted ? (
                <span className="flex items-center gap-1 text-[11px] text-rose-400 font-medium bg-rose-500/10 px-2 py-0.5 rounded-full shrink-0">
                  <MicOff className="w-3 h-3" /> Muted
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                  <Mic className="w-3 h-3" /> Live
                </span>
              )}
            </div>

            {/* Remote Voice Peers */}
            {participantsList.length === 0 ? (
              <div className="text-center py-2 text-xs text-slate-400 flex items-center justify-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>Waiting for teammates to join voice...</span>
              </div>
            ) : (
              participantsList.map((p, idx) => {
                const userName = p.user?.name || `Peer ${idx + 1}`;
                const userColor = p.user?.color || '#8B5CF6';
                const isPeerMuted = p.user?.isMuted;

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-slate-700/30"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        style={{ backgroundColor: userColor }}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase shrink-0 ${
                          !isPeerMuted && p.isSpeaking ? 'speaking-ring' : ''
                        }`}
                      >
                        {userName.slice(0, 1)}
                      </div>
                      <span className="text-xs font-medium text-slate-300 truncate max-w-[120px]">{userName}</span>
                    </div>

                    {isPeerMuted ? (
                      <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium bg-slate-700/50 px-2 py-0.5 rounded-full shrink-0">
                        <MicOff className="w-3 h-3" /> Muted
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                        <Volume2 className="w-3 h-3 text-emerald-400" /> Connected
                      </span>
                    )}
                  </div>
                );
              })
            )}
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
