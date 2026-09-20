import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { recoverByCode } from '../api/client';
import { EASE } from '../motion/primitives';

/**
 * RestorePage — allows a user to enter a recovery code on a new device
 * and restore their existing data (user_id).
 */
export default function RestorePage({ onNavigate }) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const reduced = useReducedMotion();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = code.trim().toLowerCase();
    if (!trimmed) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const data = await recoverByCode(trimmed);
      if (data.userId) {
        // Store the recovered user_id in localStorage
        localStorage.setItem('bhaav_user_id', data.userId);
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMsg('Recovery code not found. Check the code and try again.');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg('Recovery code not found. Check the code and try again.');
    }
  };

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center px-5 py-16"
      initial={reduced ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <div className="max-w-md w-full space-y-8">
        {/* Back link */}
        <button
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.12em] text-ink-400 hover:text-ink-700 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>Back</span>
        </button>

        {/* Header */}
        <div className="space-y-3">
          <h1 className="font-serif text-3xl sm:text-4xl text-ink-950">
            Restore your data
          </h1>
          <p className="text-sm text-ink-500 leading-relaxed">
            Enter your recovery code to pick up where you left off.
            Your sessions, baseline, and insights will appear on this device.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="recovery-code" className="block text-[10px] font-mono uppercase tracking-[0.2em] text-ink-400 mb-2">
              Recovery code
            </label>
            <input
              id="recovery-code"
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value); setStatus('idle'); setErrorMsg(''); }}
              placeholder="e.g. coral-window-42"
              className="w-full px-4 py-3 bg-paper-50 border border-stone-border rounded-xl font-mono text-lg text-ink-950 placeholder:text-ink-300 focus:outline-none focus:border-ink-900/40 transition-colors"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {status === 'error' && (
            <motion.div
              initial={reduced ? { opacity: 1 } : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-xs text-accent-terracotta"
            >
              <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div
              initial={reduced ? { opacity: 1 } : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 text-xs text-accent-sage">
                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Data restored! Redirecting to your journal...</span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('journal')}
                className="btn-ink w-full justify-center"
              >
                Go to journal <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}

          {status !== 'success' && (
            <button
              type="submit"
              disabled={!code.trim() || status === 'loading'}
              className="btn-ink w-full justify-center disabled:opacity-40"
            >
              {status === 'loading' ? 'Restoring...' : 'Restore'}
            </button>
          )}
        </form>

        {/* Help text */}
        <p className="text-[10px] text-ink-400 leading-relaxed">
          Your recovery code was shown once when you first used Bhaav — three words
          and two numbers, like "coral-window-42". If you lost it, your data can't
          be recovered, but you can start fresh.
        </p>
      </div>
    </motion.div>
  );
}
