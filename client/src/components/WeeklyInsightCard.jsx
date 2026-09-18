import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from 'framer-motion';
import { submitInsightFeedback } from '../api/client';
import { FadeUp } from '../motion/primitives';
import InsightActivity from './InsightActivity';
import WeatherFeedback from './WeatherFeedback';
import RollKindness from './RollKindness';

/**
 * WalkTheDot — interactive drag feedback replacing three buttons.
 * A horizontal ink line with three implied zones. The user drags (or taps)
 * a dot to choose their answer. The dot snaps to the nearest zone with
 * a soft spring, then a warm confirmation fades in.
 */

const ZONES = [
  { id: 'not_really', label: 'Not really', x: 40, color: '#B45A3C' },
  { id: 'not_sure', label: 'Not sure', x: 140, color: '#77715F' },
  { id: 'a_little', label: 'A little', x: 240, color: '#5A7A62' },
];

const CONFIRMATIONS = {
  a_little: 'Noted \u2014 small shifts count. We\u2019ll build on this next week.',
  not_really: 'Noted \u2014 we\u2019ll try something different next week.',
  not_sure: 'That\u2019s okay too. We\u2019ll keep watching the pattern either way.',
};

const DOT_R = 8;
const LINE_Y = 50;
const SVG_W = 280;
const SVG_H = 100;

function nearestZone(x) {
  let best = ZONES[0];
  let bestDist = Math.abs(x - ZONES[0].x);
  for (const z of ZONES) {
    const d = Math.abs(x - z.x);
    if (d < bestDist) { best = z; bestDist = d; }
  }
  return best;
}

