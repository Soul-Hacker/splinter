'use strict';

const MIN_WORD_LENGTH = 3;

function normalize(raw) {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

function letterCounts(text) {
  const counts = Object.create(null);
  for (const ch of text) counts[ch] = (counts[ch] || 0) + 1;
  return counts;
}

/**
 * Validates one submitted word against the round's base word.
 * Returns { ok: true, word } or { ok: false, reason }.
 *
 * `inDictionary` is injected so this stays a pure, easily testable function.
 */
function validateWord(raw, baseWord, inDictionary) {
  const word = normalize(raw);

  if (!word) return { ok: false, reason: 'Type a word first.' };
  if (word.length > 40) return { ok: false, reason: 'That is too long to be a valid word.' };
  if (!/^[a-z]+$/.test(word)) return { ok: false, reason: 'Use the letters a to z only.' };

  // 1. Length
  if (word.length < MIN_WORD_LENGTH) {
    return { ok: false, reason: `Words need at least ${MIN_WORD_LENGTH} letters.` };
  }

  // 2. Base word rule
  if (word === baseWord) {
    return { ok: false, reason: "You can't submit the base word itself." };
  }

  // 3. Letter frequency: never use a letter more often than the base word has it
  const available = letterCounts(baseWord);
  const remaining = { ...available };
  for (const ch of word) {
    if (!available[ch]) {
      return { ok: false, reason: `"${ch}" isn't in ${baseWord}.` };
    }
    if (remaining[ch] === 0) {
      return {
        ok: false,
        reason: `${baseWord} only has ${available[ch]} "${ch}"${available[ch] === 1 ? '' : 's'}.`,
      };
    }
    remaining[ch]--;
  }

  // 4. Dictionary check
  if (!inDictionary(word)) {
    return { ok: false, reason: `"${word}" isn't in the dictionary.` };
  }

  return { ok: true, word };
}

/**
 * Scattergories-style scoring for one round.
 * `submissions` is an array of { id, words: Iterable<string> } (already validated).
 * A word found by 2+ players is cancelled (0 points for everyone).
 * A word found by exactly one player scores 1 point.
 *
 * Returns Map<id, { words: [{ word, status: 'unique' | 'cancelled' }], score }>.
 */
function scoreRound(submissions) {
  const finders = new Map(); // word -> number of players who found it
  for (const sub of submissions) {
    for (const word of new Set(sub.words)) {
      finders.set(word, (finders.get(word) || 0) + 1);
    }
  }

  const results = new Map();
  for (const sub of submissions) {
    const words = [];
    let score = 0;
    for (const word of new Set(sub.words)) {
      const unique = finders.get(word) === 1;
      if (unique) score += 1;
      words.push({ word, status: unique ? 'unique' : 'cancelled' });
    }
    words.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'unique' ? -1 : 1;
      return a.word.localeCompare(b.word);
    });
    results.set(sub.id, { words, score });
  }
  return results;
}

module.exports = { validateWord, scoreRound, MIN_WORD_LENGTH };
