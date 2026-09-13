import React, { useState, useEffect } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { FadeUp } from '../motion/primitives';

export default function SupportCard({ onDismiss, onOpenTrustedContact }) {
  const [activeTab, setActiveTab] = useState('breathe');
  const [breathPhase, setBreathPhase] = useState('Ready when you are.');
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const [isPacingActive, setIsPacingActive] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isPacingActive && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            setIsPacingActive(false);
            setBreathPhase('Done. Notice anything?');
            return 60;
          }
          const elapsed = 60 - prev;
          const cycleSec = elapsed % 12;
          if (cycleSec < 4) setBreathPhase('Inhale slowly\u2026');
          else if (cycleSec < 8) setBreathPhase('Hold gently\u2026');
          else setBreathPhase('Exhale completely\u2026');
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPacingActive, secondsRemaining]);

  const togglePacing = () => {
    if (isPacingActive) {
      setIsPacingActive(false);
      setSecondsRemaining(60);
      setBreathPhase('Ready when you are.');
    } else {
      setIsPacingActive(true);
      setSecondsRemaining(60);
      setBreathPhase('Inhale slowly\u2026');
    }
  };

  return (
    <FadeUp>
      <div className="border border-stone-border bg-paper-50 p-6 sm:p-8 relative">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-1.5 text-ink-400 hover:text-ink-950 transition-colors"
          aria-label="Dismiss support card"
        >
          <X className="w-4 h-4" />
        </button>

        <span className="eyebrow text-accent-terracotta">A quiet check-in</span>
        <h3 className="font-serif text-xl sm:text-2xl text-ink-950 mt-3 max-w-lg leading-snug">
          This session looked quite different from your usual rhythm.
        </h3>
        <p className="text-sm text-ink-600 mt-2">
          Before you move on, take one slow breath and unclench your shoulders.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-8 sm:gap-14 items-start">
          {/* Breathing circle */}
          {activeTab === 'breathe' && (
            <div className="flex flex-col items-center gap-4">
              <div className="relative flex items-center justify-center w-28 h-28">
                <div className={`absolute inset-0 rounded-full border border-ink-900/15 ${isPacingActive ? 'animate-breathe' : ''}`} aria-hidden="true" />
                <div className={`w-16 h-16 rounded-full bg-ink-900/5 border border-ink-900/10 ${isPacingActive ? 'animate-breathe' : ''}`} aria-hidden="true" />
                <span className={`absolute font-mono text-[10px] text-ink-500 ${isPacingActive ? 'animate-breathe' : ''}`}>
                  {isPacingActive ? `${secondsRemaining}s` : '60s'}
                </span>
              </div>
              <div className="text-center space-y-1">
                <div className="font-serif text-base text-ink-950">{breathPhase}</div>
                <div className="eyebrow text-ink-400">4s in &middot; 4s hold &middot; 4s out</div>
              </div>
              <button onClick={togglePacing} className="btn-ghost" style={{ padding: '0.625rem 1.25rem' }}>
                {isPacingActive ? 'Pause' : 'Begin 60 seconds'}
              </button>
            </div>
          )}

          {/* Grounding */}
          {activeTab === 'ground' && (
            <div className="space-y-3 max-w-sm">
              <div className="eyebrow text-ink-400">5-4-3-2-1 grounding</div>
              <p className="text-sm text-ink-700 leading-relaxed">
                Pause your hands on the desk. Silently notice:
              </p>
              <ul className="text-xs text-ink-600 space-y-1.5 font-mono">
                <li>5 things you can see</li>
                <li>4 things you can feel</li>
                <li>3 sounds in the room</li>
                <li>2 scents in the air</li>
                <li>1 deep breath, all the way in</li>
              </ul>
            </div>
          )}

          {/* Tab switcher */}
          <div className="sm:border-l sm:border-stone-border sm:pl-10 space-y-3 sm:flex-1">
            <div className="flex items-center gap-5">
              <button
                onClick={() => setActiveTab('breathe')}
                className={`eyebrow transition-colors ${activeTab === 'breathe' ? 'text-ink-950' : 'text-ink-400 hover:text-ink-950'}`}
              >
                60-second breathing
              </button>
              <button
                onClick={() => setActiveTab('ground')}
                className={`eyebrow transition-colors ${activeTab === 'ground' ? 'text-ink-950' : 'text-ink-400 hover:text-ink-950'}`}
              >
                Grounding prompt
              </button>
            </div>
            <p className="text-xs text-ink-500 leading-relaxed max-w-xs">
              Nothing here is reported, logged, or shared. These moments are yours alone.
            </p>

            {onOpenTrustedContact && (
              <button
                onClick={onOpenTrustedContact}
                className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-accent-terracotta hover:text-ink-950 transition-colors mt-2"
              >
                Draft a note to someone you trust
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
            <p className="text-[10px] text-ink-400 mt-3">
              We read every message, typically within 2-3 days during the hackathon period.
            </p>
          </div>
        </div>
      </div>
    </FadeUp>
  );
}
