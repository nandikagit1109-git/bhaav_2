import React, { useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Motion system — one shared vocabulary of timing and easing.
 * Everything here respects prefers-reduced-motion by rendering
 * without the entrance transform when the user opts out.
 */

export const EASE = [0.22, 1, 0.36, 1];

const stripPunct = (w) => String(w).replace(/[.,!?;:'"\u2019\u2018]+/g, '').toLowerCase();

/**
 * AccentText — renders a string with selected words in the vivid accent
 * (italic, vermilion). accent: array of words to highlight, punctuation-insensitive.
 */
export function AccentText({ text, accent = [], className = '' }) {
  const words = String(text).split(' ');
  return (
    <span className={className}>
      {words.map((word, i) => {
        const isAccent = accent.some((a) => stripPunct(a) === stripPunct(word));
        return (
          <React.Fragment key={`${word}-${i}`}>
            {i > 0 ? ' ' : ''}
            {isAccent ? <span className="text-accent-pop italic">{word}</span> : word}
          </React.Fragment>
        );
      })}
    </span>
  );
}

export function FadeUp({ children, delay = 0, y = 26, className = '', once = true, amount = 0.35 }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration: 0.75, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Word-by-word reveal for display headlines.
 * Splits on spaces; preserves the exact rendered text for a11y via aria-label.
 */
export function RevealWords({ text, className = '', delay = 0, stagger = 0.055, as = 'h2', accent = [] }) {
  const reduced = useReducedMotion();
  const Tag = motion[as] || motion.h2;
  const words = text.split(' ');

  if (reduced) {
    const Plain = as;
    return <Plain className={className}><AccentText text={text} accent={accent} /></Plain>;
  }

  return (
    <Tag
      className={className}
      aria-label={text}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.4 }}
      transition={{ staggerChildren: stagger, delayChildren: delay }}
    >
      {words.map((word, i) => (
        <span key={`${word}-${i}`} aria-hidden="true" className="inline-block overflow-hidden align-bottom">
          <motion.span
            className={`inline-block ${accent.some((a) => stripPunct(a) === stripPunct(word)) ? 'text-accent-pop italic pr-[0.06em]' : ''}`}
            variants={{
              hidden: { y: '110%', opacity: 0 },
              visible: { y: '0%', opacity: 1 },
            }}
            transition={{ duration: 0.85, ease: EASE }}
          >
            {word}
            {i < words.length - 1 ? '\u00A0' : ''}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/** Tiny mono section marker: "01 / WRITE" */
export function SectionMark({ index, label, className = '' }) {
  return (
    <FadeUp className={`flex items-center gap-3 ${className}`} y={12}>
      <span className="w-1.5 h-1.5 rounded-full bg-accent-terracotta" aria-hidden="true" />
      <span className="eyebrow">
        {index} / {label}
      </span>
    </FadeUp>
  );
}

/** A thin horizontal rule that draws itself in from the left. */
export function InkRule({ className = '', delay = 0 }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={`h-px bg-ink-800 origin-left ${className}`}
      initial={reduced ? false : { scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 0.8 }}
      transition={{ duration: 1.1, delay, ease: EASE }}
      aria-hidden="true"
    />
  );
}

/**
 * Hand-drawn ink path that draws itself when scrolled into view.
 * Props: d (path), stroke, width, delay, duration, viewBox passthrough via svgProps.
 */
export function InkPath({
  d,
  stroke = '#1E1B16',
  width = 1.6,
  delay = 0,
  duration = 1.6,
  className = '',
  svgProps = {},
  opacity = 1,
}) {
  const reduced = useReducedMotion();
  return (
    <svg viewBox="0 0 600 120" fill="none" className={className} aria-hidden="true" {...svgProps}>
      <motion.path
        d={d}
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity }}
        initial={reduced ? false : { pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ pathLength: { duration, delay, ease: 'easeInOut' }, opacity: { duration: 0.3, delay } }}
      />
    </svg>
  );
}

/** Hook: is the visitor on a touch/coarse pointer device? */
export function useCoarsePointer() {
  const ref = useRef(typeof window !== 'undefined' && window.matchMedia
    && window.matchMedia('(pointer: coarse)').matches);
  return ref.current;
}
