'use strict';

const fs = require('fs');
const path = require('path');

// `check-word` ships a plain-text English word list (one lowercase word per line).
// Its own check() re-reads that 2.8 MB file on every call and builds a RegExp from
// the input, which is slow and unsafe for user-supplied text. So we use the same
// bundled list, but load it once into a Set for O(1) lookups.
const listPath = path.join(
  path.dirname(require.resolve('check-word/package.json')),
  'words',
  'en.txt'
);

const WORDS = new Set(
  fs
    .readFileSync(listPath, 'utf8')
    .split(/\r?\n/)
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean)
);

function isWord(word) {
  return WORDS.has(word);
}

module.exports = { isWord, WORDS };
