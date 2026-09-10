import { useState, useRef, useCallback, useEffect } from 'react';
import { extractFeatures } from '../lib/featureExtraction';

/**
 * useKeystrokeTelemetry
 * 
 * Sub-millisecond keystroke dynamics tracking without text storage.
 * Evaluates typing speed, pauses, variability, and corrections locally.
 * Erases memory buffer upon session completion.
 */
export function useKeystrokeTelemetry() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [currentSpeedWpm, setCurrentSpeedWpm] = useState(0);
  const [lastPauseDurationMs, setLastPauseDurationMs] = useState(0);
  const [correctionCount, setCorrectionCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [instantRhythmVariance, setInstantRhythmVariance] = useState(0);

  // Buffer stores ONLY timestamps and boolean flags (ZERO characters or words)
  const timestampsRef = useRef([]); // [{ t: number, isCorrection: boolean }]
  const sessionStartTimeRef = useRef(null);
  const timerIntervalRef = useRef(null);

  const startSession = useCallback(() => {
    timestampsRef.current = [];
    sessionStartTimeRef.current = performance.now();
    setIsSessionActive(true);
    setTotalKeystrokes(0);
    setCurrentSpeedWpm(0);
    setLastPauseDurationMs(0);
    setCorrectionCount(0);
    setElapsedSeconds(0);
    setInstantRhythmVariance(0);

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
  }, []);

  const recordKeystroke = useCallback((e) => {
    const now = performance.now();
    if (!sessionStartTimeRef.current) {
      sessionStartTimeRef.current = now;
      setIsSessionActive(true);
    }

    const isCorrection = e.key === 'Backspace' || e.key === 'Delete';

    // PRIVACY ENFORCEMENT: We record timestamp and correction flag ONLY.
    // The key value (e.g. 'a', 'm', 'password') is discarded instantly.
    const prevEntry = timestampsRef.current[timestampsRef.current.length - 1];
    timestampsRef.current.push({
      t: now,
      isCorrection
    });

    setTotalKeystrokes(timestampsRef.current.length);
    if (isCorrection) {
      setCorrectionCount(c => c + 1);
    }

    // Measure recent pause
    if (prevEntry) {
      const deltaMs = now - prevEntry.t;
      if (deltaMs > 450) {
        setLastPauseDurationMs(Math.round(deltaMs));
      }
    }

    // Real-time rolling WPM (past 15 keystrokes)
    const count = timestampsRef.current.length;
    if (count > 5) {
      const windowStart = timestampsRef.current[Math.max(0, count - 15)];
      const elapsedMinutes = (now - windowStart.t) / (1000 * 60);
      if (elapsedMinutes > 0.005) {
        // Average 5 chars per word
        const words = (Math.min(count, 15)) / 5;
        const speed = Math.round(words / elapsedMinutes);
        setCurrentSpeedWpm(Math.min(180, Math.max(5, speed)));
      }

      // Rolling variance (past 10 intervals)
      const recentIntervals = [];
      for (let i = Math.max(1, count - 10); i < count; i++) {
        recentIntervals.push(timestampsRef.current[i].t - timestampsRef.current[i - 1].t);
      }
      if (recentIntervals.length > 2) {
        const meanIki = recentIntervals.reduce((a, b) => a + b, 0) / recentIntervals.length;
        const varIki = Math.sqrt(
          recentIntervals.reduce((acc, v) => acc + Math.pow(v - meanIki, 2), 0) / recentIntervals.length
        );
        const cv = meanIki > 0 ? varIki / meanIki : 0;
        setInstantRhythmVariance(Number(cv.toFixed(3)));
      }
    }
  }, []);

  const finishSession = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    const events = timestampsRef.current;
    if (events.length < 5) {
      // Too few keystrokes for meaningful telemetry
      setIsSessionActive(false);
      timestampsRef.current = [];
      return null;
    }

    const sessionEndTime = performance.now();

    // Pure extraction — see lib/featureExtraction.js. Input events carry
    // timestamps and correction flags ONLY; no character data exists here.
    const features = extractFeatures(events, sessionStartTimeRef.current, sessionEndTime);

    // PRIVACY PURGE: Wipe memory array immediately
    timestampsRef.current = [];
    setIsSessionActive(false);

    return features;
  }, []);

  const resetSession = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timestampsRef.current = [];
    sessionStartTimeRef.current = null;
    setIsSessionActive(false);
    setTotalKeystrokes(0);
    setCurrentSpeedWpm(0);
    setLastPauseDurationMs(0);
    setCorrectionCount(0);
    setElapsedSeconds(0);
  }, []);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  return {
    isSessionActive,
    totalKeystrokes,
    currentSpeedWpm,
    lastPauseDurationMs,
    correctionCount,
    elapsedSeconds,
    instantRhythmVariance,
    startSession,
    recordKeystroke,
    finishSession,
    resetSession,
  };
}