function WalkTheDot({ feedbackId, existingFeedback, onSubmit }) {
  const reduced = useReducedMotion();
  const dotX = useMotionValue(ZONES[1].x);
  const [chosen, setChosen] = useState(existingFeedback || null);
  const [confirmText, setConfirmText] = useState(existingFeedback ? CONFIRMATIONS[existingFeedback] : '');
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const svgRef = useRef(null);
  const trailRef = useRef([]);

  useEffect(() => {
    if (existingFeedback) {
      const zone = ZONES.find(z => z.id === existingFeedback);
      if (zone) {
        dotX.set(zone.x);
        setConfirmText(CONFIRMATIONS[existingFeedback]);
      }
    }
  }, [existingFeedback, dotX]);

  const trailPath = useTransform(dotX, (x) => {
    trailRef.current.push(x);
    if (trailRef.current.length > 20) trailRef.current = trailRef.current.slice(-20);
    if (trailRef.current.length < 2) return '';
    const pts = trailRef.current;
    let d = `M ${pts[0]} ${LINE_Y}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${pts[i]} ${LINE_Y}`;
    }
    return d;
  });

  const dotColor = useTransform(dotX, (x) => nearestZone(x).color);
  const dotScale = useMotionValue(1);

  const handlePointerDown = useCallback((e) => {
    if (chosen || isSubmitting) return;
    e.preventDefault();
    setIsDragging(true);
    trailRef.current = [dotX.get()];
    dotScale.set(1.15);
  }, [chosen, isSubmitting, dotX, dotScale]);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(DOT_R, Math.min(SVG_W - DOT_R, ((e.clientX - rect.left) / rect.width) * SVG_W));
    dotX.set(x);
  }, [isDragging, dotX]);

  const handlePointerUp = useCallback(async () => {
    if (!isDragging) return;
    setIsDragging(false);
    dotScale.set(1);

    const currentX = dotX.get();
    const zone = nearestZone(currentX);

    animate(dotX, zone.x, {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    });

    if (!chosen && feedbackId) {
      setIsSubmitting(true);
      try {
        await submitInsightFeedback(zone.id, feedbackId);
        setChosen(zone.id);
        setConfirmText(CONFIRMATIONS[zone.id]);
        if (onSubmit) onSubmit(zone.id);
      } catch (err) {
        console.error('Failed to submit feedback:', err);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [isDragging, dotX, chosen, feedbackId, onSubmit, dotScale]);

  useEffect(() => {
    if (!isDragging) return;
    const up = () => handlePointerUp();
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [isDragging, handlePointerUp]);

  const handleZoneTap = useCallback(async (zone) => {
    if (chosen || isSubmitting) return;

    animate(dotX, zone.x, {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    });

    if (feedbackId) {
      setIsSubmitting(true);
      try {
        await submitInsightFeedback(zone.id, feedbackId);
        setChosen(zone.id);
        setConfirmText(CONFIRMATIONS[zone.id]);
        if (onSubmit) onSubmit(zone.id);
      } catch (err) {
        console.error('Failed to submit feedback:', err);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [chosen, isSubmitting, dotX, feedbackId, onSubmit]);

  if (reduced) {
    return (
      <div className="mt-6">
        <div className="flex flex-wrap items-center gap-6">
          {ZONES.map((z) => (
            <button
              key={z.id}
              onClick={() => handleZoneTap(z)}
              disabled={!!chosen || isSubmitting}
              className={`font-mono text-[11px] uppercase tracking-[0.16em] pb-1 border-b transition-colors duration-300 ${
                chosen === z.id
                  ? 'text-ink-950 border-accent-terracotta'
                  : 'text-ink-500 border-ink-900/20 hover:text-ink-950 hover:border-ink-950'
              }`}
            >
              {z.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="relative select-none" style={{ touchAction: 'none' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full max-w-[280px] h-[100px] cursor-pointer"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          aria-label="Drag the dot to choose your answer: Not really, Not sure, or A little"
          role="slider"
          aria-valuemin={0}
          aria-valuemax={2}
          aria-valuenow={ZONES.findIndex(z => z.id === (chosen || 'not_sure'))}
          tabIndex={0}
          onKeyDown={(e) => {
            if (chosen) return;
            const idx = ZONES.findIndex(z => z.id === (chosen || 'not_sure'));
            if (e.key === 'ArrowRight' && idx < 2) handleZoneTap(ZONES[idx + 1]);
            if (e.key === 'ArrowLeft' && idx > 0) handleZoneTap(ZONES[idx - 1]);
          }}
        >
          {/* Base ink line */}
          <line
            x1={DOT_R}
            y1={LINE_Y}
            x2={SVG_W - DOT_R}
            y2={LINE_Y}
            stroke="#E2DBCB"
            strokeWidth={1.5}
            strokeLinecap="round"
          />

          {/* Zone tick marks */}
          {ZONES.map((z) => (
            <g key={z.id}>
              <line
                x1={z.x}
                y1={LINE_Y - 12}
                x2={z.x}
                y2={LINE_Y + 12}
                stroke={chosen === z.id ? z.color : '#D6CFC0'}
                strokeWidth={1}
                strokeLinecap="round"
              />
              <text
                x={z.x}
                y={LINE_Y + 28}
                textAnchor="middle"
                fontFamily="JetBrains Mono, monospace"
                fontSize="9"
                letterSpacing="0.08em"
                fill={chosen === z.id ? z.color : '#948D79'}
              >
                {z.label.toUpperCase()}
              </text>
            </g>
          ))}

          {/* Trailing stroke */}
          {!chosen && (
            <motion.path
              d={trailPath}
              stroke="#2B3A67"
              strokeWidth={1.4}
              strokeLinecap="round"
              fill="none"
              style={{ opacity: isDragging ? 0.6 : 0 }}
              transition={{ opacity: { duration: 0.3 } }}
            />
          )}

          {/* The draggable dot */}
          <motion.circle
            cx={dotX}
            cy={LINE_Y}
            r={DOT_R}
            fill={dotColor}
            stroke="#FBF9F4"
            strokeWidth={2}
            style={{ scale: dotScale, cursor: chosen ? 'default' : 'grab' }}
            whileHover={!chosen ? { scale: 1.1 } : {}}
          />

          {/* Inner glow when dragging */}
          {!chosen && isDragging && (
            <motion.circle
              cx={dotX}
              cy={LINE_Y}
              r={DOT_R + 4}
              fill="none"
              stroke={dotColor}
              strokeWidth={1}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: [0.5, 0.2, 0.5] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          )}
        </svg>
      </div>

      {/* Confirmation line */}
      {confirmText && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4 flex items-center gap-2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent-sage flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-ink-600 font-serif italic leading-relaxed">
            {confirmText}
          </p>
        </motion.div>
      )}

      {/* Hint before answering */}
      {!chosen && !isDragging && (
        <p className="eyebrow mt-3 text-ink-400">
          Drag the dot or tap a zone
        </p>
      )}
    </div>
  );
}

/* ————————————————— TAB SELECTOR ————————————————— */

const FEEDBACK_TABS = [
  { id: 'dot', label: 'Walk the dot' },
  { id: 'weather', label: 'Weather' },
  { id: 'roll', label: 'Roll a kindness' },
];

function FeedbackTabBar({ active, onChange }) {
  return (
    <div className="flex items-center gap-1 mt-6">
      {FEEDBACK_TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative font-mono text-[10px] uppercase tracking-[0.14em] px-3 py-1.5 rounded-md transition-colors duration-300 ${
            active === tab.id
              ? 'text-ink-950 bg-ink-100/60'
              : 'text-ink-400 hover:text-ink-600'
          }`}
          aria-pressed={active === tab.id}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/* ————————————————— PARENT CARD ————————————————— */

export default function WeeklyInsightCard({ insight, onFeedbackUpdated }) {
  const [feedbackStatus, setFeedbackStatus] = useState(insight?.feedback_status || null);
  const [activeTab, setActiveTab] = useState('dot');

  const handleSubmit = (status) => {
    setFeedbackStatus(status);
    if (onFeedbackUpdated) onFeedbackUpdated(status);
  };

  if (!insight) return null;

  return (
    <FadeUp>
      <div className="gradient-card-coral glow-coral rounded-xl p-6">
        <div className="flex items-baseline justify-between gap-4">
          <span className="eyebrow text-accent-coral">This week</span>
          <span className="eyebrow text-ink-400">
            {insight.source === 'fallback' ? 'deterministic fallback' : 'observation'}
          </span>
        </div>

        <blockquote className="font-serif italic text-xl sm:text-2xl text-ink-800 leading-relaxed mt-5 max-w-2xl">
          &ldquo;{insight.observation}&rdquo;
        </blockquote>

        {/* Interactive micro-activity (replaces static suggestion text) */}
        <InsightActivity
          insight={insight}
          onActivityComplete={() => {/* activity done, feedback still available below */}}
        />

        {/* The feedback moment — with tab toggle */}
        <div className="mt-12 pt-8 border-t border-stone-border">
          <h4 className="text-display-sub font-serif text-ink-950">
            Did that make<br />a difference?
          </h4>

          {/* Tab selector to switch between feedback modes */}
          <FeedbackTabBar active={activeTab} onChange={setActiveTab} />

          {/* Walk the dot (original) */}
          {activeTab === 'dot' && (
            <WalkTheDot
              feedbackId={insight.id}
              existingFeedback={feedbackStatus}
              onSubmit={handleSubmit}
            />
          )}

          {/* Weather feedback (new) */}
          {activeTab === 'weather' && (
            <WeatherFeedback
              feedbackId={insight.id}
              existingFeedback={feedbackStatus}
              onSubmit={handleSubmit}
            />
          )}

          {/* Roll a kindness (new) — no backend feedback, just a playful moment */}
          {activeTab === 'roll' && (
            <RollKindness />
          )}
        </div>
      </div>
    </FadeUp>
  );
}
