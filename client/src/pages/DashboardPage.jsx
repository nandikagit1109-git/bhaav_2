import React, { useState, useEffect } from 'react';
import TrendChart from '../components/TrendChart';
import WeeklyInsightCard from '../components/WeeklyInsightCard';
import PeerCountCard from '../components/PeerCountCard';
import { InkPath } from '../motion/primitives';
import {
  fetchSessions,
  fetchBaseline,
  fetchWeeklyInsight,
} from '../api/client';

function headlineFor(latest, sessionCount) {
  if (sessionCount === 0) {
    return {
      eyebrow: 'Begin',
      h: ['The line', 'begins here.'],
      note: 'Your first writing session starts the record — and teaches Bhaav nothing yet, by design.',
    };
  }
  if (sessionCount < 5) {
    return {
      eyebrow: 'Early',
      h: ['We\u2019re still', 'learning you.'],
      pop: true,
      note: `A few more sessions (${sessionCount} of 5) and Bhaav will know your usual rhythm well enough to notice when it changes.`,
    };
  }
  const d = Number(latest?.deviation_score ?? 0);
  if (d >= 60) {
    return {
      eyebrow: 'Today',
      h: ['Something looked', 'different.'],
      pop: true,
      note: 'Your writing rhythm moved noticeably farther from your usual pattern this week.',
    };
  }
  if (d >= 35) {
    return {
      eyebrow: 'Today',
      h: ['A little', 'different.'],
      pop: true,
      note: 'Your rhythm drifted somewhat from your usual pattern — well within an ordinary week.',
    };
  }
  return {
    eyebrow: 'Today',
    h: ['Your rhythm is', 'close to usual.'],
    note: 'Recent sessions sit inside your personal corridor. Nothing needs your attention.',
  };
}

const devBadge = (score) => {
  const d = Number(score ?? 0);
  if (d >= 60) return { text: 'text-accent-pop', label: 'noticeable' };
  if (d >= 35) return { text: 'text-accent-ochre', label: 'slight' };
  return { text: 'text-accent-sage', label: 'usual' };
};

