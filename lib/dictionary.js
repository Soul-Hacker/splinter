'use strict';

const fs = require('fs');

// The `word-list` package is ESM-only, so it is loaded with a dynamic import().
// It exports the path to a plain-text file with one lowercase word per line
// (about 274,000 words). We read it once at startup into an array (for picking
// random words) and a Set (for O(1) validation).
let LIST = [];
let WORDS = new Set();
let loading = null;

function loadDictionary() {
  if (!loading) {
    loading = (async () => {
      const { default: wordListPath } = await import('word-list');
      const text = await fs.promises.readFile(wordListPath, 'utf8');
      LIST = text.split(/\r?\n/).map((w) => w.trim().toLowerCase()).filter(Boolean);
      WORDS = new Set(LIST);
      return LIST.length;
    })();
  }
  return loading;
}

function isWord(word) {
  return WORDS.has(word);
}

function wordList() {
  return LIST;
}

module.exports = { loadDictionary, isWord, wordList };
