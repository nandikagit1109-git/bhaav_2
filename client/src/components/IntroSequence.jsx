import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { InkPath, EASE } from '../motion/primitives';

/* ═══════════════════════════════════════════════════════════════════
   IntroSequence — a calm, auto-advancing intro before the Journal.
   
   ZERO API calls. Works even if the backend is down.
   Three phases, auto-advancing, skippable at any point.
   
   Phase 1 — Explain (3 beats, ~2.5s each, auto-advance)
   Phase 2 — The feeling moment (rhetorical, not data collection)
   Phase 3 — The invitation ("Start writing" CTA)
   ═══════════════════════════════════════════════════════════════════ */

const BEAT_DURATION = 2500; // ms per Phase 1 beat
const FEELING_PAUSE = 1500; // ms before the second line fades in

const BEATS = [
  {
    text: 'Bhaav reads rhythm, not words.',
    path: 'M6 60 C 80 30, 160 90, 240 55 S 380 70, 460 45 S 540 60, 594 50',
  },
  {
    text: 'No mood ratings. No daily check-ins.',
    path: 'M6 55 C 100 75, 180 35, 260 60 S 400 40, 480 65 S 560 55, 594 58',
  },
  {
    text: 'Just write. We\u2019ll notice what changes.',
    path: 'M6 50 C 90 65, 200 30, 300 55 S 450 70, 540 48 S 580 55, 594 52',
  },
];

/* ─── Phase 1: Explain — three quick beats ──────────────────────── */

function PhaseExplain({ onComplete }) {
  const [beat, setBeat] = useState(0);
  const reduced = useReducedMotion();
  const timerRef = useRef(null);

  const advance = useCallback(() => {
    clearTimeout(timerRef.current);
    if (beat < BEATS.length - 1) {
      setBeat(beat + 1);
    } else {
      onComplete();
    }
  }, [beat, onComplete]);

  // Auto-advance timer
  useEffect(() => {
    timerRef.current = setTimeout(advance, BEAT_DURATION);
    return () => clearTimeout(timerRef.current);
  }, [beat, advance]);

  const current = BEATS[beat];

  return (
    <div
      className="flex flex-col items-center justify-center h-full px-6 cursor-pointer select-none"
      onClick={advance}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') advance(); }}
      tabIndex={0}
      role="button"
      aria-label="Tap to advance"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={beat}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -10 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="text-center max-w-lg"
        >
          <p className="font-serif text-2xl sm:text-3xl md:text-4xl text-ink-900 leading-snug">
            {current.text}
          </p>

          {/* Ink path drawing */}
          <div className="mt-8 w-full max-w-sm mx-auto">
            <InkPath
              d={current.path}
              stroke="#2B3A67"
              width={1.4}
              duration={reduced ? 0 : 1.8}
              className="w-full h-12 opacity-50"
            />
          </div>

          {/* Beat indicator */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {BEATS.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                  i <= beat ? 'bg-accent-terracotta' : 'bg-ink-200'
                }`}
                aria-hidden="true"
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ─── Phase 2: The feeling moment ───────────────────────────────── */

function PhaseFeeling({ onComplete }) {
  const [showSecond, setShowSecond] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const timer = setTimeout(() => setShowSecond(true), FEELING_PAUSE);
    return () => clearTimeout(timer);
  }, []);

  // Auto-advance after both lines have been read
  useEffect(() => {
    const timer = setTimeout(onComplete, FEELING_PAUSE + 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="flex flex-col items-center justify-center h-full px-6 cursor-pointer select-none"
      onClick={onComplete}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onComplete(); }}
      tabIndex={0}
      role="button"
      aria-label="Tap to continue"
    >
      <div className="text-center max-w-lg">
        {/* First line — always visible */}
        <motion.p
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="font-serif text-3xl sm:text-4xl md:text-5xl text-ink-950 leading-snug"
        >
          How are you feeling right now?
        </motion.p>

        {/* Second line — fades in after a beat */}
        <AnimatePresence>
          {showSecond && (
            <motion.p
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE }}
              className="font-serif italic text-lg sm:text-xl text-ink-500 leading-relaxed mt-6 max-w-md mx-auto"
            >
              You don&rsquo;t have to put it into words.
              <br />
              That&rsquo;s what writing is for.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Phase 3: The invitation ───────────────────────────────────── */

function PhaseInvitation({ onStart }) {
  const reduced = useReducedMotion();

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="text-center"
      >
        <p className="font-serif text-xl sm:text-2xl text-ink-700 leading-relaxed mb-8 max-w-md">
          Your words stay yours. Only your rhythm is observed.
        </p>

        <button
          onClick={onStart}
          className="btn-ink inline-flex items-center gap-2"
        >
          Start writing
          <ArrowUpRight className="w-4 h-4" />
        </button>

        <p className="text-[11px] font-mono text-ink-400 mt-6 tracking-wide">
          Nothing is stored until you complete a session.
        </p>
      </motion.div>
    </div>
  );
}

/* ─── Main component ────────────────────────────────────────────── */

const PHASES = ['explain', 'feeling', 'invitation'];

export default function IntroSequence({ onComplete }) {
  const [phase, setPhase] = useState('explain');
  const reduced = useReducedMotion();

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const handlePhaseComplete = useCallback(() => {
    const idx = PHASES.indexOf(phase);
    if (idx < PHASES.length - 1) {
      setPhase(PHASES[idx + 1]);
    } else {
      onComplete();
    }
  }, [phase, onComplete]);

  return (
    <div className="fixed inset-0 z-[9998] bg-paper-100 flex flex-col">
      {/* Skip link — always visible, top-right corner */}
      <div className="absolute top-5 right-5 sm:top-8 sm:right-8 z-10">
        <button
          onClick={handleSkip}
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-400 hover:text-ink-700 transition-colors duration-300"
        >
          Skip
        </button>
      </div>

      {/* Brand mark — top-left */}
      <div className="absolute top-5 left-5 sm:top-8 sm:left-8 z-10">
        <span className="font-serif text-xl text-ink-900">
          Bhaav<span className="text-accent-pop">.</span>
        </span>
      </div>

      {/* Phase content */}
      <div className="flex-1 flex">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="flex-1"
          >
            {phase === 'explain' && (
              <PhaseExplain onComplete={handlePhaseComplete} onSkip={handleSkip} />
            )}
            {phase === 'feeling' && (
              <PhaseFeeling onComplete={handlePhaseComplete} onSkip={handleSkip} />
            )}
            {phase === 'invitation' && (
              <PhaseInvitation onStart={onComplete} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * Helper: check if intro has been seen before (localStorage).
 */
export function hasSeenIntro() {
  try {
    return localStorage.getItem('bhaav-intro-seen') === 'true';
  } catch {
    return false;
  }
}

/**
 * Helper: mark intro as seen.
 */
export function markIntroSeen() {
  try {
    localStorage.setItem('bhaav-intro-seen', 'true');
  } catch { /* silent */ }
}

/**
 * Helper: reset intro (for "Watch intro again" in Settings).
 */
export function resetIntro() {
  try {
    localStorage.removeItem('bhaav-intro-seen');
  } catch { /* silent */ }
}
