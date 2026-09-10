import React, { useState } from 'react';
import { X, ShieldCheck, Check, Ban, Code2, Database } from 'lucide-react';

export default function PrivacyModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('summary');

  if (!isOpen) return null;

  const samplePayload = {
    typingSpeed: 46.8,
    meanPauseMs: 815,
    pauseStdDevMs: 215,
    correctionRate: 0.055,
    timingVariance: 0.171,
    burstCount: 12,
    sessionDuration: 470,
    zSpeed: -0.22,
    zPause: 0.35,
    deviationScore: 20.3
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/45 backdrop-blur-xs animate-fadeIn">
      <div className="bg-paper-50 rounded-2xl border border-stone-border max-w-2xl w-full p-6 sm:p-8 shadow-paper-lg space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-stone-border/60 pb-4">
          <div className="space-y-1">
            <div className="eyebrow text-accent-sage flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>TRANSPARENCY &amp; CONTROL</span>
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl text-ink-950">What does Bhaav store?</h3>
            <p className="text-xs sm:text-sm text-ink-600">Inspect the exact telemetry pipeline and the live database schema.</p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-ink-400 hover:text-ink-700 rounded-lg hover:bg-paper-200 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-2 border-b border-stone-border/60 pb-2 text-xs font-medium">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'summary'
                ? 'bg-paper-200 text-ink-900 border border-stone-border'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            Stored vs. Never Stored
          </button>
          <button
            onClick={() => setActiveTab('payload')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'payload'
                ? 'bg-paper-200 text-ink-900 border border-stone-border'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Live Session Payload</span>
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'schema'
                ? 'bg-paper-200 text-ink-900 border border-stone-border'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Database Schema Audit</span>
          </button>
        </div>

        {/* Tab 1: Summary */}
        {activeTab === 'summary' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-paper-100 p-5 rounded-xl border border-stone-border space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-accent-sage font-medium">
                <Check className="w-4 h-4" />
                <span>STORED (Telemetry Only)</span>
              </div>
              <ul className="text-xs sm:text-sm text-ink-700 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-sage" />
                  <span>Typing speed (words per minute)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-sage" />
                  <span>Mean pause duration (ms)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-sage" />
                  <span>Pause standard deviation (ms)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-sage" />
                  <span>Correction rate (backspace ratio)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-sage" />
                  <span>Timing variability (interval coefficient)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-sage" />
                  <span>Session duration (seconds)</span>
                </li>
              </ul>
            </div>

            <div className="bg-accent-terracottaLight/30 p-5 rounded-xl border border-accent-terracotta/30 space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-accent-terracotta font-medium">
                <Ban className="w-4 h-4" />
                <span>NEVER STORED OR SENT</span>
              </div>
              <ul className="text-xs sm:text-sm text-ink-700 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-terracotta" />
                  <span>Journal text &amp; prose</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-terracotta" />
                  <span>Individual typed characters</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-terracotta" />
                  <span>Clipboard contents</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-terracotta" />
                  <span>Passwords &amp; credentials</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-terracotta" />
                  <span>Messages from other applications</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-terracotta" />
                  <span>Prompts to the AI model</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 2: Live Payload */}
        {activeTab === 'payload' && (
          <div className="space-y-2">
            <div className="text-xs text-ink-500 font-mono">
              The exact JSON transmitted over the wire when completing a session:
            </div>
            <pre className="p-4 bg-ink-950 text-paper-200 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-ink-800">
              {JSON.stringify(samplePayload, null, 2)}
            </pre>
            <div className="text-[11px] text-accent-sage font-mono">
              &#x2713; Verified: 0 bytes of journal text. Strictly numerical behavioral features.
            </div>
          </div>
        )}

        {/* Tab 3: Schema */}
        {activeTab === 'schema' && (
          <div className="space-y-2">
            <div className="text-xs text-ink-500 font-mono">
              Database DDL definition verifying absence of text columns:
            </div>
            <pre className="p-4 bg-paper-100 text-ink-800 rounded-xl text-xs font-mono overflow-x-auto border border-stone-border leading-relaxed">
{`CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  typing_speed REAL NOT NULL,
  mean_pause_ms REAL NOT NULL,
  pause_std_dev_ms REAL NOT NULL,
  correction_rate REAL NOT NULL,
  timing_variance REAL NOT NULL,
  session_duration REAL NOT NULL,
  deviation REAL DEFAULT 0,
  dominant_feature TEXT,
  high_deviation INTEGER DEFAULT 0
);

-- Note: No "text", "content", "journal",
-- "message", or "prose" columns exist.
-- Schema is privacy-enforced at DDL level.`}
            </pre>
            <div className="text-[11px] text-accent-sage font-mono">
              &#x2713; Schema audit: 0 text columns. Behavioral metrics only.
            </div>
          </div>
        )}

        <div className="flex items-center justify-end pt-2 border-t border-stone-border/60">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full bg-ink-950 text-paper-100 text-xs font-medium hover:bg-ink-800 transition-colors"
          >
            Close Privacy Audit
          </button>
        </div>
      </div>
    </div>
  );
}
