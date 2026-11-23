'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const scriptDir = path.join(__dirname, '../public/games/neon-swarm/scripts');
const scripts = [
  'core.js',
  'render.js',
  'multiplayer-rules.js',
  'multiplayer.js',
  'multiplayer-render.js',
  'input.js',
];

function createBrowser() {
  const emitted = [];
  const drawnText = [];
  const elements = new Map();
  const listeners = new Map();
  const drawing = new Proxy({}, {
    get(target, key) {
      if (key === 'createRadialGradient') return () => ({ addColorStop() {} });
      if (key === 'fillText') return (text) => drawnText.push(String(text));
      if (!(key in target)) target[key] = () => {};
      return target[key];
    },
    set(target, key, value) {
      target[key] = value;
      return true;
    },
  });
  const element = () => ({
    style: {},
    children: [],
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {},
    append(...items) { this.children.push(...items); },
    replaceChildren(...items) { this.children = items; },
    setAttribute() {},
    remove() {},
    focus() {},
    select() {},
    getContext() { return drawing; },
  });
  const socket = {
    connected: true,
    on() { return this; },
    emit(event, payload, callback) {
      emitted.push({ event, payload, delivery: 'reliable' });
      if (callback) callback({ ok: true });
      return this;
    },
    volatile: {
      emit(event, payload) { emitted.push({ event, payload, delivery: 'volatile' }); },
    },
    timeout() { return this; },
  };
  const context = vm.createContext({
    console,
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, element());
        return elements.get(id);
      },
      createElement: element,
    },
    io: () => socket,
    localStorage: { getItem() { return null; }, setItem() {} },
    addEventListener(name, callback) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(callback);
    },
    requestAnimationFrame() {},
    setTimeout() { return 1; },
    clearTimeout() {},
    setInterval() {},
    innerWidth: 1600,
    innerHeight: 900,
    devicePixelRatio: 1,
    navigator: { clipboard: { writeText() {} } },
    prompt() { return null; },
    confirm() { return true; },
    performance: { now() { return 0; } },
  });
  context.window = context;
  for (const file of scripts) {
    vm.runInContext(fs.readFileSync(path.join(scriptDir, file), 'utf8'), context, { filename: file });
  }
  vm.runInContext('PT=[];TX=[];shake=0;', context);
  return { context, emitted, drawnText, listeners };
}

function player(id, name, x, y, overrides = {}) {
  return {
    id, name, col: id === 0 ? '#3dd6ff' : '#ff3d7f',
    x, y, tx: x, ty: y, a: 0, vx: 0, vy: 0, hull: 3,
    kills: 0, deaths: 0, al: true, inv: 0, dash: 0, cd: 0,
    fire: 100, rt: 0, dx: 1, dy: 0, dn: 0, un: 0,
    powerup: null, shield: 0, frozen: 0,
    inp: { ix: 0, iy: 0, a: 0, f: false, dreq: false, ureq: false },
    ...overrides,
  };
}

function setMatch(context, players, overrides = {}) {
  context.matchState = {
    host: true, id: 0, pl: players, bl: [], bots: [], hole: null,
    ph: 2, tl: 110, botTimes: [1000, 1040, 1080],
    botPowerUps: ['nuke', 'black-hole', 'shield'], botIndex: 3,
    nextBotId: 3, matchElapsed: 20, ev: [], msgs: [],
    cdL: 0, dn: 0, un: 0, sacc: 0, acc: 0, pend: {},
    ...overrides,
  };
  context.vmMatch = context.matchState;
  vm.runInContext('mp=vmMatch;st="mp";MP_WAVES=[];PT=[];TX=[];shake=0;', context);
}

function state(context, expression) {
  context.query = expression;
  return vm.runInContext(`(${expression})`, context);
}

test('audio unlocks on a user gesture and schedules sound', () => {
  const { context, listeners } = createBrowser();
  const audio = { resumed: 0, started: [] };
  context.AudioContext = class {
    constructor() {
      this.state = 'suspended';
      this.currentTime = 0;
      this.destination = {};
    }
    resume() {
      audio.resumed++;
      this.state = 'running';
      return Promise.resolve();
    }
    createOscillator() {
      return {
        frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {},
        start(time) { audio.started.push(time); },
        stop() {},
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {},
      };
    }
  };

  listeners.get('pointerdown')[0]();
  vm.runInContext("beep(440,.1,'sine',.1,220,.2)", context);
  assert.equal(audio.resumed, 1);
  assert.deepEqual(audio.started, [0.2]);
});

