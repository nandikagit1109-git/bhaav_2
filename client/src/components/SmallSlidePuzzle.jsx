import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * SmallSlidePuzzle — a 3x3 sliding tile puzzle (8 tiles + 1 blank).
 * No timer, no move counter, no win/lose framing.
 * On solve: tiles glow ochre, then a warm line appears.
 * "Shuffle again" always available, no attempt limit.
 *
 * Uses ink-line/paper visual style — thin borders, serif numerals,
 * color reserved for the solve moment only.
 */

const SIZE = 3;
const SOLVED = [1, 2, 3, 4, 5, 6, 7, 8, 0]; // 0 = blank

function isSolvable(tiles) {
  let inversions = 0;
  for (let i = 0; i < tiles.length; i++) {
    for (let j = i + 1; j < tiles.length; j++) {
      if (tiles[i] && tiles[j] && tiles[i] > tiles[j]) inversions++;
    }
  }
  return inversions % 2 === 0;
}

function shuffleTiles() {
  let tiles;
  do {
    tiles = [...SOLVED];
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
  } while (!isSolvable(tiles) || arraysEqual(tiles, SOLVED));
  return tiles;
}

function arraysEqual(a, b) {
  return a.every((v, i) => v === b[i]);
}

function getMovable(tiles, blankIdx) {
  const row = Math.floor(blankIdx / SIZE);
  const col = blankIdx % SIZE;
  const movable = [];
  if (row > 0) movable.push(blankIdx - SIZE); // up
  if (row < SIZE - 1) movable.push(blankIdx + SIZE); // down
  if (col > 0) movable.push(blankIdx - 1); // left
  if (col < SIZE - 1) movable.push(blankIdx + 1); // right
  return movable;
}

const EASE = [0.22, 1, 0.36, 1];

export default function SmallSlidePuzzle() {
  const reduced = useReducedMotion();
  const [tiles, setTiles] = useState(() => shuffleTiles());
  const [solved, setSolved] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const messageTimer = useRef(null);

  useEffect(() => {
    return () => { if (messageTimer.current) clearTimeout(messageTimer.current); };
  }, []);

  useEffect(() => {
    if (arraysEqual(tiles, SOLVED)) {
      setSolved(true);
      messageTimer.current = setTimeout(() => setShowMessage(true), 800);
    }
  }, [tiles]);

  const blankIdx = tiles.indexOf(0);
  const movable = getMovable(tiles, blankIdx);

  const handleMove = useCallback((tileIdx) => {
    if (solved) return;
    if (!movable.includes(tileIdx)) return;
    setTiles((prev) => {
      const next = [...prev];
      [next[blankIdx], next[tileIdx]] = [next[tileIdx], next[blankIdx]];
      return next;
    });
  }, [solved, movable, blankIdx]);

  const handleShuffle = useCallback(() => {
    setSolved(false);
    setShowMessage(false);
    if (messageTimer.current) clearTimeout(messageTimer.current);
    setTiles(shuffleTiles());
  }, []);

  // Keyboard support
  const handleKeyDown = useCallback((e, tileIdx) => {
    if (!movable.includes(tileIdx)) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleMove(tileIdx);
    }
  }, [movable, handleMove]);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <span className="eyebrow text-[var(--play-sage)]">Small slide</span>
        <button
          onClick={handleShuffle}
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400 hover:text-ink-700 transition-colors duration-300"
        >
          {solved ? 'Shuffle again' : 'Shuffle'}
        </button>
      </div>

      {/* Tile grid */}
      <div className="slide-grid mx-auto" role="grid" aria-label="Sliding puzzle grid">
        {tiles.map((tile, idx) => {
          const isBlank = tile === 0;
          const isMovable = movable.includes(idx) && !solved;
          const isSolvedGlow = solved && !isBlank;

          return (
            <motion.button
              key={tile}
              layout={!reduced}
              transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 28 }}
              onClick={() => handleMove(idx)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              disabled={isBlank || solved}
              className={`slide-tile ${
                isBlank ? 'blank' : ''
              } ${isMovable ? 'movable' : ''} ${
                isSolvedGlow && showMessage ? 'solved-glow' : ''
              }`}
              style={{ aspectRatio: '1/1' }}
              role={isBlank ? undefined : 'gridcell'}
              aria-label={isBlank ? 'Blank space' : `Tile ${tile}`}
              tabIndex={isMovable ? 0 : -1}
              whileHover={isMovable ? { scale: 1.04 } : {}}
              whileTap={isMovable ? { scale: 0.96 } : {}}
            >
              {!isBlank && tile}
            </motion.button>
          );
        })}
      </div>

      {/* Solve message */}
      {showMessage && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mt-4 text-center font-serif italic text-sm text-ink-600 leading-relaxed"
        >
          Solved. No pressure, it was just something to do with your hands.
        </motion.p>
      )}

      {/* Subtle hint before solve */}
      {!solved && (
        <p className="eyebrow mt-3 text-center text-ink-400">
          Tap a tile next to the blank to slide it
        </p>
      )}
    </div>
  );
}
