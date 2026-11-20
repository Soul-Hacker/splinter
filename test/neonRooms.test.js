'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { NeonRoomManager } = require('../lib/neonRooms');

test('creates rooms, approves players, and routes only supported messages', () => {
  const rooms = new NeonRoomManager();
  const host = rooms.create('host-socket', 'HOST');
  assert.equal(host.ok, true);
  assert.match(host.code, /^\d{6}$/);

  const request = rooms.requestJoin('player-socket', host.code, 'PLAYER');
  assert.equal(request.ok, true);
  assert.equal(request.hostSocketId, 'host-socket');

  const accepted = rooms.respond('host-socket', request.requestId, true);
  assert.deepEqual(accepted.roster, [
    { id: 0, name: 'HOST' },
    { id: 1, name: 'PLAYER' },
  ]);
  assert.deepEqual(rooms.routeMessage('player-socket', { k: 'in', ix: 1 }), {
    ok: true,
    hostSocketId: 'host-socket',
    fromId: 1,
  });
  assert.equal(rooms.routeMessage('player-socket', { k: 's' }).ok, false);
  assert.equal(rooms.routeMessage('host-socket', { k: 's', p: [] }).ok, true);
});

test('rejects unauthorized responses and cleans up members when the host leaves', () => {
  const rooms = new NeonRoomManager();
  const host = rooms.create('host-socket', 'HOST');
  const request = rooms.requestJoin('player-socket', host.code, 'PLAYER');

  assert.equal(rooms.respond('player-socket', request.requestId, true).ok, false);
  assert.equal(rooms.respond('host-socket', request.requestId, false).accepted, false);
  assert.equal(rooms.routeMessage('player-socket', { k: 'in' }).ok, false);

  const anotherRequest = rooms.requestJoin('pending-socket', host.code, 'PENDING');
  const close = rooms.leave('host-socket');
  assert.deepEqual(close.pendingSocketIds, ['pending-socket']);
  assert.equal(rooms.routeMessage('pending-socket', { k: 'in' }).ok, false);
  assert.equal(rooms.requestJoin('new-socket', host.code, 'NEW').ok, false);
  assert.equal(anotherRequest.ok, true);
});

test('enforces the eight-player room cap, including pending requests', () => {
  const rooms = new NeonRoomManager();
  const host = rooms.create('host-socket', 'HOST');
  const requests = [];

  for (let i = 1; i < 8; i++) {
    requests.push(rooms.requestJoin(`player-${i}`, host.code, `P${i}`));
  }
  assert.equal(rooms.requestJoin('extra-player', host.code, 'EXTRA').error, 'That room is full.');
  assert.equal(requests.every((request) => request.ok), true);
});
