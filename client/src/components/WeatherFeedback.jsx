import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { submitInsightFeedback } from '../api/client';

/* ═══════════════════════════════════════════════════════════════════
   WeatherFeedback — subjective weekly mood as line-drawn weather.
   
   4 ink-stroke icons: calm (flat), breezy (wave), shifting (bump),
   stormy (zigzag). Tapping one stores the choice via the same
   backend feedback endpoint as WalkTheDot.
   
   Rules: no scoring, no correct answer, no comparison to deviation.
   ═══════════════════════════════════════════════════════════════════ */

const WEATHER_OPTIONS = [
  {
    id: 'a_little', // maps to existing feedback value
    label: 'Calm',
    // Flat, steady ink line — like a still pond
    icon: (
      <svg viewBox="0 0 48 24" className="w-12 h-6" fill="none" aria-hidden="true">
        <path
          d="M4 14 C 12 14, 20 14, 24 14 S 36 14, 44 14"
          stroke="#2B3A67"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
    response: 'Calm weeks count too. Noted.',
  },
  {
    id: 'not_sure', // maps to existing feedback value
    label: 'Breezy',
    // Gentle wave — light movement
    icon: (
      <svg viewBox="0 0 48 24" className="w-12 h-6" fill="none" aria-hidden="true">
        <path
          d="M4 14 C 10 10, 14 10, 18 14 S 26 18, 32 14 S 40 10, 44 14"
          stroke="#2B3A67"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
    response: 'Breezy weeks pass too. Noted.',
  },
  {
    id: 'not_really', // maps to existing feedback value
    label: 'Shifting',
    // Wave with one pronounced bump — unsettled
    icon: (
      <svg viewBox="0 0 48 24" className="w-12 h-6" fill="none" aria-hidden="true">
        <path
          d="M4 16 C 10 16, 14 16, 18 8 C 22 2, 26 2, 30 10 C 34 16, 38 16, 44 16"
          stroke="#2B3A67"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
    response: 'Shifting weeks are still weeks worth naming. Noted.',
  },
  {
    id: 'not_really', // maps to existing feedback value (stormy → same bucket)
    label: 'Stormy',
    // Sharper zigzag — more turbulent
    icon: (
      <svg viewBox="0 0 48 24" className="w-12 h-6" fill="none" aria-hidden="true">
        <path
          d="M4 16 L 10 8 L 16 16 L 22 6 L 28 16 L 34 8 L 40 14 L 44 10"
          stroke="#2B3A67"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    response: 'Stormy weeks pass too. Noted.',
  },
];

// Map weather IDs to actual feedback values for the backend
const WEATHER_FEEDBACK_MAP = {
  calm: 'a_little',
  breezy: 'not_sure',
  shifting: 'not_really',
  stormy: 'not_really',
};

const EASE = [0.22, 1, 0.36, 1];

export default function WeatherFeedback({ feedbackId, existingFeedback, onSubmit }) {
  const reduced = useReducedMotion();
  const [chosen, setChosen] = useState(existingFeedback || null);
  const [chosenWeather, setChosenWeather] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelect = async (option) => {
    if (chosen || isSubmitting) return;

    const feedbackValue = WEATHER_FEEDBACK_MAP[option.id] || 'not_sure';

    setIsSubmitting(true);
    try {
      if (feedbackId) {
        await submitInsightFeedback(feedbackValue, feedbackId);
      }
      setChosen(feedbackValue);
      setChosenWeather(option);
      setConfirmText(option.response);
      if (onSubmit) onSubmit(feedbackValue);
    } catch (err) {
      console.error('Failed to submit weather feedback:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // If already answered, show the chosen weather with confirmation
  if (chosen && chosenWeather) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="mt-6"
      >
        <div className="flex items-center gap-4">
          <span className="text-ink-500">{chosenWeather.icon}</span>
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400">
              {chosenWeather.label}
            </span>
            <p className="text-sm text-ink-600 font-serif italic leading-relaxed mt-1">
              {confirmText}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="mt-6">
      <p className="text-sm text-ink-600 leading-relaxed mb-4">
        What feels closest to how this week went?
      </p>

      <div className="flex gap-4 sm:gap-6">
        {WEATHER_OPTIONS.map((opt, i) => (
          <motion.button
            key={`${opt.label}-${i}`}
            onClick={() => handleSelect(opt)}
            disabled={isSubmitting}
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.5, ease: EASE }}
            className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-lg border border-stone-border hover:border-ink-300 hover:bg-ink-50/50 transition-all duration-300 group focus:outline-none focus:ring-1 focus:ring-ink-300"
            aria-label={`Select ${opt.label} weather`}
          >
            <span className="text-ink-500 group-hover:text-ink-950 transition-colors duration-300">
              {opt.icon}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-ink-400 group-hover:text-ink-600 transition-colors duration-300">
              {opt.label}
            </span>
          </motion.button>
        ))}
      </div>

      {!chosen && (
        <p className="eyebrow mt-3 text-ink-400">
          Tap the one that fits
        </p>
      )}
    </div>
  );
}