test('multiplayer power-ups each produce a layered sound cue', () => {
  const { context } = createBrowser();
  vm.runInContext("mp={id:0,msgs:[]};MP_WAVES=[]", context);
  const cues = [
    { event: "['nuke',0,800,450]", frequency: 70, offsets: [0, 0.03, 0.08] },
    { event: "['black-hole',0]", frequency: 220, offsets: [0, 0.08, 0.18] },
    { event: "['shield',0]", frequency: 360, offsets: [0, 0.12, 0.24] },
    { event: "['freeze',0,800,450]", frequency: 1350, offsets: [0, 0.14, 0.28] },
  ];

  for (const cue of cues) {
    const sounds = [];
    context.beep = (...args) => sounds.push(args);
    vm.runInContext(`applyEv(${cue.event})`, context);
    assert.equal(sounds.length, 3);
    assert.equal(sounds[0][0], cue.frequency);
    assert.deepEqual(sounds.map((sound) => sound[5] || 0), cue.offsets);
  }
});

test('host starts each rematch with clean power state and schedules a bot every twenty seconds', () => {
  const { context } = createBrowser();
  vm.runInContext(
    "mp={host:true,id:0,pl:[],pend:{},req:document.createElement('div'),bl:[],bots:[],hole:null,ev:[],msgs:[]};mkP(0,'HOST');mkP(1,'GUEST');hostStart();",
    context
  );

  const match = state(context, 'mp');
  assert.equal(match.ph, 1);
  assert.equal(match.botPowerUps.length, 6);
  assert.deepEqual(Array.from(match.botTimes), Array.from({ length: 6 }, (_, i) => i * 20));
  assert.ok(match.pl.every((p) => p.powerup === null && p.shield === 0 && p.frozen === 0));

  vm.runInContext("mp.ph=2;mp.tl=120;mp.botTimes=[0.05,40.05,80.05];mp.botPowerUps=['nuke','shield','light'];mp.botIndex=0;mp.matchElapsed=0;hostStep(.1);", context);
  vm.runInContext("mp.matchElapsed=40;hostStep(.1);mp.matchElapsed=80;hostStep(.1);", context);
  assert.equal(state(context, "mp.ev.filter((event)=>event[0]==='bot-spawned').length"), 2);
  assert.equal(state(context, 'mp.bots.length'), 2);
});

test('first bot spawns as soon as the match starts', () => {
  const { context } = createBrowser();
  const host = player(0, 'HOST', 800, 450);
  const guest = player(1, 'GUEST', 900, 450);
  setMatch(context, [host, guest], {
    ph: 1, tl: 0.01, botTimes: [0, 10, 20], botPowerUps: ['nuke', 'shield', 'light'],
    botIndex: 0, matchElapsed: 0,
  });

  vm.runInContext('hostStep(.02)', context);
  assert.equal(state(context, 'mp.ph'), 2);
  assert.equal(state(context, 'mp.bots.length'), 1);
  assert.ok(state(context, "mp.ev.some((event)=>event[0]==='bot-spawned')"));
});

test('player bullets damage and eliminate opponents while respecting spawn protection', () => {
  const { context } = createBrowser();
  const shooter = player(0, 'SHOOTER', 100, 100);
  const target = player(1, 'TARGET', 500, 500, { hull: 1 });
  const protectedPlayer = player(2, 'PROTECTED', 600, 600, { inv: 2 });
  setMatch(context, [shooter, target, protectedPlayer], {
    bl: [
      { x: 500, y: 500, vx: 0, vy: 0, l: 1, o: 0, bot: false },
      { x: 600, y: 600, vx: 0, vy: 0, l: 1, o: 0, bot: false },
    ],
  });

  vm.runInContext('moveBullets(.01)', context);
  assert.equal(state(context, 'mp.pl[1].al'), false);
  assert.equal(state(context, 'mp.pl[0].kills'), 1);
  assert.equal(state(context, 'mp.pl[2].al'), true);
  assert.ok(state(context, "mp.ev.some((event)=>event[0]==='k'&&event[1]==='SHOOTER'&&event[2]==='TARGET')"));
});

