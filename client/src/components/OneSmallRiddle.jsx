import React, { useState, useMemo } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';

/**
 * OneSmallRiddle — a single gentle riddle themed around noticing,
 * patterns, or rhythm. Rotates weekly (tied to week_start).
 * Tap "Reveal" to see the answer. No timer, no attempts, no guilt.
 */

const RIDDLES = [
  {
    question: 'I get longer when you\'re unsure, and shorter when you\'re certain. What am I?',
    answer: 'A pause',
  },
  {
    question: 'I am always present when you write, but you never see me. What am I?',
    answer: 'Your rhythm',
  },
  {
    question: 'I mark the space between thoughts. I am not empty — just waiting. What am I?',
    answer: 'A blank moment',
  },
  {
    question: 'I appear when you slow down, and vanish when you rush. What am I?',
    answer: 'A breath',
  },
  {
    question: 'I am the pattern behind your words, not the words themselves. What am I?',
    answer: 'Your writing rhythm',
  },
  {
    question: 'I am quieter when you are certain, and louder when you hesitate. What am I?',
    answer: 'A correction',
  },
];

function weekStart(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function riddleForWeek() {
  const week = weekStart(new Date());
  // Simple hash of the week string to pick a riddle
  let hash = 0;
  for (let i = 0; i < week.length; i++) {
    hash = ((hash << 5) - hash + week.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % RIDDLES.length;
}

const EASE = [0.22, 1, 0.36, 1];

export default function OneSmallRiddle() {
  const reduced = useReducedMotion();
  const [revealed, setRevealed] = useState(false);
  const riddleIndex = useMemo(() => riddleForWeek(), []);
  const riddle = RIDDLES[riddleIndex];

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <span className="eyebrow text-[var(--play-slate)]">One small riddle</span>
        <span className="eyebrow text-ink-400">Rotate weekly</span>
      </div>

      <div className="riddle-card">
        <p className="font-serif italic text-lg text-ink-800 leading-relaxed">
          &ldquo;{riddle.question}&rdquo;
        </p>

        <div className="mt-5">
          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--play-slate)] hover:text-ink-950 transition-colors duration-300 pb-1 border-b border-[var(--play-slate)]/30 hover:border-ink-950/50"
            >
              Reveal answer
            </button>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key="answer"
                initial={reduced ? { opacity: 1 } : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: 'var(--play-sage)' }}
                    aria-hidden="true"
                  />
                  <p className="font-serif text-lg text-ink-900">
                    {riddle.answer}
                  </p>
                </div>
                <p className="mt-3 font-serif italic text-sm text-ink-500 leading-relaxed">
                  No right or wrong — just a small thing to notice.
                </p>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
