'use strict';

const crypto = require('crypto');
const { Game, ROOM_SIZE } = require('./game');

// No 0/O/1/I/L, so codes are easy to read out loud.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 5;
const MAX_ROOMS = 200;
const NAME_PATTERN = /^[\p{L}\p{N}_ '.!-]{2,24}$/u;

function normalizeCode(code) {
  return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Owns every room. Each room is an independent Game with its own code, host,
 * players and timers. The manager creates rooms, finds them by code, lists the
 * public ones, and closes rooms that have been empty for a while.
 */
class RoomManager {
  constructor({
    roundMs,
    intermissionMs,
    emptyRoomMs = 45000,
    onRoomChanged = () => {},
    onListChanged = () => {},
  } = {}) {
    this.roundMs = roundMs;
    this.intermissionMs = intermissionMs;
    this.emptyRoomMs = emptyRoomMs;
    this.onRoomChanged = onRoomChanged;
    this.onListChanged = onListChanged;
    this.rooms = new Map(); // code -> Game
    this.closing = new Map(); // code -> timeout for empty rooms
  }

  get(code) {
    return this.rooms.get(normalizeCode(code)) || null;
  }

  newCode() {
    for (let attempt = 0; attempt < 50; attempt++) {
      let code = '';
      for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
      if (!this.rooms.has(code)) return code;
    }
    return null;
  }

  /** Creates a room with `username` as its host. Returns { ok, game, token, username } or { ok: false, error }. */
  create({ username, name, isPublic, maxPlayers }, socketId) {
    if (this.rooms.size >= MAX_ROOMS) {
      return { ok: false, error: 'The server is busy right now. Try again in a few minutes.' };
    }

    const cleanUser = String(username || '').trim().replace(/\s+/g, ' ');
    let roomName = String(name || '').trim().replace(/\s+/g, ' ');
    if (!roomName) roomName = `${cleanUser}'s room`;
    if (!NAME_PATTERN.test(roomName)) {
      return { ok: false, error: 'Room names are 2 to 24 characters: letters, numbers, spaces and . - _ \' !' };
    }

    const size = maxPlayers === undefined || maxPlayers === null ? ROOM_SIZE.default : Number(maxPlayers);
    if (!Number.isInteger(size) || size < ROOM_SIZE.min || size > ROOM_SIZE.max) {
      return { ok: false, error: `Rooms hold ${ROOM_SIZE.min} to ${ROOM_SIZE.max} players.` };
    }

    const code = this.newCode();
    if (!code) return { ok: false, error: 'Could not make a room code. Try again.' };

    const game = new Game({
      roundMs: this.roundMs,
      intermissionMs: this.intermissionMs,
      code,
      name: roomName,
      isPublic: isPublic !== false,
      maxPlayers: size,
      onChange: () => this.handleChange(game),
    });

    const joined = game.join({ username: cleanUser }, socketId);
    if (!joined.ok) {
      game.destroy();
      return joined;
    }
    this.rooms.set(code, game);
    this.onListChanged();
    return { ...joined, game };
  }

  /** Joins (or rejoins) the room with this code. */
  join(code, { username, token }, socketId) {
    const game = this.get(code);
    if (!game) return { ok: false, error: "That room doesn't exist. It may have closed." };
    const joined = game.join({ username, token }, socketId);
    return joined.ok ? { ...joined, game } : joined;
  }

  /** Public rooms that have someone in them, open ones first. */
  list() {
    return [...this.rooms.values()]
      .filter((g) => g.isPublic && g.connectedPlayers().length > 0)
      .map((g) => g.summary())
      .sort((a, b) => Number(b.joinable) - Number(a.joinable) || b.players - a.players)
      .slice(0, 100);
  }

  handleChange(game) {
    this.onRoomChanged(game);
    this.onListChanged();
    if (this.rooms.get(game.code) !== game) return;
    if (game.connectedPlayers().length === 0) this.scheduleClose(game);
    else this.cancelClose(game);
  }

  // Empty rooms stay around briefly so a page refresh doesn't destroy a room.
  scheduleClose(game) {
    if (this.closing.has(game.code)) return;
    this.closing.set(game.code, setTimeout(() => this.close(game), this.emptyRoomMs));
  }

  cancelClose(game) {
    clearTimeout(this.closing.get(game.code));
    this.closing.delete(game.code);
  }

  close(game) {
    this.cancelClose(game);
    game.destroy();
    this.rooms.delete(game.code);
    this.onListChanged();
  }
}

module.exports = { RoomManager, normalizeCode };