test('nuke uses the inclusive 300-unit radius, credits kills, and spares shield and spawn protection', () => {
  const { context } = createBrowser();
  const host = player(0, 'HOST', 100, 100, {
    powerup: 'nuke',
    inp: { ix: 0, iy: 0, a: 0, f: false, dreq: false, ureq: true },
  });
  const inRange = player(1, 'IN RANGE', 400, 100);
  const outOfRange = player(2, 'OUTSIDE', 401, 100);
  const shielded = player(3, 'SHIELDED', 150, 100, { shield: 2 });
  const spawning = player(4, 'SPAWNING', 150, 120, { inv: 2 });
  setMatch(context, [host, inRange, outOfRange, shielded, spawning], {
    bots: [{ id: 7, x: 400, y: 100, hp: 4, ttl: 25, fire: 1.4, powerup: 'light', dead: false }],
  });

  vm.runInContext('hostStep(.001)', context);
  assert.equal(state(context, 'mp.pl[1].al'), false);
  assert.equal(state(context, 'mp.pl[2].al'), true);
  assert.equal(state(context, 'mp.pl[3].al'), true);
  assert.equal(state(context, 'mp.pl[4].al'), true);
  assert.equal(state(context, 'mp.pl[0].kills'), 1);
  assert.equal(state(context, 'mp.pl[0].powerup'), 'light');
  assert.ok(state(context, "mp.ev.some((event)=>event[0]==='nuke')"));
});

test('black hole drags players, kills and credits in range, but does not pull shielded players or kill its owner', () => {
  const { context } = createBrowser();
  const owner = player(0, 'OWNER', 790, 450, {
    powerup: 'black-hole',
    inp: { ix: 0, iy: 0, a: 0, f: false, dreq: false, ureq: true },
  });
  const victim = player(1, 'VICTIM', 839, 450);
  const shielded = player(2, 'SAFE', 1200, 450, { shield: 5 });
  const dragged = player(3, 'DRAGGED', 1200, 450);
  const farthest = player(4, 'FARTHEST', 1450, 850);
  setMatch(context, [owner, victim, shielded, dragged, farthest]);

  vm.runInContext('hostStep(.01)', context);
  assert.equal(state(context, 'mp.hole.t'), 5);
  assert.equal(state(context, 'mp.pl[0].al'), true);
  assert.equal(state(context, 'mp.pl[1].al'), false);
  assert.equal(state(context, 'mp.pl[0].kills'), 1);
  assert.equal(state(context, 'mp.pl[2].x'), 1200);
  assert.ok(state(context, 'mp.pl[3].x') < 1200);
  assert.ok(Math.hypot(1450 - state(context, 'mp.pl[4].x'), 850 - state(context, 'mp.pl[4].y')) > 0);
  assert.ok(
    Math.hypot(1450 - state(context, 'mp.pl[4].x'), 850 - state(context, 'mp.pl[4].y')) <
      Math.hypot(1450 - 800, 850 - 450)
  );
  assert.ok(
    Math.hypot(1200 - state(context, 'mp.pl[3].x'), 450 - state(context, 'mp.pl[3].y')) >
      Math.hypot(1450 - state(context, 'mp.pl[4].x'), 850 - state(context, 'mp.pl[4].y'))
  );
  assert.ok(state(context, "mp.ev.some((event)=>event[0]==='black-hole')"));
});

test('bot bullets kill players without awarding a player kill', () => {
  const { context } = createBrowser();
  const victim = player(0, 'VICTIM', 100, 100, { hull: 1 });
  const other = player(1, 'OTHER', 500, 500);
  setMatch(context, [victim, other], {
    bl: [{ x: 100, y: 100, vx: 0, vy: 0, l: 1, o: -1, bot: true }],
  });

  vm.runInContext('hostStep(.01)', context);
  assert.equal(state(context, 'mp.pl[0].al'), false);
  assert.equal(state(context, 'mp.pl[0].deaths'), 1);
  assert.equal(state(context, 'mp.pl[1].kills'), 0);
  assert.ok(state(context, "mp.ev.some((event)=>event[0]==='k'&&event[1]==='BOT'&&event[2]==='VICTIM')"));
});

