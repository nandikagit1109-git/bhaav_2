import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, useScroll, useMotionValueEvent, useReducedMotion, AnimatePresence } from 'framer-motion';
import { SectionMark } from '../motion/primitives';

const EASE = [0.22, 1, 0.36, 1];

/* ── Caption thresholds (progress 0–1) ───────────────────────── */
const CAPTIONS = [
  { start: 0.0, end: 0.25, text: 'Writing normally — no mood ratings, no prompts' },
  { start: 0.25, end: 0.50, text: 'Bhaav reads pauses, corrections, and rhythm' },
  { start: 0.50, end: 0.75, text: 'Compared only to this person\'s own baseline' },
  { start: 0.75, end: 1.00, text: 'One honest observation, once a week' },
];

function getCaption(progress) {
  for (const c of CAPTIONS) {
    if (progress >= c.start && progress < c.end) return c.text;
  }
  return CAPTIONS[CAPTIONS.length - 1].text;
}

/* ── Loading timeout (5 seconds) ─────────────────────────────── */
const LOAD_TIMEOUT_MS = 5000;

/**
 * ScrollScrubVideo — video playback controlled by scroll position.
 *
 * States:
 *   LOADING  — metadata loading, brief spinner (max 5s)
 *   ERROR    — video failed or timed out, poster + calm fallback
 *   READY    — scroll-scrubbing works
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

  /* ── State machine ─────────────────────────────────────────── */
  const [phase, setPhase] = useState('loading'); // 'loading' | 'error' | 'ready'
  const [errorMessage, setErrorMessage] = useState('');
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [autoPlayMode, setAutoPlayMode] = useState(false);
  const autoPlayRef = useRef(false);

  /* ── Log video src on mount for debugging ──────────────────── */
  useEffect(() => {
    console.log('[Bhaav ScrollScrubVideo] Video src:', src, '| Poster:', poster || '(none)');
  }, [src, poster]);

  /* ── Loading timeout ───────────────────────────────────────── */
  useEffect(() => {
    if (phase !== 'loading') return;
    const timer = setTimeout(() => {
      if (phase === 'loading') {
        console.warn('[Bhaav ScrollScrubVideo] Metadata load timed out after 5s — src:', src);
        setPhase('error');
        setErrorMessage('Video is taking a while to load. Try the play button or scroll down.');
      }
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [phase, src]);

  /* ── Scroll tracking ───────────────────────────────────────── */
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  /* ── Scrub video on every scroll tick ──────────────────────── */
  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    setProgress(latest);
    if (reduced || autoPlayRef.current) return;
    if (!videoRef.current || phase !== 'ready' || !duration) return;
    const target = latest * duration;
    if (Math.abs(videoRef.current.currentTime - target) > 0.08) {
      videoRef.current.currentTime = target;
    }
  });

  /* ── Video metadata loaded ─────────────────────────────────── */
  const handleLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (v) {
      setDuration(v.duration);
      setPhase('ready');
      v.pause();
    }
  }, []);

  /* ── Video error handler ───────────────────────────────────── */
  const handleVideoError = useCallback((e) => {
    const v = videoRef.current;
    const error = v?.error;
    let reason = 'Unknown error';
    if (error) {
      switch (error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          reason = 'Video loading was aborted';
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          reason = 'Network error — video file may be missing or unreachable';
          break;
        case MediaError.MEDIA_ERR_DECODE:
          reason = 'Video format error — browser cannot decode this file';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          reason = 'Video source not supported or file not found (404)';
          break;
        default:
          reason = `Error code: ${error.code}`;
      }
    }
    console.error('[Bhaav ScrollScrubVideo] Video failed to load:', reason, e);
    setErrorMessage('Demo video unavailable. The file may not be recorded yet.');
    setPhase('error');
  }, []);

  /* ── Auto-play fallback ────────────────────────────────────── */
  const toggleAutoPlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;

    if (autoPlayMode) {
      // Switch back to scroll-scrub mode
      autoPlayRef.current = false;
      setAutoPlayMode(false);
      v.pause();
    } else {
      // Switch to auto-play mode
      autoPlayRef.current = true;
      setAutoPlayMode(true);
      v.currentTime = 0;
      v.play().catch(() => {
        // Autoplay blocked — stay in scrub mode
        autoPlayRef.current = false;
        setAutoPlayMode(false);
      });
    }
  }, [autoPlayMode]);

  /* ── When video ends in auto-play mode, return to scrub ────── */
  const handleVideoEnded = useCallback(() => {
    if (autoPlayRef.current) {
      autoPlayRef.current = false;
      setAutoPlayMode(false);
    }
  }, []);

  /* ── Current caption text ──────────────────────────────────── */
  const currentCaption = getCaption(progress);

  /* ── Reduced motion: show poster + play button only ────────── */
  if (reduced) {
    return (
      <section ref={sectionRef} className="relative">
        <div className="sticky top-0 min-h-screen flex items-center justify-center py-24">
          <div className="w-full max-w-6xl mx-auto px-5 sm:px-8">
            <SectionMark index={mark} label={label} />
            <div className="mt-12 relative rounded-xl overflow-hidden bg-ink-100 border border-stone-border/60 shadow-lg">
              <div className="relative aspect-video bg-ink-100">
                {poster ? (
                  <img src={poster} alt="Demo video preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-ink-100">
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-400">
                      Demo video coming soon
                    </p>
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    onClick={toggleAutoPlay}
                    className="w-16 h-16 rounded-full bg-ink-900/80 text-paper-50 flex items-center justify-center
                      hover:bg-ink-900 transition-colors duration-300"
                    aria-label="Play demo video"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            {caption && (
              <p className="eyebrow text-ink-400 mt-5 text-center">{caption}</p>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{ height: `${sectionH}vh` }}
    >
      {/* Sticky viewport — stays pinned while user scrolls through */}
      <div className="sticky top-0 min-h-screen flex items-center justify-center py-24">
        <div className="w-full max-w-6xl mx-auto px-5 sm:px-8">
          <SectionMark index={mark} label={label} />

          <div className="mt-12 relative rounded-xl overflow-hidden bg-ink-100 border border-stone-border/60 shadow-lg">
            {/* ── LOADING STATE ─────────────────────────────── */}
            {phase === 'loading' && (
              <div className="aspect-video flex items-center justify-center bg-ink-100">
                {poster && (
                  <img
                    src={poster}
                    alt="Demo video preview"
                    className="absolute inset-0 w-full h-full object-cover opacity-40"
                  />
                )}
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-ink-300 border-t-ink-700 rounded-full animate-spin" />
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400">
                    Loading…
                  </p>
                </div>
              </div>
            )}

            {/* ── ERROR STATE ───────────────────────────────── */}
            {phase === 'error' && (
              <div className="aspect-video flex items-center justify-center bg-ink-100">
                {poster ? (
                  <img
                    src={poster}
                    alt="Demo video preview"
                    className="absolute inset-0 w-full h-full object-cover opacity-30"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-ink-100 to-ink-200" />
                )}
                <div className="relative z-10 flex flex-col items-center gap-4 text-center px-8">
                  <div className="w-12 h-12 rounded-full bg-ink-200/60 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-500">
                      <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
                    </svg>
                  </div>
                  <p className="font-serif text-lg text-ink-700">
                    Demo video coming soon
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400 max-w-xs">
                    We're recording a walkthrough of a Bhaav writing session.
                    The scroll-scrub demo will appear here once it's ready.
                  </p>
                </div>
              </div>
            )}

            {/* ── READY STATE ───────────────────────────────── */}
            {phase === 'ready' && (
              <>
                <video
                  ref={videoRef}
                  src={src}
                  poster={poster}
                  muted
                  playsInline
                  preload="auto"
                  onLoadedMetadata={handleLoadedMetadata}
                  onError={handleVideoError}
                  onEnded={handleVideoEnded}
                  className="w-full aspect-video object-cover"
                  aria-label="Interactive demo video — scroll to scrub through the recording"
                />

                {/* Scrub progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink-200/40">
                  <motion.div
                    className="h-full bg-accent-terracotta origin-left"
                    style={{ scaleX: progress }}
                  />
                </div>

                {/* Time indicator */}
                {duration > 0 && (
                  <div className="absolute top-4 right-4 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400/70 bg-paper-50/80 backdrop-blur-sm px-2 py-1 rounded">
                    {Math.round(progress * duration * 10) / 10}s / {Math.round(duration)}s
                  </div>
                )}

                {/* Synced caption */}
                <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={currentCaption}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.4, ease: EASE }}
                      className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.14em] text-ink-50/90 bg-ink-900/60 backdrop-blur-sm px-4 py-2 rounded-full"
                    >
                      {currentCaption}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </>
            )}

            {/* ── PLAY BUTTON (always visible when not playing) ── */}
            {phase === 'ready' && !autoPlayMode && (
              <button
                onClick={toggleAutoPlay}
                className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5
                  bg-ink-900/70 text-paper-50 rounded-full
                  hover:bg-ink-900/90 transition-colors duration-300
                  font-mono text-[10px] uppercase tracking-[0.14em]"
                aria-label="Play demo video instead of scroll scrubbing"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Just play it
              </button>
            )}

            {/* ── PAUSE BUTTON (visible during auto-play) ────── */}
            {phase === 'ready' && autoPlayMode && (
              <button
                onClick={toggleAutoPlay}
                className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5
                  bg-ink-900/70 text-paper-50 rounded-full
                  hover:bg-ink-900/90 transition-colors duration-300
                  font-mono text-[10px] uppercase tracking-[0.14em]"
                aria-label="Pause demo video and return to scroll scrubbing"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                Pause
              </button>
            )}

            {/* Scroll hint */}
            {phase === 'ready' && !autoPlayMode && progress < 0.05 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute bottom-14 left-0 right-0 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-ink-400 pointer-events-none"
              >
                Scroll to scrub through the demo ↓
              </motion.p>
            )}
          </div>

          {caption && (
            <p className="eyebrow text-ink-400 mt-5 text-center">{caption}</p>
          )}
        </div>
      </div>
    </section>
  );
}
