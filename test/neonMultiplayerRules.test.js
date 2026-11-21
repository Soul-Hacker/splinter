'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../public/games/neon-swarm/scripts/multiplayer-rules');

test('match plan schedules power-up bots every twenty seconds and rotates all power-ups', () => {
  const values = [0.2, 0.1, 0.8, 0.25, 0.25];
  const plan = rules.createMatchPlan(() => values.shift());

  assert.equal(plan.botPowerUps.length, 6);
  assert.deepEqual(plan.botTimes, Array.from({ length: 6 }, (_, i) => i * 20));
  assert.equal(new Set(plan.botPowerUps).size, 4);
  assert.equal(rules.POWER_UPS.every(({ id }) => plan.botPowerUps.includes(id)), true);
  assert.equal(rules.POWER_UPS.every(({ id }) => plan.botPowerUps.filter((powerUp) => powerUp === id).length <= 2), true);
  assert.equal(plan.botPowerUps.every((id) => rules.POWER_UPS.some((powerUp) => powerUp.id === id)), true);
});

test('incoming controls are clamped and only new bounded counters become requests', () => {
  const player = { dn: 4, un: 8 };
  assert.deepEqual(rules.sanitizeInput({
    ix: 7,
    iy: -9,
    a: 10,
    f: true,
    dn: 5,
    un: 9,
  }, player), {
    ix: 1,
    iy: -1,
    a: Math.atan2(Math.sin(10), Math.cos(10)),
    f: true,
    dn: 5,
    un: 9,
    dreq: true,
    ureq: true,
  });

  const replay = rules.sanitizeInput({
    ix: Infinity,
    iy: NaN,
    a: 'invalid',
    dn: 500,
    un: 8,
    f: 1,
  }, player);
  assert.deepEqual(replay, {
    ix: 0,
    iy: 0,
    a: 0,
    f: false,
    dn: 4,
    un: 8,
    dreq: false,
    ureq: false,
  });
});

test('nuke, bullets, freeze, and black-hole protections follow player status', () => {
  const player = { id: 2, al: true, shield: 0, inv: 0, dash: 0, frozen: 0, powerup: 'nuke' };
  assert.equal(rules.canBeNuked(player, 1, 300), true);
  assert.equal(rules.canBeNuked(player, 1, 301), false);
  assert.equal(rules.canBeNuked({ ...player, shield: 1 }, 1, 50), false);
  assert.equal(rules.canBeNuked({ ...player, inv: 1 }, 1, 50), false);
  assert.equal(rules.canBeNuked(player, 2, 0), false);

  assert.equal(rules.canTakeBulletDamage(player), true);
  assert.equal(rules.canTakeBulletDamage({ ...player, shield: 1 }), false);
  assert.equal(rules.canTakeBulletDamage({ ...player, dash: 1 }), false);
  assert.equal(rules.canBeFrozen(player, 1), true);
  assert.equal(rules.canBeFrozen({ ...player, shield: 1 }, 1), false);
  assert.equal(rules.canBeFrozen(player, 2), false);

  assert.equal(rules.canBeKilledByBlackHole(player, 1, 38), true);
  assert.equal(rules.canBeKilledByBlackHole({ ...player, dash: 1 }, 1, 20), false);
  assert.equal(rules.canBeKilledByBlackHole({ ...player, inv: 1 }, 1, 20), false);
  assert.equal(rules.canBeKilledByBlackHole({ ...player, shield: 1 }, 1, 20), false);
  assert.equal(rules.canBeKilledByBlackHole(player, 2, 20), false);
});

test('power use requires a running, alive, unfrozen player and an inventory item', () => {
  const player = { al: true, frozen: 0, powerup: 'shield' };
  assert.equal(rules.canUsePowerUp(player, 2), true);
  assert.equal(rules.canUsePowerUp(player, 1), false);
  assert.equal(rules.canUsePowerUp({ ...player, al: false }, 2), false);
  assert.equal(rules.canUsePowerUp({ ...player, frozen: 0.1 }, 2), false);
  assert.equal(rules.canUsePowerUp({ ...player, powerup: null }, 2), false);
});

test('black-hole pull smoothly slows with distance while retaining a gentle outer pull', () => {
  assert.ok(rules.blackHolePullSpeed(900) < 50);
  assert.ok(rules.blackHolePullSpeed(600) > rules.blackHolePullSpeed(900));
  assert.ok(rules.blackHolePullSpeed(300) > rules.blackHolePullSpeed(600));
  assert.equal(rules.blackHolePullSpeed(0), 700);
  assert.equal(rules.blackHolePullSpeed(1000), 25);
  assert.equal(rules.blackHolePullSpeed(-10), 700);
});