test('shield blocks bullets, nuke, black-hole pull, and freeze', () => {
  const { context } = createBrowser();
  const shielded = player(0, 'SHIELDED', 900, 450, {
    powerup: 'shield',
    inp: { ix: 0, iy: 0, a: 0, f: false, dreq: false, ureq: true },
  });
  const nukeUser = player(1, 'NUKE', 1000, 450, {
    powerup: 'nuke',
    inp: { ix: 0, iy: 0, a: 0, f: false, dreq: false, ureq: true },
  });
  const freezeUser = player(2, 'FREEZE', 1400, 450, {
    powerup: 'light',
    inp: { ix: 0, iy: 0, a: 0, f: false, dreq: false, ureq: true },
  });
  setMatch(context, [shielded, nukeUser, freezeUser], {
    hole: { ownerId: 2, x: 800, y: 450, t: 10 },
    bl: [{ x: 900, y: 450, vx: 0, vy: 0, l: 1, o: -1, bot: true }],
  });

  vm.runInContext('hostStep(.001)', context);
  assert.equal(state(context, 'mp.pl[0].al'), true);
  assert.equal(state(context, 'mp.pl[0].x'), 900);
  assert.equal(state(context, 'mp.pl[0].frozen'), 0);
  assert.equal(state(context, 'mp.pl[0].hull'), 3);
  assert.ok(state(context, "mp.ev.some((event)=>event[0]==='shield')"));
  assert.ok(state(context, "mp.ev.some((event)=>event[0]==='nuke')"));
  assert.ok(state(context, "mp.ev.some((event)=>event[0]==='freeze')"));
});

test('EMP freezes for five seconds, blocks controls but not incoming bullets', () => {
  const { context } = createBrowser();
  const user = player(0, 'USER', 100, 100, {
    powerup: 'light',
    inp: { ix: 0, iy: 0, a: 0, f: false, dreq: false, ureq: true },
  });
  const frozen = player(1, 'FROZEN', 500, 450, {
    powerup: 'nuke',
    inp: { ix: 1, iy: 0, a: 0, f: true, dreq: true, ureq: true },
  });
  const shielded = player(2, 'SHIELDED', 600, 450, { shield: 6 });
  setMatch(context, [user, frozen, shielded]);

  vm.runInContext('hostStep(.01)', context);
  assert.equal(state(context, 'mp.pl[1].frozen'), 5);
  assert.equal(state(context, 'mp.pl[2].frozen'), 0);
  const frozenX = state(context, 'mp.pl[1].x');
  vm.runInContext('hostStep(.05)', context);
  assert.equal(state(context, 'mp.pl[1].x'), frozenX);
  assert.equal(state(context, 'mp.pl[1].dash'), 0);
  assert.equal(state(context, 'mp.pl[1].powerup'), 'nuke');
  for (let i = 0; i < 98; i++) vm.runInContext('hostStep(.05)', context);
  assert.ok(Math.abs(state(context, 'mp.pl[1].frozen') - 0.05) < 1e-8);
  vm.runInContext('hostStep(.05)', context);
  assert.ok(Math.abs(state(context, 'mp.pl[1].frozen')) < 1e-8);
  vm.runInContext('hostStep(.05)', context);
  assert.ok(state(context, 'mp.pl[1].x') > frozenX);
});

test('bots do not shoot, grant power-ups but not kills, and expire without a drop', () => {
  const { context } = createBrowser();
  const host = player(0, 'HOST', 800, 450);
  const target = player(1, 'TARGET', 900, 450);
  const bot = { id: 2, x: 500, y: 450, hp: 4, ttl: 25, powerup: 'shield', dead: false };
  setMatch(context, [host, target], { bots: [bot] });

  vm.runInContext('moveBots(.01)', context);
  assert.equal(state(context, 'mp.bl.length'), 0);

  vm.runInContext("for(let i=0;i<4;i++)damageBot(mp.bots[0],mp.pl[0])", context);
  assert.equal(state(context, 'mp.pl[0].kills'), 0);
  assert.equal(state(context, 'mp.pl[0].powerup'), 'shield');
  assert.ok(state(context, "mp.ev.some((event)=>event[0]==='bot-killed')"));
  assert.ok(state(context, "mp.ev.some((event)=>event[0]==='powerup')"));

  vm.runInContext("mp.bots=[{id:3,x:500,y:450,hp:4,ttl:.05,powerup:'light',dead:false}];moveBots(.05)", context);
  assert.equal(state(context, 'mp.bots.length'), 0);
  assert.ok(state(context, "mp.ev.some((event)=>event[0]==='bot-left')"));
});

