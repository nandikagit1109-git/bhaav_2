import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
} from 'recharts';
import { InkPath } from '../motion/primitives';

/* Editorial palette (matches tailwind.config tokens) */
const INK = '#1E1B16';
const INK_SOFT = '#948D79';
const HAIRLINE = '#E2DBCB';
const CORRIDOR = '#EFE9DD';
const SAGE = '#5A7A62';
const OCHRE = '#A8842C';
const TERRACOTTA = '#B45A3C';
const CORAL = '#FF6B4A';
const INDIGO = '#4F46E5';
const PAPER = '#FBF9F4';

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;

  const dateStr = data.created_at
    ? new Date(data.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : `Session #${data.index + 1}`;

  return (
    <div className="bg-paper-50 border border-stone-border px-4 py-3 shadow-paper-md text-xs max-w-[15rem] font-sans">
      <div className="eyebrow">{dateStr}</div>
      <div className="flex justify-between items-baseline mt-2">
        <span className="text-ink-500">Distance</span>
        <span className="font-mono font-medium text-ink-950">{Math.round(data.deviation_score)} / 100</span>
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-ink-500">Speed</span>
        <span className="font-mono text-ink-700">{Math.round(data.typing_speed)} wpm</span>
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-ink-500">Mean pause</span>
        <span className="font-mono text-ink-700">{Math.round(data.mean_pause_ms)}ms</span>
      </div>
      <div className="mt-2 pt-2 border-t border-stone-border/60 text-[10px] text-ink-400">
        Compared to your own baseline only.
      </div>
    </div>
  );
}

function CustomDot(props) {
  const { cx, cy, payload } = props;
  const d = payload.deviation_score;
  let fill = SAGE;
  let r = 3;

  if (d >= 60) {
    fill = TERRACOTTA;
    r = 4.5;
  } else if (d >= 35) {
    fill = OCHRE;
    r = 4;
  }

  return (
    <g>
      {d >= 60 && <circle cx={cx} cy={cy} r={9} fill="rgba(180, 90, 60, 0.14)" />}
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke={PAPER} strokeWidth={1.5} />
    </g>
  );
}

export default function TrendChart({ sessions = [], className = 'w-full', onNavigateToJournal }) {
  if (!sessions || sessions.length === 0) {
    return (
      <div className={`py-10 ${className}`}>
        <InkPath
          d="M6 60 C 100 40, 200 78, 300 60 S 500 62, 594 56"
          className="w-full h-20 opacity-50"
          width={1.2}
        />
        <h4 className="font-serif text-xl text-ink-800 mt-4">The line begins with your first session.</h4>
        <p className="text-xs text-ink-500 max-w-sm mt-2 leading-relaxed">
          Write once, and a single point appears. A few more, and your corridor emerges.
        </p>
        {onNavigateToJournal && (
          <button
            onClick={onNavigateToJournal}
            className="ink-link font-mono text-[11px] uppercase tracking-[0.16em] mt-5"
          >
            Write the first line
          </button>
        )}
      </div>
    );
  }

  const chartData = sessions.map((s, idx) => ({
    ...s,
    index: idx,
    label: s.created_at
      ? new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : `#${idx + 1}`,
  }));

  return (
    <div className={className}>
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-6">
        <div>
          <div className="eyebrow">The line, over time</div>
          <h3 className="font-serif text-xl sm:text-2xl text-ink-950 mt-1">
            Distance from your usual rhythm.
          </h3>
        </div>
        <div className="flex items-center gap-5 eyebrow">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-2.5 bg-[#EFE9DD] border border-[#E2DBCB]" aria-hidden="true" />
            Usual corridor
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B45A3C]" aria-hidden="true" />
            Meaningful shift
          </span>
        </div>
      </div>

      <div className="w-full h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 8, left: -28, bottom: 0 }}>
            <ReferenceArea y1={0} y2={35} fill={CORRIDOR} fillOpacity={0.7} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: HAIRLINE }}
              tick={{ fill: INK_SOFT, fontSize: 10, fontFamily: 'JetBrains Mono' }}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fill: INK_SOFT, fontSize: 10, fontFamily: 'JetBrains Mono' }}
              ticks={[0, 50, 100]}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: HAIRLINE, strokeWidth: 1 }} />
            <defs>
              <linearGradient id="inkGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CORAL} stopOpacity={0.15} />
                <stop offset="100%" stopColor={INDIGO} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="deviation_score"
              fill="url(#inkGradient)"
              stroke="none"
              animationDuration={900}
            />
            <Line
              type="monotone"
              dataKey="deviation_score"
              stroke={INK}
              strokeWidth={1.6}
              dot={<CustomDot />}
              activeDot={{ r: 5, stroke: PAPER, strokeWidth: 1.5, fill: CORAL }}
              animationDuration={900}
              animationEasing="ease-out"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
