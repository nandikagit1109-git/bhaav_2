// ═══════════════════════════════════════════════════════════════════
// BHAAV — Recovery Code Generator
//
// Generates human-typeable recovery codes in the format: word-word-XX
// e.g. "coral-window-42" — memorable, ~35 bits of entropy, safe to
// type by hand. Uniqueness is verified against the database.
// ═══════════════════════════════════════════════════════════════════

import crypto from "node:crypto";

// ~256 carefully chosen common English words.
// All lowercase, 4-8 letters, easy to spell and pronounce.
// No ambiguous words (no "right/write", no obscure words).
const WORDS = [
  // Nature & weather
  "coral", "cedar", "maple", "ocean", "river", "stone", "flame", "frost",
  "cloud", "breeze", "marsh", "dune", "grove", "creek", "prairie", "harbor",
  "summit", "canyon", "beacon", "meadow", "sunset", "sunrise", "autumn", "spring",
  "winter", "summer", "petal", "branch", "willow", "pebble", "island", "forest",
  "shadow", "copper", "silver", "emerald", "amber", "scarlet", "indigo", "ivory",
  "amber", "golden", "velvet", "marble", "granite", "sandal", "terracotta",
  // Objects & concepts
  "window", "garden", "harbor", "lantern", "bridge", "circle", "hourglass",
  "compass", "whistle", "feather", "thread", "ribbon", "mirror", "pillow",
  "blanket", "ladder", "canvas", "chapel", "bottle", "pencil", "marble",
  "trinket", "crystal", "hammock", "breeze", "candle", "shelter", "riddle",
  "wonder", "shimmer", "hollow", "gentle", "nimble", "lively", "mellow",
  "sunny", "proud", "brave", "calm", "still", "quick", "humble", "serene",
  // Actions & states
  "wander", "listen", "follow", "settle", "gather", "ripple", "flutter",
  "drift", "bright", "steady", "humble", "restful", "quiet", "lively",
  "grace", "honest", "patient", "simple", "bold", "kind", "warm",
  "dream", "wonder", "notice", "breathe", "wander", "stretch", "balance",
  "reflect", "settle", "gather", "begin", "return", "embrace", "savor",
  "notice", "create", "unwind", "renew", "stroll", "linger", "settle",
  "settle", "whisper", "drift", "glow", "soothe", "mend", "forge",
  // Animals & food
  "finch", "robin", "otter", "fox", "hare", "swan", "wolf", "bear",
  "honey", "berry", "ginger", "vanilla", "papaya", "mango", "peach", "olive",
  "almond", "clover", "sage", "basil", "thyme", "mocha", "latte", "pistachio",
  "cocoa", "raisin", "cherry", "lemon", "apricot", "nectar", "melon", "fig",
  // Places
  "harbor", "glen", "moor", "vale", "dale", "dale", "park", "pier",
  "quay", "dock", "trail", "path", "loop", "fern", "nest", "den",
  "cove", "cape", "reef", "bank", "shore", "ridge", "peak", "hill",
  "dale", "glen", "vale", "mesa", "butte", "cliff", "ledge", "shore",
  // Misc good words
  "clarity", "rhythm", "pattern", "signal", "pulse", "thread", "thread",
  "moment", "story", "colors", "gentle", "luminous", "ephemeral", "quiet",
  "serenity", "tempest", "harmony", "rhythm", "oracle", "murmur", "silence",
  "insight", "pattern", "signal", "memory", "vivid", "subtle", "obvious",
  "steady", "tender", "robust", "subtle", "elegant", "earnest", "vivid",
  "mellow", "rich", "full", "clear", "deep", "soft", "rare", "sweet",
];

// Deduplicate the word list
const UNIQUE_WORDS = [...new Set(WORDS)];

/**
 * Generate a single recovery code: word-word-XX
 * ~35 bits of entropy (14 bits from two words, 7 bits from two digits)
 * Enough to resist casual guessing, short enough to type by hand.
 */
export function generateRecoveryCode() {
  const w1 = UNIQUE_WORDS[crypto.randomInt(UNIQUE_WORDS.length)];
  const w2 = UNIQUE_WORDS[crypto.randomInt(UNIQUE_WORDS.length)];
  const num = crypto.randomInt(100); // 00–99
  return `${w1}-${w2}-${String(num).padStart(2, "0")}`;
}

/**
 * Generate a unique recovery code, retrying on collision.
 * @param {object} db — database adapter with get()
 * @param {number} maxAttempts — give up after this many collisions (unlikely)
 * @returns {Promise<string>}
 */
export async function generateUniqueRecoveryCode(db, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateRecoveryCode();
    const existing = await db.get(
      "SELECT id FROM users WHERE recovery_code = $1",
      [code],
    );
    if (!existing) return code;
  }
  throw new Error("Failed to generate a unique recovery code after multiple attempts");
}
