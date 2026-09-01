/**
 * useWebRTC.ts
 * Mesh WebRTC peer-to-peer audio communication hook with Socket.IO signaling,
 * microphone controls, speaking level detection, and comprehensive error handling.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { RoomUser } from '../types/whiteboard';

// Standard public STUN servers for reliable peer connection discovery
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
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
  const [voiceParticipants, setVoiceParticipants] = useState<Map<string, { user?: RoomUser; isSpeaking?: boolean }>>(new Map());
  const [localSpeaking, setLocalSpeaking] = useState(false);

  // References
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

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

    setVoiceParticipants((prev) => {
      const next = new Map(prev);
      next.delete(peerId);
      return next;
    });
  }, []);

  // Setup AudioContext volume analyzer for speaking detection
  const setupAudioAnalyzer = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
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
        // Threshold for speaking
        const isSpeakingNow = average > 18 && !isMuted;
        setLocalSpeaking(isSpeakingNow);

        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      console.warn('AudioContext analyzer not available:', err);
    }
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
        if (event.candidate && socket) {
          socket.emit('voice:ice-candidate', {
            to: targetSocketId,
            candidate: event.candidate,
          });
        }
      };

      // Handle incoming remote audio stream
      pc.ontrack = (event) => {
        const remoteStream = event.streams[0] || new MediaStream([event.track]);
        let audioEl = audioElementsRef.current.get(targetSocketId);

        if (!audioEl) {
          audioEl = new Audio();
          audioEl.autoplay = true;
          audioEl.setAttribute('playsinline', 'true');
          audioElementsRef.current.set(targetSocketId, audioEl);
        }

        audioEl.srcObject = remoteStream;
        audioEl.play().catch((e) => console.log('Audio autoplay prevented or waiting user interaction', e));
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          cleanupPeer(targetSocketId);
        }
      };

      return pc;
    },
    [socket, cleanupPeer]
  );

  // Join Voice Chat
  const joinVoice = useCallback(async () => {
    if (!socket || !socket.connected) {
      onError?.('Cannot connect to voice: Server is disconnected.');
      return;
    }

    try {
      setIsConnecting(true);

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      localStreamRef.current = stream;
      setIsInVoice(true);
      setIsMuted(false);
      setIsConnecting(false);
      onVoiceStateChange?.(true);

      setupAudioAnalyzer(stream);

      // Notify backend that we are ready for voice signaling
      socket.emit(
        'voice:join',
        async (res: { success: boolean; existingPeers: RoomUser[]; error?: string }) => {
          if (!res || !res.success) {
            onError?.(res?.error || 'Failed to connect to voice room');
            leaveVoice();
            return;
          }

          // As the newly joined peer, initiate WebRTC offers to all existing peers
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
              console.error(`Error initiating offer to ${peer.socketId}:`, err);
            }
          }
        }
      );
    } catch (err: unknown) {
      setIsConnecting(false);
      console.error('Microphone access failed:', err);
      const isDenied = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      if (isDenied) {
        onError?.('Microphone permission denied. Please allow microphone access in your browser settings to use voice chat.');
      } else {
        onError?.('Unable to connect to voice chat. Please check your audio devices.');
      }
    }
  }, [socket, onError, onVoiceStateChange, createPeerConnection]);

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

    setVoiceParticipants(new Map());
    setIsInVoice(false);
    setIsMuted(false);
    setLocalSpeaking(false);
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

  // Handle incoming signaling messages
  useEffect(() => {
    if (!socket) return;

    // A new peer joined voice
    const handlePeerJoined = ({ socketId, user }: { socketId: string; user?: RoomUser }) => {
      setVoiceParticipants((prev) => {
        const next = new Map(prev);
        next.set(socketId, { user });
        return next;
      });
    };

    // A peer left voice
    const handlePeerLeft = ({ socketId }: { socketId: string }) => {
      cleanupPeer(socketId);
    };

    // Received WebRTC Offer
    const handleOffer = async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      try {
        const pc = createPeerConnection(from);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('voice:answer', {
          to: from,
          answer,
        });
      } catch (err) {
        console.error('Error handling WebRTC offer:', err);
      }
    };

    // Received WebRTC Answer
    const handleAnswer = async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      try {
        const pc = peerConnectionsRef.current.get(from);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (err) {
        console.error('Error handling WebRTC answer:', err);
      }
    };

    // Received ICE Candidate
    const handleIceCandidate = async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      try {
        const pc = peerConnectionsRef.current.get(from);
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error('Error handling ICE candidate:', err);
      }
    };

    socket.on('voice:peer-joined', handlePeerJoined);
    socket.on('voice:peer-left', handlePeerLeft);
    socket.on('voice:offer', handleOffer);
    socket.on('voice:answer', handleAnswer);
    socket.on('voice:ice-candidate', handleIceCandidate);

    return () => {
      socket.off('voice:peer-joined', handlePeerJoined);
      socket.off('voice:peer-left', handlePeerLeft);
      socket.off('voice:offer', handleOffer);
      socket.off('voice:answer', handleAnswer);
      socket.off('voice:ice-candidate', handleIceCandidate);
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
    joinVoice,
    leaveVoice,
    toggleMute,
  };
}
