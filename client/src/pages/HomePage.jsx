import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useReducedMotion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDown, ChevronDown } from 'lucide-react';
import TheLineYouWalkHero from '../components/TheLineYouWalkHero';
import {
  FadeUp,
  RevealWords,
  SectionMark,
  InkRule,
  InkPath,
} from '../motion/primitives';

/* ——— Full-bleed editorial marquee band — the color-pop moments ——— */

function MarqueeBand({ items, dark = false }) {
  const half = (key) => (
    <span key={key} className="font-mono text-[11px] uppercase tracking-[0.3em] whitespace-nowrap">
      {items.map((it, i) => (
        <span key={i}>
          {i > 0 && <span aria-hidden="true" className="mx-8 opacity-40">·</span>}
          {it}
        </span>
      ))}
      <span aria-hidden="true" className="mx-8 opacity-40">·</span>
    </span>
  );
  return (
    <div className={`marquee ${dark ? 'marquee-ink' : ''}`} aria-hidden="true">
      <div className="marquee-track">
        {half('a')}
        {half('b')}
      </div>
    </div>
  );
}

/* ————————————————— CHAPTER 02 — the question ————————————————— */

function ChapterQuestion() {
  return (
    <section className="py-28 sm:py-44">
      <SectionMark index="02" label="The question" />
      <div className="mt-10 sm:mt-16">
        <RevealWords
          as="h2"
          text="What if you didn't have to say how you feel?"
          accent={['feel']}
          className="text-display-section font-serif uppercase text-ink-950 max-w-5xl"
        />
        <FadeUp delay={0.35} className="mt-10 max-w-md sm:ml-[38%]">
          <p className="font-serif italic text-xl sm:text-2xl text-ink-600 leading-relaxed">
            Most tools ask you to perform your distress — rate it, type it, explain it.
            Bhaav starts somewhere quieter.
          </p>
        </FadeUp>
      </div>
    </section>
  );
}

/* ————————————————— CHAPTER 03 — the five signals ————————————————— */

const SIGNALS = [
  { n: '01', name: 'Typing speed', note: 'How fast your hands move when they move.' },
  { n: '02', name: 'Pause rhythm', note: 'The length of the silences between words.' },
  { n: '03', name: 'Pause variation', note: 'Whether those silences are steady or scattered.' },
  { n: '04', name: 'Corrections', note: 'How often you go back and take words away.' },
  { n: '05', name: 'Timing variability', note: 'The overall irregularity of your cadence.' },
];

