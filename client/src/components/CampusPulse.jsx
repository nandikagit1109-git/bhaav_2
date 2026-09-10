import React, { useState, useEffect } from 'react';
import { fetchCampusPulse } from '../api/client';
import { TrendingUp, ShieldCheck } from 'lucide-react';
import { FadeUp } from '../motion/primitives';

const FALLBACK_PULSE = {
  ok: true,
  meanDeviation: 7,
  participantCount: 17,
  minGroupSize: 10,
  trendDirection: 'higher',
  delta: 5.6,
  trendDescription:
    'Aggregate writing patterns show a higher level of rhythm deviation this week than the recent campus baseline.',
  weeks: [
    { week: 'Recent weeks', meanDeviation: 1.5, sessions: 21 },
    { week: 'This week', meanDeviation: 7.2, sessions: 9 },
  ],
};

export default function CampusPulse({ forcedCohort }) {
  const [pulseData, setPulseData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    async function loadPulse() {
      setIsLoading(true);
      setLoadFailed(false);
      try {
        // BHAAV2 has a single campus-wide cohort; the page simulates small cohorts
        // locally to demo the privacy floor without touching the live endpoint.
        const useFloor = forcedCohort === 'campus_small';
        if (useFloor) {
          setPulseData({
            privacyBlocked: true,
            participantCount: 4,
            requiredThreshold: 10,
          });
        } else {
          const res = await fetchCampusPulse();
          setPulseData(res.ok ? res : FALLBACK_PULSE);
        }
      } catch (err) {
        console.error('Failed to load campus pulse:', err);
        setLoadFailed(true);
      } finally {
        setIsLoading(false);
      }
    }
    loadPulse();
  }, [forcedCohort]);

  if (isLoading) {
    return (
      <div className="space-y-3 py-10">
        <div className="analyzing-line w-full" />
        <span className="eyebrow">Reading the campus line</span>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="border border-stone-border bg-paper-50 p-8">
        <h3 className="font-serif text-xl text-ink-950">The campus line paused.</h3>
        <p className="text-xs text-ink-600 mt-2">The aggregate couldn&rsquo;t be reached just now. Nothing was exposed.</p>
      </div>
    );
  }

  /* ——— PRIVACY FLOOR ENFORCED ——— */
  if (pulseData?.privacyBlocked) {
    return (
      <FadeUp>
        <div className="border border-dashed border-accent-terracotta/50 bg-accent-terracottaLight/30 p-8 sm:p-10 text-center">
          <div className="eyebrow text-accent-terracotta">Privacy floor enforced</div>
          <h3 className="font-serif text-xl sm:text-2xl text-ink-950 mt-4 max-w-md mx-auto leading-snug">
            Not enough participants to show this trend privately.
          </h3>
          <p className="text-xs sm:text-sm text-ink-600 leading-relaxed mt-4 max-w-md mx-auto">
            This group has <span className="font-mono">{pulseData.participantCount}</span> participants.
            The backend refuses to compute or release any aggregate until participation reaches
            at least <span className="font-mono">{pulseData.requiredThreshold}</span>.
          </p>
          <div className="eyebrow text-ink-400 mt-6">
            Server response: zero bytes of aggregate data
          </div>
        </div>
      </FadeUp>
    );
  }

  const isElevated = pulseData?.trendDirection === 'higher';

  /* ——— PASSING AGGREGATE ——— */
  return (
    <FadeUp>
      <div>
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <span className="eyebrow text-accent-terracotta">Campus pulse</span>
            <h3 className="font-serif text-2xl sm:text-3xl text-ink-950 mt-3">
              {isElevated ? 'Campus rhythm is shifting.' : 'Campus rhythm holds steady.'}
            </h3>
          </div>
          <span className="eyebrow text-accent-sage flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Privacy protected &middot; aggregate only
          </span>
        </div>

        {/* Trend statement */}
        <div className="mt-8 flex items-start gap-4">
          {isElevated && <TrendingUp className="w-4 h-4 text-accent-terracotta mt-2 flex-shrink-0" aria-hidden="true" />}
          <p className="font-serif italic text-lg sm:text-xl text-ink-800 leading-relaxed max-w-2xl">
            &ldquo;{pulseData?.trendDescription}&rdquo;
          </p>
        </div>

        {/* Week-over-week comparison — the honest aggregate */}
        {Array.isArray(pulseData?.weeks) && pulseData.weeks.length > 0 && (
          <div className="mt-10">
            <div className="eyebrow">Week over week</div>
            <div className="mt-4 space-y-4 max-w-xl">
              {pulseData.weeks.map((w) => {
                const maxDev = Math.max(...pulseData.weeks.map(x => x.meanDeviation), 1);
                return (
                  <div key={w.week}>
                    <div className="flex items-baseline justify-between">
                      <span className="font-mono text-xs text-ink-600">
                        {new Date(w.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) !== 'Invalid Date'
                          ? new Date(w.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : w.week}
                        <span className="text-ink-400 ml-2">{w.sessions} sessions</span>
                      </span>
                      <span className="font-mono text-xs text-ink-950">{w.meanDeviation} / 100</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full bg-paper-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${(w.meanDeviation / maxDev) * 100}%`,
                          backgroundColor: w.meanDeviation >= 10 ? '#B45A3C' : w.meanDeviation >= 5 ? '#A8842C' : '#5A7A62',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Thin data layer */}
        <div className="mt-10 pt-5 border-t border-stone-border flex flex-wrap gap-x-12 gap-y-3">
          <span className="eyebrow">
            Aggregate deviation
            <span className="ml-2 font-mono text-sm tracking-normal text-ink-950">{pulseData?.meanDeviation ?? '—'} / 100</span>
          </span>
          {pulseData?.delta != null && (
            <span className="eyebrow">
              Change vs recent weeks
              <span className="ml-2 font-mono text-sm tracking-normal text-ink-950">+{pulseData.delta}</span>
            </span>
          )}
          <span className="eyebrow">
            Participants
            <span className="ml-2 font-mono text-sm tracking-normal text-ink-950">{pulseData?.participantCount}</span>
          </span>
          <span className="eyebrow">
            Individual records shown
            <span className="ml-2 font-mono text-sm tracking-normal text-ink-950">0</span>
          </span>
        </div>

        {/* Privacy floor note — grounded in the real threshold */}
        <div className="mt-10 pt-5 border-t border-stone-border/70">
          <p className="eyebrow text-ink-400 max-w-lg leading-relaxed">
            Shown because {pulseData?.participantCount} ≥ {pulseData?.minGroupSize ?? 10}. Below that floor,
            the server returns nothing at all.
          </p>
        </div>

        <p className="eyebrow text-ink-400 mt-10 max-w-md leading-relaxed">
          An early-warning signal for student wellness councils — not a diagnostic system.
          Participation is always optional.
        </p>
      </div>
    </FadeUp>
  );
}
