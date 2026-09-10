import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import CampusPulse from '../components/CampusPulse';
import { FadeUp, RevealWords, SectionMark, InkPath, InkRule } from '../motion/primitives';

const SIMULATED_COHORTS = [
  { cohortId: 'campus_general', cohortName: 'Campus-Wide', participantCount: 17, meetsPrivacyFloor: true },
  { cohortId: 'campus_small', cohortName: 'Small cohort (privacy floor demo)', participantCount: 4, meetsPrivacyFloor: false },
];

export default function CampusPulsePage() {
  const [simCohort, setSimCohort] = useState('campus_general');

  return (
    <div className="max-w-4xl mx-auto pt-28 sm:pt-36 pb-24">
      {/* ——— Narrative: one → many ——— */}
      <SectionMark index="A" label="Campus pulse" />
      <div className="mt-10 sm:mt-14 space-y-8">
        <RevealWords
          as="h1"
          text="One person has a rhythm."
          className="text-display-statement font-serif text-ink-800"
        />

        <div>
          <InkPath d="M6 60 C 90 44, 170 76, 260 58 S 420 66, 594 48" className="w-full h-12 opacity-40" width={1} duration={1.4} />
          <InkPath d="M6 64 C 100 56, 180 72, 270 62 S 430 54, 594 50" className="w-full h-12 opacity-40" width={1} duration={1.4} delay={0.2} />
          <InkPath d="M6 56 C 95 68, 175 50, 265 58 S 425 62, 594 42" className="w-full h-12 opacity-40" width={1} duration={1.4} delay={0.4} />
        </div>

        <RevealWords
          as="h2"
          text="Many people create a signal."
          accent={['signal']}
          className="text-display-section font-serif uppercase text-ink-950"
          delay={0.1}
        />

        <FadeUp delay={0.3} className="max-w-xl">
          <p className="font-serif italic text-xl text-ink-700 leading-relaxed">
            Individual lines dissolve into one anonymous aggregate. See the direction of a
            campus without seeing the people inside it.
          </p>
        </FadeUp>
      </div>

      <InkRule className="my-14" />

      {/* ——— Privacy floor explainer ——— */}
      <FadeUp>
        <div className="grid sm:grid-cols-2 gap-10 sm:gap-16">
          <div>
            <span className="eyebrow text-accent-pop">The privacy floor</span>
            <p className="text-sm text-ink-600 leading-relaxed mt-4">
              The server refuses to compute any aggregate until at least ten people have opted
              in. Below the floor, the endpoint returns nothing — not a rounded number, not a
              hint. Protection lives in code, not in promises.
            </p>
          </div>
          <div>
            <span className="eyebrow text-ink-400">What a campus sees</span>
            <p className="text-sm text-ink-600 leading-relaxed mt-4">
              A trend direction. A participation count. A distribution across rhythm bands.
              Never a student. Never a diagnosis — an early-warning signal for exam-season
              stress peaks, not a verdict about anyone.
            </p>
          </div>
        </div>
      </FadeUp>

      {/* ——— Privacy-floor simulator (judge demo) ——— */}
      <FadeUp delay={0.1} className="mt-12">
        <div className="border border-stone-border bg-paper-50 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="eyebrow text-ink-500">Try the floor yourself</span>
            <div className="flex items-center gap-2" role="group" aria-label="Choose a cohort size">
              {SIMULATED_COHORTS.map((c) => (
                <button
                  key={c.cohortId}
                  onClick={() => setSimCohort(c.cohortId)}
                  className={`font-mono text-[10px] uppercase tracking-[0.14em] px-3 py-1.5 border transition-colors ${
                    simCohort === c.cohortId
                      ? 'border-ink-900 text-ink-950 bg-paper-100'
                      : 'border-stone-border text-ink-500 hover:text-ink-950'
                  }`}
                >
                  {c.cohortName} &middot; n={c.participantCount}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-start gap-6">
            {/* INDIVIDUAL: hidden bars */}
            <div className="flex-1">
              <div className="eyebrow text-ink-400 mb-3">Individual</div>
              <div className="space-y-1.5" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-px w-full bg-ink-200/70 line-through" />
                ))}
              </div>
              <div className="eyebrow text-ink-400 mt-3">remain invisible</div>
            </div>
            {/* AGGREGATE: one bold bar */}
            <div className="flex-1">
              <div className="eyebrow text-ink-400 mb-3">Aggregated</div>
              <div className="h-2 w-full bg-ink-900 rounded-full" aria-hidden="true" />
              <div className="eyebrow text-ink-500 mt-3">only the signal survives</div>
            </div>
          </div>
        </div>
      </FadeUp>

      <InkRule className="my-14" />

      {/* ——— The live aggregate ——— */}
      <CampusPulse forcedCohort={simCohort} />

      {/* ——— Closing principle ——— */}
      <FadeUp className="mt-16 border-t border-stone-border pt-8">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-accent-sage flex-shrink-0 mt-1" />
          <p className="font-serif italic text-lg text-ink-700 max-w-2xl">
            The principle: insight without surveillance. Bhaav never diagnoses a campus or
            ranks students against each other.
          </p>
        </div>
      </FadeUp>
    </div>
  );
}
