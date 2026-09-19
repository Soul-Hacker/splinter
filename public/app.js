(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const SESSION_KEY = 'splinter-session';
  const socket = io();

  const wordInput = $('wordInput');
  const submitBtn = $('submitBtn');

  let state = null;        // latest snapshot from the server
  let clockOffset = 0;     // serverTime - clientTime, so the countdown matches the server
  let session = readSession();
  let tilesWord = null;    // base word the tiles were last built for
  let focusedRound = 0;    // round number the input was last reset/focused for
  let feedbackTimer = null;

  // sessionStorage is per-tab, so two tabs on one machine are two separate players.
  function readSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; }
  }
  function writeSession(value) {
    session = value;
    try {
      if (value) sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
      else sessionStorage.removeItem(SESSION_KEY);
    } catch { /* storage unavailable: reconnect just won't auto-resume */ }
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  const serverNow = () => Date.now() + clockOffset;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  function formatClock(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  // ------------------------------------------------------------ connection

  socket.on('connect', () => {
    $('conn').hidden = true;
    if (session) join(session.username, session.token, true);
  });
  socket.on('disconnect', () => { $('conn').hidden = false; });
  socket.on('state', (snapshot) => {
    state = snapshot;
    clockOffset = snapshot.serverNow - Date.now();
    render();
  });

  function join(username, token, silent) {
    socket.emit('join', { username, token }, (res) => {
      if (res && res.ok) {
        writeSession({ username: res.username, token: res.token });
        return;
      }
      if (silent) writeSession(null); // saved identity is no longer valid
      state = null;
      render();
      $('joinError').textContent = (res && res.error) || 'Could not join.';
    });
  }

  // ------------------------------------------------------------ UI events

  $('joinForm').addEventListener('submit', (e) => {
    e.preventDefault();
    $('joinError').textContent = '';
    join($('usernameInput').value, null, false);
  });

  $('startBtn').addEventListener('click', () => {
    $('startError').textContent = '';
    socket.emit('start', {}, (res) => {
      if (!res.ok) $('startError').textContent = res.reason;
    });
  });

  $('playAgainBtn').addEventListener('click', () => {
    $('playAgainError').textContent = '';
    socket.emit('playAgain', {}, (res) => {
      if (!res.ok) $('playAgainError').textContent = res.reason;
    });
  });

  function setFeedback(text, kind) {
    const box = $('feedback');
    box.textContent = text;
    box.className = `feedback ${kind || ''}`;
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => { box.textContent = ''; box.className = 'feedback'; }, 3500);
  }

  function submitWord() {
    const word = wordInput.value.trim();
    if (!word || wordInput.disabled) return;
    socket.emit('submit', { word }, (res) => {
      if (res && res.ok) {
        wordInput.value = '';
        updateTileUsage();
        setFeedback(`Added ${res.word}`, 'ok');
      } else {
        setFeedback((res && res.reason) || 'Word rejected.', 'error');
        const entry = $('entry');
        entry.classList.remove('shake');
        void entry.offsetWidth; // restart the animation
        entry.classList.add('shake');
        wordInput.select();
      }
    });
  }
  wordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitWord(); });
  wordInput.addEventListener('input', updateTileUsage);
  submitBtn.addEventListener('click', () => { submitWord(); wordInput.focus(); });

  // -------------------------------------------------------------- rendering

  const SCREEN_FOR_PHASE = { lobby: 'lobby', playing: 'game', roundEnd: 'results', gameOver: 'final' };
  const ALL_SCREENS = ['join', 'lobby', 'game', 'results', 'final'];

  function render() {
    const joined = Boolean(state && state.you);
    const screen = joined ? SCREEN_FOR_PHASE[state.phase] : 'join';
    for (const name of ALL_SCREENS) $(`screen-${name}`).hidden = name !== screen;

    const showSide = joined && screen !== 'final';
    $('side').hidden = !showSide;
    $('layout').classList.toggle('solo', !showSide);

    $('youChip').hidden = !joined;
    if (joined) $('youChip').textContent = state.you.username;

    if (!joined) return;
    if (state.phase !== 'playing') focusedRound = 0;

    if (showSide) renderScoreboard();
    if (screen === 'lobby') renderLobby();
    if (screen === 'game') renderGame();
    if (screen === 'results') renderResults();
    if (screen === 'final') renderFinal();
    tick();
  }

  function renderLobby() {
    const count = state.players.length;
    $('startBtn').disabled = !state.canStart;
    $('lobbyHint').textContent = state.canStart
      ? `${count} players are in. Anyone can start the game.`
      : `You need at least ${state.minPlayers} players to start. Send a friend this page's address.`;
  }

  function renderScoreboard() {
    const inLobby = state.phase === 'lobby';
    $('sideTitle').textContent = inLobby ? `In the lobby (${state.players.length})` : 'Scoreboard';

    const players = [...state.players];
    if (!inLobby) {
      players.sort((a, b) => b.total - a.total || a.username.localeCompare(b.username));
    }

    const list = $('scoreList');
    list.replaceChildren();
    for (const p of players) {
      const row = el('li', `score-row${p.connected ? '' : ' offline'}`);
      const name = el('span', 'score-name', p.username);
      if (p.isYou) name.append(el('span', 'me', ' (you)'));
      row.append(name);

      if (!inLobby) {
        let sub = '';
        if (!p.connected) sub = 'Disconnected';
        else if (state.phase === 'playing') sub = plural(p.wordCount, 'word', 'words') + ' found';
        if (sub) row.append(el('span', 'score-sub', sub));

        const total = el('span', 'score-total', String(p.total));
        if (state.phase === 'roundEnd' && p.roundScores.length) {
          total.append(el('small', null, `+${p.roundScores[p.roundScores.length - 1]}`));
        }
        row.append(total);
      }
      list.append(row);
    }
  }

  function renderGame() {
    $('roundLabel').textContent = `Round ${state.round} of ${state.totalRounds}`;

    if (tilesWord !== state.baseWord) {
      tilesWord = state.baseWord;
      const box = $('tiles');
      box.replaceChildren();
      for (const ch of state.baseWord) box.append(el('span', 'tile', ch));
      box.setAttribute('aria-label', `Base word: ${state.baseWord}`);
    }

    if (focusedRound !== state.round) {
      focusedRound = state.round;
      wordInput.value = '';
      wordInput.disabled = false;
      submitBtn.disabled = false;
      $('feedback').textContent = '';
      wordInput.focus();
    }
    updateTileUsage();

    const words = state.you.words;
    $('wordCount').textContent = String(words.length);
    $('myWordsEmpty').hidden = words.length > 0;
    const list = $('myWords');
    list.replaceChildren();
    for (const w of [...words].reverse()) list.append(el('li', 'chip', w));
  }

  // Dim the tiles for letters currently typed, so players can see what is left.
  function updateTileUsage() {
    const used = {};
    for (const ch of wordInput.value.toLowerCase().replace(/[^a-z]/g, '')) {
      used[ch] = (used[ch] || 0) + 1;
    }
    for (const tile of $('tiles').children) {
      const ch = tile.textContent;
      if (used[ch] > 0) { used[ch]--; tile.classList.add('used'); }
      else tile.classList.remove('used');
    }
  }

  function renderResultCards(container, result) {
    container.replaceChildren();
    const players = [...result.players].sort(
      (a, b) => b.score - a.score || a.username.localeCompare(b.username)
    );
    for (const p of players) {
      const mine = p.username === state.you.username;
      const card = el('article', `result-card${mine ? ' mine' : ''}`);

      const head = el('header', 'result-head');
      head.append(
        el('h3', null, mine ? `${p.username} (you)` : p.username),
        el('span', 'result-score', plural(p.score, 'point', 'points'))
      );
      card.append(head);

      const list = el('ul', 'chips');
      if (p.words.length === 0) list.append(el('li', 'empty', 'No words this round'));
      for (const w of p.words) {
        const chip = el('li', `chip ${w.status}`, w.word);
        if (w.status === 'cancelled') chip.title = 'Also found by another player';
        list.append(chip);
      }
      card.append(list);
      container.append(card);
    }
  }

  function renderResults() {
    const r = state.result;
    $('resultsTitle').textContent = `Round ${r.round} of ${state.totalRounds} results`;
    $('resultsBase').textContent = r.baseWord;
    renderResultCards($('resultsGrid'), r);
  }

  function renderFinal() {
    const names = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(state.winners);
    const top = Math.max(...state.players.map((p) => p.total));
    $('winnerTitle').textContent = state.winners.length === 1 ? `${names} wins` : `${names} tie`;
    $('winnerSub').textContent = `${plural(top, 'point', 'points')} after ${state.totalRounds} rounds.`;

    const head = $('standingsHead');
    head.replaceChildren();
    const headRow = el('tr');
    headRow.append(el('th', null, 'Player'));
    for (let i = 1; i <= state.totalRounds; i++) headRow.append(el('th', null, `R${i}`));
    headRow.append(el('th', null, 'Total'));
    head.append(headRow);

    const body = $('standingsBody');
    body.replaceChildren();
    const players = [...state.players].sort((a, b) => b.total - a.total || a.username.localeCompare(b.username));
    for (const p of players) {
      const row = el('tr', state.winners.includes(p.username) ? 'winner' : '');
      row.append(el('td', null, p.isYou ? `${p.username} (you)` : p.username));
      for (let i = 0; i < state.totalRounds; i++) {
        row.append(el('td', null, p.roundScores[i] === undefined ? '–' : String(p.roundScores[i])));
      }
      row.append(el('td', 'total', String(p.total)));
      body.append(row);
    }

    $('lastRoundTitle').textContent = `Round ${state.result.round} was ${state.result.baseWord}`;
    renderResultCards($('finalResultsGrid'), state.result);
  }

  // ----------------------------------------------------------------- timer

  function tick() {
    if (!state || !state.you) return;

    if (state.phase === 'playing') {
      const left = state.endsAt - serverNow();
      $('timer').textContent = formatClock(left);
      const fraction = Math.max(0, Math.min(1, left / state.roundMs));
      $('barFill').style.width = `${fraction * 100}%`;
      $('screen-game').classList.toggle('urgent', left <= 20000);
      const over = left <= 0;
      wordInput.disabled = over;
      submitBtn.disabled = over;
    } else if (state.phase === 'roundEnd') {
      $('nextIn').textContent = String(Math.max(0, Math.ceil((state.nextRoundAt - serverNow()) / 1000)));
    }
  }
  setInterval(tick, 200);

  // ------------------------------------------------------------------ init

  fetch('/api/config')
    .then((r) => r.json())
    .then((cfg) => {
      $('ruleRounds').textContent = String(cfg.totalRounds);
      const s = cfg.roundSeconds;
      $('ruleTime').textContent = s % 60 === 0 ? plural(s / 60, 'minute', 'minutes') : plural(s, 'second', 'seconds');
    })
    .catch(() => {});

  $('usernameInput').focus();
})();
