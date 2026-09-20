import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Copy, Check, Shield, X } from 'lucide-react';
import { EASE } from '../motion/primitives';

const STORAGE_KEY = 'bhaav-recovery-seen';

/**
 * Returns true if the user has already seen their recovery code modal.
 */
export function hasSeenRecoveryModal() {
  return localStorage.getItem(STORAGE_KEY) === '1';
}

/**
 * Mark the recovery modal as seen so it doesn't show again.
 */
export function markRecoverySeen() {
  localStorage.setItem(STORAGE_KEY, '1');
}

/**
 * One-time modal showing the user's recovery code.
 * Appears after first user creation. Dismissible once seen.
 *
 * @param {{ isOpen: boolean, recoveryCode: string, onClose: () => void }} props
 */
export default function RecoveryCodeModal({ isOpen, recoveryCode, onClose }) {
  const [copied, setCopied] = useState(false);
  const reduced = useReducedMotion();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text
      const el = document.getElementById('recovery-code-display');
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
    }
  };

  const handleDismiss = () => {
    markRecoverySeen();
    onClose();
  };

  if (!isOpen || !recoveryCode) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="bg-paper-50 rounded-2xl border border-stone-border max-w-lg w-full p-6 sm:p-8 shadow-paper-lg space-y-5"
          initial={reduced ? { opacity: 1 } : { opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent-terracotta/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-accent-terracotta" />
              </div>
              <div>
                <h3 className="font-serif text-xl sm:text-2xl text-ink-950">Save this code</h3>
                <p className="text-[11px] text-ink-400 font-mono uppercase tracking-wider mt-0.5">
                  It won't be shown again
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 text-ink-400 hover:text-ink-700 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Explanation */}
          <p className="text-sm text-ink-600 leading-relaxed">
            This is the only way to get your data back if you switch devices or clear your browser.
            Write it down, screenshot it, or save it somewhere safe.
          </p>

          {/* Recovery code display */}
          <div className="bg-paper-100 border border-stone-border rounded-xl p-4 text-center">
            <p className="text-[10px] text-ink-400 font-mono uppercase tracking-[0.2em] mb-3">
              Your recovery code
            </p>
            <p
              id="recovery-code-display"
              className="font-mono text-2xl sm:text-3xl tracking-[0.08em] text-ink-950 font-medium select-all break-all"
              style={{ wordBreak: 'break-all' }}
            >
              {recoveryCode}
            </p>
          </div>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full border text-xs font-mono uppercase tracking-[0.14em] transition-all ${
              copied
                ? 'bg-accent-sage/10 border-accent-sage/40 text-accent-sage'
                : 'border-ink-900/25 text-ink-800 hover:border-ink-900 hover:bg-ink-900 hover:text-paper-50'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy code</span>
              </>
            )}
          </button>

          {/* Dismiss */}
          <button
            onClick={handleDismiss}
            className="w-full text-center text-xs font-mono uppercase tracking-[0.12em] text-ink-400 hover:text-ink-700 transition-colors py-1"
          >
            I've saved it — continue
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