export default function DashboardPage({ onNavigateToJournal, onOpenPrivacyModal }) {
  const [sessions, setSessions] = useState([]);
  const [baseline, setBaseline] = useState(null);
  const [insight, setInsight] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [insightLoading, setInsightLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadDashboardData() {
      setIsLoading(true);
      setLoadError(false);
      setInsightLoading(true);
      try {
        const results = await Promise.allSettled([
          fetchSessions(),
          fetchBaseline(),
          fetchWeeklyInsight(),
        ]);
        if (cancelled) return;
        // Sessions — if this fails, we show an error
        if (results[0].status === 'fulfilled') {
          setSessions(results[0].value.sessions || []);
        } else {
          console.error('Failed to load sessions:', results[0].reason);
          setLoadError(true);
        }
        // Baseline — optional, render as null if missing
        if (results[1].status === 'fulfilled') {
          setBaseline(results[1].value.baseline || null);
        } else {
          console.warn('Baseline unavailable:', results[1].reason);
        }
        // Insight — optional, render as null if missing
        if (results[2].status === 'fulfilled') {
          setInsight(results[2].value.insight || null);
        } else {
          console.warn('Insight unavailable:', results[2].reason);
        }
        setInsightLoading(false);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadDashboardData();
    return () => { cancelled = true; };
  }, []);

  const latestSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
  const headline = headlineFor(latestSession, sessions.length);

  return (
    <div className="max-w-4xl mx-auto pt-28 sm:pt-36 pb-24">
      {/* ——— Meaning first ——— */}
      <div>
        <span className="eyebrow text-accent-terracotta">{headline.eyebrow}</span>
        <h1 className="text-display-section font-serif text-ink-950 mt-6">
          {headline.h[0]}<br />
          <span className={headline.pop ? 'italic text-accent-pop' : ''}>{headline.h[1]}</span>
        </h1>
        <p className="font-serif italic text-lg sm:text-xl text-ink-600 leading-relaxed mt-6 max-w-xl">
          {headline.note}
        </p>
      </div>

      {/* ——— The thin data layer ——— */}
      {isLoading && sessions.length === 0 ? (
        <div className="mt-16 space-y-8 animate-pulse">
          {/* Skeleton: stat row */}
          <div className="pt-6 border-t border-stone-border flex flex-wrap gap-x-12 gap-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-20 bg-ink-200/60 rounded" />
                <div className="h-5 w-28 bg-ink-200/40 rounded" />
              </div>
            ))}
          </div>
          {/* Skeleton: chart area */}
          <div className="h-48 bg-ink-100/50 rounded-lg border border-stone-border/50" />
          {/* Skeleton: insight card */}
          <div className="h-32 bg-ink-100/50 rounded-lg border border-stone-border/50" />
          {/* Skeleton: session rows */}
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-ink-100/40 rounded border border-stone-border/30" />
            ))}
          </div>
        </div>
      ) : loadError ? (
        <div className="mt-16 border border-accent-terracotta/30 bg-accent-terracottaLight/40 p-6">
          <h3 className="font-serif text-xl text-ink-950">Something didn&rsquo;t land.</h3>
          <p className="text-xs text-ink-600 mt-2">Your data is safe. The page couldn&rsquo;t reach your rhythm just now.</p>
          <button
            onClick={() => window.location.reload()}
            className="ink-link font-mono text-[11px] uppercase tracking-[0.16em] mt-4"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="gradient-card-coral glow-coral rounded-xl p-5">
              <span className="eyebrow text-accent-coral">Latest deviation</span>
              <div className={`font-serif text-3xl mt-2 ${latestSession ? devBadge(latestSession.deviation_score).text : 'text-ink-400'}`}>
                {latestSession ? `${Math.round(latestSession.deviation_score)}` : '—'}
                <span className="text-lg text-ink-400 ml-1">/ 100</span>
              </div>
            </div>
            <div className="gradient-card-indigo glow-indigo rounded-xl p-5">
              <span className="eyebrow text-accent-indigo">Sessions</span>
              <div className="font-serif text-3xl mt-2 text-ink-950">{sessions.length}</div>
            </div>
            <div className="gradient-card-sage glow-sage rounded-xl p-5">
              <span className="eyebrow text-accent-sage">Your baseline</span>
              <div className="font-serif text-lg mt-2 text-ink-800">
                {baseline ? `${Math.round(baseline.mean_speed)} wpm · ${Math.round(baseline.mean_pause)}ms` : 'forming'}
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={onOpenPrivacyModal}
              className="eyebrow ink-link"
            >
              What Bhaav stores
            </button>
          </div>

          {/* ——— The line over time ——— */}
          <section className="mt-16">
            <TrendChart
              sessions={sessions}
              baseline={baseline}
              onNavigateToJournal={onNavigateToJournal}
            />
          </section>

          {/* ——— You're not alone ——— */}
          <section className="mt-20">
            <PeerCountCard onOpenSettings={() => {}} />
          </section>

          {/* ——— Weekly insight ——— */}
          {insight ? (
            <section className="mt-20">
              <WeeklyInsightCard
                insight={insight}
                onFeedbackUpdated={(status) => {
                  setInsight(prev => ({ ...prev, feedback_status: status }));
                }}
              />
            </section>
          ) : insightLoading ? (
            <section className="mt-20">
              <div className="gradient-card-coral glow-coral rounded-xl p-6 animate-pulse">
                <div className="h-3 w-24 bg-ink-200/60 rounded mb-4" />
                <div className="h-5 w-3/4 bg-ink-200/40 rounded mb-2" />
                <div className="h-5 w-1/2 bg-ink-200/30 rounded" />
              </div>
            </section>
          ) : null}

          {/* ——— Session ledger ——— */}
          <section className="mt-20">
            <div className="flex items-baseline justify-between">
              <h3 className="font-serif text-2xl text-ink-950">Recent sessions</h3>
              <span className="eyebrow">{sessions.length} recorded</span>
            </div>

            {sessions.length === 0 ? (
              <div className="mt-8">
                <InkPath d="M6 60 C 100 40, 200 78, 300 60 S 500 62, 594 56" className="w-full h-16 opacity-40" width={1.2} />
                <p className="eyebrow mt-6 text-ink-400">No sessions yet. Your line is waiting.</p>
              </div>
            ) : (
              <div className="mt-6">
                <div className="hidden sm:grid grid-cols-[3rem_1fr_1fr_1fr_1fr_5rem] gap-4 pb-2 border-b border-ink-900/20">
                  {['Session', 'Date', 'Speed', 'Pause', 'Corrections', 'Distance'].map((h) => (
                    <span key={h} className="eyebrow text-ink-400">{h}</span>
                  ))}
                </div>
                {sessions.slice(-8).reverse().map((s, idx) => {
                  const badge = devBadge(s.deviation_score);
                  return (
                    <div
                      key={s.id || idx}
                      className="grid grid-cols-2 sm:grid-cols-[3rem_1fr_1fr_1fr_1fr_5rem] gap-x-4 gap-y-1 py-4 border-b border-stone-border/70 font-mono text-xs text-ink-700 hover:bg-paper-50 transition-colors"
                    >
                      <span className="text-ink-950">#{sessions.length - idx}</span>
                      <span className="text-ink-600">
                        {s.created_at
                          ? new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : '—'}
                      </span>
                      <span>{Math.round(s.typing_speed)} wpm</span>
                      <span>{Math.round(s.mean_pause_ms)}ms</span>
                      <span>{(s.correction_rate * 100).toFixed(1)}%</span>
                      <span className={`sm:text-right ${badge.text}`}>
                        {Math.round(s.deviation_score)}
                        <span className="hidden sm:inline"> / 100</span>
                      </span>
                    </div>
                  );
                })}
                <p className="eyebrow mt-6 text-ink-400 max-w-md leading-relaxed">
                  Distance is measured against your own baseline only — never against other people.
                </p>
              </div>
            )}
          </section>

          <div className="mt-16 flex justify-end">
            <button onClick={onNavigateToJournal} className="btn-ghost">
              New session
            </button>
          </div>
        </>
      )}
    </div>
  );
}
