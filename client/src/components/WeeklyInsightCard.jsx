import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { submitInsightFeedback } from '../api/client';
import { FadeUp, InkPath } from '../motion/primitives';

const FEEDBACK_OPTIONS = [
  { id: 'a_little', label: 'A little' },
  { id: 'not_really', label: 'Not really' },
  { id: 'not_sure', label: 'Not sure' },
];

/* The ink line reacts to which option you hover: settles, stays unsettled, or stays neutral. */
const HOVER_STROKES = {
  a_little: { stroke: '#5A7A62', d: 'M6 60 C 100 56, 220 60, 340 58 S 520 58, 594 58' },
  not_really: { stroke: '#B45A3C', d: 'M6 60 C 90 48, 170 74, 260 52 S 430 70, 594 40' },
  not_sure: { stroke: '#77715F', d: 'M6 58 C 110 62, 210 54, 320 62 S 510 56, 594 60' },
};

export default function WeeklyInsightCard({ insight, onFeedbackUpdated }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState(insight?.feedback_status || null);
  const [hovered, setHovered] = useState(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  const handleFeedback = async (status) => {
    if (!insight?.id) return;
    setIsSubmitting(true);
    try {
      await submitInsightFeedback(status, insight.id);
      setCurrentFeedback(status);
      setFeedbackSuccess(true);
      if (onFeedbackUpdated) onFeedbackUpdated(status);
      setTimeout(() => setFeedbackSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to submit reflection feedback:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!insight) return null;

  const line = hovered ? HOVER_STROKES[hovered] : null;

  return (
    <FadeUp>
      <div>
        <div className="flex items-baseline justify-between gap-4">
          <span className="eyebrow text-accent-pop">This week</span>
          <span className="eyebrow text-ink-400">
            {insight.source === 'fallback' ? 'deterministic fallback' : 'observation'}
          </span>
        </div>

        <blockquote className="font-serif italic text-xl sm:text-2xl text-ink-800 leading-relaxed mt-5 max-w-2xl">
          &ldquo;{insight.observation}&rdquo;
        </blockquote>

        <div className="mt-8 max-w-2xl">
          <span className="eyebrow text-ink-400">Try this</span>
          <p className="text-sm sm:text-base text-ink-700 leading-relaxed mt-2">
            {insight.suggestion}
          </p>
        </div>

        {/* ——— The feedback moment ——— */}
        <div className="mt-12 pt-8 border-t border-stone-border">
          <h4 className="text-display-sub font-serif text-ink-950">
            Did that make<br />a difference?
          </h4>

          <div className="mt-6 flex flex-wrap items-center gap-6">
            {FEEDBACK_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleFeedback(opt.id)}
                onMouseEnter={() => setHovered(opt.id)}
                onMouseLeave={() => setHovered(null)}
                disabled={isSubmitting}
                className={`font-mono text-[11px] uppercase tracking-[0.16em] pb-1 border-b transition-colors duration-300 ${
                  currentFeedback === opt.id
                    ? 'text-ink-950 border-accent-terracotta'
                    : 'text-ink-500 border-ink-900/20 hover:text-ink-950 hover:border-ink-950'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* The line listens */}
          <div className="mt-4 h-8 max-w-md">
            <InkPath
              key={hovered || 'idle'}
              d={line ? line.d : 'M6 60 C 100 58, 220 62, 340 58 S 520 60, 594 58'}
              stroke={line ? line.stroke : '#B5AD99'}
              width={1.4}
              duration={0.9}
              className="w-full h-8"
              opacity={0.9}
            />
          </div>

          {feedbackSuccess && (
            <div className="mt-2 flex items-center gap-2 text-xs text-accent-sage font-mono">
              <Check className="w-3.5 h-3.5" />
              <span>Noted. This calibrates next week&rsquo;s observation.</span>
            </div>
          )}
          {!feedbackSuccess && (
            <p className="eyebrow mt-2 text-ink-400">
              Your reflection teaches the loop — not a profile.
            </p>
          )}
        </div>
      </div>
    </FadeUp>
  );
}
