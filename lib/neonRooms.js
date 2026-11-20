'use strict';

const { randomBytes, randomInt } = require('node:crypto');

const MAX_PLAYERS = 8;
const MAX_MESSAGE_BYTES = 8 * 1024;
const HOST_MESSAGES = new Set(['lobby', 'start', 's']);
const PLAYER_MESSAGES = new Set(['in', 'rename']);

function normalizeName(value) {
  return (typeof value === 'string' ? value : '')
    .replace(/[\u0000-\u001f]/g, '')
    .trim()
    .slice(0, 12) || 'PILOT';
}

class NeonRoomManager {
  constructor() {
    this.rooms = new Map();
    this.connections = new Map();
  }

  create(socketId, name) {
    if (this.connections.has(socketId)) return { ok: false, error: 'You are already in a Neon Swarm room.' };

    let code;
    do {
      code = String(randomInt(100_000, 1_000_000));
    } while (this.rooms.has(code));

    const room = {
      code,
      roomName: `neon:${code}`,
      hostSocketId: socketId,
      players: new Map([[0, { id: 0, socketId, name: normalizeName(name) }]]),
      pending: new Map(),
      nextPlayerId: 1,
    };
    this.rooms.set(code, room);
    this.connections.set(socketId, { code, role: 'host', playerId: 0 });
    return { ok: true, code, name: room.players.get(0).name };
  }

  requestJoin(socketId, rawCode, name) {
    if (this.connections.has(socketId)) return { ok: false, error: 'You already have a pending request or are in a room.' };

    const code = typeof rawCode === 'string' ? rawCode.replace(/\D/g, '') : '';
    const room = this.rooms.get(code);
    if (!/^\d{6}$/.test(code) || !room) return { ok: false, error: 'That room code is invalid or closed.' };
    if (room.players.size + room.pending.size >= MAX_PLAYERS) return { ok: false, error: 'That room is full.' };

    const requestId = randomBytes(8).toString('hex');
    const request = { requestId, socketId, name: normalizeName(name) };
    room.pending.set(requestId, request);
    this.connections.set(socketId, { code, role: 'pending', requestId });
    return { ok: true, code, hostSocketId: room.hostSocketId, requestId, name: request.name };
  }

  respond(hostSocketId, requestId, accepted) {
    const hostConnection = this.connections.get(hostSocketId);
    const room = hostConnection && hostConnection.role === 'host' ? this.rooms.get(hostConnection.code) : null;
    if (!room) return { ok: false, error: 'Only the room host can respond to join requests.' };

    const request = room.pending.get(requestId);
    if (!request) return { ok: false, error: 'That join request is no longer available.' };
    room.pending.delete(requestId);
    this.connections.delete(request.socketId);

    if (!accepted) return { ok: true, accepted: false, socketId: request.socketId };
    if (room.players.size >= MAX_PLAYERS) {
      return { ok: false, error: 'That room is full.', socketId: request.socketId };
    }

    const playerId = room.nextPlayerId++;
    const player = { id: playerId, socketId: request.socketId, name: request.name };
    room.players.set(playerId, player);
    this.connections.set(request.socketId, { code: room.code, role: 'player', playerId });
    return {
      ok: true,
      accepted: true,
      code: room.code,
      playerId,
      name: player.name,
      socketId: player.socketId,
      roster: [...room.players.values()].map(({ id, name }) => ({ id, name })),
    };
  }

  routeMessage(socketId, data) {
    const connection = this.connections.get(socketId);
    const room = connection && this.rooms.get(connection.code);
    if (!room || connection.role === 'pending') return { ok: false, error: 'Join a Neon Swarm room first.' };
    if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.k !== 'string') {
      return { ok: false, error: 'Invalid Neon Swarm message.' };
    }

    let size;
    try {
      size = Buffer.byteLength(JSON.stringify(data), 'utf8');
    } catch {
      return { ok: false, error: 'Invalid Neon Swarm message.' };
    }
    if (size > MAX_MESSAGE_BYTES) return { ok: false, error: 'Neon Swarm message is too large.' };

    if (connection.role === 'host') {
      if (!HOST_MESSAGES.has(data.k)) return { ok: false, error: 'The host cannot send that Neon Swarm message.' };
      return { ok: true, roomName: room.roomName, exceptSocketId: socketId };
    }

    if (!PLAYER_MESSAGES.has(data.k)) return { ok: false, error: 'Players cannot send that Neon Swarm message.' };
    return { ok: true, hostSocketId: room.hostSocketId, fromId: connection.playerId };
  }

  leave(socketId) {
    const connection = this.connections.get(socketId);
    if (!connection) return null;
    this.connections.delete(socketId);

    const room = this.rooms.get(connection.code);
    if (!room) return null;

    if (connection.role === 'host') {
      this.rooms.delete(room.code);
      const memberSocketIds = [...room.players.values()]
        .filter((player) => player.socketId !== socketId)
        .map((player) => player.socketId);
      const pendingSocketIds = [...room.pending.values()].map((request) => request.socketId);
      for (const id of [...memberSocketIds, ...pendingSocketIds]) this.connections.delete(id);
      return { role: 'host', roomName: room.roomName, memberSocketIds, pendingSocketIds };
    }

    if (connection.role === 'pending') {
      const request = room.pending.get(connection.requestId);
      room.pending.delete(connection.requestId);
      return {
        role: 'pending',
        roomName: room.roomName,
        hostSocketId: room.hostSocketId,
        requestId: connection.requestId,
        name: request ? request.name : 'PILOT',
      };
    }

    const player = room.players.get(connection.playerId);
    room.players.delete(connection.playerId);
    return {
      role: 'player',
      roomName: room.roomName,
      hostSocketId: room.hostSocketId,
      playerId: connection.playerId,
      name: player ? player.name : 'PILOT',
    };
  }
}

module.exports = { NeonRoomManager };