test('scheduled bot spawns never exceed two living bots', () => {
  const { context } = createBrowser();
  const host = player(0, 'HOST', 800, 450);
  const guest = player(1, 'GUEST', 900, 450);
  setMatch(context, [host, guest], {
    botTimes: [0, 0, 0],
    botPowerUps: ['nuke', 'shield', 'light'],
    botIndex: 0,
    matchElapsed: 0,
  });

  vm.runInContext('hostStep(.01)', context);
  assert.equal(state(context, 'mp.bots.length'), 2);
});

test('player firing produces a multiplayer sound event for guests', () => {
  const hostBrowser = createBrowser();
  const shooter = player(0, 'SHOOTER', 100, 100, {
    fire: 0,
    inp: { ix: 0, iy: 0, a: 0, f: true, dreq: false, ureq: false },
  });
  const target = player(1, 'TARGET', 500, 500);
  setMatch(hostBrowser.context, [shooter, target]);

  vm.runInContext('hostStep(.01);snapshotSend()', hostBrowser.context);
  const snapshot = hostBrowser.emitted.at(-1).payload.data;
  assert.ok(snapshot.ev.some(([type, playerId]) => type === 'shot' && playerId === 0));

  const guestBrowser = createBrowser();
  const sounds = [];
  guestBrowser.context.beep = (...args) => sounds.push(args);
  guestBrowser.context.roster = [
    { id: 0, name: 'SHOOTER', col: '#3dd6ff' },
    { id: 1, name: 'TARGET', col: '#ff3d7f' },
  ];
  guestBrowser.context.snapshot = snapshot;
  vm.runInContext("mp={host:false,id:1,pl:[],bl:[],bots:[],hole:null,ph:0,tl:0,msgs:[],lob:roster};cliMsg(snapshot)", guestBrowser.context);
  assert.deepEqual(sounds[0], [880, 0.05, 'square', 0.025, 440]);
});

test('guest receives authoritative bot, bullet, status, inventory, hole, and effect snapshots', () => {
  const hostBrowser = createBrowser();
  const host = player(0, '<HOST>', 800, 450, { shield: 7 });
  const guest = player(1, 'GUEST', 900, 450, { frozen: 3, powerup: 'nuke' });
  setMatch(hostBrowser.context, [host, guest], {
    bots: [{ id: 5, x: 600, y: 400, hp: 2 }],
    bl: [{ x: 620, y: 400, vx: 330, vy: 0, l: 2.5, o: -1, bot: true }],
    hole: { ownerId: 0, x: 800, y: 450, t: 6.5 },
    ev: [['bot-spawned', 5, 600, 400, 'shield']],
  });
  vm.runInContext('snapshotSend()', hostBrowser.context);
  const snapshot = hostBrowser.emitted.at(-1);
  const message = snapshot.payload.data;
  assert.equal(snapshot.delivery, 'reliable');
  assert.equal(message.k, 's');

  const guestBrowser = createBrowser();
  const context = guestBrowser.context;
  context.roster = [
    { id: 0, name: '<HOST>', col: '#3dd6ff' },
    { id: 1, name: 'GUEST', col: '#ff3d7f' },
  ];
  context.snapshot = message;
  vm.runInContext("mp={host:false,id:1,pl:[],bl:[],bots:[],hole:null,ph:0,tl:0,msgs:[],lob:roster};cliMsg(snapshot)", context);
  assert.equal(state(context, 'mp.bots[0].hp'), 2);
  assert.equal(state(context, 'mp.bl[0].bot'), true);
  assert.equal(state(context, 'mp.hole.t'), 6.5);
  assert.equal(state(context, 'mp.pl[0].shield'), 1);
  assert.equal(state(context, 'mp.pl[1].frozen'), 1);
  assert.equal(state(context, 'mp.pl[1].powerup'), 'nuke');
  vm.runInContext('mpDraw()', context);
  assert.ok(guestBrowser.drawnText.includes('BOT'));
  assert.ok(guestBrowser.drawnText.includes('POWER-UP BOT INCOMING!'));
  assert.ok(guestBrowser.drawnText.includes('[E] NUCLEAR BOMB'));
  assert.ok(guestBrowser.drawnText.includes('FROZEN'));
  assert.ok(guestBrowser.drawnText.some((text) => text.includes('<HOST>')));
});
