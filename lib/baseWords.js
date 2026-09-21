'use strict';

const { isWord, wordList } = require('./dictionary');

/**
 * Where round words come from:
 *   BASE_WORDS=random (default)  a random word from the full word-list dictionary
 *   BASE_WORDS=common            a random word from a small hand-picked list of everyday words
 */
const SOURCE = process.env.BASE_WORDS === 'common' ? 'common' : 'random';

const MIN_LENGTH = 9;
const MAX_LENGTH = 12;
const MIN_SUBWORDS = 120; // a base word must hide at least this many valid words
const MAX_TRIES = 5000;
const CHAR_A = 97;

const COMMON = `
extinguisher adventurous unforgettable championship masterpiece playground
information destination strawberries atmosphere imagination lightweight
thunderstorm understanding transportation consideration professional
independent relationship arrangement celebration communication construction
disappointed electrician fundamental harmonious kindergarten laboratory
mountaineer neighborhood observation refrigerator sophisticated temperature
unbelievable watermelon architecture basketball caterpillar dictionary
earthquake friendship grandmother illustration knowledgeable lighthouse
motorcycle negotiation opportunity photography restaurant sunflower
tournament university vegetarian waterfall revolution presentation
distribution organization encouragement entertainment environment
explanation instrument magnificent microphone nightingale overwhelming
personality playwright programming reconstruction registration spectacular
stationery subtraction trampoline wheelbarrow adolescent chocolate
declaration generosity hairdresser impossible landscape marshmallow
outstanding population punctuation
`.split(/\s+/).filter(Boolean);

let candidates = null; // indexes into the word list that can be base words
let masks = null;      // 26-bit letter-presence mask per dictionary word
let commonPool = null;

/** Words that are just an inflection of a shorter word (plurals, -ed, -ing...) make dull base words. */
function isInflection(word, has) {
  if (word.endsWith('ies') && has(word.slice(0, -3) + 'y')) return true;
  for (const suffix of ['s', 'es', 'ed', 'd', 'ing', 'ly', 'er', 'ers', 'est']) {
    if (!word.endsWith(suffix)) continue;
    const stem = word.slice(0, -suffix.length);
    if (stem.length < 4) continue;
    if (has(stem) || has(stem + 'e')) return true;
    if (stem[stem.length - 1] === stem[stem.length - 2] && has(stem.slice(0, -1))) return true;
  }
  return false;
}

/** Builds the lookup tables once. Call after loadDictionary(). Returns how many words can be picked. */
function prepareBaseWords() {
  const list = wordList();
  if (candidates) return SOURCE === 'common' ? commonPool.length : candidates.length;

  masks = new Int32Array(list.length);
  candidates = [];
  const has = (w) => isWord(w);
  for (let i = 0; i < list.length; i++) {
    const w = list[i];
    let mask = 0;
    for (let j = 0; j < w.length; j++) mask |= 1 << (w.charCodeAt(j) - CHAR_A);
    masks[i] = mask;
    if (w.length >= MIN_LENGTH && w.length <= MAX_LENGTH && !isInflection(w, has)) candidates.push(i);
  }
  commonPool = [...new Set(COMMON)].filter((w) => w.length >= MIN_LENGTH && isWord(w));
  return SOURCE === 'common' ? commonPool.length : candidates.length;
}

/** How many dictionary words (3+ letters, shorter than `base`) can be spelled from `base`. */
function countSubwords(base) {
  const list = wordList();
  const available = new Int8Array(26);
  let baseMask = 0;
  for (let j = 0; j < base.length; j++) {
    const c = base.charCodeAt(j) - CHAR_A;
    available[c]++;
    baseMask |= 1 << c;
  }
  const remaining = new Int8Array(26);
  let count = 0;
  for (let i = 0; i < list.length; i++) {
    const w = list[i];
    if (w.length < 3 || w.length >= base.length) continue;
    if (masks[i] & ~baseMask) continue; // uses a letter the base word doesn't have
    remaining.set(available);
    let ok = true;
    for (let j = 0; j < w.length; j++) {
      if (--remaining[w.charCodeAt(j) - CHAR_A] < 0) { ok = false; break; }
    }
    if (ok) count++;
  }
  return count;
}

function shuffle(array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Returns `count` distinct base words for one game. */
function pickBaseWords(count) {
  prepareBaseWords();
  const picked = [];

  if (SOURCE === 'random') {
    const list = wordList();
    const seen = new Set();
    for (let tries = 0; picked.length < count && tries < MAX_TRIES; tries++) {
      const word = list[candidates[Math.floor(Math.random() * candidates.length)]];
      if (seen.has(word)) continue;
      seen.add(word);
      if (countSubwords(word) >= MIN_SUBWORDS) picked.push(word);
    }
  }

  // 'common' mode, or a safety net if the random search came up short.
  for (const word of shuffle(commonPool)) {
    if (picked.length >= count) break;
    if (!picked.includes(word)) picked.push(word);
  }
  return picked;
}

module.exports = { pickBaseWords, prepareBaseWords, countSubwords, SOURCE };
