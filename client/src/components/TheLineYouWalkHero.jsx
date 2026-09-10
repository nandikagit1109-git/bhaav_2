import React, { useState, useEffect } from 'react';
import { useKeystrokeTelemetry } from '../hooks/useKeystrokeTelemetry';
import InkLineCanvas from './InkLineCanvas';
import { ArrowDown, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { FadeUp } from '../motion/primitives';

export default function TheLineYouWalkHero({ onNavigateToJournal, onNavigateToDashboard }) {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const {
    currentSpeedWpm,
    lastPauseDurationMs,
    instantRhythmVariance,
    totalKeystrokes,
    recordKeystroke
  } = useKeystrokeTelemetry();

  const handleKeyDown = (e) => {
    setIsTyping(true);
    if (!hasInteracted) setHasInteracted(true);
    recordKeystroke(e);
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsTyping(false), 450);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const scrollToNext = () => {
    const el = document.getElementById('chapter-02');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative pt-28 sm:pt-36 pb-16">
      {/* Metadata strip */}
      <FadeUp y={12} className="flex items-center justify-between border-b border-stone-border pb-4">
        <span className="eyebrow flex items-center gap-2">
          <span
            className={`w-1.5 h-1.5 rounded-full ${isTyping ? 'bg-accent-pop animate-pulse' : 'bg-ink-300'}`}
            style={isTyping ? { boxShadow: '0 0 8px rgba(224, 85, 47, 0.6)' } : undefined}
          />
          01 / The line you walk
        </span>
        <span className="eyebrow hidden sm:inline">Ephemeral telemetry &bull; Zero text storage</span>
      </FadeUp>

      {/* The interactive composition */}
      <div className="mt-10 sm:mt-14 space-y-8">
        <FadeUp>
          <p className="font-serif italic text-display-sub text-ink-700 max-w-3xl">
            Try writing something <span className="not-italic text-accent-pop">normally.</span>
          </p>
        </FadeUp>

        {/* Live ink line */}
        <FadeUp delay={0.1}>
          <div className="relative">
            <InkLineCanvas
              speed={currentSpeedWpm}
              pauseDuration={lastPauseDurationMs}
              variance={instantRhythmVariance || 0.14}
              isTyping={isTyping}
              className="w-full h-40 sm:h-48"
            />
          </div>
        </FadeUp>

        {/* Writing field — underline style, editorial */}
        <FadeUp delay={0.15}>
          <div className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Today felt like&hellip;"
              aria-label="Try writing something normally — the words are never stored"
              className="w-full bg-transparent border-b border-ink-900/25 focus:border-ink-950 transition-colors duration-300 pb-4 font-serif text-xl sm:text-2xl text-ink-950 placeholder:text-ink-300 focus:outline-none"
            />
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="eyebrow">
                The line listens to your rhythm — not your words.
              </span>
              {hasInteracted && (
                <span className="eyebrow text-ink-400">
                  {totalKeystrokes} strokes &middot; measured locally
                </span>
              )}
            </div>
          </div>
        </FadeUp>

        {/* Quiet live metrics — only after interaction */}
        <FadeUp delay={0.2}>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-stone-border/70 pt-4 min-h-[2.5rem]">
            {hasInteracted ? (
              <>
                <span className="eyebrow">
                  Speed <span className="text-ink-950 ml-1">{currentSpeedWpm > 0 ? `${currentSpeedWpm} wpm` : '—'}</span>
                </span>
                <span className="eyebrow">
                  Last pause <span className="text-ink-950 ml-1">{lastPauseDurationMs > 0 ? `${lastPauseDurationMs}ms` : '—'}</span>
                </span>
                <span className="eyebrow">
                  Variation <span className="text-ink-950 ml-1">{instantRhythmVariance > 0 ? instantRhythmVariance : '—'}</span>
                </span>
              </>
            ) : (
              <span className="eyebrow text-ink-400">
                Fast typing quickens the line &middot; pauses let it rest &middot; irregular rhythm shows
              </span>
            )}
          </div>
        </FadeUp>

        {/* Actions */}
        <FadeUp delay={0.25}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-4">
            <div className="flex items-center gap-2 text-ink-500">
              <ShieldCheck className="w-4 h-4 text-accent-sage flex-shrink-0" />
              <span className="text-xs text-ink-500 max-w-sm leading-relaxed">
                Nothing you type here is saved or sent. The words dissolve; only rhythm remains.
              </span>
            </div>

            <div className="flex items-center gap-6">
              <button
                onClick={onNavigateToDashboard}
                className="ink-link font-mono text-[11px] uppercase tracking-[0.16em]"
              >
                See a rhythm over time
              </button>
              <button
                onClick={onNavigateToJournal}
                className="btn-ink"
              >
                Start writing <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </FadeUp>
      </div>

      {/* Scroll cue */}
      <FadeUp delay={0.3} className="pt-14">
        <button
          onClick={scrollToNext}
          className="group flex items-center gap-3 eyebrow text-ink-600 hover:text-ink-950 transition-colors"
        >
          <ArrowDown className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-y-1" />
          Your rhythm leaves a trace
        </button>
      </FadeUp>
    </section>
  );
}
