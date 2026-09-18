import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════════════
   RollKindness — a solo-adapted "roll for a small kindness."
   
   A line-drawn die icon in the ink-stroke style. Tapping it plays
   a brief roll animation (rotate + spring settle), then reveals
   ONE random low-effort self-kindness action from a fixed list.
   
   Rules: no scoring, no tracking, no completion obligations.
   The die never repeats the same action twice in a row.
   ═══════════════════════════════════════════════════════════════════ */

const KINDNESS_ACTIONS = [
  'Drink a glass of water.',
  'Step outside for two minutes.',
  'Text one person a two-word hello.',
  'Put your phone down for five minutes.',
  'Stretch your arms above your head.',
  'Look out a window for thirty seconds.',
  'Name one thing you did well today.',
  'Take three slow breaths.',
  'Hum a line of any song you know.',
  'Rest your eyes for a minute — close them.',
  'Touch something with a texture you like.',
  'Say one kind thing to yourself, out loud or silently.',
];

const EASE = [0.22, 1, 0.36, 1];

// Simple seeded random to avoid repeats
function pickRandom(exclude) {
  const available = KINDNESS_ACTIONS.filter(a => a !== exclude);
  return available[Math.floor(Math.random() * available.length)];
}

/**
 * Ink-style die icon — a rounded square with 4 dots (pips).
 * Drawn with the same stroke style as the weather icons.
 */
function DieIcon({ size = 32 }) {
  const s = size;
  const pad = 4;
  const dotR = 2;
  const cx = s / 2;
  const cy = s / 2;
  const off = s / 3.5; // distance from center to pips

  return (
    <svg viewBox={`0 0 ${s} ${s}`} width={s} height={s} fill="none" aria-hidden="true">
      {/* Die body */}
      <rect
        x={pad}
        y={pad}
        width={s - pad * 2}
        height={s - pad * 2}
        rx={4}
        ry={4}
        stroke="#2B3A67"
        strokeWidth="1.6"
      />
      {/* 4 pips */}
      <circle cx={cx - off} cy={cy - off} r={dotR} fill="#2B3A67" />
      <circle cx={cx + off} cy={cy - off} r={dotR} fill="#2B3A67" />
      <circle cx={cx - off} cy={cy + off} r={dotR} fill="#2B3A67" />
      <circle cx={cx + off} cy={cy + off} r={dotR} fill="#2B3A67" />
    </svg>
  );
}

export default function RollKindness() {
  const reduced = useReducedMotion();
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const lastAction = useRef(null);

  const handleRoll = useCallback(() => {
    if (isRolling) return;

    setIsRolling(true);
    setShowResult(false);

    // Pick a random action (never repeat the last one)
    const action = pickRandom(lastAction.current);
    lastAction.current = action;

    // Brief roll animation, then reveal
    const rollDuration = reduced ? 0 : 600;
    setTimeout(() => {
      setResult(action);
      setShowResult(true);
      setIsRolling(false);
    }, rollDuration);
  }, [isRolling, reduced]);

  const handleRollAgain = useCallback(() => {
    setShowResult(false);
    setResult(null);
    // Small delay so the exit animation plays, then trigger new roll
    setTimeout(() => handleRoll(), 200);
  }, [handleRoll]);

  return (
    <div className="mt-6">
      <p className="text-sm text-ink-600 leading-relaxed mb-4">
        Roll for a small kindness.
      </p>

      <div className="flex items-start gap-5">
        {/* The die */}
        <motion.button
          onClick={showResult ? handleRollAgain : handleRoll}
          disabled={isRolling}
          className="relative flex-shrink-0 p-3 rounded-lg border border-stone-border hover:border-ink-300 hover:bg-ink-50/50 transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-ink-300"
          whileHover={!isRolling ? { scale: 1.05 } : {}}
          whileTap={!isRolling ? { scale: 0.95 } : {}}
          aria-label={showResult ? 'Roll again for another kindness' : 'Roll for a small kindness'}
        >
          <motion.div
            animate={
              isRolling
                ? { rotate: [0, 180, 360], scale: [1, 1.1, 1] }
                : { rotate: 0, scale: 1 }
            }
            transition={
              isRolling
                ? { duration: 0.6, ease: 'easeInOut' }
                : { type: 'spring', stiffness: 300, damping: 20 }
            }
          >
            <DieIcon size={36} />
          </motion.div>
        </motion.button>

        {/* The result */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {showResult && result ? (
              <motion.div
                key={result}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                <p className="font-serif text-base sm:text-lg text-ink-800 leading-relaxed italic">
                  {result}
                </p>
                <button
                  onClick={handleRollAgain}
                  className="mt-3 text-[11px] font-mono uppercase tracking-[0.14em] text-ink-400 hover:text-ink-600 border-b border-ink-300 hover:border-ink-600 transition-colors duration-300 pb-0.5"
                >
                  Roll again
                </button>
              </motion.div>
            ) : isRolling ? (
              <motion.div
                key="rolling"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <motion.span
                  className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-400"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  Rolling...
                </motion.span>
              </motion.div>
            ) : (
              <motion.div
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <span className="eyebrow text-ink-400">Tap the die</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
