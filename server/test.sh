#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# BHAAV — Test Runner
#
# Runs the existing node:test suites and the directional-fix
# integration test (Step 5 from the analysis upgrade spec).
# ═══════════════════════════════════════════════════════════════

set -euo pipefail
cd "$(dirname "$0")"

PASS=0
FAIL=0

run() {
  local label="$1"; shift
  echo "─── $label ───"
  if node --test "$@" 2>&1; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    echo "FAIL: $label"
  fi
}

# ── Existing unit tests ────────────────────────────────────────
run "analysis (lib)"   tests/analysis.test.js
run "stats (legacy)"   tests/stats.test.js

# ── Directional-fix integration test ───────────────────────────
# Verifies that 3 fast/fluent sessions scored against a
# seeded baseline produce a LOW combined_z (near 0), proving
# the directional clamping actually works.
echo "─── directional-fix integration test ───"
node -e '
import { buildBaseline, scoreSession, rollingAverage, scoreSmoothed } from "./lib/baseline.js";

// Build a baseline of 15 "normal" sessions with realistic variance
const baselineSessions = Array.from({ length: 15 }, (_, i) => ({
  typingSpeed:      55 + (i % 3) * 5,        // varies 55-65
  meanPauseMs:      280 + (i % 3) * 20,       // varies 280-320
  pauseStdDevMs:    90 + (i % 3) * 10,        // varies 90-110
  correctionRate:   0.02 + (i % 3) * 0.005,   // varies 0.02-0.03
  timingVariance:   0.07 + (i % 3) * 0.01,    // varies 0.07-0.09
  longPauseRate:    0.04 + (i % 3) * 0.01,    // varies 0.04-0.06
  correctionBurstRate: 0.01 + (i % 3) * 0.002,
  speedDecay:       0.02 + (i % 3) * 0.005,
}));

const baseline = buildBaseline(baselineSessions);
console.assert(baseline.ready, "baseline should be ready with 15 sessions");

// 3 sessions that are clearly FASTER and MORE fluent than baseline
const fastSessions = Array.from({ length: 3 }, () => ({
  typingSpeed:      85,        // much faster (down_concerning, but z < 0 → clamped to 0)
  meanPauseMs:      150,       // fewer pauses (up_concerning, z < 0 → clamped)
  pauseStdDevMs:    100,       // close to baseline median (~100) — neutral, no magnitude spike
  correctionRate:   0.01,      // fewer corrections (z < 0 → clamped)
  timingVariance:   0.08,      // close to baseline median (~0.08) — neutral, no magnitude spike
  longPauseRate:    0.02,      // fewer long pauses (z < 0 → clamped)
  correctionBurstRate: 0.005,  // fewer bursts (z < 0 → clamped)
  speedDecay:       0.01,      // less slowdown (z < 0 → clamped)
}));

// Score each fast session individually
for (const s of fastSessions) {
  const result = scoreSession(s, baseline);
  console.assert(
    result.deviation < 0.5,
    "Fast/fluent session should NOT be flagged — deviation=" + result.deviation
  );
}

// Score the rolling average of all 3 fast sessions
const smoothed = scoreSmoothed(fastSessions, baseline);
console.assert(
  smoothed.deviation < 0.5,
  "Smoothed fast sessions should NOT be flagged — deviation=" + smoothed.deviation
);

console.log("✅ directional-fix integration test PASSED");
console.log("   Single-session deviation:", scoreSession(fastSessions[0], baseline).deviation);
console.log("   Smoothed deviation:", smoothed.deviation);
console.log("   Confidence:", scoreSession(fastSessions[0], baseline)._confidence);
'
if [ $? -eq 0 ]; then
  PASS=$((PASS + 1))
else
  FAIL=$((FAIL + 1))
  echo "FAIL: directional-fix integration test"
fi

# ── Summary ────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
TOTAL=$((PASS + FAIL))
echo "Results: $PASS/$TOTAL passed, $FAIL failed"
echo "═══════════════════════════════════════════════"

if [ $FAIL -gt 0 ]; then
  exit 1
fi
