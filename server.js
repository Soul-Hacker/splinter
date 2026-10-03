'use strict';

const http = require('http');
const path = require('path');
const express = require('express');
const { Server } = require('socket.io');
const { RoomManager, normalizeCode } = require('./lib/rooms');
const { loadDictionary } = require('./lib/dictionary');
const { prepareBaseWords, SOURCE } = require('./lib/baseWords');
const { FixedWindowRateLimiter } = require('./lib/fixedWindowRateLimiter');

const PORT = Number(process.env.PORT) || 3000;
const ROUND_SECONDS = Number(process.env.ROUND_SECONDS) || 120;
const INTERMISSION_SECONDS = Number(process.env.INTERMISSION_SECONDS) || 20;
const EMPTY_ROOM_SECONDS = Number(process.env.EMPTY_ROOM_SECONDS) || 45;
const TRUST_PROXY_HOPS = process.env.TRUST_PROXY_HOPS ? Number(process.env.TRUST_PROXY_HOPS) : 0;
if (!Number.isInteger(TRUST_PROXY_HOPS) || TRUST_PROXY_HOPS < 0) {
  throw new Error('TRUST_PROXY_HOPS must be a non-negative integer.');
}

const SOCKET_RATE_LIMITS = {
  'rooms:subscribe': 60,
  createRoom: 5,
  joinRoom: 30,
  leaveRoom: 30,
  start: 10,
  submit: 120,
  playAgain: 5,
};
const SOCKET_CONNECTIONS_PER_MINUTE = 30;
const rateLimiter = new FixedWindowRateLimiter();

const BROWSER = 'room-browser'; // socket.io room for sockets that are looking at the room list

const app = express();
app.set('trust proxy', TRUST_PROXY_HOPS);
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 16 * 1024 });

app.use(express.static(path.join(__dirname, 'public')));
app.get('/api/config', (_req, res) => res.json({ roundSeconds: ROUND_SECONDS }));
app.get('/healthz', (_req, res) => res.send('ok'));
app.get('/ads.txt', (_req, res) => {
  res.type('text/plain');
  res.send('google.com, pub-8789716413238583, DIRECT, f08c47fec0942fa0');
});

/** Push a fresh, per-player snapshot to everyone in one room. */
function broadcastRoom(game) {
  for (const player of game.players.values()) {
    if (player.socketId) io.to(player.socketId).emit('state', game.snapshotFor(player.token));
  }
}

// Room list updates are batched so a busy room doesn't flood the room browser.
let listTimer = null;
function scheduleListBroadcast() {
  if (listTimer) return;
  listTimer = setTimeout(() => {
    listTimer = null;
    io.to(BROWSER).emit('rooms', manager.list());
  }, 300);
}

const manager = new RoomManager({
  roundMs: ROUND_SECONDS * 1000,
  intermissionMs: INTERMISSION_SECONDS * 1000,
  emptyRoomMs: EMPTY_ROOM_SECONDS * 1000,
  onRoomChanged: broadcastRoom,
  onListChanged: scheduleListBroadcast,
});

function reply(ack, payload) {
  if (typeof ack === 'function') ack(payload);
}

function clientIp(socket) {
  const remoteAddress = String(socket.handshake.address || 'unknown').replace(/^::ffff:/i, '').toLowerCase();
  if (TRUST_PROXY_HOPS === 0) return remoteAddress;

  const forwarded = socket.handshake.headers['x-forwarded-for'];
  if (typeof forwarded !== 'string') return remoteAddress;
  const addresses = forwarded.split(',').map((address) => address.trim()).filter(Boolean);
  return addresses[Math.max(0, addresses.length - TRUST_PROXY_HOPS)] || remoteAddress;
}

function allowSocketEvent(socket, event, ack) {
  const limit = SOCKET_RATE_LIMITS[event];
  if (!limit) return true;

  const { allowed, retryAfter } = rateLimiter.consume(`${clientIp(socket)}:${event}`, limit);
  if (allowed) return true;

  const message = `Too many requests. Try again in ${retryAfter} seconds.`;
  reply(ack, { ok: false, code: 'RATE_LIMITED', error: message, reason: message, retryAfter });
  return false;
}

io.use((socket, next) => {
  const { allowed, retryAfter } = rateLimiter.consume(
    `${clientIp(socket)}:connection`,
    SOCKET_CONNECTIONS_PER_MINUTE
  );
  if (allowed) return next();
  next(new Error(`Too many connections. Try again in ${retryAfter} seconds.`));
});

