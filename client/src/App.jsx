import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import CustomCursor from './components/CustomCursor';
import HomePage from './pages/HomePage';
import JournalPage from './pages/JournalPage';
import DashboardPage from './pages/DashboardPage';
import CampusPulsePage from './pages/CampusPulsePage';
import PrivacyPage from './pages/PrivacyPage';
import CrisisPage from './pages/CrisisPage';
import RestorePage from './pages/RestorePage';
import PrivacyModal from './components/PrivacyModal';
import SettingsModal from './components/SettingsModal';
import TechArchitectureModal from './components/TechArchitectureModal';
import TourOverlay from './components/TourOverlay';
import IntroSequence, { hasSeenIntro, markIntroSeen } from './components/IntroSequence';
import RecoveryCodeModal, { hasSeenRecoveryModal, markRecoverySeen } from './components/RecoveryCodeModal';
import { fetchState } from './api/client';
import { EASE } from './motion/primitives';

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const [currentView, setCurrentView] = useState('home');
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isTechModalOpen, setIsTechModalOpen] = useState(false);
  const [sessionRefreshKey, setSessionRefreshKey] = useState(0);
  const [tourActive, setTourActive] = useState(false);
  const [showIntro, setShowIntro] = useState(() => !hasSeenIntro());
  const [recoveryCode, setRecoveryCode] = useState(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const reduced = useReducedMotion();

  const handleNavigate = (viewId, sectionId) => {
    setCurrentView(viewId);
    if (sectionId) {
      // Allow the view to mount before scrolling to its section anchor.
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      }, 120);
    } else {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    }
  };

  const handleDataReset = () => {
    setSessionRefreshKey(prev => prev + 1);
  };

  // Dynamic SEO titles per route
  useEffect(() => {
    const titles = {
      home: "Bhaav \u2014 Write normally. We\u2019ll tell you what your hands already know.",
      journal: "Bhaav \u2014 Write normally.",
      dashboard: "Bhaav \u2014 The line you walk.",
      campus: "Bhaav \u2014 Campus Pulse.",
      privacy: "Bhaav \u2014 Privacy by architecture.",
      crisis: "Bhaav \u2014 Crisis support.",
    };
    document.title = titles[currentView] || titles.home;
  }, [currentView]);

  // Check for recovery code on first load (new user creation)
  useEffect(() => {
    if (showIntro) return;
    // Only check once per session
    if (sessionStorage.getItem('bhaav-recovery-checked') === '1') return;
    sessionStorage.setItem('bhaav-recovery-checked', '1');

    fetchState()
      .then((state) => {
        if (state.recoveryCode && !hasSeenRecoveryModal()) {
          setRecoveryCode(state.recoveryCode);
          setShowRecoveryModal(true);
        }
      })
      .catch(() => { /* silent — not critical */ });
  }, [showIntro]);

  const pageVariants = {
    initial: reduced ? { opacity: 1 } : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    exit: reduced ? { opacity: 0 } : { opacity: 0, y: -10 },
  };

  return (
    <div className="min-h-screen bg-paper-100 text-ink-900 flex flex-col font-sans paper-grain">
      <CustomCursor />

      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenTechModal={() => setIsTechModalOpen(true)}
      />

      <main className="flex-1 w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView + String(sessionRefreshKey)}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.45, ease: EASE }}
          >
            {currentView === 'home' && (
              <HomePage
                onNavigate={handleNavigate}
                onOpenSettings={() => setIsSettingsModalOpen(true)}
                onOpenHowItWorks={() => setIsTechModalOpen(true)}
              />
            )}

            {currentView === 'restore' && (
              <RestorePage onNavigate={handleNavigate} />
            )}

            {currentView === 'journal' && (
              <JournalPage
                onNavigateToDashboard={() => handleNavigate('dashboard')}
              />
            )}

            {currentView === 'dashboard' && (
              <DashboardPage
                onNavigateToJournal={() => handleNavigate('journal')}
                onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
              />
            )}

            {currentView === 'campus' && (
              <CampusPulsePage onNavigate={handleNavigate} />
            )}

            {currentView === 'privacy' && (
              <PrivacyPage onNavigate={handleNavigate} />
            )}

            {currentView === 'crisis' && (
              <CrisisPage onNavigate={handleNavigate} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ——— Minimal editorial footer ——— */}
      <footer className="w-full mt-24">
        <div className="rule" />
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="font-serif text-xl text-ink-950">
              Bhaav <span className="text-ink-400 text-base ml-1">&#x092D;&#x093E;&#x0935;</span>
            </div>
            <p className="eyebrow mt-2">
              Write normally. Notice what changes.
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-x-7 gap-y-2 text-xs font-mono text-ink-500">
            <button onClick={() => handleNavigate('dashboard')} className="ink-link">Your rhythm</button>
            <button onClick={() => handleNavigate('campus')} className="ink-link">Campus pulse</button>
            <button onClick={() => handleNavigate('privacy')} className="ink-link">Privacy</button>
            <button onClick={() => setIsTechModalOpen(true)} className="ink-link">How it works</button>
            <button onClick={() => setTourActive(true)} className="ink-link">Take the tour</button>
            <button onClick={() => setIsSettingsModalOpen(true)} className="ink-link">Settings</button>
            <button onClick={() => handleNavigate('crisis')} className="ink-link text-accent-terracotta">Crisis support</button>
          </nav>
        </div>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pb-8">
          <p className="text-[10px] font-mono text-ink-400 leading-relaxed max-w-2xl">
            Bhaav is a self-awareness aid, not a medical device. It compares your writing rhythm only with
            your own past rhythm. It does not diagnose, score, or replace professional care.
          </p>
        </div>
      </footer>

      <PrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onDataReset={handleDataReset}
        onNavigate={handleNavigate}
      />

      <TechArchitectureModal
        isOpen={isTechModalOpen}
        onClose={() => setIsTechModalOpen(false)}
      />

      <TourOverlay active={tourActive} onFinish={() => setTourActive(false)} />

      {/* Intro sequence — shown on first visit, skippable */}
      {showIntro && (
        <IntroSequence
          onComplete={() => {
            markIntroSeen();
            setShowIntro(false);
          }}
        />
      )}

      {/* Recovery code modal — shown once after first user creation */}
      <RecoveryCodeModal
        isOpen={showRecoveryModal}
        recoveryCode={recoveryCode}
        onClose={() => setShowRecoveryModal(false)}
      />
    </div>
  );
}
