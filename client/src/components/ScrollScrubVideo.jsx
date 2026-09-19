import React, { useRef, useState, useCallback } from 'react';
import { motion, useScroll, useMotionValueEvent, useReducedMotion } from 'framer-motion';
import { SectionMark } from '../motion/primitives';

/**
 * ScrollScrubVideo — video playback controlled entirely by scroll position.
 *
 * As the user scrolls through the section, video.currentTime maps linearly
 * from 0 (top of section) to duration (bottom). The video never auto-plays;
 * scrolling IS the interaction.
 *
 * Props:
 *   src       — path to the video file (mp4)
 *   poster    — poster image path (shown before metadata loads / on reduced motion)
 *   sectionH  — total section height in vh (controls scrub length). Default 250vh.
 *   mark      — SectionMark label, e.g. "01" or "See it"
 *   label     — SectionMark label text
 *   caption   — optional small text below the video
 */
export default function ScrollScrubVideo({
  src,
  poster,
  sectionH = 250,
  mark = '02',
  label = 'See it in action',
  caption,
}) {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const reduced = useReducedMotion();

  const [metaLoaded, setMetaLoaded] = useState(false);
  const [duration, setDuration] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);

  /* ── Scroll tracking ───────────────────────────────────────── */
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  /* ── Scrub video on every scroll tick ──────────────────────── */
  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    if (reduced || !videoRef.current || !metaLoaded || !duration) return;
    const target = latest * duration;
    // Only update if meaningfully different (> 2 frames worth) to avoid thrash
    if (Math.abs(videoRef.current.currentTime - target) > 0.08) {
      videoRef.current.currentTime = target;
      setScrubbing(true);
    }
  });

  /* ── Video metadata ────────────────────────────────────────── */
  const handleLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (v) {
      setDuration(v.duration);
      setMetaLoaded(true);
      v.pause();
    }
  }, []);

  /* ── Progress bar width from scroll ────────────────────────── */
  const [progress, setProgress] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    setProgress(latest);
  });

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{ height: reduced ? 'auto' : `${sectionH}vh` }}
    >
      {/* Sticky viewport — stays pinned while user scrolls through */}
      <div
        className={
          reduced
            ? ''
            : 'sticky top-0 min-h-screen flex items-center justify-center py-24'
        }
      >
        <div className="w-full max-w-6xl mx-auto px-5 sm:px-8">
          <SectionMark index={mark} label={label} />

          <div className="mt-12 relative rounded-xl overflow-hidden bg-ink-100 border border-stone-border/60 shadow-lg">
            {/* Video element — never auto-plays, only scrubbed by scroll */}
            <video
              ref={videoRef}
              src={src}
              poster={poster}
              muted
              playsInline
              preload="auto"
              onLoadedMetadata={handleLoadedMetadata}
              className="w-full aspect-video object-cover"
              aria-label="Interactive demo video — scroll to scrub through the recording"
            />

            {/* Scrub progress bar — thin ink line at the bottom */}
            {!reduced && metaLoaded && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink-200/40">
                <motion.div
                  className="h-full bg-accent-terracotta origin-left"
                  style={{ scaleX: progress }}
                />
              </div>
            )}

            {/* Subtle frame indicator */}
            {!reduced && metaLoaded && scrubbing && (
              <div className="absolute top-4 right-4 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400/70 bg-paper-50/80 backdrop-blur-sm px-2 py-1 rounded">
                {Math.round(progress * duration * 10) / 10}s / {Math.round(duration)}s
              </div>
            )}

            {/* Reduced-motion fallback: static poster with play hint */}
            {reduced && (
              <div className="absolute inset-0 flex items-center justify-center bg-ink-900/20">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-50">
                  Demo video
                </p>
              </div>
            )}

            {/* Before metadata loads */}
            {!metaLoaded && !reduced && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400 animate-pulse">
                  Loading…
                </div>
              </div>
            )}
          </div>

          {caption && (
            <p className="eyebrow text-ink-400 mt-5 text-center">{caption}</p>
          )}

          {/* Scroll hint */}
          {!reduced && metaLoaded && progress < 0.05 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mt-6 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-400"
            >
              Scroll to scrub through the demo ↓
            </motion.p>
          )}
        </div>
      </div>
    </section>
  );
}
