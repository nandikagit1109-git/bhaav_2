import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { forgotPassword, resetPassword } from '../api/client';
import { FadeUp } from '../motion/primitives';

const EASE = [0.22, 1, 0.36, 1];

/**
 * ForgotPasswordPage — two modes:
 * 1. Request: enter email, get a reset link (logged to console)
 * 2. Reset: enter new password via token from URL
 */
export default function ForgotPasswordPage() {
  const params = new URLSearchParams(window.location.search);
  const tokenFromUrl = params.get('token');

  const [mode] = useState(tokenFromUrl ? 'reset' : 'request');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      await forgotPassword(email);
      setSuccess('If an account with that email exists, a reset link has been sent. Check the server console for the link.');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword(tokenFromUrl, password);
      setSuccess('Password updated! Signing you in...');
      // Auto-login after successful reset
      setTimeout(async () => {
        try {
          await login(email, password);
        } catch {
          // If auto-login fails, redirect to login
          window.location.href = '/';
        }
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper-100 flex items-center justify-center px-5">
      <FadeUp>
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-serif text-4xl sm:text-5xl text-ink-950 leading-tight">
              {mode === 'request' ? 'Forgot password?' : 'New password'}
            </h1>
            <p className="mt-4 text-ink-500 font-mono text-xs tracking-wider uppercase">
              {mode === 'request'
                ? 'We\'ll send you a reset link'
                : 'Choose a new password for your account'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {mode === 'request' ? (
              <motion.form
                key="request"
                onSubmit={handleRequestSubmit}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="space-y-6"
              >
                <label className="block">
                  <span className="eyebrow text-ink-400">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="mt-2 w-full px-4 py-3 bg-transparent border border-stone-border rounded-lg
                      text-ink-900 placeholder-ink-300 font-sans text-sm
                      focus:outline-none focus:border-ink-400 focus:ring-1 focus:ring-ink-400
                      transition-colors duration-300"
                  />
                </label>

                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="p-3 bg-accent-terracotta/10 border border-accent-terracotta/30 rounded-lg"
                    >
                      <p className="text-sm text-accent-terracotta">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Success message */}
                <AnimatePresence>
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="p-3 bg-accent-sage/10 border border-accent-sage/30 rounded-lg"
                    >
                      <p className="text-sm text-accent-sage">{success}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-6 bg-ink-900 text-paper-100 rounded-lg
                    font-mono text-xs uppercase tracking-[0.16em]
                    hover:bg-ink-800 active:bg-ink-950
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors duration-300"
                >
                  {isSubmitting ? 'Sending...' : 'Send reset link'}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="reset"
                onSubmit={handleResetSubmit}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="space-y-6"
              >
                <label className="block">
                  <span className="eyebrow text-ink-400">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="mt-2 w-full px-4 py-3 bg-transparent border border-stone-border rounded-lg
                      text-ink-900 placeholder-ink-300 font-sans text-sm
                      focus:outline-none focus:border-ink-400 focus:ring-1 focus:ring-ink-400
                      transition-colors duration-300"
                  />
                </label>

                <label className="block">
                  <span className="eyebrow text-ink-400">New password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="mt-2 w-full px-4 py-3 bg-transparent border border-stone-border rounded-lg
                      text-ink-900 placeholder-ink-300 font-sans text-sm
                      focus:outline-none focus:border-ink-400 focus:ring-1 focus:ring-ink-400
                      transition-colors duration-300"
                  />
                </label>

                <label className="block">
                  <span className="eyebrow text-ink-400">Confirm password</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Type it again"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="mt-2 w-full px-4 py-3 bg-transparent border border-stone-border rounded-lg
                      text-ink-900 placeholder-ink-300 font-sans text-sm
                      focus:outline-none focus:border-ink-400 focus:ring-1 focus:ring-ink-400
                      transition-colors duration-300"
                  />
                </label>

                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="p-3 bg-accent-terracotta/10 border border-accent-terracotta/30 rounded-lg"
                    >
                      <p className="text-sm text-accent-terracotta">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Success message */}
                <AnimatePresence>
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="p-3 bg-accent-sage/10 border border-accent-sage/30 rounded-lg"
                    >
                      <p className="text-sm text-accent-sage">{success}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-6 bg-ink-900 text-paper-100 rounded-lg
                    font-mono text-xs uppercase tracking-[0.16em]
                    hover:bg-ink-800 active:bg-ink-950
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors duration-300"
                >
                  {isSubmitting ? 'Updating...' : 'Update password'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Back to login */}
          <div className="mt-8 text-center">
            <a
              href="/"
              className="text-sm text-ink-500 hover:text-ink-900 transition-colors duration-300"
            >
              Back to sign in
            </a>
          </div>
        </div>
      </FadeUp>
    </div>
  );
}
