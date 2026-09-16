import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════════════
   ACTIVITY 1 — Weather for your week
   A single row of 4 tappable weather icons (sun, partly cloudy,
   overcast, storm). Tapping one selects it as a mood-weather match.
   ═══════════════════════════════════════════════════════════════════ */

const WEATHER_OPTIONS = [
  {
    id: 'sun',
    label: 'Sunny',
    icon: (
      <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="16" cy="16" r="6" />
        <line x1="16" y1="4" x2="16" y2="8" />
        <line x1="16" y1="24" x2="16" y2="28" />
        <line x1="4" y1="16" x2="8" y2="16" />
        <line x1="24" y1="16" x2="28" y2="16" />
        <line x1="7.5" y1="7.5" x2="10.3" y2="10.3" />
        <line x1="21.7" y1="21.7" x2="24.5" y2="24.5" />
        <line x1="7.5" y1="24.5" x2="10.3" y2="21.7" />
        <line x1="21.7" y1="10.3" x2="24.5" y2="7.5" />
      </svg>
    ),
    response: "Sunny weeks pass, same as stormy ones — thanks for naming it.",
  },
  {
    id: 'partly',
    label: 'Partly cloudy',
    icon: (
      <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="3" x2="12" y2="6" />
        <line x1="4" y1="12" x2="7" y2="12" />
        <line x1="5.6" y1="5.6" x2="7.8" y2="7.8" />
        <line x1="5.6" y1="18.4" x2="7.8" y2="16.2" />
        <path d="M14 20a5 5 0 0 0 0-10 6 6 0 0 0-11.5 2.5A4 4 0 0 0 8 22h6a4 4 0 0 0 0-8" />
      </svg>
    ),
    response: "Mixed days are still days worth having.",
  },
  {
    id: 'overcast',
    label: 'Overcast',
    icon: (
      <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 22h14a5 5 0 0 0 0-10 6 6 0 0 0-11.5 2.5A4 4 0 0 0 10 22" />
        <path d="M6 16h20a4 4 0 0 0 0-8 5 5 0 0 0-9.5 2A3.5 3.5 0 0 0 9 14" />
      </svg>
    ),
    response: "Grey days have their own quiet rhythm. Noticing that counts.",
  },
  {
    id: 'storm',
    label: 'Stormy',
    icon: (
      <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 18h14a5 5 0 0 0 0-10 6 6 0 0 0-11.5 2.5A4 4 0 0 0 10 18" />
        <polyline points="12 20 10 26 14 22" />
        <polyline points="16 20 14 28 18 24" />
        <line x1="20" y1="20" x2="18" y2="24" />
      </svg>
    ),
    response: "Stormy weeks pass, same as sunny ones — thanks for naming it.",
  },
];

