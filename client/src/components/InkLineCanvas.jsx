import React, { useEffect, useRef } from 'react';

/**
 * InkLineCanvas
 * 
 * Signature living ink line responding organically to human typing physics.
 * Interpolates velocity, pause hesitation, and rhythm variability like
 * sumi ink flowing across textured paper.
 */
export default function InkLineCanvas({
  speed = 0,
  pauseDuration = 0,
  variance = 0.14,
  isTyping = false,
  strokeColor = "rgba(20, 18, 14, 0.92)",
  guideColor = "rgba(229, 223, 211, 0.5)",
  className = "w-full h-44 sm:h-52"
}) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    points: [],
    x: 0,
    y: 0,
    targetY: 0,
    velocity: 1.0,
    inkWidth: 2.0,
    lastTime: performance.now(),
    accumulatedTime: 0
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;

    const state = stateRef.current;
    if (state.points.length === 0) {
      state.x = 24;
      state.y = centerY;
      state.targetY = centerY;
      state.points.push({ x: 24, y: centerY, width: 2.0, opacity: 0.9 });
    }

    const render = (time) => {
      const dt = Math.min((time - state.lastTime) / 1000, 0.1);
      state.lastTime = time;
      state.accumulatedTime += dt;

      // Dynamics based on typing physics
      const effectiveSpeed = Math.max(12, Math.min(speed || (isTyping ? 48 : 22), 140));
      const targetSpeedPixels = (effectiveSpeed / 60) * 85;
      state.velocity += (targetSpeedPixels - state.velocity) * 0.09;

      state.x += state.velocity * dt;

      // Wrap around gently
      if (state.x > width - 24) {
        state.x = 24;
        state.points = [{ x: 24, y: state.y, width: 2.0, opacity: 0.9 }];
      }

      // Organic rhythm oscillation
      const cadenceFactor = 1 + (variance * 3.8);
      const waveFreq = 2.1 * cadenceFactor;
      const baseWave = Math.sin(state.accumulatedTime * waveFreq) * (height * 0.15);

      // Long pause dampens line and turns into a settled bead
      const pauseDampening = pauseDuration > 500 ? Math.max(0.1, 1 - (pauseDuration / 1800)) : 1.0;
      state.targetY = centerY + (baseWave * pauseDampening);

      if (isTyping) {
        // Micro-jitter representing human touch
        state.targetY += (Math.random() - 0.5) * (variance * 22);
      }

      state.y += (state.targetY - state.y) * 0.14;

      // Dynamic stroke width: finer when fast, pooled when slow
      const targetWidth = Math.max(1.0, Math.min(4.2, 3.6 - (state.velocity / 75)));
      state.inkWidth += (targetWidth - state.inkWidth) * 0.1;

      state.points.push({
        x: state.x,
        y: state.y,
        width: state.inkWidth,
        opacity: isTyping ? 0.95 : 0.75
      });

      if (state.points.length > 260) {
        state.points.shift();
      }

      ctx.clearRect(0, 0, width, height);

      // Whispering hairline guideline
      ctx.beginPath();
      ctx.strokeStyle = guideColor;
      ctx.lineWidth = 0.75;
      ctx.setLineDash([3, 8]);
      ctx.moveTo(24, centerY);
      ctx.lineTo(width - 24, centerY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Fluid Bezier ink stroke
      const pts = state.points;
      if (pts.length > 2) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const FRESH_TAIL = 44; // newest segment rendered as vivid "wet ink"
        for (let i = 1; i < pts.length - 1; i++) {
          const xc = (pts[i].x + pts[i + 1].x) / 2;
          const yc = (pts[i].y + pts[i + 1].y) / 2;

          const freshIdx = i - (pts.length - 1 - FRESH_TAIL);
          const isFresh = freshIdx > 0;

          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);

          ctx.strokeStyle = isFresh
            ? `rgba(224, 85, 47, ${(0.35 + 0.65 * (freshIdx / FRESH_TAIL)).toFixed(3)})`
            : strokeColor;
          ctx.lineWidth = pts[i].width * (isFresh ? 1.12 : 1);
          ctx.stroke();
        }

        // Active ink tip
        const tip = pts[pts.length - 1];
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, isTyping ? tip.width * 1.25 : tip.width * 0.9, 0, Math.PI * 2);
        ctx.fillStyle = isTyping ? '#B45A3C' : '#1E1B16';
        ctx.fill();

        // Tranquil ink pool if paused
        if (pauseDuration > 650) {
          const ripple = Math.min(16, tip.width + (pauseDuration / 130));
          ctx.beginPath();
          ctx.arc(tip.x, tip.y, ripple, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(180, 90, 60, 0.25)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [speed, pauseDuration, variance, isTyping, strokeColor, guideColor]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
