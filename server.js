'use strict';

const http = require('http');
const path = require('path');
const express = require('express');
const { Server } = require('socket.io');
const { Game, TOTAL_ROUNDS } = require('./lib/game');
const { POOL_SIZE } = require('./lib/baseWords');

const PORT = Number(process.env.PORT) || 3000;
const ROUND_SECONDS = Number(process.env.ROUND_SECONDS) || 120;
const INTERMISSION_SECONDS = Number(process.env.INTERMISSION_SECONDS) || 15;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
app.get('/api/config', (_req, res) => {
  res.json({ roundSeconds: ROUND_SECONDS, totalRounds: TOTAL_ROUNDS });
});

// Single global lobby. All state lives in this object: no database.
const game = new Game({
  roundMs: ROUND_SECONDS * 1000,
  intermissionMs: INTERMISSION_SECONDS * 1000,
  onChange: broadcast,
});

/** Push a fresh, per-player snapshot to every connected player. */
function broadcast() {
  for (const player of game.players.values()) {
    if (player.socketId) io.to(player.socketId).emit('state', game.snapshotFor(player.token));
  }
}

function reply(ack, payload) {
  if (typeof ack === 'function') ack(payload);
}

io.on('connection', (socket) => {
  socket.on('join', (payload, ack) => {
    const data = payload && typeof payload === 'object' ? payload : {};

    // One identity per connection.
    if (socket.data.token && data.token !== socket.data.token) {
      return reply(ack, { ok: false, error: 'You have already joined from this tab.' });
    }

    const result = game.join(data, socket.id);
    if (!result.ok) return reply(ack, result);

    socket.data.token = result.token;

    // If the same player reconnects from a new socket, drop the old one quietly.
    if (result.previousSocketId && result.previousSocketId !== socket.id) {
      const old = io.sockets.sockets.get(result.previousSocketId);
      if (old) {
        old.data.token = null; // so its disconnect handler doesn't mark the player offline
        old.disconnect(true);
      }
    }
    reply(ack, { ok: true, token: result.token, username: result.username });
  });

  socket.on('start', (_payload, ack) => {
    reply(ack, game.start(socket.data.token));
  });

  socket.on('submit', (payload, ack) => {
    const raw = payload && typeof payload === 'object' ? payload.word : '';
    reply(ack, game.submit(socket.data.token, raw));
  });

  socket.on('playAgain', (_payload, ack) => {
    reply(ack, game.playAgain(socket.data.token));
  });

  socket.on('disconnect', () => {
    if (socket.data.token) game.disconnect(socket.data.token, socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Splinter running at http://localhost:${PORT}`);
  console.log(`Round: ${ROUND_SECONDS}s, break: ${INTERMISSION_SECONDS}s, base words available: ${POOL_SIZE}`);
});
