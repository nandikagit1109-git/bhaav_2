import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { FadeUp } from '../motion/primitives';

/**
 * AuthPage — Login and Signup forms with the paper/ink visual style.
 * Shows as a full-page view when the user is not authenticated.
 */
export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, signup } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup(email, password, displayName);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError('');
  };

  return (
    <div className="min-h-screen bg-paper-100 flex items-center justify-center px-5">
      <FadeUp>
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-serif text-4xl sm:text-5xl text-ink-950 leading-tight">
              {mode === 'login' ? 'Welcome back.' : 'Join Bhaav.'}
            </h1>
            <p className="mt-4 text-ink-500 font-mono text-xs tracking-wider uppercase">
              {mode === 'login'
                ? 'Sign in to continue your rhythm'
                : 'Start noticing your pattern'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div
                  key="displayName"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <label className="block">
                    <span className="eyebrow text-ink-400">Name (optional)</span>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="How should we address you?"
                      className="mt-2 w-full px-4 py-3 bg-transparent border border-stone-border rounded-lg
                        text-ink-900 placeholder-ink-300 font-sans text-sm
                        focus:outline-none focus:border-ink-400 focus:ring-1 focus:ring-ink-400
                        transition-colors duration-300"
                    />
                  </label>
                </motion.div>
              )}
            </AnimatePresence>

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
              <span className="eyebrow text-ink-400">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                required
                minLength={mode === 'signup' ? 8 : undefined}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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
              {isSubmitting
                ? (mode === 'login' ? 'Signing in...' : 'Creating account...')
                : (mode === 'login' ? 'Sign in' : 'Create account')}
            </button>
          </form>

          {/* Toggle mode */}
          <div className="mt-8 text-center">
            <p className="text-sm text-ink-500">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              {' '}
              <button
                onClick={toggleMode}
                className="text-ink-900 font-medium underline underline-offset-4
                  hover:text-accent-terracotta transition-colors duration-300"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>

          {/* Privacy note */}
          <p className="mt-8 text-center text-[10px] font-mono text-ink-400 leading-relaxed max-w-xs mx-auto">
            Your email is used only for authentication. We never store your
            journal text — only behavioral metadata.
          </p>
        </div>
      </FadeUp>
    </div>
  );
}
