'use strict';

const { performance } = require('node:perf_hooks');
const { io } = require('socket.io-client');

const DEFAULTS = {
  url: 'http://127.0.0.1:3000',
  duration: 15,
  httpConcurrency: 5,
  socketClients: 5,
  allowRemote: false,
  probeEventLimit: false,
};

function parseArgs(args) {
  const options = { ...DEFAULTS };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--help') {
      console.log('Usage: npm run load-test -- [--url URL] [--duration SECONDS] [--http-concurrency N] [--socket-clients N] [--probe-event-limit] [--allow-remote]');
      process.exit(0);
    }
    if (arg === '--allow-remote') {
      options.allowRemote = true;
      continue;
    }
    if (arg === '--probe-event-limit') {
      options.probeEventLimit = true;
      continue;
    }

    const values = {
      '--url': 'url',
      '--duration': 'duration',
      '--http-concurrency': 'httpConcurrency',
      '--socket-clients': 'socketClients',
    };
    const key = values[arg];
    if (!key || !args[index + 1]) throw new Error(`Unknown or incomplete option: ${arg}`);
    options[key] = key === 'url' ? args[++index] : Number(args[++index]);
  }
  return options;
}

function validateOptions(options) {
  let target;
  try {
    target = new URL(options.url);
  } catch {
    throw new Error('--url must be a valid HTTP or HTTPS URL.');
  }
  if (!['http:', 'https:'].includes(target.protocol)) {
    throw new Error('--url must use HTTP or HTTPS.');
  }

  const local = target.hostname === 'localhost' || target.hostname === '::1' ||
    /^127(?:\.\d{1,3}){3}$/.test(target.hostname);
  if (!local && !options.allowRemote) {
    throw new Error('Remote targets are disabled by default. Use a staging site you control and pass --allow-remote.');
  }
  if (!Number.isInteger(options.duration) || !Number.isInteger(options.httpConcurrency) ||
      !Number.isInteger(options.socketClients)) {
    throw new Error('Duration and concurrency values must be whole numbers.');
  }
  if (options.probeEventLimit && !local) {
    throw new Error('--probe-event-limit is permitted only against localhost.');
  }

  const limits = local
    ? { duration: 60, httpConcurrency: 25, socketClients: 20 }
    : { duration: 30, httpConcurrency: 3, socketClients: 3 };
  for (const key of Object.keys(limits)) {
    if (options[key] < 1 || options[key] > limits[key]) {
      throw new Error(`${key} must be between 1 and ${limits[key]} for this target.`);
    }
  }
  return target;
}

function percentile(values, fraction) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

function formatMs(value) {
  return `${value.toFixed(1)} ms`;
}

function connectSocket(target) {
  const socket = io(target.origin, { reconnection: false, timeout: 5000 });
  const started = performance.now();
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      socket.close();
      resolve({ socket: null, latency: performance.now() - started, error: 'connect timeout' });
    }, 6000);
    socket.once('connect', () => {
      clearTimeout(timeout);
      resolve({ socket, latency: performance.now() - started });
    });
    socket.once('connect_error', (error) => {
      clearTimeout(timeout);
      socket.close();
      resolve({ socket: null, latency: performance.now() - started, error: error.message });
    });
  });
}

function emitWithAck(socket, event, payload) {
  const started = performance.now();
  return new Promise((resolve) => {
    socket.timeout(5000).emit(event, payload, (error, response) => {
      resolve({
        latency: performance.now() - started,
        response,
        error: error ? error.message : null,
      });
    });
  });
}

async function runHttpLoad(target, options) {
  const urls = [new URL('/', target), new URL('/api/config', target)];
  const durations = [];
  const statuses = new Map();
  let failures = 0;
  let requestIndex = 0;
  const started = performance.now();
  const deadline = started + options.duration * 1000;

  async function worker() {
    while (performance.now() < deadline) {
      const url = urls[requestIndex++ % urls.length];
      const requestStarted = performance.now();
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
        await response.arrayBuffer();
        durations.push(performance.now() - requestStarted);
        statuses.set(response.status, (statuses.get(response.status) || 0) + 1);
      } catch {
        failures++;
      }
    }
  }

  await Promise.all(Array.from({ length: options.httpConcurrency }, worker));
  const elapsed = (performance.now() - started) / 1000;
  const requests = [...statuses.values()].reduce((sum, count) => sum + count, 0);
  const badResponses = [...statuses.entries()]
    .filter(([status]) => status < 200 || status >= 400)
    .reduce((sum, [, count]) => sum + count, 0);

  console.log(`HTTP: ${requests} responses, ${failures} network errors, ${(requests / elapsed).toFixed(1)} requests/sec`);
  console.log(`HTTP latency: p50 ${formatMs(percentile(durations, 0.50))}, p95 ${formatMs(percentile(durations, 0.95))}`);
  console.log(`HTTP statuses: ${[...statuses].map(([status, count]) => `${status}=${count}`).join(', ') || 'none'}`);
  if (failures || badResponses) process.exitCode = 1;
}

async function probeEventLimit(socket) {
  let accepted = 0;
  let limited = 0;
  let errors = 0;
  for (let index = 0; index < 65; index++) {
    const result = await emitWithAck(socket, 'rooms:subscribe', {});
    if (result.error) errors++;
    else if (result.response && result.response.code === 'RATE_LIMITED') limited++;
    else if (result.response && result.response.ok) accepted++;
    else errors++;
  }
  console.log(`Room-list limit probe: ${accepted} accepted, ${limited} rate-limited, ${errors} errors (limit is 60/IP/minute; previous requests in this window count)`);
  if (!limited) process.exitCode = 1;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const target = validateOptions(options);
  const local = target.hostname === 'localhost' || target.hostname === '::1' ||
    /^127(?:\.\d{1,3}){3}$/.test(target.hostname);
  console.log(`Target: ${target.origin} (${local ? 'local' : 'remote, capped'})`);
  console.log(`HTTP: ${options.duration}s at concurrency ${options.httpConcurrency}; Socket.IO clients: ${options.socketClients}`);

  const connects = await Promise.all(
    Array.from({ length: options.socketClients }, () => connectSocket(target))
  );
  const sockets = connects.flatMap((result) => result.socket ? [result.socket] : []);
  const failed = connects.filter((result) => !result.socket);
  console.log(`Socket.IO: ${sockets.length}/${options.socketClients} connected, ${failed.length} failed`);
  if (sockets.length) {
    console.log(`Connect latency: p50 ${formatMs(percentile(connects.filter((result) => result.socket).map((result) => result.latency), 0.50))}, p95 ${formatMs(percentile(connects.filter((result) => result.socket).map((result) => result.latency), 0.95))}`);
    const subscriptions = await Promise.all(sockets.map((socket) => emitWithAck(socket, 'rooms:subscribe', {})));
    const accepted = subscriptions.filter((result) => result.response && result.response.ok).length;
    const limited = subscriptions.filter((result) => result.response && result.response.code === 'RATE_LIMITED').length;
    const eventErrors = subscriptions.length - accepted - limited;
    console.log(`Room-list acknowledgements: ${accepted} accepted, ${limited} rate-limited, ${eventErrors} errors; p95 ${formatMs(percentile(subscriptions.map((result) => result.latency), 0.95))}`);
    if (failed.length || eventErrors) process.exitCode = 1;
    if (options.probeEventLimit) await probeEventLimit(sockets[0]);
  } else {
    process.exitCode = 1;
  }

  await runHttpLoad(target, options);
  for (const socket of sockets) socket.close();
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});