function ChapterSignals() {
  return (
    <section className="py-28 sm:py-40">
      <SectionMark index="03" label="What we notice" />
      <div className="mt-10 sm:mt-16">
        <RevealWords
          as="h2"
          text="We notice rhythm."
          accent={['rhythm']}
          className="text-display-section font-serif uppercase text-ink-950"
        />
        <FadeUp delay={0.3} className="mt-6 max-w-lg">
          <p className="text-sm sm:text-base text-ink-600 leading-relaxed">
            Not your words — the shape of your writing. Five quiet signals, measured
            in your browser, never leaving as text.
          </p>
        </FadeUp>

        {/* The line the signals live on */}
        <div className="mt-16">
          <InkPath
            d="M6 60 C 90 30, 150 84, 240 56 S 400 70, 470 44 S 560 62, 594 54"
            width={1.4}
            duration={2.2}
            className="w-full h-16 sm:h-20 text-ink-800"
            opacity={0.85}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-x-8 gap-y-10 mt-4">
            {SIGNALS.map((s, i) => (
              <FadeUp key={s.n} delay={0.12 * i} className="relative">
                <span
                  aria-hidden="true"
                  className="hidden lg:block absolute -top-11 left-0 w-px h-8 bg-ink-300"
                />
                <span className="absolute -top-[3.42rem] left-[-2.5px] hidden lg:block w-1.5 h-1.5 rounded-full bg-accent-terracotta" />
                <div className="eyebrow text-ink-400">{s.n}</div>
                <h3 className="font-serif text-xl sm:text-2xl text-ink-950 mt-1.5">{s.name}</h3>
                <p className="text-xs text-ink-500 leading-relaxed mt-2 max-w-[16rem]">{s.note}</p>
              </FadeUp>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ————————————————— CHAPTER 04 — sticky baseline story ————————————————— */

const STAGES = [
  {
    mark: 'Your rhythm',
    line: 'Every session leaves a line.',
    note: 'The way your hands move on an ordinary Tuesday.',
  },
  {
    mark: 'Your baseline',
    line: 'Bhaav learns your usual.',
    note: 'A personal corridor — mean and variation, from your own history only.',
  },
  {
    mark: 'Today',
    line: 'Then a new session arrives.',
    note: 'Compared with your corridor, never with anyone else\u2019s.',
  },
  {
    mark: 'A difference',
    line: 'Sometimes, the line walks away.',
    note: 'Farther from your usual than it usually goes. That is all we claim.',
  },
];

function BaselineStageArt({ stage }) {
  /* Four small SVGs, one per stage, crossfaded by scroll. */
  if (stage === 0) {
    return (
      <InkPath
        d="M6 60 C 80 44, 140 72, 220 58 S 380 62, 460 50 S 560 58, 594 54"
        width={1.6}
        duration={1.4}
        className="w-full h-28"
      />
    );
  }
  if (stage === 1) {
    return (
      <svg viewBox="0 0 600 120" className="w-full h-28" aria-hidden="true">
        <rect x="10" y="34" width="580" height="52" fill="#EFE9DD" opacity="0.7" />
        <line x1="10" y1="34" x2="590" y2="34" stroke="#B5AD99" strokeWidth="0.6" strokeDasharray="2 6" />
        <line x1="10" y1="86" x2="590" y2="86" stroke="#B5AD99" strokeWidth="0.6" strokeDasharray="2 6" />
        <path
          d="M6 60 C 80 44, 140 72, 220 58 S 380 62, 460 50 S 560 58, 594 54"
          fill="none"
          stroke="#1E1B16"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (stage === 2) {
    return (
      <svg viewBox="0 0 600 120" className="w-full h-28" aria-hidden="true">
        <rect x="10" y="34" width="580" height="52" fill="#EFE9DD" opacity="0.5" />
        <path
          d="M6 60 C 80 44, 140 72, 220 58 S 380 62, 460 50 S 560 58, 594 54"
          fill="none"
          stroke="#B5AD99"
          strokeWidth="1.2"
          strokeDasharray="3 5"
        />
        <path
          d="M300 58 C 360 52, 420 60, 480 40 S 560 24, 594 22"
          fill="none"
          stroke="#B45A3C"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="300" cy="58" r="3.4" fill="#B45A3C" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 600 120" className="w-full h-28" aria-hidden="true">
      <rect x="10" y="34" width="580" height="52" fill="#EFE9DD" opacity="0.5" />
      <path
        d="M6 60 C 80 44, 140 72, 220 58 S 380 62, 460 50 S 560 58, 594 54"
        fill="none"
        stroke="#B5AD99"
        strokeWidth="1.2"
        strokeDasharray="3 5"
      />
      <path
        d="M280 58 C 340 46, 400 34, 460 22 S 560 10, 594 12"
        fill="none"
        stroke="#B45A3C"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <text x="470" y="104" fontFamily="JetBrains Mono" fontSize="9" fill="#77715F" letterSpacing="2">
        FARTHER THAN USUAL
      </text>
    </svg>
  );
}

function ChapterBaseline() {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  const o0 = useTransform(scrollYProgress, [0, 0.2, 0.3], [1, 1, 0]);
  const o1 = useTransform(scrollYProgress, [0.22, 0.32, 0.45, 0.55], [0, 1, 1, 0]);
  const o2 = useTransform(scrollYProgress, [0.47, 0.57, 0.7, 0.8], [0, 1, 1, 0]);
  const o3 = useTransform(scrollYProgress, [0.72, 0.82, 1], [0, 1, 1]);
  const opacities = [o0, o1, o2, o3];

  return (
    <section ref={ref} className="relative" style={{ height: reduced ? 'auto' : '320vh' }}>
      <div className={reduced ? '' : 'sticky top-0 min-h-screen flex items-center py-24'}>
        <div className="w-full max-w-6xl mx-auto px-5 sm:px-8">
          <SectionMark index="04" label="How it reads you" />
          <div className="mt-12 grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
            {/* Stacked statements crossfaded by scroll */}
            <div className="relative">
              {STAGES.map((s, i) => (
                <motion.div
                  key={s.mark}
                  style={reduced ? { position: 'static', display: i === 0 ? 'block' : 'none' } : { opacity: opacities[i] }}
                  className={reduced ? '' : 'absolute inset-0'}
                >
                  <div className="eyebrow text-accent-terracotta">{s.mark}</div>
                  <h3 className="text-display-statement font-serif text-ink-950 mt-3">{s.line}</h3>
                  <p className="text-sm text-ink-600 leading-relaxed mt-5 max-w-md">{s.note}</p>
                </motion.div>
              ))}
              {/* Reserve height so absolute layers don't collapse */}
              {!reduced && <div aria-hidden="true" className="invisible">
                <div className="eyebrow">Placeholder</div>
                <h3 className="text-display-statement font-serif">Placeholder line</h3>
              </div>}
            </div>

            {/* Stage art */}
            <div className="relative">
              {STAGES.map((_, i) => (
                <motion.div
                  key={i}
                  style={reduced ? { display: (reduced ? i === 3 : i === 0) ? 'block' : 'none' } : { opacity: opacities[i] }}
                  className={reduced ? '' : 'absolute inset-0 flex items-center'}
                >
                  <BaselineStageArt stage={i} />
                </motion.div>
              ))}
              {!reduced && <div aria-hidden="true" className="invisible h-28" />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ————————————————— CHAPTER 05 — deviation ————————————————— */

function ChapterDeviation() {
  return (
    <section className="py-28 sm:py-40">
      <SectionMark index="05" label="The noticing" />
      <div className="mt-10 sm:mt-16">
        <RevealWords
          as="h2"
          text="Something looked different."
          accent={['different']}
          className="text-display-section font-serif uppercase text-ink-950"
        />
        <div className="mt-12 max-w-3xl">
          <InkPath
            d="M6 70 C 70 62, 120 66, 180 62 S 280 66, 330 58 C 370 50, 400 30, 440 22 S 540 12, 594 10"
            stroke="#B45A3C"
            width={1.8}
            duration={2.4}
            className="w-full h-24"
          />
          <FadeUp delay={0.5}>
            <p className="font-serif italic text-xl sm:text-2xl text-ink-700 leading-relaxed mt-6 max-w-xl">
              This is not a score about who you are. It is a distance — how far today&rsquo;s
              rhythm walked from your own usual pattern.
            </p>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}

/* ————————————————— CHAPTER 06 — the pause ————————————————— */

function ChapterShow() {
  return (
    <section className="py-32 sm:py-52">
      <div className="max-w-4xl">
        <RevealWords
          as="h2"
          text="We don't tell you what you feel."
          className="text-display-statement font-serif text-ink-400"
        />
      </div>
      <FadeUp delay={0.4} className="my-16 sm:my-24">
        <InkRule className="w-24" />
      </FadeUp>
      <div className="max-w-5xl sm:ml-[12%]">
        <RevealWords
          as="h2"
          text="We show you what changed."
          accent={['changed']}
          className="text-display-section font-serif uppercase text-ink-950"
        />
      </div>
    </section>
  );
}

/* ————————————————— CHAPTER 07 — you decide ————————————————— */

const LEVELS = [
  { n: '01', name: 'Awareness', note: 'See your patterns. Nothing more happens.' },
  { n: '02', name: 'Suggestions', note: 'Small, low-pressure observations you can try — or ignore.' },
  { n: '03', name: 'Connection', note: 'Optionally, a pre-drafted note to someone you trust. You always send it yourself.' },
];

function ChapterDecide({ onOpenSettings }) {
  return (
    <section className="py-28 sm:py-40">
      <SectionMark index="06" label="Your control" />
      <div className="mt-10 sm:mt-16">
        <RevealWords
          as="h2"
          text="You decide what happens next."
          accent={['decide']}
          className="text-display-section font-serif uppercase text-ink-950 max-w-4xl"
        />
      </div>

      <div className="mt-16 border-t border-stone-border">
        {LEVELS.map((l, i) => (
          <FadeUp key={l.n} delay={0.1 * i}>
            <div className="group grid grid-cols-[3rem_1fr] sm:grid-cols-[5rem_16rem_1fr] gap-4 sm:gap-8 items-baseline py-7 border-b border-stone-border">
              <span className="eyebrow text-ink-400">{l.n}</span>
              <h3 className="font-serif text-2xl sm:text-3xl text-ink-950 transition-transform duration-300 group-hover:translate-x-1">
                {l.name}
              </h3>
              <p className="text-sm text-ink-600 leading-relaxed max-w-md col-start-2 sm:col-start-auto">{l.note}</p>
            </div>
          </FadeUp>
        ))}
      </div>

      <FadeUp delay={0.3} className="mt-10">
        <button onClick={onOpenSettings} className="ink-link font-mono text-[11px] uppercase tracking-[0.16em]">
          Choose your level in settings <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </FadeUp>
    </section>
  );
}

/* ————————————————— CHAPTER 08 — privacy ————————————————— */

const STORED = [
  'Typing speed',
  'Pause rhythm',
  'Correction rate',
  'Timing variation',
  'Session timing',
  'Your baseline statistics',
];
const NOT_STORED = [
  'Your journal',
  'Individual characters',
  'Clipboard contents',
  'Passwords',
  'Messages from other apps',
];

function ChapterPrivacy({ onNavigate }) {
  return (
    <section className="py-28 sm:py-40">
      <SectionMark index="07" label="Privacy" />
      <div className="mt-10 sm:mt-16">
        <RevealWords
          as="h2"
          text="Your words stay yours."
          accent={['yours']}
          className="text-display-section font-serif uppercase text-ink-950 max-w-4xl"
        />
      </div>

      <div className="mt-16 grid md:grid-cols-2 gap-12 md:gap-20">
        <FadeUp>
          <div className="eyebrow text-accent-sage">Stored</div>
          <ul className="mt-6">
            {STORED.map((item) => (
              <li key={item} className="font-mono text-xs sm:text-sm text-ink-700 py-3 border-t border-stone-border flex items-center gap-3">
                <span className="w-1 h-1 rounded-full bg-accent-sage flex-shrink-0" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </FadeUp>

        <FadeUp delay={0.15}>
          <div className="eyebrow text-ink-400">Never stored</div>
          <ul className="mt-6">
            {NOT_STORED.map((item) => (
              <li key={item} className="font-mono text-xs sm:text-sm text-ink-400 line-through decoration-ink-300 py-3 border-t border-stone-border/70 flex items-center gap-3">
                <span className="w-1 h-1 rounded-full bg-ink-300 flex-shrink-0" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </FadeUp>
      </div>

      <FadeUp delay={0.25} className="mt-12">
        <button
          onClick={() => onNavigate('privacy')}
          className="ink-link font-mono text-[11px] uppercase tracking-[0.16em]"
        >
          Read the full privacy architecture <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </FadeUp>
    </section>
  );
}

/* ————————————————— CHAPTER 09 — campus pulse ————————————————— */

function ChapterCampus({ onNavigate }) {
  const reduced = useReducedMotion();
  const individual = [
    'M6 70 C 90 50, 170 84, 260 62 S 420 70, 594 48',
    'M6 74 C 100 60, 180 76, 270 66 S 430 58, 594 52',
    'M6 58 C 95 72, 175 52, 265 60 S 425 66, 594 44',
    'M6 66 C 85 54, 165 80, 255 70 S 415 62, 594 56',
    'M6 62 C 110 68, 190 58, 280 58 S 440 74, 594 50',
  ];

  return (
    <section className="py-28 sm:py-40">
      <SectionMark index="08" label="Campus pulse" />

      <div className="mt-10 sm:mt-16 space-y-10">
        <RevealWords
          as="h2"
          text="One person has a rhythm."
          className="text-display-statement font-serif text-ink-800"
        />

        {/* Individual lines drawing in */}
        <div className="space-y-1">
          {individual.map((d, i) => (
            <InkPath
              key={i}
              d={d}
              width={1}
              duration={1.6}
              delay={0.25 * i}
              className="w-full h-8"
              opacity={0.35}
            />
          ))}
        </div>

        <RevealWords
          as="h2"
          text="Many people create a signal."
          accent={['signal']}
          className="text-display-section font-serif uppercase text-ink-950"
          delay={0.1}
        />

        {/* Aggregate line draws after the individuals */}
        <div className="relative">
          {!reduced && (
            <div aria-hidden="true" className="absolute inset-x-0 top-0 space-y-1 opacity-25">
              {individual.map((d, i) => (
                <svg key={i} viewBox="0 0 600 120" className="w-full h-8" fill="none">
                  <path d={d} stroke="#77715F" strokeWidth="1" strokeLinecap="round" />
                </svg>
              ))}
            </div>
          )}
          <InkPath
            d="M6 62 C 100 58, 200 62, 300 56 S 480 46, 594 42"
            stroke="#B45A3C"
            width={2.2}
            duration={2.2}
            delay={1.4}
            className="relative w-full h-8"
          />
        </div>

        <FadeUp delay={0.4} className="grid md:grid-cols-2 gap-10 md:gap-20 items-start">
          <p className="font-serif italic text-xl sm:text-2xl text-ink-700 leading-relaxed">
            See the direction of a campus without seeing the people inside it.
          </p>
          <div>
            <p className="text-sm text-ink-600 leading-relaxed">
              Individual lines dissolve into one anonymous aggregate. The server refuses to
              show anything until at least ten people have opted in — a privacy floor
              enforced in code, not in promises.
            </p>
            <button
              onClick={() => onNavigate('campus')}
              className="ink-link font-mono text-[11px] uppercase tracking-[0.16em] mt-6"
            >
              See Campus Pulse <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

/* ————————————————— CHAPTER 10 — the line continues ————————————————— */

function ChapterEnd({ onNavigate }) {
  return (
    <section className="py-32 sm:py-48">
      <SectionMark index="09" label="Begin" />
      <div className="mt-12">
        <RevealWords
          as="h2"
          text="The line continues."
          accent={['continues']}
          className="text-display-hero font-serif uppercase text-ink-950"
        />
        <FadeUp delay={0.35} className="mt-12 flex flex-col sm:flex-row sm:items-center gap-8 sm:gap-12">
          <button onClick={() => onNavigate('journal')} className="btn-ink">
            Start writing <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
          <p className="text-xs text-ink-500 max-w-xs leading-relaxed">
            Bhaav doesn&rsquo;t tell you how to feel. It helps you notice your own pattern —
            and leaves the rest to you.
          </p>
        </FadeUp>
      </div>
    </section>
  );
}

/* ————————————————— FAQ ————————————————— */

const FAQ_ITEMS = [
  {
    q: 'Does Bhaav read what I write?',
    a: 'No. Bhaav never sees, stores, or transmits your journal text. It only measures behavioral metadata — typing speed, pause patterns, correction rate, and timing variability — all computed locally in your browser. Your words exist only in the textarea and vanish the moment you end a session.',
  },
  {
    q: 'How much support can I choose?',
    a: 'Three levels, and you can change anytime. Awareness only (just the data), Awareness + suggestions (weekly observations you can try or ignore), or Awareness + connection (a pre-drafted note you can share with someone you trust). You are always in control.',
  },
  {
    q: 'Is this a replacement for therapy?',
    a: 'No. Bhaav is a self-awareness tool, not a clinical instrument. It does not diagnose conditions, provide therapy, or replace professional care. It helps you notice your own patterns — nothing more.',
  },
  {
    q: 'What happens to my data?',
    a: 'Your typing metadata is stored in our server database. You can export everything at any time to verify — you will find zero bytes of journal text. You can also delete everything permanently from Settings or the Privacy page.',
  },
  {
    q: 'Is it free?',
    a: 'Yes. Bhaav is free to use. There are no hidden costs, no premium tiers, and no ads.',
  },
];

function ChapterFAQ() {
  const [openIdx, setOpenIdx] = useState(null);
  return (
    <section className="py-28 sm:py-40">
      <SectionMark index="10" label="Questions" />
      <div className="mt-10 sm:mt-16">
        <RevealWords
          as="h2"
          text="Frequently asked questions."
          className="text-display-section font-serif uppercase text-ink-950 max-w-4xl"
        />
      </div>
      <div className="mt-12 border-t border-stone-border">
        {FAQ_ITEMS.map((item, i) => (
          <FadeUp key={i} delay={0.05 * i}>
            <div className="border-b border-stone-border">
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full text-left py-5 flex items-center justify-between gap-4 group"
                aria-expanded={openIdx === i}
              >
                <span className="font-serif text-lg sm:text-xl text-ink-950 group-hover:text-accent-terracotta transition-colors">
                  {item.q}
                </span>
                <motion.span
                  animate={{ rotate: openIdx === i ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex-shrink-0 text-ink-400"
                >
                  <ChevronDown className="w-5 h-5" />
                </motion.span>
              </button>
              <AnimatePresence>
                {openIdx === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="text-sm text-ink-600 leading-relaxed pb-6 max-w-2xl">
                      {item.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </FadeUp>
        ))}
      </div>
    </section>
  );
}

/* ————————————————— STICKY MOBILE CTA ————————————————— */

function StickyMobileCTA({ onNavigate }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.6);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-0 inset-x-0 z-40 sm:hidden bg-paper-100/95 backdrop-blur-md border-t border-stone-border/70 p-4"
        >
          <button
            onClick={() => onNavigate('journal')}
            className="w-full btn-ink justify-center"
          >
            Start writing <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ————————————————— PAGE ————————————————— */

export default function HomePage({ onNavigate, onOpenSettings, onOpenHowItWorks }) {
  const heroRef = useRef(null);

  const scrollToDemo = () => {
    if (heroRef.current) heroRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="pt-20">
      {/* ——— Poster hero ——— */}
      <section className="min-h-[88vh] flex flex-col justify-center py-16">
        <FadeUp y={12}>
          <div className="flex items-center justify-between border-b border-stone-border pb-4">
            <span className="eyebrow">Bhaav &middot; Personal rhythm &middot; 01</span>
            <span className="eyebrow hidden sm:inline">No mood ratings &middot; No chatbots</span>
          </div>
        </FadeUp>

        <div className="mt-10 sm:mt-14">
          <RevealWords
            as="h1"
            text="Write normally."
            accent={['normally']}
            className="text-display-hero font-serif uppercase text-ink-950"
          />
          <div className="mt-8 sm:mt-12 flex flex-col lg:flex-row lg:items-end justify-between gap-10">
            <RevealWords
              as="p"
              text="We'll tell you what your hands already know."
              accent={['hands']}
              className="font-serif italic text-display-sub text-ink-700 max-w-2xl"
              delay={0.3}
              stagger={0.04}
            />
            <FadeUp delay={0.6} className="flex flex-col items-start gap-6 lg:items-end lg:text-right">
              <p className="text-sm text-ink-600 leading-relaxed max-w-xs lg:ml-auto">
                Bhaav notices changes in how you write — never what you write — and reflects
                them against your own baseline.
              </p>
              <div className="flex items-center gap-6">
                <button onClick={onOpenHowItWorks} className="ink-link font-mono text-[11px] uppercase tracking-[0.16em]">
                  How it works
                </button>
                <button onClick={scrollToDemo} className="btn-ghost">
                  Try the demo <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      <InkRule className="max-w-6xl mx-auto" />

      {/* ——— Chapter 01: the live demo ——— */}
      <div ref={heroRef} id="hero-demo">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <TheLineYouWalkHero
            onNavigateToJournal={() => onNavigate('journal')}
            onNavigateToDashboard={() => onNavigate('dashboard')}
          />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <ChapterQuestion />
        <InkRule />
        <ChapterSignals />
        <InkRule />
        <ChapterBaseline />
        <ChapterDeviation />
      </div>

      <MarqueeBand
        items={[
          'Write normally',
          'Notice what changes',
          'No mood ratings',
          'No chatbots',
          'Your words stay yours',
        ]}
      />

      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <ChapterShow />
        <InkRule />
        <ChapterDecide onOpenSettings={onOpenSettings} />
        <InkRule />
        <ChapterPrivacy onNavigate={onNavigate} />
        <InkRule />
        <ChapterCampus onNavigate={onNavigate} />
        <InkRule />
        <ChapterFAQ />
        <InkRule />
      </div>

      <MarqueeBand
        dark
        items={[
          'One line per session',
          'Your baseline, not a benchmark',
          'You decide what happens next',
          'The line continues',
        ]}
      />

      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <ChapterEnd onNavigate={onNavigate} />
      </div>

      {/* ——— Sticky mobile CTA ——— */}
      <StickyMobileCTA onNavigate={onNavigate} />
    </div>
  );
}
