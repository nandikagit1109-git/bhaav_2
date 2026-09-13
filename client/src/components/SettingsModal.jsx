import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Download,
  Trash2,
  RefreshCw,
  Check,
  AlertTriangle,
} from 'lucide-react';
import {
  fetchSettings,
  updateSettings,
  exportUserData,
  deleteUserData,
  reseedDemoData
} from '../api/client';

const LEVELS = [
  {
    id: 'awareness',
    name: 'Awareness only',
    note: 'See your patterns. Nothing more happens.',
  },
  {
    id: 'suggestions',
    name: 'Awareness + suggestions',
    note: 'Small, low-pressure observations you can try — or ignore.',
  },
  {
    id: 'connection',
    name: 'Awareness + connection',
    note: 'Optionally, a pre-drafted note to someone you trust. You always send it yourself.',
  },
];

export default function SettingsModal({ isOpen, onClose, onDataReset, onNavigate }) {
  const [settings, setSettings] = useState({
    supportLevel: 'suggestions',
    trustedName: '',
    trustedChannel: '',
    campusOptIn: true,
  });
  const [statusMessage, setStatusMessage] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSettings().then(res => {
        if (res.settings) setSettings(res.settings);
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveSupportLevel = async (level) => {
    try {
      const updated = { ...settings, supportLevel: level };
      await updateSettings(updated);
      setSettings(updated);
      setStatusMessage('Saved. Your level applies immediately.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = async () => {
    try {
      await exportUserData();
      setStatusMessage('Exported — zero bytes of journal text inside.');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteUserData();
      setShowDeleteConfirm(false);
      setStatusMessage('Deleted. Baseline, sessions, insights — all gone.');
      if (onDataReset) onDataReset();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReseed = async () => {
    try {
      await reseedDemoData();
      setStatusMessage('Demo dataset restored.');
      if (onDataReset) onDataReset();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/45 backdrop-blur-xs animate-fadeIn">
      <div className="bg-paper-50 rounded-2xl border border-stone-border max-w-xl w-full p-6 sm:p-8 shadow-paper-md space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-stone-border/60 pb-4">
          <div className="space-y-1">
            <div className="eyebrow flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              <span>Preferences</span>
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl text-ink-950">You decide how far it goes.</h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-ink-400 hover:text-ink-950 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {statusMessage && (
          <div className="p-3 bg-accent-sageLight border border-accent-sage/30 rounded-lg text-xs text-accent-sage font-mono flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Support levels */}
        <div className="space-y-3">
          <p className="text-xs text-ink-500">Choose your support experience. Change it anytime.</p>
          <div className="border-t border-stone-border">
            {LEVELS.map((level) => (
              <button
                key={level.id}
                onClick={() => handleSaveSupportLevel(level.id)}
                className={`w-full text-left py-4 border-b border-stone-border/70 flex items-start gap-4 transition-colors ${
                  settings.supportLevel === level.id ? 'pl-3 -ml-3 bg-paper-100 rounded-lg px-3' : ''
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 transition-colors ${
                    settings.supportLevel === level.id ? 'bg-accent-terracotta' : 'bg-ink-300'
                  }`}
                />
                <span>
                  <span className={`block font-serif text-lg ${settings.supportLevel === level.id ? 'text-ink-950' : 'text-ink-800'}`}>
                    {level.name}
                  </span>
                  <span className="block text-xs text-ink-500 mt-0.5">{level.note}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Data management */}
        <div className="pt-4 border-t border-stone-border/60 space-y-3">
          <div className="font-serif text-lg text-ink-950">Your stored data</div>
          <p className="text-xs text-ink-500">
            Export every value Bhaav holds — or remove it all, permanently.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handleExport}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-ink-900/25 text-ink-800 hover:border-ink-900 hover:bg-ink-900 hover:text-paper-50 text-xs font-mono uppercase tracking-[0.14em] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            <button
              onClick={handleReseed}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-ink-900/25 text-ink-800 hover:border-ink-900 hover:bg-ink-900 hover:text-paper-50 text-xs font-mono uppercase tracking-[0.14em] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restore demo data</span>
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-accent-terracotta/40 text-accent-terracotta hover:bg-accent-terracotta hover:text-paper-50 text-xs font-mono uppercase tracking-[0.14em] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete all</span>
            </button>
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="p-4 bg-accent-terracottaLight/40 border border-accent-terracotta/40 rounded-xl space-y-3 animate-fadeIn">
            <div className="flex items-center gap-2 eyebrow text-accent-terracotta">
              <AlertTriangle className="w-4 h-4" />
              <span>Delete your Bhaav data?</span>
            </div>
            <p className="text-xs text-ink-700">
              This permanently removes your sessions, baseline, insights, feedback, and settings.
            </p>
            <div className="flex items-center gap-4 pt-1">
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-full bg-accent-terracotta text-paper-50 text-xs font-medium hover:bg-ink-950 transition-colors"
              >
                Yes, delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-xs font-mono uppercase tracking-[0.14em] text-ink-600 hover:text-ink-950"
              >
                Keep my data
              </button>
            </div>
          </div>
        )}

        {/* Crisis support link */}
        <div className="pt-2 border-t border-stone-border/60">
          <p className="text-[11px] text-ink-400">
            In crisis? <button onClick={() => { onClose(); if (onNavigate) onNavigate('crisis'); }} className="text-accent-terracotta hover:underline font-medium">Get help now</button> — Tele-MANAS 14416 (24/7)
          </p>
        </div>

        <div className="flex justify-end pt-2 border-t border-stone-border/60">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-ink-950 text-paper-100 text-xs font-medium hover:bg-ink-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
