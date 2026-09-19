'use strict';

const { isWord, WORDS } = require('./dictionary');

// Hand-picked long, common words with a healthy mix of vowels and consonants,
// so every round has plenty of short words hiding inside it. Anything that is
// not in the dictionary (or is too short) is dropped at startup.
const CANDIDATES = `
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
`
  .split(/\s+/)
  .filter(Boolean);

const MIN_LENGTH = 9;
const MAX_LENGTH = 14;

const POOL = [...new Set(CANDIDATES)].filter(
  (w) => w.length >= MIN_LENGTH && w.length <= MAX_LENGTH && isWord(w)
);

function shuffle(array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Returns `count` distinct random base words. */
function pickBaseWords(count) {
  const picked = shuffle(POOL).slice(0, count);

  // Safety net: if the curated list ever shrinks below `count`, top up from the
  // full dictionary with 9-11 letter words.
  if (picked.length < count) {
    const fallback = [];
    for (const w of WORDS) {
      if (/^[a-z]+$/.test(w) && w.length >= 9 && w.length <= 11 && !picked.includes(w)) {
        fallback.push(w);
      }
    }
    picked.push(...shuffle(fallback).slice(0, count - picked.length));
  }
  return picked;
}

module.exports = { pickBaseWords, POOL_SIZE: POOL.length };
