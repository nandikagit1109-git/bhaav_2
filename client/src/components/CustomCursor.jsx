import React, { useEffect, useRef, useState } from 'react';

/**
 * CustomCursor — restrained, expensive-feeling pointer.
 * A 5px ink dot tracks instantly; a hairline ring lags behind and
 * expands over interactive elements. Disabled on touch devices and
 * when prefers-reduced-motion is set. The system cursor is hidden
 * via the .has-custom-cursor class (pointer:fine only in CSS) — but
 * only AFTER the custom cursor has painted, so there is never a
 * moment with no visible cursor at all.
 */
export default function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduced) return undefined;

    setEnabled(true);

    const pos = { x: -100, y: -100 };
    const ring = { x: -100, y: -100 };
    let rafId;
    let visible = false;

    // Hide the system cursor ONLY once the custom cursor has actually
    // painted. If anything goes wrong before that (refs not attached yet,
    // no pointer movement yet), the user keeps the normal OS cursor
    // instead of ending up with no cursor at all.
    const show = () => {
      if (visible || !dotRef.current || !ringRef.current) return;
      visible = true;
      dotRef.current.style.opacity = '1';
      ringRef.current.style.opacity = '1';
      document.documentElement.classList.add('has-custom-cursor');
    };

    const onMove = (e) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      show();
    };

    const onOver = (e) => {
      const interactive = e.target.closest('a, button, input, textarea, select, [data-cursor]');
      if (ringRef.current) ringRef.current.classList.toggle('is-active', Boolean(interactive));
    };

    const onDown = () => ringRef.current && ringRef.current.classList.add('is-pressed');
    const onUp = () => ringRef.current && ringRef.current.classList.remove('is-pressed');
    const onLeave = () => {
      visible = false;
      if (dotRef.current) dotRef.current.style.opacity = '0';
      if (ringRef.current) ringRef.current.style.opacity = '0';
      // Give the system cursor back while the pointer is elsewhere.
      document.documentElement.classList.remove('has-custom-cursor');
    };

    const tick = () => {
      ring.x += (pos.x - ring.x) * 0.16;
      ring.y += (pos.y - ring.y) * 0.16;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ring.x}px, ${ring.y}px) translate(-50%, -50%)`;
      }
      rafId = requestAnimationFrame(tick);
    };

    // Capture phase on document: a stopPropagation() inside any component
    // must not be able to starve the cursor of its position updates.
    document.addEventListener('mousemove', onMove, { capture: true, passive: true });
    window.addEventListener('mouseover', onOver, { passive: true });
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    document.documentElement.addEventListener('mouseleave', onLeave);
    rafId = requestAnimationFrame(tick);

    return () => {
      document.removeEventListener('mousemove', onMove, { capture: true });
      window.removeEventListener('mouseover', onOver);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(rafId);
      document.documentElement.classList.remove('has-custom-cursor');
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <div ref={ringRef} className="cursor-ring" style={{ opacity: 0 }} aria-hidden="true" />
      <div ref={dotRef} className="cursor-dot" style={{ opacity: 0 }} aria-hidden="true" />
    </>
  );
}
