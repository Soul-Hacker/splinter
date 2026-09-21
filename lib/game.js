'use strict';

const crypto = require('crypto');
const { validateWord, scoreRound, assignMedals } = require('./rules');
const { isWord } = require('./dictionary');
const { pickBaseWords } = require('./baseWords');

const DEFAULT_ROUNDS = 5;
const MIN_ROUNDS = 1;
const MAX_ROUNDS = 10;
const MIN_PLAYERS = 2; // needed to start a game
const ROOM_SIZE = { min: 2, max: 12, default: 8 };
const NAME_PATTERN = /^[\p{L}\p{N}_ -]{2,16}$/u;

const emptyMedals = () => ({ gold: 0, silver: 0, bronze: 0 });

/**
 * One in-memory game room (lobby + game). Each room has its own timers, players and host.
 *
 * Phases: 'lobby' -> 'playing' -> 'roundEnd' -> 'playing' ... -> 'gameOver' -> 'lobby'
 *
 * The Game knows nothing about sockets except the opaque `socketId` it stores on
 * each player. Whenever anything changes it calls `onChange()`, and the server
 * layer pushes a fresh per-player snapshot to every connected client.
 */
class Game {
  constructor({
    roundMs = 120000,
    intermissionMs = 20000,
    onChange = () => {},
    code = '',
    name = 'Room',
    isPublic = true,
    maxPlayers = ROOM_SIZE.default,
  } = {}) {
    this.roundMs = roundMs;
    this.intermissionMs = intermissionMs;
    this.onChange = onChange;
    this.code = code;
    this.name = name;
    this.isPublic = isPublic;
    this.maxPlayers = maxPlayers;
    this.hostToken = null; // the player who can start games
    this.players = new Map(); // token -> player
    this.timer = null;
    this.gameId = 0;
    this.resetState();
  }

  resetState() {
    clearTimeout(this.timer);
    this.timer = null;
    this.phase = 'lobby';
    this.round = 0;
    this.totalRounds = DEFAULT_ROUNDS;
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
    if (this.players.size >= this.maxPlayers) {
      return { ok: false, error: `That room is full (${this.maxPlayers} players).` };
    }

    const player = {
      token: crypto.randomUUID(),
      username: name,
      socketId: null,
      connected: false,
      total: 0,
      roundScores: [],
      medals: emptyMedals(),
      words: new Set(),
    };
    this.players.set(player.token, player);
    return this.attach(player, socketId);
  }

  attach(player, socketId) {
    const previousSocketId = player.socketId;
    player.socketId = socketId;
    player.connected = true;
    this.ensureHost();
    this.onChange();
    return { ok: true, token: player.token, username: player.username, previousSocketId };
  }

  /** The host is the room's creator; if they leave, the longest-present connected player takes over. */
  ensureHost() {
    const host = this.players.get(this.hostToken);
    if (host && host.connected) return;
    const next = this.connectedPlayers()[0];
    if (next) this.hostToken = next.token;
    else if (!host) this.hostToken = null;
  }

  disconnect(token, socketId) {
    const player = this.players.get(token);
    // Ignore stale sockets that were already replaced by a newer connection.
    if (!player || player.socketId !== socketId) return;

    player.connected = false;
    player.socketId = null;

    if (this.phase === 'lobby') this.players.delete(token);
    this.ensureHost();
    this.onChange();
  }

  /** Stops the timers and forgets everyone. Called when the room is closed. */
  destroy() {
    clearTimeout(this.timer);
    this.timer = null;
    this.players.clear();
  }

  // ------------------------------------------------------------- game flow

