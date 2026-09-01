/**
 * LandingPage.tsx
 * Modern, visually stunning landing page for CanvasConnect with interactive room creation & join modal
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Users,
  Mic,
  Download,
  Layers,
  Zap,
  ArrowRight,
  Shield,
  Palette,
  CheckCircle2,
  Code2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface LandingPageProps {
  onJoinRoom: (roomId: string, userName: string) => void;
  initialRoomId?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onJoinRoom, initialRoomId = '' }) => {
  const [roomId, setRoomId] = useState(initialRoomId);
  const [userName, setUserName] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Background animated canvas preview
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate a clean memorable Room ID
  const generateRoomId = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  useEffect(() => {
    if (!roomId) {
      setRoomId(generateRoomId());
    }
  }, []);

  // Hero canvas interactive background animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Floating particles and vector connection nodes
    const particles = Array.from({ length: 30 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      radius: Math.random() * 2 + 1,
      color: ['#38bdf8', '#818cf8', '#c084fc', '#34d399'][Math.floor(Math.random() * 4)],
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw faint connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 140) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.12 * (1 - dist / 140)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // Draw particle points
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.5;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!userName.trim()) {
      setError('Please enter your display name.');
      return;
    }

    if (!roomId.trim()) {
      setError('Please enter a valid Room ID.');
      return;
    }

    setIsSubmitting(true);

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch (_) {}

    setTimeout(() => {
      onJoinRoom(roomId.trim().toUpperCase(), userName.trim());
    }, 300);
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden selection:bg-blue-500 selection:text-white">
      {/* Background canvas animation */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0 opacity-60" />
      <div className="absolute inset-0 hero-glow pointer-events-none z-0" />

      {/* Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-white">CanvasConnect</span>
            <span className="text-[10px] uppercase font-bold text-blue-400 ml-2 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
              v1.0 Live
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="#features"
            className="text-xs font-medium text-slate-400 hover:text-white transition-colors hidden sm:inline"
          >
            Features
          </a>
          <button
            onClick={() => {
              setMode('join');
              setRoomId('');
            }}
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-200 border border-slate-700/80 transition-all shadow-sm"
          >
            Join with Code
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-5xl mx-auto text-center">
        {/* Tagline Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6 animate-fade-in shadow-inner">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Real-time Collaborative Drawing & Voice</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Think Together. <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            Draw Together.
          </span>{' '}
          Create Together.
        </h1>

        {/* Description */}
        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mb-10 leading-relaxed">
          Brainstorm ideas on an infinite shared whiteboard, sketch diagrams with smooth vector tools,
          and speak naturally with crystal-clear WebRTC voice chat — all with zero latency.
        </p>

        {/* Card Form */}
        <div className="w-full max-w-md p-6 sm:p-8 glass-panel rounded-3xl shadow-2xl border border-white/10 text-left animate-scale-in">
          {/* Tabs: Create vs Join */}
          <div className="flex items-center p-1 bg-slate-900/90 rounded-2xl border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('create');
                setRoomId(generateRoomId());
                setError(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                mode === 'create'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create New Room
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('join');
                setError(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                mode === 'join'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Join Existing Room
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display Name Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Your Display Name
              </label>
              <input
                type="text"
                required
                maxLength={24}
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g. Suvan Gupta"
                className="w-full px-4 py-3 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm font-medium text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            {/* Room ID Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                {mode === 'create' ? 'Generated Room ID' : 'Enter Room ID'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={12}
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  placeholder="e.g. ABC123"
                  className="w-full px-4 py-3 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm font-mono font-bold tracking-widest text-blue-400 placeholder-slate-500 uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                {mode === 'create' && (
                  <button
                    type="button"
                    onClick={() => setRoomId(generateRoomId())}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-white bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 transition-colors"
                  >
                    Regenerate
                  </button>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-xl shadow-blue-600/30 transition-all transform active:scale-[0.99] disabled:opacity-50"
            >
              <span>{mode === 'create' ? 'Enter Whiteboard & Start Drawing' : 'Join Whiteboard Room'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>

      {/* Feature Highlights Section */}
      <section id="features" className="relative z-10 w-full max-w-6xl mx-auto px-6 py-16 border-t border-slate-800/80">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Designed for Instant Teamwork</h2>
          <p className="text-xs sm:text-sm text-slate-400">Everything you need for seamless creative collaboration.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1 */}
          <div className="p-6 glass-panel rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
              <Palette className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1.5">Smooth Vector Drawing</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Organic pen strokes with Bezier smoothing, highlighters, geometric shapes, and text notes.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 glass-panel rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
              <Mic className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1.5">WebRTC Voice Chat</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Low-latency peer-to-peer audio mesh with mute toggles and speaking volume visualizers.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 glass-panel rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1.5">Live Cursors & Presence</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              See teammates' colored cursors move in real time with sub-30ms WebSocket synchronization.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-6 glass-panel rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1.5">PDF & PNG High-Res Export</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Download your full workspace as high-resolution PNG, JPEG, or vectorized PDF documents.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 w-full py-6 text-center text-xs text-slate-500 border-t border-slate-900">
        CanvasConnect © 2026 — Live Collaborative Whiteboard & Voice Workspace
      </footer>
    </div>
  );
};
