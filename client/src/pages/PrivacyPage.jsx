import React, { useState } from 'react';
import { CheckCircle2, Download, Trash2, RefreshCw, AlertTriangle, Bot } from 'lucide-react';
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

      {/* ——— Plain-language Privacy Policy ——— */}
      <FadeUp delay={0.25} className="mt-16">
        <span className="eyebrow text-accent-terracotta">Privacy policy</span>
        <h2 className="font-serif text-2xl sm:text-3xl text-ink-950 mt-4">
          What we collect, and why.
        </h2>
        <div className="mt-8 space-y-6 text-sm text-ink-700 leading-relaxed max-w-2xl">
          <div>
            <h3 className="font-serif text-lg text-ink-950 mb-2">What we collect</h3>
            <p>
              Bhaav collects only typing behavior metadata — how fast you type, how long you pause,
              how often you correct yourself, and the overall rhythm of your writing. We never collect
              the actual text you write, the content of your journal, or any personal information beyond
              a randomly generated user identifier stored in your browser.
            </p>
          </div>
          <div>
            <h3 className="font-serif text-lg text-ink-950 mb-2">How long we keep it</h3>
            <p>
              Your data is stored locally in our server{'’'}s database as long as your account exists.
              You can delete everything at any time from the Privacy page or Settings. When you delete,
              all sessions, your baseline, insights, and preferences are permanently removed.
            </p>
          </div>
          <div>
            <h3 className="font-serif text-lg text-ink-950 mb-2">Your rights</h3>
            <p>
              You can export all data Bhaav holds about you at any time. You can delete everything.
              You can change your support level or opt out of Campus Pulse at any time. You are always
              in control.
            </p>
          </div>
          <div>
            <h3 className="font-serif text-lg text-ink-950 mb-2">What this is not</h3>
            <p>
              Bhaav is a self-awareness tool, not a medical device. It does not diagnose mental health
              conditions, does not provide clinical advice, and is not a replacement for professional
              care. If you are in crisis, please visit our <button onClick={() => onNavigate && onNavigate('crisis')} className="text-accent-terracotta hover:underline">crisis support page</button> or call a helpline directly.
            </p>
          </div>
        </div>
      </FadeUp>

      <InkRule className="my-14" />

      {/* ——— AI Disclosure ——— */}
      <FadeUp>
        <div className="bg-ink-950 text-paper-100 p-8 sm:p-10">
          <div className="flex items-center gap-2 eyebrow text-paper-100/60 mb-4">
            <Bot className="w-4 h-4" />
            <span>How Bhaav uses AI</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl text-paper-100">
            AI-generated insights, honestly disclosed.
          </h2>
          <div className="mt-6 space-y-4 text-sm text-paper-100/80 leading-relaxed max-w-2xl">
            <p>
              Bhaav uses an AI model (Anthropic{'’'}s Claude) to generate your weekly observation and
              suggestion. The AI receives only your aggregate behavioral metrics — typing speed,
              pause patterns, correction rate, and timing variability — along with your deviation
              score. It never receives your journal text, individual characters, or any content.
            </p>
            <p>
              The AI{'’'}s output is an observation, not a diagnosis. It is generated from aggregate
              statistics, not from reading your writing. If the AI service is unavailable, Bhaav
              generates a deterministic fallback insight from your actual metrics — the product
              never breaks.
            </p>
            <p>
              AI-generated insights are not clinical advice. They are designed to help you notice
              patterns in your own behavior. If you need support, please reach out to a qualified
              professional or visit our <button onClick={() => onNavigate && onNavigate('crisis')} className="text-paper-100 underline hover:text-paper-50">crisis support page</button>.
            </p>
          </div>
        </div>
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
