'use strict';

const crypto = require('crypto');
const { validateWord, scoreRound } = require('./rules');
const { isWord } = require('./dictionary');
const { pickBaseWords } = require('./baseWords');

const TOTAL_ROUNDS = 5;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 12;
const NAME_PATTERN = /^[\p{L}\p{N}_ -]{2,16}$/u;

/**
 * One in-memory game lobby.
 *
 * Phases: 'lobby' -> 'playing' -> 'roundEnd' -> 'playing' ... -> 'gameOver' -> 'lobby'
 *
 * The Game knows nothing about sockets except the opaque `socketId` it stores on
 * each player. Whenever anything changes it calls `onChange()`, and the server
 * layer pushes a fresh per-player snapshot to every connected client.
 */
class Game {
  constructor({ roundMs = 120000, intermissionMs = 15000, onChange = () => {} } = {}) {
    this.roundMs = roundMs;
    this.intermissionMs = intermissionMs;
    this.onChange = onChange;
    this.players = new Map(); // token -> player
    this.timer = null;
    this.resetState();
  }

  resetState() {
    clearTimeout(this.timer);
    this.timer = null;
    this.phase = 'lobby';
    this.round = 0;
    this.baseWords = [];
    this.baseWord = null;
    this.endsAt = null;
    this.nextRoundAt = null;
    this.lastResult = null;
    this.winners = [];
  }

  connectedPlayers() {
    return [...this.players.values()].filter((p) => p.connected);
  }

  // ---------------------------------------------------------------- players

  /**
   * Adds a player, or re-attaches a returning one.
   * A returning player is recognised by their secret session token or, if the
   * token was lost (e.g. a closed tab), by claiming the name of a player who is
   * currently disconnected.
   */
  join({ username, token }, socketId) {
    const byToken = token ? this.players.get(token) : null;
    if (byToken) return this.attach(byToken, socketId);

    const name = String(username || '').trim().replace(/\s+/g, ' ');
    if (!NAME_PATTERN.test(name)) {
      return {
        ok: false,
        error: 'Usernames are 2 to 16 characters: letters, numbers, spaces, - or _.',
      };
    }

    const sameName = [...this.players.values()].find(
      (p) => p.username.toLowerCase() === name.toLowerCase()
    );
    if (sameName) {
      if (!sameName.connected) return this.attach(sameName, socketId);
      return { ok: false, error: `"${name}" is already taken. Pick another username.` };
    }

    if (this.phase !== 'lobby') {
      return { ok: false, error: 'A game is in progress. You can join when it finishes.' };
    }
    if (this.players.size >= MAX_PLAYERS) {
      return { ok: false, error: `The lobby is full (${MAX_PLAYERS} players).` };
    }

    const player = {
      token: crypto.randomUUID(),
      username: name,
      socketId: null,
      connected: false,
      total: 0,
      roundScores: [],
      words: new Set(),
    };
    this.players.set(player.token, player);
    return this.attach(player, socketId);
  }

  attach(player, socketId) {
    const previousSocketId = player.socketId;
    player.socketId = socketId;
    player.connected = true;
    this.onChange();
    return { ok: true, token: player.token, username: player.username, previousSocketId };
  }

  disconnect(token, socketId) {
    const player = this.players.get(token);
    // Ignore stale sockets that were already replaced by a newer connection.
    if (!player || player.socketId !== socketId) return;

    player.connected = false;
    player.socketId = null;

    if (this.phase === 'lobby') {
      this.players.delete(token);
    } else if (this.connectedPlayers().length === 0) {
      // Everyone left mid-game: throw the game away.
      this.players.clear();
      this.resetState();
    }
    this.onChange();
  }

  // ------------------------------------------------------------- game flow

  start(token) {
    if (!this.players.has(token)) return { ok: false, reason: 'Join the lobby first.' };
    if (this.phase !== 'lobby') return { ok: false, reason: 'A game is already running.' };
    if (this.connectedPlayers().length < MIN_PLAYERS) {
      return { ok: false, reason: `You need at least ${MIN_PLAYERS} players to start.` };
    }

    for (const p of this.players.values()) {
      p.total = 0;
      p.roundScores = [];
      p.words = new Set();
    }
    this.baseWords = pickBaseWords(TOTAL_ROUNDS);
    this.startRound(1);
    return { ok: true };
  }

