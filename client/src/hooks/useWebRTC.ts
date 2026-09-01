/**
 * useWebRTC.ts
 * Mesh WebRTC peer-to-peer audio communication hook with Socket.IO signaling,
 * ICE candidate buffering, device enumeration/selection, speaking level detection,
 * multi-tier fallback, and comprehensive error handling.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { RoomUser } from '../types/whiteboard';

// Standard high-reliability public STUN servers for robust NAT & tunnel traversal
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.services.mozilla.com:3478' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
  iceCandidatePoolSize: 10,
};

interface UseWebRTCProps {
  socket: Socket | null;
  currentUser: RoomUser | null;
  onError?: (msg: string) => void;
  onVoiceStateChange?: (isActive: boolean) => void;
}

export function useWebRTC({ socket, currentUser, onError, onVoiceStateChange }: UseWebRTCProps) {
  const [isInVoice, setIsInVoice] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [voiceParticipants, setVoiceParticipants] = useState<
    Map<string, { user?: RoomUser; isSpeaking?: boolean }>
  >(new Map());
  const [localSpeaking, setLocalSpeaking] = useState(false);

  // Audio Device Management
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioInputId, setSelectedAudioInputId] = useState<string>('');
  const [selectedAudioOutputId, setSelectedAudioOutputId] = useState<string>('');
  const [micVolumeLevel, setMicVolumeLevel] = useState<number>(0);

  // References
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const pendingIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Remote audio analyzers for speech detection
  const remoteAnalysersRef = useRef<Map<string, { analyser: AnalyserNode; animId: number }>>(new Map());

  // Enumerate audio devices
  const refreshAudioDevices = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter((d) => d.kind === 'audioinput');
      const outputs = devices.filter((d) => d.kind === 'audiooutput');

      setAudioInputDevices(inputs);
      setAudioOutputDevices(outputs);

      if (inputs.length > 0 && !selectedAudioInputId) {
        setSelectedAudioInputId(inputs[0].deviceId);
      }
      if (outputs.length > 0 && !selectedAudioOutputId) {
        setSelectedAudioOutputId(outputs[0].deviceId);
      }
    } catch (err) {
      console.warn('[WebRTC] Error enumerating devices:', err);
    }
  }, [selectedAudioInputId, selectedAudioOutputId]);

  // Listen for device changes (e.g. plugging/unplugging headphones)
  useEffect(() => {
    refreshAudioDevices();
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', refreshAudioDevices);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', refreshAudioDevices);
      };
    }
  }, [refreshAudioDevices]);

  // Clean up a single peer connection
  const cleanupPeer = useCallback((peerId: string) => {
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(peerId);
    }

    const audioEl = audioElementsRef.current.get(peerId);
    if (audioEl) {
      audioEl.srcObject = null;
      audioEl.remove();
      audioElementsRef.current.delete(peerId);
    }

    pendingIceCandidatesRef.current.delete(peerId);

    const remoteAnalyser = remoteAnalysersRef.current.get(peerId);
    if (remoteAnalyser) {
      cancelAnimationFrame(remoteAnalyser.animId);
      remoteAnalysersRef.current.delete(peerId);
    }

    setVoiceParticipants((prev) => {
      const next = new Map(prev);
      next.delete(peerId);
      return next;
    });
  }, []);

  // Flush queued ICE candidates after remote description is set
  const drainPendingIceCandidates = async (peerId: string, pc: RTCPeerConnection) => {
    const queued = pendingIceCandidatesRef.current.get(peerId);
    if (queued && queued.length > 0) {
      pendingIceCandidatesRef.current.delete(peerId);
      for (const cand of queued) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (err) {
          console.warn(`[WebRTC] Error applying buffered ICE candidate for ${peerId}:`, err);
        }
      }
    }
  };

  // Setup AudioContext volume analyzer for local speaking detection & volume meter
  const setupAudioAnalyzer = (stream: MediaStream) => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }

      const tracks = stream.getAudioTracks();
      if (tracks.length === 0) return;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserRef.current = analyser;

      const buffer = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const average = sum / buffer.length;
        const normalized = Math.min(Math.round((average / 128) * 100), 100);
        setMicVolumeLevel(normalized);

        const isSpeakingNow = average > 12 && !isMuted;
        setLocalSpeaking(isSpeakingNow);

        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      console.warn('[WebRTC] Local AudioContext analyzer not available:', err);
    }
  };

  // Helper: Create a fallback silent/simulated audio stream if microphone hardware is unavailable
  const createFallbackAudioStream = (): MediaStream => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const dest = ctx.createMediaStreamDestination();
        return dest.stream;
      }
    } catch (_) {}
    return new MediaStream();
  };

  // Create or retrieve PeerConnection for a remote socket
  const createPeerConnection = useCallback(
    (targetSocketId: string): RTCPeerConnection => {
      if (peerConnectionsRef.current.has(targetSocketId)) {
        return peerConnectionsRef.current.get(targetSocketId)!;
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionsRef.current.set(targetSocketId, pc);

      // Add local audio tracks to the peer connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle ICE Candidates generated locally
      pc.onicecandidate = (event) => {
        if (event.candidate && socket && socket.connected) {
          socket.emit('voice:ice-candidate', {
            to: targetSocketId,
            candidate: event.candidate,
          });
        }
      };

      // Handle incoming remote audio stream with DOM attachment and Autoplay resilience
      pc.ontrack = (event) => {
        const remoteStream = event.streams[0] || new MediaStream([event.track]);
        let audioEl = audioElementsRef.current.get(targetSocketId);

        if (!audioEl) {
          audioEl = document.createElement('audio');
          audioEl.autoplay = true;
          audioEl.setAttribute('playsinline', 'true');
          audioEl.setAttribute('data-peer-socket', targetSocketId);

          let container = document.getElementById('canvasconnect-audio-container');
          if (!container) {
            container = document.createElement('div');
            container.id = 'canvasconnect-audio-container';
            container.style.display = 'none';
            document.body.appendChild(container);
          }
          container.appendChild(audioEl);
          audioElementsRef.current.set(targetSocketId, audioEl);
        }

        audioEl.srcObject = remoteStream;

        // Apply audio output sink if supported
        const elSink = audioEl as unknown as { setSinkId?: (id: string) => Promise<void> };
        if (selectedAudioOutputId && typeof elSink.setSinkId === 'function') {
          elSink.setSinkId(selectedAudioOutputId).catch(() => {});
        }

        audioEl.play().catch((e) => {
          console.log('[WebRTC] Autoplay waiting user gesture:', e);
          const resumeAudio = () => {
            audioEl?.play().catch(() => {});
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
              audioContextRef.current.resume().catch(() => {});
            }
            window.removeEventListener('click', resumeAudio);
            window.removeEventListener('keydown', resumeAudio);
          };
          window.addEventListener('click', resumeAudio, { once: true });
          window.addEventListener('keydown', resumeAudio, { once: true });
        });
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === 'disconnected' ||
          pc.connectionState === 'failed' ||
          pc.connectionState === 'closed'
        ) {
          cleanupPeer(targetSocketId);
        }
      };

      return pc;
    },
    [socket, cleanupPeer, selectedAudioOutputId]
  );

  // Acquire local media stream with multi-tier fallback
  const acquireMediaStream = async (deviceId?: string): Promise<MediaStream> => {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      console.warn('[WebRTC] Insecure origin or mediaDevices unavailable. Using fallback stream.');
      onError?.(
        'Voice chat running in compatibility mode. For full microphone access, open via HTTPS or localhost.'
      );
      return createFallbackAudioStream();
    }

    // Tier 1: Optimal constraints with specific or default device
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      };
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (tier1Err) {
      console.warn('[WebRTC] Advanced audio constraints failed, trying basic audio...', tier1Err);
    }

    // Tier 2: Basic audio
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (tier2Err) {
      console.warn('[WebRTC] Basic audio failed, fallback to simulated stream...', tier2Err);
      const isDenied =
        tier2Err instanceof DOMException &&
        (tier2Err.name === 'NotAllowedError' || tier2Err.name === 'PermissionDeniedError');
      if (isDenied) {
        onError?.('Microphone permission blocked. Please allow microphone access in your browser bar.');
      } else {
        onError?.('Microphone not detected. Connected in listen-only voice mode.');
      }
      return createFallbackAudioStream();
    }
  };

  // Join Voice Chat
  const joinVoice = useCallback(async () => {
    if (!socket || !socket.connected) {
      onError?.('Cannot connect to voice: Collaboration server is disconnected.');
      return;
    }

    try {
      setIsConnecting(true);

      const stream = await acquireMediaStream(selectedAudioInputId);
      localStreamRef.current = stream;

      setIsInVoice(true);
      setIsMuted(false);
      setIsConnecting(false);
      onVoiceStateChange?.(true);

      setupAudioAnalyzer(stream);
      refreshAudioDevices();

      // Notify backend that we joined voice
      socket.emit(
        'voice:join',
        async (res: { success: boolean; existingPeers: RoomUser[]; error?: string }) => {
          if (!res || !res.success) {
            onError?.(res?.error || 'Failed to connect to voice room');
            leaveVoice();
            return;
          }

          // As newly joined peer, initiate WebRTC offers to all existing peers
          const existing = res.existingPeers || [];
          for (const peer of existing) {
            try {
              const pc = createPeerConnection(peer.socketId);
              const offer = await pc.createOffer({
                offerToReceiveAudio: true,
              });
              await pc.setLocalDescription(offer);

              socket.emit('voice:offer', {
                to: peer.socketId,
                offer,
              });

              setVoiceParticipants((prev) => {
                const next = new Map(prev);
                next.set(peer.socketId, { user: peer });
                return next;
              });
            } catch (err) {
              console.error(`[WebRTC] Error initiating offer to ${peer.socketId}:`, err);
            }
          }
        }
      );
    } catch (err: unknown) {
      setIsConnecting(false);
      console.error('[WebRTC] Voice chat join failed:', err);
      onError?.('Unable to connect to voice chat. Please check your audio settings.');
    }
  }, [socket, selectedAudioInputId, onError, onVoiceStateChange, createPeerConnection, refreshAudioDevices]);

  // Leave Voice Chat
  const leaveVoice = useCallback(() => {
    if (socket && socket.connected) {
      socket.emit('voice:leave');
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    audioElementsRef.current.forEach((el) => {
      el.srcObject = null;
      el.remove();
    });
    audioElementsRef.current.clear();

    remoteAnalysersRef.current.forEach((r) => cancelAnimationFrame(r.animId));
    remoteAnalysersRef.current.clear();

    pendingIceCandidatesRef.current.clear();
    setVoiceParticipants(new Map());
    setIsInVoice(false);
    setIsMuted(false);
    setLocalSpeaking(false);
    setMicVolumeLevel(0);
    onVoiceStateChange?.(false);
  }, [socket, onVoiceStateChange]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;

    const newMuted = !isMuted;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !newMuted;
    });

    setIsMuted(newMuted);

    if (socket && socket.connected) {
      socket.emit('voice:mute-status', { isMuted: newMuted });
    }
  }, [isMuted, socket]);

  // Switch Active Microphone Input
  const switchAudioInput = useCallback(
    async (deviceId: string) => {
      setSelectedAudioInputId(deviceId);
      if (!isInVoice) return;

      try {
        const newStream = await acquireMediaStream(deviceId);
        const newTrack = newStream.getAudioTracks()[0];

        if (newTrack) {
          // Replace track across all active peer connections
          peerConnectionsRef.current.forEach((pc) => {
            const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'audio');
            if (sender) {
              sender.replaceTrack(newTrack);
            }
          });

          // Stop old tracks
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => t.stop());
          }

          localStreamRef.current = newStream;
          setupAudioAnalyzer(newStream);
        }
      } catch (err) {
        console.error('[WebRTC] Failed to switch microphone:', err);
        onError?.('Could not switch microphone to selected device.');
      }
    },
    [isInVoice, onError]
  );

  // Switch Audio Output Device (Speakers/Headphones)
  const switchAudioOutput = useCallback(async (deviceId: string) => {
    setSelectedAudioOutputId(deviceId);
    audioElementsRef.current.forEach((el) => {
      const elSink = el as unknown as { setSinkId?: (id: string) => Promise<void> };
      if (typeof elSink.setSinkId === 'function') {
        elSink.setSinkId(deviceId).catch(() => {});
      }
    });
  }, []);

  // Handle incoming signaling messages
  useEffect(() => {
    if (!socket) return;

    // Peer joined voice
    const handlePeerJoined = ({ socketId, user }: { socketId: string; user?: RoomUser }) => {
      setVoiceParticipants((prev) => {
        const next = new Map(prev);
        next.set(socketId, { user });
        return next;
      });
    };

    // Peer left voice
    const handlePeerLeft = ({ socketId }: { socketId: string }) => {
      cleanupPeer(socketId);
    };

    // Received WebRTC Offer
    const handleOffer = async ({
      from,
      offer,
    }: {
      from: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      try {
        const pc = createPeerConnection(from);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Drain any ICE candidates received before the offer was set
        await drainPendingIceCandidates(from, pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('voice:answer', {
          to: from,
          answer,
        });
      } catch (err) {
        console.error('[WebRTC] Error handling offer:', err);
      }
    };

    // Received WebRTC Answer
    const handleAnswer = async ({
      from,
      answer,
    }: {
      from: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      try {
        const pc = peerConnectionsRef.current.get(from);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          // Drain buffered ICE candidates after setting answer
          await drainPendingIceCandidates(from, pc);
        }
      } catch (err) {
        console.error('[WebRTC] Error handling answer:', err);
      }
    };

    // Received ICE Candidate (with buffer support for race conditions)
    const handleIceCandidate = async ({
      from,
      candidate,
    }: {
      from: string;
      candidate: RTCIceCandidateInit;
    }) => {
      try {
        const pc = peerConnectionsRef.current.get(from);
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          // Buffer candidate until remote description is ready
          const queued = pendingIceCandidatesRef.current.get(from) || [];
          queued.push(candidate);
          pendingIceCandidatesRef.current.set(from, queued);
        }
      } catch (err) {
        console.warn('[WebRTC] Error adding ICE candidate:', err);
      }
    };

    // Received Mute status update from peer
    const handleMuteUpdated = ({
      socketId,
      isMuted: peerMuted,
    }: {
      socketId: string;
      isMuted: boolean;
    }) => {
      setVoiceParticipants((prev) => {
        const next = new Map(prev);
        const existing = next.get(socketId);
        if (existing && existing.user) {
          existing.user.isMuted = peerMuted;
          next.set(socketId, { ...existing });
        }
        return next;
      });
    };

    socket.on('voice:peer-joined', handlePeerJoined);
    socket.on('voice:peer-left', handlePeerLeft);
    socket.on('voice:offer', handleOffer);
    socket.on('voice:answer', handleAnswer);
    socket.on('voice:ice-candidate', handleIceCandidate);
    socket.on('voice:mute-updated', handleMuteUpdated);

    return () => {
      socket.off('voice:peer-joined', handlePeerJoined);
      socket.off('voice:peer-left', handlePeerLeft);
      socket.off('voice:offer', handleOffer);
      socket.off('voice:answer', handleAnswer);
      socket.off('voice:ice-candidate', handleIceCandidate);
      socket.off('voice:mute-updated', handleMuteUpdated);
    };
  }, [socket, createPeerConnection, cleanupPeer]);

  // Clean up all audio tracks when unmounting
  useEffect(() => {
    return () => {
      leaveVoice();
    };
  }, [leaveVoice]);

  return {
    isInVoice,
    isMuted,
    isConnecting,
    voiceParticipants,
    localSpeaking,
    micVolumeLevel,
    audioInputDevices,
    audioOutputDevices,
    selectedAudioInputId,
    selectedAudioOutputId,
    joinVoice,
    leaveVoice,
    toggleMute,
    switchAudioInput,
    switchAudioOutput,
    refreshAudioDevices,
  };
}
