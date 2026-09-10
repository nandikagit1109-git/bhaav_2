import React, { useState } from 'react';
import { CheckCircle2, Download, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { exportUserData, deleteUserData, reseedDemoData } from '../api/client';
import { FadeUp, SectionMark, InkRule } from '../motion/primitives';

const STORED = [
  'Typing speed, measured locally',
  'Mean pause duration',
  'Pause standard deviation',
  'Correction rate',
  'Timing variability',
  'Session timestamps and length',
  'Your baseline mean and spread',
];
const NEVER_STORED = [
  'Your journal text',
  'Individual characters or keys',
  'Clipboard contents',
  'Passwords or credentials',
  'Messages from other apps',
  'Anything sent to the AI provider',
];

export default function PrivacyPage({ onNavigate }) {
  const [statusMessage, setStatusMessage] = useState(null);
  const [statusKind, setStatusKind] = useState('ok');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const flash = (msg, kind = 'ok') => {
    setStatusMessage(msg);
    setStatusKind(kind);
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleExport = async () => {
    try {
      await exportUserData();
      flash('Exported. Inspect it — you will find zero bytes of journal text.');
    } catch (err) {
      console.error(err);
      flash('The export didn\u2019t land. Your data is untouched.', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteUserData();
      setShowDeleteConfirm(false);
      flash('Deleted. Your sessions, baseline, insights, and settings are gone.');
    } catch (err) {
      console.error(err);
      setShowDeleteConfirm(false);
      flash('The deletion didn\u2019t complete. Your data is untouched.', 'error');
    }
  };

  const handleReseed = async () => {
    try {
      await reseedDemoData();
      flash('Demo data restored.');
    } catch (err) {
      console.error(err);
      flash('The reseed didn\u2019t land. Try again.', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto pt-28 sm:pt-36 pb-24">
      <SectionMark index="P" label="Privacy architecture" />
      <h1 className="text-display-section font-serif uppercase text-ink-950 mt-10">
        Your words<br /><span className="italic text-accent-pop">stay yours.</span>
      </h1>
      <FadeUp delay={0.2}>
        <p className="font-serif italic text-lg sm:text-xl text-ink-600 leading-relaxed mt-6 max-w-xl">
          Privacy here is not a policy. It is the shape of the database — there is simply no
          column where your words could live.
        </p>
      </FadeUp>

      {statusMessage && (
        <FadeUp className={`mt-10 p-4 text-xs font-mono flex items-center gap-2 border ${
          statusKind === 'ok'
            ? 'bg-accent-sageLight/50 border-accent-sage/30 text-accent-sage'
            : 'bg-accent-terracottaLight/50 border-accent-terracotta/30 text-accent-terracotta'
        }`}>
          {statusKind === 'ok' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          <span>{statusMessage}</span>
        </FadeUp>
      )}

      {/* ——— The two columns ——— */}
      <div className="mt-16 grid md:grid-cols-2 gap-12 md:gap-20">
        <FadeUp>
          <div className="eyebrow text-accent-sage">Stored</div>
          <ul className="mt-6">
            {STORED.map((item) => (
              <li key={item} className="font-mono text-xs sm:text-sm text-ink-700 py-3.5 border-t border-stone-border flex items-center gap-3">
                <span className="w-1 h-1 rounded-full bg-accent-sage flex-shrink-0" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </FadeUp>

        <FadeUp delay={0.12}>
          <div className="eyebrow text-ink-400">Never stored</div>
          <ul className="mt-6">
            {NEVER_STORED.map((item) => (
              <li key={item} className="font-mono text-xs sm:text-sm text-ink-400 line-through decoration-ink-300 py-3.5 border-t border-stone-border/70 flex items-center gap-3">
                <span className="w-1 h-1 rounded-full bg-ink-300 flex-shrink-0" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </FadeUp>
      </div>

      <InkRule className="my-16" />

      {/* ——— Verify it yourself ——— */}
      <FadeUp>
        <span className="eyebrow text-accent-terracotta">Verify, don&rsquo;t trust</span>
        <h2 className="font-serif text-2xl sm:text-3xl text-ink-950 mt-4">
          Download the file. Look for your words.
        </h2>
        <p className="text-sm text-ink-600 leading-relaxed mt-3 max-w-lg">
          The export contains every value Bhaav holds about you. Search it for a sentence you
          wrote — you will not find one.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button onClick={handleExport} className="btn-ink">
            <Download className="w-3.5 h-3.5" /> Export my data
          </button>
          <button onClick={handleReseed} className="btn-ghost">
            <RefreshCw className="w-3.5 h-3.5" /> Restore demo data
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-accent-terracotta border-b border-accent-terracotta/40 pb-1 hover:text-ink-950 hover:border-ink-950 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete everything
          </button>
        </div>

        {showDeleteConfirm && (
          <FadeUp className="mt-8 border border-accent-terracotta/40 bg-accent-terracottaLight/40 p-6">
            <div className="flex items-center gap-2 eyebrow text-accent-terracotta">
              <AlertTriangle className="w-4 h-4" />
              Delete your Bhaav data?
            </div>
            <p className="text-sm text-ink-700 mt-3 max-w-md leading-relaxed">
              This permanently removes your sessions, baseline, insights, feedback, and
              settings. The dashboard resets to its first-day state.
            </p>
            <div className="flex items-center gap-4 mt-5">
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] bg-accent-terracotta text-paper-50 px-5 py-2.5 rounded-full hover:bg-ink-950 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Yes, delete
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="ink-link font-mono text-[11px] uppercase tracking-[0.16em]">
                Keep my data
              </button>
            </div>
          </FadeUp>
        )}
      </FadeUp>

      <InkRule className="my-16" />

      {/* ——— Honesty ——— */}
      <FadeUp>
        <div className="bg-ink-950 text-paper-100 p-8 sm:p-10">
          <span className="eyebrow text-ink-400">Scientific honesty</span>
          <p className="font-serif italic text-lg sm:text-xl text-paper-100 leading-relaxed mt-4 max-w-2xl">
            Bhaav is a self-awareness aid, not a diagnostic instrument. It compares your
            typing rhythm only with your own past rhythm. It has not undergone clinical
            validation, and it will never tell you what you feel — only what changed.
          </p>
          {onNavigate && (
            <button
              onClick={() => onNavigate('campus')}
              className="ink-link font-mono text-[11px] uppercase tracking-[0.16em] mt-8 !text-paper-100"
            >
              See how this scales to a campus
            </button>
          )}
        </div>
      </FadeUp>
    </div>
  );
}