  startRound(round) {
    clearTimeout(this.timer);
    this.phase = 'playing';
    this.round = round;
    this.baseWord = this.baseWords[round - 1];
    this.endsAt = Date.now() + this.roundMs;
    this.nextRoundAt = null;
    this.lastResult = null;
    for (const p of this.players.values()) p.words = new Set();

    this.timer = setTimeout(() => this.endRound(), this.roundMs);
    this.onChange();
  }

  endRound() {
    if (this.phase !== 'playing') return;
    clearTimeout(this.timer);

    const players = [...this.players.values()];
    const scored = scoreRound(players.map((p) => ({ id: p.token, words: p.words })));

    for (const p of players) {
      const { score } = scored.get(p.token);
      p.total += score;
      p.roundScores.push(score);
    }

    this.lastResult = {
      round: this.round,
      baseWord: this.baseWord,
      players: players.map((p) => ({
        username: p.username,
        words: scored.get(p.token).words,
        score: scored.get(p.token).score,
      })),
    };
    this.endsAt = null;

    if (this.round >= TOTAL_ROUNDS) {
      const top = Math.max(...players.map((p) => p.total));
      this.winners = players.filter((p) => p.total === top).map((p) => p.username);
      this.phase = 'gameOver';
    } else {
      this.phase = 'roundEnd';
      this.nextRoundAt = Date.now() + this.intermissionMs;
      this.timer = setTimeout(() => this.startRound(this.round + 1), this.intermissionMs);
    }
    this.onChange();
  }

  /** Validates and records one word for one player. Returns { ok, word } or { ok, reason }. */
  submit(token, raw) {
    const player = this.players.get(token);
    if (!player) return { ok: false, reason: 'Join the lobby first.' };
    if (this.phase !== 'playing' || Date.now() > this.endsAt) {
      return { ok: false, reason: 'The round is over.' };
    }

    const check = validateWord(raw, this.baseWord, isWord);
    if (!check.ok) return check;

    if (player.words.has(check.word)) {
      return { ok: false, reason: `You already have "${check.word}".` };
    }
    player.words.add(check.word);
    this.onChange();
    return { ok: true, word: check.word };
  }

  /** After game over, return everyone still connected to a fresh lobby. */
  playAgain(token) {
    if (!this.players.has(token)) return { ok: false, reason: 'Join the lobby first.' };
    if (this.phase !== 'gameOver') return { ok: false, reason: 'The game is not finished yet.' };

    for (const [t, p] of this.players) {
      if (!p.connected) {
        this.players.delete(t);
        continue;
      }
      p.total = 0;
      p.roundScores = [];
      p.words = new Set();
    }
    this.resetState();
    this.onChange();
    return { ok: true };
  }

  // -------------------------------------------------------------- snapshots

  /** What one specific player is allowed to see right now. Other players' words stay hidden until the round ends. */
  snapshotFor(token) {
    const me = this.players.get(token);
    const list = [...this.players.values()];
    return {
      serverNow: Date.now(),
      phase: this.phase,
      round: this.round,
      totalRounds: TOTAL_ROUNDS,
      roundMs: this.roundMs,
      minPlayers: MIN_PLAYERS,
      canStart: this.phase === 'lobby' && this.connectedPlayers().length >= MIN_PLAYERS,
      baseWord: this.baseWord,
      endsAt: this.endsAt,
      nextRoundAt: this.nextRoundAt,
      players: list.map((p) => ({
        username: p.username,
        total: p.total,
        roundScores: p.roundScores,
        wordCount: p.words.size,
        connected: p.connected,
        isYou: p.token === token,
      })),
      you: me ? { username: me.username, words: [...me.words] } : null,
      result: this.lastResult,
      winners: this.winners,
    };
  }
}

module.exports = { Game, TOTAL_ROUNDS };