  /** `rounds` is chosen by whoever starts the game (1 to 10, default 5). */
  start(token, rounds) {
    if (!this.players.has(token)) return { ok: false, reason: 'Join the room first.' };
    if (token !== this.hostToken) return { ok: false, reason: 'Only the host can start the game.' };
    if (this.phase !== 'lobby') return { ok: false, reason: 'A game is already running.' };
    if (this.connectedPlayers().length < MIN_PLAYERS) {
      return { ok: false, reason: `You need at least ${MIN_PLAYERS} players to start.` };
    }

    let totalRounds = DEFAULT_ROUNDS;
    if (rounds !== undefined && rounds !== null) {
      totalRounds = Number(rounds);
      if (!Number.isInteger(totalRounds) || totalRounds < MIN_ROUNDS || totalRounds > MAX_ROUNDS) {
        return { ok: false, reason: `Choose between ${MIN_ROUNDS} and ${MAX_ROUNDS} rounds.` };
      }
    }

    this.gameId += 1;
    this.totalRounds = totalRounds;
    for (const p of this.players.values()) {
      p.total = 0;
      p.roundScores = [];
      p.medals = emptyMedals();
      p.words = new Set();
    }
    this.baseWords = pickBaseWords(totalRounds);
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
    const medals = assignMedals(players.map((p) => scored.get(p.token).score));

    const resultPlayers = players.map((p, i) => {
      const { words, score } = scored.get(p.token);
      const prevTotal = p.total;
      p.total += score;
      p.roundScores.push(score);
      if (medals[i]) p.medals[medals[i]] += 1;
      return { username: p.username, words, score, medal: medals[i], prevTotal, total: p.total };
    });

    this.lastResult = { round: this.round, baseWord: this.baseWord, players: resultPlayers };
    this.endsAt = null;

    if (this.round >= this.totalRounds) {
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
    if (!player) return { ok: false, reason: 'Join the room first.' };
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
    if (!this.players.has(token)) return { ok: false, reason: 'Join the room first.' };
    if (token !== this.hostToken) return { ok: false, reason: 'Only the host can start a new game.' };
    if (this.phase !== 'gameOver') return { ok: false, reason: 'The game is not finished yet.' };

    for (const [t, p] of this.players) {
      if (!p.connected) {
        this.players.delete(t);
        continue;
      }
      p.total = 0;
      p.roundScores = [];
      p.medals = emptyMedals();
      p.words = new Set();
    }
    this.resetState();
    this.onChange();
    return { ok: true };
  }

  // -------------------------------------------------------------- snapshots

  /** What the public room browser shows for this room. */
  summary() {
    const host = this.players.get(this.hostToken);
    return {
      code: this.code,
      name: this.name,
      host: host ? host.username : '',
      players: this.players.size,
      maxPlayers: this.maxPlayers,
      phase: this.phase,
      round: this.round,
      totalRounds: this.totalRounds,
      joinable: this.phase === 'lobby' && this.players.size < this.maxPlayers,
    };
  }

  /** What one specific player is allowed to see right now. Other players' words stay hidden until the round ends. */
  snapshotFor(token) {
    const me = this.players.get(token);
    const list = [...this.players.values()];
    const host = this.players.get(this.hostToken);
    const isHost = token === this.hostToken;
    return {
      room: {
        code: this.code,
        name: this.name,
        isPublic: this.isPublic,
        maxPlayers: this.maxPlayers,
        host: host ? host.username : null,
      },
      isHost,
      serverNow: Date.now(),
      gameId: this.gameId,
      phase: this.phase,
      round: this.round,
      totalRounds: this.totalRounds,
      roundLimits: { min: MIN_ROUNDS, max: MAX_ROUNDS, default: DEFAULT_ROUNDS },
      roundMs: this.roundMs,
      minPlayers: MIN_PLAYERS,
      canStart: isHost && this.phase === 'lobby' && this.connectedPlayers().length >= MIN_PLAYERS,
      baseWord: this.baseWord,
      endsAt: this.endsAt,
      nextRoundAt: this.nextRoundAt,
      players: list.map((p) => ({
        username: p.username,
        total: p.total,
        roundScores: p.roundScores,
        medals: p.medals,
        wordCount: p.words.size,
        connected: p.connected,
        isHost: p.token === this.hostToken,
        isYou: p.token === token,
      })),
      you: me ? { username: me.username, words: [...me.words] } : null,
      result: this.lastResult,
      winners: this.winners,
    };
  }
}

module.exports = { Game, DEFAULT_ROUNDS, MIN_ROUNDS, MAX_ROUNDS, ROOM_SIZE };