function WeatherForYourWeek({ onComplete }) {
  const [selected, setSelected] = useState(null);
  const reduced = useReducedMotion();

  const handleSelect = (option) => {
    if (selected) return;
    setSelected(option);
    // Show confirmation, then complete after a brief moment
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 2500);
  };

  return (
    <div className="mt-6">
      <AnimatePresence mode="wait">
        {!selected ? (
          <motion.div
            key="weather-grid"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: reduced ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-sm text-ink-600 leading-relaxed mb-4">
              What feels closest to this week?
            </p>
            <div className="flex gap-3 sm:gap-5">
              {WEATHER_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(opt)}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg border border-stone-border hover:border-ink-300 hover:bg-ink-50/50 transition-all duration-300 group"
                  aria-label={`Select ${opt.label}`}
                >
                  <span className="text-ink-600 group-hover:text-ink-950 transition-colors duration-300">
                    {opt.icon}
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-ink-400 group-hover:text-ink-600 transition-colors duration-300">
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="weather-response"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-start gap-3"
          >
            <span className="text-ink-500 mt-0.5 flex-shrink-0">{selected.icon}</span>
            <p className="text-sm text-ink-600 font-serif italic leading-relaxed">
              {selected.response}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ACTIVITY 2 — Five things (grounding technique)
   A simple guided sequence, one prompt at a time, advancing on tap.
   No typed input required — just a quick grounding pause.
   ═══════════════════════════════════════════════════════════════════ */

const GROUNDING_STEPS = [
  { prompt: "Name 5 things you can see right now", number: "5" },
  { prompt: "Name 3 things you can hear", number: "3" },
  { prompt: "Name 1 thing you're grateful for today", number: "1" },
];

const COMPLETE_MESSAGE = "That's the whole exercise. Nicely done.";

function FiveThings({ onComplete }) {
  const [step, setStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const reduced = useReducedMotion();

  const handleNext = () => {
    if (step < GROUNDING_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      setIsComplete(true);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 2500);
    }
  };

  return (
    <div className="mt-6">
      <AnimatePresence mode="wait">
        {!isComplete ? (
          <motion.div
            key={`step-${step}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: reduced ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-start gap-4"
          >
            <div className="flex items-baseline gap-3">
              <span className="font-serif text-4xl text-accent-terracotta font-light">
                {GROUNDING_STEPS[step].number}
              </span>
              <p className="text-sm sm:text-base text-ink-700 leading-relaxed max-w-xs">
                {GROUNDING_STEPS[step].prompt}
              </p>
            </div>
            <button
              onClick={handleNext}
              className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-500 hover:text-ink-950 border-b border-ink-300 hover:border-ink-950 transition-colors duration-300 pb-0.5"
            >
              {step < GROUNDING_STEPS.length - 1 ? 'Next →' : 'Done'}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-start gap-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent-sage flex-shrink-0 mt-2" aria-hidden="true" />
            <p className="text-sm text-ink-600 font-serif italic leading-relaxed">
              {COMPLETE_MESSAGE}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SELECTOR — which activity to show based on the suggestion pattern
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Patterns that relate to pause/interruption → show grounding (Activity 2):
 *   - meanPauseMs: "more interrupted than usual"
 *   - pauseStdDevMs: "pause length varied more"
 *
 * Patterns that relate to overall energy/session length → show weather (Activity 1):
 *   - typingSpeed: "typing pace sat farther"
 *   - correctionRate: "revised more than usual"
 *   - timingVariance: "rhythm was more variable"
 *   - CALM_COPY: "stayed close to usual"
 *   - fallback/unknown: default to weather
 */
function pickActivity(insight) {
  if (!insight) return 'weather';

  // Try to detect the pattern from the suggestion text
  const suggestion = (insight.suggestion || '').toLowerCase();
  const observation = (insight.observation || '').toLowerCase();

  // Check if the insight relates to pause/interruption patterns
  // Look for keywords that indicate pause-related suggestions
  const pauseKeywords = ['uninterrupted', 'protected window', 'without switching', 'interrupted', 'pause'];
  const hasPauseKeyword = pauseKeywords.some(kw => suggestion.includes(kw) || observation.includes(kw));

  if (hasPauseKeyword) {
    return 'grounding';
  }

  // Default: weather check-in
  return 'weather';
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN EXPORT — InsightActivity
   Replaces the static "Try this" suggestion text with an interactive
   micro-activity. Shows the activity, then reveals the feedback loop.
   ═══════════════════════════════════════════════════════════════════ */

export default function InsightActivity({ insight, onActivityComplete }) {
  const [isSkipped, setIsSkipped] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const activityType = pickActivity(insight);

  const handleComplete = () => {
    setIsCompleted(true);
    if (onActivityComplete) onActivityComplete();
  };

  const handleSkip = () => {
    setIsSkipped(true);
    if (onActivityComplete) onActivityComplete();
  };

  // If completed or skipped, don't show the activity
  if (isSkipped || isCompleted) {
    return null;
  }

  return (
    <div className="mt-8 max-w-2xl">
      <span className="eyebrow text-ink-400">Try this</span>

      {activityType === 'grounding' ? (
        <FiveThings onComplete={handleComplete} />
      ) : (
        <WeatherForYourWeek onComplete={handleComplete} />
      )}

      <button
        onClick={handleSkip}
        className="mt-4 text-[11px] font-mono uppercase tracking-[0.12em] text-ink-400 hover:text-ink-600 transition-colors duration-300"
      >
        Skip for now
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   EXPORTS for testing
   ═══════════════════════════════════════════════════════════════════ */
export { pickActivity, WeatherForYourWeek, FiveThings };
