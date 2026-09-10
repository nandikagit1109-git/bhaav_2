import React from 'react';
import { X, ArrowDown } from 'lucide-react';

const STEPS = [
  {
    n: '1',
    title: 'Your typing creates timing patterns',
    body: 'Key press timestamps (and only timestamps) are recorded in your browser. Characters are discarded instantly.',
  },
  {
    n: '2',
    title: 'Bhaav compresses them into five features',
    body: 'Speed, pause length, pause variation, correction rate, timing variability — a handful of numbers.',
  },
  {
    n: '3',
    title: 'Bhaav learns your individual baseline',
    body: 'After five sessions, a personal corridor — mean and spread — is computed from your history alone.',
  },
  {
    n: '4',
    title: 'New sessions are compared with that corridor',
    body: 'Each session gets z-scores per feature, combined into one distance-from-your-normal figure.',
  },
  {
    n: '5',
    title: 'A deviation becomes a gentle observation',
    body: 'A weekly note and one small suggestion. You reflect, and the loop learns what helps.',
  },
];

export default function TechArchitectureModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/45 backdrop-blur-xs animate-fadeIn">
      <div className="bg-paper-50 rounded-2xl border border-stone-border max-w-2xl w-full p-6 sm:p-8 shadow-paper-md space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-stone-border/60 pb-4">
          <div className="space-y-1">
            <div className="eyebrow text-accent-terracotta">How it works</div>
            <h3 className="font-serif text-2xl sm:text-3xl text-ink-950">From keystrokes to noticing.</h3>
            <p className="text-xs sm:text-sm text-ink-600">
              Deterministic statistics — no black box, no diagnosis, no stored prose.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-ink-400 hover:text-ink-950 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          {STEPS.map((step, i) => (
            <div key={step.n} className="flex items-start gap-5 py-5 border-b border-stone-border/60">
              <span className="font-mono text-xs text-accent-terracotta pt-1">{step.n}</span>
              <div>
                <div className="font-serif text-lg text-ink-950">{step.title}</div>
                <p className="text-xs text-ink-600 leading-relaxed mt-1 max-w-md">{step.body}</p>
              </div>
              {i < STEPS.length - 1 && (
                <ArrowDown className="w-3 h-3 text-ink-300 ml-auto hidden sm:block flex-shrink-0 mt-1" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>

        <div className="p-4 bg-ink-950 text-paper-200 rounded-xl text-xs font-mono space-y-1.5">
          <div className="text-ink-400">Pipeline</div>
          <div>Keyboard events &rarr; local aggregation &rarr; 5 numbers &rarr; Express &rarr; SQLite &rarr; baseline &rarr; deviation &rarr; weekly note</div>
          <div className="text-accent-sage pt-1">
            &#x2713; 0 bytes of prose stored &middot; 0 text sent to the LLM &middot; explainable math throughout
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-stone-border/60">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-ink-950 text-paper-100 text-xs font-medium hover:bg-ink-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