const asObject = (value) => (value && typeof value === 'object' ? value : {});

io.on('connection', (socket) => {
  const currentRoom = () => (socket.data.room ? manager.get(socket.data.room) : null);

  /** Puts this socket inside a room after a successful create/join. */
  function enterRoom(result, ack) {
    socket.data.room = result.game.code;
    socket.data.token = result.token;
    socket.leave(BROWSER);

    // The same player reconnecting from a new socket: drop the old one quietly.
    if (result.previousSocketId && result.previousSocketId !== socket.id) {
      const old = io.sockets.sockets.get(result.previousSocketId);
      if (old) {
        old.data.room = null;
        old.data.token = null;
        old.disconnect(true);
      }
    }
    reply(ack, { ok: true, code: result.game.code, token: result.token, username: result.username });
  }

  socket.on('rooms:subscribe', (_payload, ack) => {
    if (!allowSocketEvent(socket, 'rooms:subscribe', ack)) return;
    if (!socket.data.room) socket.join(BROWSER);
    reply(ack, { ok: true, rooms: manager.list() });
  });

  socket.on('createRoom', (payload, ack) => {
    if (!allowSocketEvent(socket, 'createRoom', ack)) return;
    if (socket.data.room) return reply(ack, { ok: false, error: 'Leave your current room first.' });
    if (Date.now() - (socket.data.lastCreate || 0) < 1500) {
      return reply(ack, { ok: false, error: 'Slow down a moment, then try again.' });
    }
    socket.data.lastCreate = Date.now();

    const result = manager.create(asObject(payload), socket.id);
    if (!result.ok) return reply(ack, result);
    enterRoom(result, ack);
  });

  socket.on('joinRoom', (payload, ack) => {
    if (!allowSocketEvent(socket, 'joinRoom', ack)) return;
    const data = asObject(payload);
    const code = normalizeCode(data.code);

    if (socket.data.room) {
      // Re-joining the room this socket is already in is harmless; anything else is not.
      if (socket.data.room !== code) return reply(ack, { ok: false, error: 'Leave your current room first.' });
      data.token = data.token || socket.data.token;
    }

    const result = manager.join(code, data, socket.id);
    if (!result.ok) return reply(ack, result);
    enterRoom(result, ack);
  });

  socket.on('leaveRoom', (_payload, ack) => {
    if (!allowSocketEvent(socket, 'leaveRoom', ack)) return;
    const game = currentRoom();
    if (game && socket.data.token) game.disconnect(socket.data.token, socket.id);
    socket.data.room = null;
    socket.data.token = null;
    socket.join(BROWSER);
    reply(ack, { ok: true, rooms: manager.list() });
  });

  socket.on('start', (payload, ack) => {
    if (!allowSocketEvent(socket, 'start', ack)) return;
    const game = currentRoom();
    if (!game) return reply(ack, { ok: false, reason: 'Join a room first.' });
    reply(ack, game.start(socket.data.token, asObject(payload).rounds));
  });

  socket.on('submit', (payload, ack) => {
    if (!allowSocketEvent(socket, 'submit', ack)) return;
    const game = currentRoom();
    if (!game) return reply(ack, { ok: false, reason: 'Join a room first.' });
    reply(ack, game.submit(socket.data.token, asObject(payload).word));
  });

  socket.on('playAgain', (_payload, ack) => {
    if (!allowSocketEvent(socket, 'playAgain', ack)) return;
    const game = currentRoom();
    if (!game) return reply(ack, { ok: false, reason: 'Join a room first.' });
    reply(ack, game.playAgain(socket.data.token));
  });

  socket.on('disconnect', () => {
    const game = currentRoom();
    if (game && socket.data.token) game.disconnect(socket.data.token, socket.id);
  });
});

// Load the dictionary first, so the first game never waits on it.
loadDictionary()
  .then((wordCount) => {
    const poolSize = prepareBaseWords();
    server.listen(PORT, () => {
      console.log(`Splinter running at http://localhost:${PORT}`);
      console.log(`Dictionary: ${wordCount.toLocaleString('en-US')} words loaded`);
      console.log(`Base words: ${SOURCE} (${poolSize.toLocaleString('en-US')} candidates)`);
      console.log(`Round: ${ROUND_SECONDS}s, break: ${INTERMISSION_SECONDS}s, empty rooms close after ${EMPTY_ROOM_SECONDS}s`);
    });
  })
  .catch((err) => {
    console.error('Could not load the dictionary. Did you run "npm install"?', err);
    process.exit(1);
  });
