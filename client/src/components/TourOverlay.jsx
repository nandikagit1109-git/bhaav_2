import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion, animate } from 'framer-motion';
import { EASE } from '../motion/primitives';

/**
 * Tour steps — each targets a nav link by `data-tour` attribute.
 */
const STEPS = [
  {
    target: 'journal',
    caption: 'Write normally here. No mood ratings.',
  },
  {
    target: 'dashboard',
    caption: 'See your personal pattern over time.',
  },
  {
    target: 'campus',
    caption: 'An anonymous signal, not a diagnosis.',
  },
  {
    target: 'privacy',
    caption: 'See exactly what\u2019s stored, and what never is.',
  },
];

/**
 * Spotlight radius: half the target width + padding.
 */
function spotRadius(rect) {
  return Math.max(rect.width, rect.height) / 2 + 18;
}

/**
 * TourOverlay — a guided spotlight tour.
 *
 * Uses a fixed full-screen overlay with `backdrop-filter: blur(6px)` and a
 * mask-image cutout that reveals the current target element sharply.
 * The spotlight animates smoothly between targets using Framer Motion.
 */
export default function TourOverlay({ active, onFinish }) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [showCaption, setShowCaption] = useState(false);
  const [spot, setSpot] = useState({ x: 0, y: 0, r: 80 });
  const [captionPos, setCaptionPos] = useState({ top: 0, left: 0, above: true });

  // Animated values for smooth spotlight transitions
  const spotX = useRef(0);
  const spotY = useRef(0);
  const spotR = useRef(80);
  const overlayRef = useRef(null);
  const captionTimeout = useRef(null);

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  /**
   * Calculate and set the spotlight position for a given step.
   */
  const computeSpot = useCallback((stepIndex, animateTransition = true) => {
    const target = STEPS[stepIndex];
    const el = document.querySelector(`[data-tour="${target.target}"]`);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const r = spotRadius(rect);

    // Position caption above or below based on available space
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const above = spaceAbove > 120 || spaceBelow < 100;
    const capY = above ? rect.top - 72 : rect.bottom + 16;
    const capX = Math.max(16, Math.min(cx - 120, window.innerWidth - 280));

    if (animateTransition && !reduced) {
      setShowCaption(false);
      // Animate the spotlight position
      const startX = spotX.current;
      const startY = spotY.current;
      const startR = spotR.current;

      const controls = animate(0, 1, {
        duration: 0.6,
        ease: EASE,
        onUpdate: (v) => {
          const x = startX + (cx - startX) * v;
          const y = startY + (cy - startY) * v;
          const radius = startR + (r - startR) * v;
          setSpot({ x, y, r: radius });
          spotX.current = x;
          spotY.current = y;
          spotR.current = radius;
        },
        onComplete: () => {
          setCaptionPos({ top: capY, left: capX, above });
          // Show caption after spotlight settles
          clearTimeout(captionTimeout.current);
          captionTimeout.current = setTimeout(() => setShowCaption(true), 120);
        },
      });
      return () => controls.stop();
    } else {
      // Instant snap (reduced motion or first step)
      setSpot({ x: cx, y: cy, r });
      spotX.current = cx;
      spotY.current = cy;
      spotR.current = r;
      setCaptionPos({ top: capY, left: capX, above });
      clearTimeout(captionTimeout.current);
      captionTimeout.current = setTimeout(() => setShowCaption(true), reduced ? 0 : 120);
    }
  }, [reduced]);

  // On mount or step change, compute spotlight
  useEffect(() => {
    if (!active) return;
    // Small delay to let the DOM settle after any navigation
    const timer = setTimeout(() => computeSpot(step, step !== 0), 80);
    return () => {
      clearTimeout(timer);
      clearTimeout(captionTimeout.current);
    };
  }, [active, step, computeSpot]);

  // Recalculate on window resize
  useEffect(() => {
    if (!active) return;
    const onResize = () => computeSpot(step, false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [active, step, computeSpot]);

  // Lock scroll while active
  useEffect(() => {
    if (active) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [active]);

  const goNext = () => {
    if (isLast) {
      onFinish();
    } else {
      setStep((s) => s + 1);
    }
  };

  const goPrev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  if (!active) return null;

  // Build the mask-image string
  const maskImage = `radial-gradient(circle at ${spot.x}px ${spot.y}px, transparent 0, transparent ${spot.r}px, black ${spot.r + 1.5}px)`;
  const webkitMaskImage = `-webkit-${maskImage}`;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          ref={overlayRef}
          className="fixed inset-0 z-[9999]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          aria-label="Guided tour"
          role="dialog"
        >
          {/* The blurred/tinted overlay with mask cutout */}
          <div
            className="absolute inset-0"
            style={{
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              background: 'rgba(28, 27, 22, 0.55)',
              maskImage,
              WebkitMaskImage: webkitMaskImage,
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
            }}
            aria-hidden="true"
          />

          {/* Spotlight ring — a thin border around the cutout */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              left: spot.x - spot.r,
              top: spot.y - spot.r,
              width: spot.r * 2,
              height: spot.r * 2,
              border: '1.5px solid rgba(255, 255, 255, 0.35)',
              boxShadow: '0 0 20px rgba(255, 255, 255, 0.08)',
            }}
            animate={{
              left: spot.x - spot.r,
              top: spot.y - spot.r,
              width: spot.r * 2,
              height: spot.r * 2,
            }}
            transition={{ duration: 0.6, ease: EASE }}
            aria-hidden="true"
          />

          {/* Caption box */}
          <AnimatePresence>
            {showCaption && (
              <motion.div
                className="absolute z-10 pointer-events-auto"
                style={{
                  top: captionPos.top,
                  left: captionPos.left,
                  maxWidth: 300,
                }}
                initial={{ opacity: 0, y: captionPos.above ? 8 : -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: captionPos.above ? 8 : -8 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                <div className="bg-paper-100/95 backdrop-blur-sm border border-stone-border/60 rounded-lg px-5 py-4 shadow-xl">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent-terracotta mb-2">
                    Step {step + 1} of {STEPS.length}
                  </p>
                  <p className="font-serif text-base text-ink-900 leading-relaxed">
                    {currentStep.caption}
                  </p>

                  {/* Controls */}
                  <div className="flex items-center gap-4 mt-4">
                    {step > 0 && (
                      <button
                        onClick={goPrev}
                        className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500 hover:text-ink-900 transition-colors"
                      >
                        Previous
                      </button>
                    )}
                    <button
                      onClick={goNext}
                      className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-950 border-b border-ink-950/70 pb-0.5 hover:border-accent-terracotta hover:text-accent-terracotta transition-colors duration-300"
                    >
                      {isLast ? 'Finish' : 'Next'}
                    </button>
                    <button
                      onClick={onFinish}
                      className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400 hover:text-ink-600 transition-colors ml-auto"
                    >
                      Skip tour
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
