import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Feather, ShieldCheck } from 'lucide-react';
import { useKeystrokeTelemetry } from '../hooks/useKeystrokeTelemetry';
import { submitSessionTelemetry } from '../api/client';
import InkLineCanvas from '../components/InkLineCanvas';
import SupportCard from '../components/SupportCard';
import TrustedContactModal from '../components/TrustedContactModal';
import { FadeUp, InkRule, EASE } from '../motion/primitives';

const FEATURES = [
  { key: 'typingSpeed', label: 'Speed', unit: 'wpm', z: 'zSpeed', format: (v) => `${Math.round(v)}` },
  { key: 'meanPauseMs', label: 'Mean pause', unit: 'ms', z: 'zPause', format: (v) => `${Math.round(v)}` },
  { key: 'correctionRate', label: 'Corrections', unit: '%', z: 'zCorrection', format: (v) => `${(v * 100).toFixed(1)}` },
  { key: 'timingVariance', label: 'Variability', unit: '', z: 'zVariance', format: (v) => v.toFixed(2) },
];

const fmtZ = (z) => {
  const n = Number(z);
  if (!Number.isFinite(n)) return '0.0';
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}σ`;
};

function resultHeadline(score) {
  if (score < 35) return { line1: 'Close to', line2: 'your usual.', note: 'Today\u2019s rhythm stayed inside your normal range.' };
  if (score < 60) return { line1: 'A little', line2: 'different.', note: 'Your writing rhythm moved somewhat farther from your usual pattern.' };
  return { line1: 'Quite', line2: 'different.', note: 'This session walked noticeably farther from your usual rhythm than recent ones.' };
}

export default function JournalPage({ onNavigateToDashboard }) {
  const [journalContent, setJournalContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [sessionResult, setSessionResult] = useState(null);
  const [isTrustedContactOpen, setIsTrustedContactOpen] = useState(false);
  const [showSupportCard, setShowSupportCard] = useState(false);
  const [isWritingActive, setIsWritingActive] = useState(false);

  const {
    currentSpeedWpm,
    lastPauseDurationMs,
    instantRhythmVariance,
    elapsedSeconds,
    totalKeystrokes,
    recordKeystroke,
    finishSession,
    resetSession
  } = useKeystrokeTelemetry();

  const textareaRef = useRef(null);

  const handleKeyDown = (e) => {
    if (!isWritingActive) setIsWritingActive(true);
    recordKeystroke(e);
  };

  const handleFinish = async () => {
    const telemetry = finishSession();
    if (!telemetry) {
      return;
    }
    setIsSubmitting(true);
    setSubmitError(false);
    try {
      const res = await submitSessionTelemetry(telemetry);
      setSessionResult(res);
      // Privacy purge: words exist only until this moment.
      setJournalContent('');
      setIsWritingActive(false);
      if (res.evaluation?.deviationScore >= 55) {
        setShowSupportCard(true);
      }
    } catch (err) {
      console.error('Session submission failed:', err);
      setSubmitError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForNewSession = () => {
    setSessionResult(null);
    setShowSupportCard(false);
    setSubmitError(false);
    setJournalContent('');
    resetSession();
    setIsWritingActive(false);
    setTimeout(() => textareaRef.current && textareaRef.current.focus(), 60);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  /* ————————————————————————— RESULT: NOTICE ————————————————————————— */
  if (sessionResult) {
    const ev = sessionResult.evaluation || {};
    const headline = resultHeadline(Number(ev.deviationScore ?? 0));
    const learning = ev.status === 'learning';

    return (
      <div className="max-w-3xl mx-auto pt-32 sm:pt-40 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <span className="eyebrow text-accent-terracotta">Notice</span>

          {learning ? (
            <>
              <h1 className="text-display-section font-serif text-ink-950 mt-6">
                We&rsquo;re still <span className="italic text-accent-pop">learning</span> you.
              </h1>
              <p className="text-sm text-ink-600 leading-relaxed mt-6 max-w-md">
                {ev.sessionsRecorded ?? 1} of {ev.sessionsRequired ?? 5} sessions recorded. A few
                more, and Bhaav can recognise your usual rhythm — until then it avoids
                overinterpreting.
              </p>
              <div className="mt-10 max-w-xs">
                <div className="h-px bg-stone-border relative overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-ink-900"
                    initial={{ width: 0 }}
                    animate={{ width: `${((ev.sessionsRecorded ?? 1) / (ev.sessionsRequired ?? 5)) * 100}%` }}
                    transition={{ duration: 1, ease: EASE, delay: 0.3 }}
                  />
                </div>
                <div className="eyebrow mt-3">{ev.sessionsRecorded ?? 1} / {ev.sessionsRequired ?? 5} sessions</div>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-display-section font-serif text-ink-950 mt-6">
                {headline.line1}
                <br />
                <span className={Number(ev.deviationScore ?? 0) >= 35 ? 'italic text-accent-pop' : ''}>
                  {headline.line2}
                </span>
              </h1>
              <p className="font-serif italic text-lg sm:text-xl text-ink-600 leading-relaxed mt-6 max-w-lg">
                {headline.note}
              </p>

              {/* The thin technical layer — meaning first, data second */}
              <div className="mt-14">
                <InkRule />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-6 mt-8">
                  {FEATURES.map((f) => (
                    <div key={f.key}>
                      <div className="eyebrow text-ink-400">{f.label}</div>
                      <div className="font-mono text-xl sm:text-2xl text-ink-950 mt-2">
                        {f.format(sessionResult.metrics?.[f.key] ?? 0)}
                        {f.unit && <span className="text-xs text-ink-400 ml-1">{f.unit}</span>}
                      </div>
                      <div className="font-mono text-[10px] text-ink-500 mt-1">
                        {fmtZ(ev?.[f.z])} vs baseline
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-2 mt-10 pt-6 border-t border-stone-border/70">
                  <span className="eyebrow">
                    Rhythm deviation <span className="text-ink-950 ml-1">{ev.deviationScore ?? 0} / 100</span>
                  </span>
                  <span className="eyebrow">
                    Baseline sessions <span className="text-ink-950 ml-1">{ev.sessionsRecorded ?? 0}</span>
                  </span>
                </div>
              </div>
            </>
          )}

          {showSupportCard && (
            <div className="mt-14">
              <SupportCard
                onDismiss={() => setShowSupportCard(false)}
                onOpenTrustedContact={() => setIsTrustedContactOpen(true)}
              />
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mt-16">
            <button onClick={handleResetForNewSession} className="ink-link font-mono text-[11px] uppercase tracking-[0.16em]">
              Write again
            </button>
            <button onClick={onNavigateToDashboard} className="btn-ink">
              The line so far <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>

        <TrustedContactModal
          isOpen={isTrustedContactOpen}
          onClose={() => setIsTrustedContactOpen(false)}
        />
      </div>
    );
  }

  /* ————————————————————————— WRITE ————————————————————————— */
  return (
    <div className="max-w-3xl mx-auto pt-28 sm:pt-36 pb-24">
      {/* Quiet header */}
      <FadeUp y={10}>
        <div className="flex items-center justify-between">
          <span className="eyebrow">02 / Write</span>
          <span className="eyebrow flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-accent-sage" />
            Your words stay yours
          </span>
        </div>
      </FadeUp>

      <FadeUp delay={0.08}>
        <h1 className="text-display-section font-serif text-ink-950 mt-10">
          Write <span className="italic text-accent-pop">normally.</span>
        </h1>
        <p className="font-serif italic text-lg sm:text-xl text-ink-600 mt-3">
          Bhaav pays attention to your rhythm, not your words.
        </p>
      </FadeUp>

      {/* Live strip: the line quietly responding */}
      <FadeUp delay={0.15}>
        <div className="mt-8">
          <InkLineCanvas
            speed={currentSpeedWpm}
            pauseDuration={lastPauseDurationMs}
            variance={instantRhythmVariance || 0.14}
            isTyping={isWritingActive && totalKeystrokes > 0}
            className="w-full h-20 sm:h-24"
          />
        </div>
      </FadeUp>

      {/* The writing canvas */}
      <FadeUp delay={0.2}>
        <div className="mt-2">
          <textarea
            ref={textareaRef}
            value={journalContent}
            onChange={(e) => setJournalContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Start anywhere. Notes, drafts, a stream of thought — no one will ever read these words."
            rows={10}
            autoFocus
            aria-label="Private writing canvas — the text is never stored or sent"
            className="ruled-paper w-full bg-transparent resize-none focus:outline-none font-serif text-lg sm:text-xl text-ink-900 placeholder:text-ink-300 leading-[36px] py-2"
          />
        </div>
      </FadeUp>

      <InkRule />

      {/* Footer bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pt-6">
        <div className="flex items-center gap-5">
          <span className="eyebrow font-mono">{formatTime(elapsedSeconds)}</span>
          <span className="eyebrow font-mono">{totalKeystrokes} strokes</span>
          {currentSpeedWpm > 0 && (
            <span className="eyebrow font-mono hidden sm:inline">{currentSpeedWpm} wpm</span>
          )}
        </div>

        <div className="flex flex-col items-start sm:items-end gap-3">
          <button
            onClick={handleFinish}
            disabled={isSubmitting || totalKeystrokes < 5}
            className={`btn-ink ${totalKeystrokes < 5 ? 'opacity-30 pointer-events-none' : ''}`}
          >
            {isSubmitting ? 'Analyzing' : 'End session'} <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <span className="eyebrow text-ink-400">
            {totalKeystrokes < 5
              ? 'A few strokes, and the line is yours.'
              : 'Words are discarded. Only rhythm is kept.'}
          </span>
        </div>
      </div>

      {/* Analyzing state */}
      <AnimatePresence>
        {isSubmitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-16 space-y-3"
          >
            <div className="analyzing-line w-full" />
            <span className="eyebrow">Analyzing rhythm</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state — elegant */}
      {submitError && (
        <FadeUp className="mt-12 border border-accent-terracotta/30 bg-accent-terracottaLight/40 p-6">
          <h3 className="font-serif text-xl text-ink-950">Something didn&rsquo;t land.</h3>
          <p className="text-xs text-ink-600 mt-2">
            Your writing is safe — nothing was lost. The rhythm from this session couldn&rsquo;t be
            saved just now.
          </p>
          <button onClick={handleFinish} className="ink-link font-mono text-[11px] uppercase tracking-[0.16em] mt-4">
            Try again <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </FadeUp>
      )}

      {/* First-time reassurance */}
      {!isWritingActive && totalKeystrokes === 0 && (
        <FadeUp delay={0.3} className="mt-14 flex items-center gap-3 text-ink-400">
          <Feather className="w-4 h-4 flex-shrink-0" />
          <span className="eyebrow">Write normally. That&rsquo;s enough.</span>
        </FadeUp>
      )}

      <TrustedContactModal
        isOpen={isTrustedContactOpen}
        onClose={() => setIsTrustedContactOpen(false)}
      />
    </div>
  );
}
