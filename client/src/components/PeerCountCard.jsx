import React, { useState, useEffect } from 'react';
import { fetchPeerCount, setCampusPulseOptIn } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

/**
 * PeerCountCard — a small, privacy-first card on the Dashboard.
 * Shows how many OTHER opted-in users this week share the same deviation tier.
 * Never shows exact user lists, rankings, or contact info.
 * K-anonymity floor enforced server-side.
 */
export default function PeerCountCard({ onOpenSettings: _onOpenSettings }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    fetchPeerCount(user.id)
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, [user?.id]);

  // Don't show anything if dismissed this session
  if (dismissed) return null;

  // Loading state
  if (!data) {
    return (
      <div className="border border-stone-border/60 rounded-xl p-5 animate-pulse">
        <div className="h-3 w-32 bg-ink-200/60 rounded" />
        <div className="h-4 w-48 bg-ink-200/40 rounded mt-3" />
      </div>
    );
  }

  // Not opted in — gentle, one-time invite
  if (!data.opted_in) {
    return (
      <div className="gradient-card-sky glow-sky rounded-xl p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent-sky mb-2">
          You&rsquo;re not alone
        </p>
        <p className="text-sm text-ink-600 leading-relaxed">
          See how many people felt a similar shift this week — anonymously, no names, no profiles.
        </p>
        <div className="flex items-center gap-4 mt-3">
          <button
            onClick={async () => {
              setToggling(true);
              try {
                await setCampusPulseOptIn(true);
                const res = await fetchPeerCount(user.id);
                setData(res);
              } catch (_) { /* silent */ }
              setToggling(false);
            }}
            disabled={toggling}
            className="ink-link font-mono text-[11px] uppercase tracking-[0.14em] text-accent-terracotta"
          >
            {toggling ? 'Enabling...' : 'Turn on'}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-400 hover:text-ink-600"
          >
            Not now
          </button>
        </div>
      </div>
    );
  }

  // Opted in but not enough data
  if (data.insufficient_data) {
    return (
      <div className="gradient-card-amber glow-amber rounded-xl p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent-amber mb-2">
          You&rsquo;re not alone
        </p>
        <p className="text-sm text-ink-600 leading-relaxed">
          Not enough people in a similar place this week to show a number yet. Check back after more people write.
        </p>
        <button
          onClick={async () => {
            setToggling(true);
            try {
              await setCampusPulseOptIn(false);
              setDismissed(true);
            } catch (_) { /* silent */ }
            setToggling(false);
          }}
          disabled={toggling}
          className="ink-link font-mono text-[11px] uppercase tracking-[0.14em] text-ink-400 mt-3"
        >
          Turn off
        </button>
      </div>
    );
  }

  // Real peer count returned
  const tierLabel = data.tier === 'high' ? 'a noticeable shift' : data.tier === 'moderate' ? 'a slight shift' : 'little deviation';

  const tierColor = data.tier === 'high' ? 'gradient-card-rose glow-rose' : data.tier === 'moderate' ? 'gradient-card-amber glow-amber' : 'gradient-card-sage glow-sage';
  const tierTextColor = data.tier === 'high' ? 'text-accent-rose' : data.tier === 'moderate' ? 'text-accent-amber' : 'text-accent-sage';

  return (
    <div className={`${tierColor} rounded-xl p-5`}>
      <p className={`font-mono text-[11px] uppercase tracking-[0.14em] ${tierTextColor} mb-2`}>
        You&rsquo;re not alone
      </p>
      <p className="text-sm text-ink-700 leading-relaxed">
        <span className="font-serif text-2xl text-accent-pop font-medium mr-1">{data.peer_count}</span>
        other people this week also saw {tierLabel} in their writing rhythm.
      </p>
      <p className="text-[11px] text-ink-400 mt-2">
        Anonymous aggregate only — no names, no profiles, no way to view or contact anyone.
      </p>
      <button
        onClick={async () => {
          setToggling(true);
          try {
            await setCampusPulseOptIn(false);
            setDismissed(true);
          } catch (_) { /* silent */ }
          setToggling(false);
        }}
        disabled={toggling}
        className="ink-link font-mono text-[11px] uppercase tracking-[0.14em] text-ink-400 mt-2"
      >
        Turn off
      </button>
    </div>
  );
}
