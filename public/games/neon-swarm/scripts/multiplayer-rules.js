'use strict';

(function attachNeonSwarmRules(root, factory) {
  const rules = factory();
  root.NeonSwarmRules = rules;
  if (typeof module !== 'undefined' && module.exports) module.exports = rules;
})(globalThis, () => {
  const POWER_UPS = [
    { id: 'nuke', name: 'NUCLEAR BOMB', color: '#ff7a1a' },
    { id: 'black-hole', name: 'BLACK HOLE BOMB', color: '#a66bff' },
    { id: 'shield', name: 'SHIELD', color: '#7ab8ff' },
    { id: 'light', name: 'EMP', color: '#e8f6ff' },
  ];
  const POWER_UP_IDS = new Set(POWER_UPS.map((powerUp) => powerUp.id));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const MAX_ACTIVE_BOTS = 2;
  const BOT_SPAWN_INTERVAL = 20;

  function createMatchPlan(random = Math.random) {
    const powerUps = POWER_UPS.map((powerUp) => powerUp.id);
    for (let i = powerUps.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [powerUps[i], powerUps[j]] = [powerUps[j], powerUps[i]];
    }
    const botCount = 6;
    return {
      botPowerUps: Array.from({ length: botCount }, (_, i) => powerUps[i % powerUps.length]),
      botTimes: Array.from({ length: botCount }, (_, i) => i * BOT_SPAWN_INTERVAL),
    };
  }

  function sanitizeInput(data, player) {
    const number = (value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const counter = (value, previous) => {
      const next = Number(value);
      return Number.isSafeInteger(next) && next > previous && next - previous < 100
        ? next
        : previous;
    };
    const dashCounter = counter(data.dn, player.dn);
    const useCounter = counter(data.un, player.un);
    const aim = number(data.a);
    return {
      ix: clamp(number(data.ix), -1, 1),
      iy: clamp(number(data.iy), -1, 1),
      a: Math.atan2(Math.sin(aim), Math.cos(aim)),
      f: data.f === true,
      dn: dashCounter,
      un: useCounter,
      dreq: dashCounter > player.dn,
      ureq: useCounter > player.un,
    };
  }

  function canUsePowerUp(player, phase) {
    return phase === 2 && player.al && player.frozen <= 0 && POWER_UP_IDS.has(player.powerup);
  }

  function canTakeBulletDamage(player) {
    return player.al && player.shield <= 0 && player.inv <= 0 && player.dash <= 0;
  }

  function canBeNuked(player, userId, distance) {
    return player.id !== userId && player.al && distance <= 300 &&
      player.shield <= 0 && player.inv <= 0;
  }

  function canBeKilledByBlackHole(player, ownerId, distance) {
    return player.id !== ownerId && player.al && distance <= 38 &&
      player.shield <= 0 && player.inv <= 0 && player.dash <= 0;
  }

  function canBeFrozen(player, userId) {
    return player.id !== userId && player.al && player.shield <= 0;
  }

  function blackHolePullSpeed(distance) {
    const proximity = 1 - clamp(distance / 1000, 0, 1);
    return 25 + 675 * proximity * proximity;
  }

  return {
    POWER_UPS,
    MAX_ACTIVE_BOTS,
    BOT_SPAWN_INTERVAL,
    createMatchPlan,
    sanitizeInput,
    canUsePowerUp,
    canTakeBulletDamage,
    canBeNuked,
    canBeKilledByBlackHole,
    canBeFrozen,
    blackHolePullSpeed,
  };
});
