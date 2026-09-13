import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { EASE } from '../motion/primitives';

const NAV_LINKS = [
  { id: 'journal', label: 'Journal' },
  { id: 'dashboard', label: 'Your Rhythm' },
  { id: 'campus', label: 'Campus Pulse' },
  { id: 'privacy', label: 'Privacy' },
];

export default function Navbar({
  currentView,
  onNavigate,
  onOpenPrivacyModal,
  onOpenSettingsModal,
  onOpenTechModal,
}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const go = (id, sectionId) => {
    setMenuOpen(false);
    onNavigate(id, sectionId);
  };

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-40 transition-all duration-500 ${
          scrolled
            ? 'bg-paper-100/85 backdrop-blur-md border-b border-stone-border/70'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className={`max-w-6xl mx-auto px-5 sm:px-8 flex items-center justify-between transition-all duration-500 ${scrolled ? 'h-14' : 'h-20'}`}>
          {/* Brand */}
          <button
            onClick={() => go('home')}
            className="flex items-baseline gap-2 group"
            aria-label="Bhaav home"
          >
            <span className="font-serif text-xl sm:text-2xl text-ink-950 tracking-tight">
              Bhaav<span className="text-accent-pop">.</span>
            </span>
            <span className="hidden sm:inline font-mono text-[10px] uppercase text-ink-400 group-hover:text-ink-600 transition-colors">
              &#x092D;&#x093E;&#x0935;
            </span>
          </button>

          {/* Desktop links */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Primary">
            {NAV_LINKS.map((item) => (
              <button
                key={item.id}
                onClick={() => go(item.id)}
                className={`relative font-mono text-[11px] uppercase tracking-[0.16em] transition-colors duration-300 ${
                  currentView === item.id ? 'text-ink-950' : 'text-ink-500 hover:text-ink-950'
                }`}
              >
                {item.label}
                <span
                  aria-hidden="true"
                  className={`absolute -bottom-1.5 left-0 h-px bg-accent-terracotta transition-all duration-300 ${
                    currentView === item.id ? 'w-full' : 'w-0'
                  }`}
                />
              </button>
            ))}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <button
              onClick={onOpenPrivacyModal}
              className="hidden lg:inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500 hover:text-ink-950 transition-colors"
              title="What does Bhaav store?"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>What Bhaav stores</span>
            </button>

            <button
              onClick={onOpenSettingsModal}
              className="p-2 text-ink-500 hover:text-ink-950 transition-colors"
              aria-label="Settings"
              title="Settings"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            <button
              onClick={() => go('journal')}
              className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-950 border-b border-ink-950/70 pb-0.5 hover:border-accent-terracotta hover:text-accent-terracotta transition-colors duration-300"
            >
              Start writing
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(true)}
              className="md:hidden p-2 text-ink-900"
              aria-label="Open menu"
            >
              <div className="w-5 space-y-1.5" aria-hidden="true">
                <span className="block h-px bg-ink-900" />
                <span className="block h-px w-3.5 bg-ink-900" />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* ——— Fullscreen mobile overlay ——— */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-paper-100 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <div className="flex items-center justify-between px-5 h-20">
              <span className="font-serif text-2xl text-ink-950">Bhaav</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-600"
                aria-label="Close menu"
              >
                Close
              </button>
            </div>

            <nav className="flex-1 flex flex-col justify-center px-6 gap-2" aria-label="Mobile">
              {[{ id: 'home', label: 'Home' }, ...NAV_LINKS].map((item, i) => (
                <motion.button
                  key={item.id}
                  onClick={() => go(item.id)}
                  className={`text-left font-serif text-4xl py-2 transition-colors ${
                    currentView === item.id ? 'text-accent-terracotta' : 'text-ink-950'
                  }`}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 * i, duration: 0.5, ease: EASE }}
                >
                  {item.label}
                </motion.button>
              ))}

              <motion.button
                onClick={() => go('journal')}
                className="mt-8 btn-ink self-start"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Start writing <ArrowUpRight className="w-3.5 h-3.5" />
              </motion.button>
            </nav>

            <div className="px-6 pb-10 flex flex-wrap items-center gap-6 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500">
              <button onClick={() => { setMenuOpen(false); onOpenPrivacyModal(); }} className="ink-link">
                What Bhaav stores
              </button>
              <button onClick={() => { setMenuOpen(false); onOpenTechModal(); }} className="ink-link">
                Architecture
              </button>
              <button onClick={() => { setMenuOpen(false); onNavigate('crisis'); }} className="ink-link text-accent-terracotta">
                Crisis support
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
