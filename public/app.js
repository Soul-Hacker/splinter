(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const SESSION_KEY = 'splinter-session';
  const socket = io();

  const wordInput = $('wordInput');
  const submitBtn = $('submitBtn');

  const MEDAL_RANK = { gold: 1, silver: 2, bronze: 3 };
  const MEDAL_LABEL = { gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
  const ROW_H = 60; // px per scoreboard row: 52px row + 8px gap (matches .rank-row in style.css)
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let state = null;        // latest snapshot from the server
  let clockOffset = 0;     // serverTime - clientTime, so the countdown matches the server
  let session = readSession();   // { username, room?, token? }, kept per browser tab
  let pendingRoom = urlRoom();   // room code from an invite link (?room=CODE)
  let roomsList = [];            // public rooms, pushed live by the server
  let tilesWord = null;    // base word the tiles were last built for
  let focusedRound = 0;    // round number the input was last reset/focused for
  let feedbackTimer = null;
  let selectedRounds = null; // rounds chosen in the lobby (null until the first snapshot)

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

  function urlRoom() {
    const code = new URLSearchParams(location.search).get('room');
    return code ? code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || null : null;
  }
  function setUrlRoom(code) {
    try {
      const url = new URL(location.href);
      if (code) url.searchParams.set('room', code);
      else url.searchParams.delete('room');
      history.replaceState(null, '', url);
    } catch { /* not critical */ }
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
  function medalDisc(medal) {
    const disc = el('span', `medal medal-${medal}`, String(MEDAL_RANK[medal]));
    disc.title = `${MEDAL_LABEL[medal]} this round`;
    disc.setAttribute('role', 'img');
    disc.setAttribute('aria-label', `${MEDAL_LABEL[medal]} medal`);
    return disc;
  }

  // ------------------------------------------------------------ connection

  socket.on('connect', () => {
    $('conn').hidden = true;
    if (!session || !session.username) return;
    if (session.room && session.token) joinRoom(session.room);   // resume after a refresh or dropped connection
    else enterBrowser();
  });
  socket.on('disconnect', () => { $('conn').hidden = false; });
  socket.on('state', (snapshot) => {
    state = snapshot;
    clockOffset = snapshot.serverNow - Date.now();
    render();
  });
  socket.on('rooms', (list) => {
    roomsList = list;
    renderRooms();
  });

  /** After choosing a name: go straight to an invited room, or show the room browser. */
  function enterBrowser() {
    if (pendingRoom) {
      const code = pendingRoom;
      pendingRoom = null;
      joinRoom(code);
      return;
    }
    subscribeRooms();
    render();
  }

  function subscribeRooms() {
    socket.emit('rooms:subscribe', {}, (res) => {
      if (res && res.ok) {
        roomsList = res.rooms;
        renderRooms();
      }
    });
  }

  function joinRoom(code) {
    socket.emit(
      'joinRoom',
      { code, username: session.username, token: session.room === code ? session.token : null },
      (res) => {
        if (res && res.ok) {
          writeSession({ username: res.username, room: res.code, token: res.token });
          setUrlRoom(res.code);
          window.splinterTrack('room_joined');
          return;
        }
        showRoomsError((res && res.error) || 'Could not join that room.');
      }
    );
  }

  /** Back to the room browser after a failed join/resume, forgetting any stale room. */
  function showRoomsError(message) {
    writeSession({ username: session.username });
    state = null;
    setUrlRoom(null);
    $('roomsError').textContent = message;
    subscribeRooms();
    render();
  }

  // ------------------------------------------------------------ UI events

  $('joinForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('usernameInput').value.trim().replace(/\s+/g, ' ');
    if (!/^[\p{L}\p{N}_ -]{2,16}$/u.test(name)) {
      $('joinError').textContent = 'Usernames are 2 to 16 characters: letters, numbers, spaces, - or _.';
      return;
    }
    $('joinError').textContent = '';
    writeSession({ username: name });
    enterBrowser();
  });

  $('changeName').addEventListener('click', () => {
    writeSession(null);
    $('roomsError').textContent = '';
    $('usernameInput').value = '';
    render();
    $('usernameInput').focus();
  });

  $('createForm').addEventListener('submit', (e) => {
    e.preventDefault();
    $('roomsError').textContent = '';
    socket.emit(
      'createRoom',
      {
        username: session.username,
        name: $('roomName').value,
        maxPlayers: Number($('roomSize').value),
        isPublic: $('roomPublic').checked,
      },
      (res) => {
        if (res && res.ok) {
          writeSession({ username: res.username, room: res.code, token: res.token });
          setUrlRoom(res.code);
          window.splinterTrack('room_created', { max_players: Number($('roomSize').value), is_public: $('roomPublic').checked });
        } else {
          $('roomsError').textContent = (res && res.error) || 'Could not create the room.';
        }
      }
    );
  });

  $('codeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const code = $('roomCode').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 4) {
      $('roomsError').textContent = 'Enter the room code your host shared.';
      return;
    }
    $('roomsError').textContent = '';
    joinRoom(code);
  });

  $('leaveBtn').addEventListener('click', () => {
    if (state && state.phase !== 'lobby' && !window.confirm('Leave the game in progress?')) return;
    socket.emit('leaveRoom', {}, (res) => {
      roomsList = (res && res.rooms) || [];
      renderRooms();
    });
    writeSession({ username: session.username });
    state = null;
    pendingRoom = null;
    setUrlRoom(null);
    $('roomsError').textContent = '';
    render();
  });

  $('copyInvite').addEventListener('click', async () => {
    const input = $('inviteLink');
    try {
      await navigator.clipboard.writeText(input.value);
      $('copyInvite').textContent = 'Copied';
    } catch {
      input.select(); // clipboard blocked: leave the link selected so it can be copied by hand
      $('copyInvite').textContent = 'Press Ctrl+C';
    }
    setTimeout(() => { $('copyInvite').textContent = 'Copy link'; }, 2000);
  });

  function stepRounds(delta) {
    if (!state) return;
    const { min, max } = state.roundLimits;
    selectedRounds = Math.max(min, Math.min(max, selectedRounds + delta));
    renderRoundsPicker();
  }
  $('roundsMinus').addEventListener('click', () => stepRounds(-1));
  $('roundsPlus').addEventListener('click', () => stepRounds(1));

  $('startBtn').addEventListener('click', () => {
    $('startError').textContent = '';
    socket.emit('start', { rounds: selectedRounds }, (res) => {
      if (!res.ok) $('startError').textContent = res.reason;
      else window.splinterTrack('game_started', { rounds: selectedRounds });
    });
  });

  $('playAgainBtn').addEventListener('click', () => {
    $('playAgainError').textContent = '';
    socket.emit('playAgain', {}, (res) => {
      if (!res.ok) $('playAgainError').textContent = res.reason;
      else window.splinterTrack('game_rematch');
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
        window.splinterTrack('word_submitted');
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
  const ALL_SCREENS = ['join', 'lobby', 'game', 'results', 'final', 'rooms'];

  function render() {
    const named = Boolean(session && session.username);
    const inRoom = Boolean(state && state.you);
    const screen = !named ? 'join' : !inRoom ? 'rooms' : SCREEN_FOR_PHASE[state.phase];
    for (const name of ALL_SCREENS) $(`screen-${name}`).hidden = name !== screen;

    const showSide = inRoom && screen !== 'final';
    $('side').hidden = !showSide;
    $('layout').classList.toggle('solo', !showSide && screen !== 'rooms');
    $('layout').classList.toggle('wide', screen === 'rooms');

    $('youChip').hidden = !named;
    if (named) $('youChip').textContent = session.username;
    $('roomChip').hidden = !inRoom;
    $('leaveBtn').hidden = !inRoom;
    if (inRoom) $('roomChip').textContent = `${state.room.name} \u00B7 ${state.room.code}`;

    syncPopup();
    if (!inRoom) return;
    if (state.phase !== 'playing') focusedRound = 0;

    if (showSide) renderScoreboard();
    if (screen === 'lobby') renderLobby();
    if (screen === 'game') renderGame();
    if (screen === 'results') renderResults();
    if (screen === 'final') renderFinal();
    tick();
  }

  function renderRooms() {
    const list = $('roomList');
    list.replaceChildren();
    $('roomsEmpty').hidden = roomsList.length > 0;
    for (const room of roomsList) {
      const item = el('li', 'room-item');
      const info = el('div', 'room-info');
      const status =
        room.phase === 'lobby' ? 'Waiting to start'
        : room.phase === 'gameOver' ? 'Game finished'
        : `In game, round ${room.round} of ${room.totalRounds}`;
      info.append(
        el('span', 'room-name', room.name),
        el('span', 'room-meta', `Host ${room.host} \u00B7 ${room.players}/${room.maxPlayers} players`),
        el('span', `room-status${room.joinable ? ' open' : ''}`, status)
      );
      const label = room.joinable ? 'Join' : room.phase === 'lobby' ? 'Full' : 'In game';
      const button = el('button', 'btn btn-small', label);
      button.type = 'button';
      button.disabled = !room.joinable;
      button.addEventListener('click', () => joinRoom(room.code));
      item.append(info, button);
      list.append(item);
    }
  }

  function renderRoundsPicker() {
    const { min, max } = state.roundLimits;
    $('roundsValue').textContent = String(selectedRounds);
    $('roundsMinus').disabled = selectedRounds <= min;
    $('roundsPlus').disabled = selectedRounds >= max;
  }

  function renderLobby() {
    const room = state.room;
    $('lobbyTitle').textContent = room.name;
    $('roomCodeText').textContent = room.code;
    $('inviteLink').value = `${location.origin}/?room=${room.code}`;
    $('roomVisibility').textContent = room.isPublic
      ? 'Public room: listed in the room browser for anyone to join.'
      : 'Private room: only people with the code or link can join.';

    $('hostControls').hidden = !state.isHost;
    const count = state.players.length;
    if (state.isHost) {
      if (selectedRounds === null) selectedRounds = state.roundLimits.default;
      renderRoundsPicker();
      $('startBtn').disabled = !state.canStart;
      $('lobbyHint').textContent = state.canStart
        ? `${count} players are in. Pick the number of rounds, then start.`
        : `You need at least ${state.minPlayers} players to start. Share the code or link above.`;
    } else {
      $('lobbyHint').textContent = `Waiting for ${room.host} to start the game. ${count} of ${room.maxPlayers} players are in.`;
    }
  }

  function renderScoreboard() {
    const inLobby = state.phase === 'lobby';
    $('sideTitle').textContent = inLobby ? `In this room (${state.players.length}/${state.room.maxPlayers})` : 'Scoreboard';

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
      if (p.isHost) name.append(el('span', 'badge', 'host'));
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

  /** "Gold: Ann (3 points)" lines for a round, or a note when nobody scored. */
  function renderMedalSummary(container, result) {
    container.replaceChildren();
    let any = false;
    for (const medal of ['gold', 'silver', 'bronze']) {
      const winners = result.players.filter((p) => p.medal === medal);
      if (winners.length === 0) continue;
      any = true;
      const line = el('div', 'medal-line');
      line.append(
        medalDisc(medal),
        el('span', 'names', winners.map((p) => p.username).join(', ')),
        el('span', 'pts', plural(winners[0].score, 'point', 'points'))
      );
      container.append(line);
    }
    if (!any) container.append(el('p', 'empty', 'Nobody scored this round.'));
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
      const title = el('h3', null, mine ? `${p.username} (you)` : p.username);
      if (p.medal) title.prepend(medalDisc(p.medal));
      head.append(title, el('span', 'result-score', plural(p.score, 'point', 'points')));
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
    renderMedalSummary($('medalSummary'), r);
    renderResultCards($('resultsGrid'), r);
  }

  function renderFinal() {
    const names = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(state.winners);
    const top = Math.max(...state.players.map((p) => p.total));
    $('winnerTitle').textContent = state.winners.length === 1 ? `${names} wins` : `${names} tie`;
    $('winnerSub').textContent = `${plural(top, 'point', 'points')} after ${plural(state.totalRounds, 'round', 'rounds')}.`;

    const head = $('standingsHead');
    head.replaceChildren();
    const headRow = el('tr');
    headRow.append(el('th', null, 'Player'));
    for (let i = 1; i <= state.totalRounds; i++) headRow.append(el('th', null, `R${i}`));
    headRow.append(el('th', null, 'Total'));
    for (const medal of ['gold', 'silver', 'bronze']) {
      const th = el('th');
      th.append(medalDisc(medal));
      headRow.append(th);
    }
    head.append(headRow);

    const body = $('standingsBody');
    body.replaceChildren();
    const players = [...state.players].sort((a, b) => b.total - a.total || a.username.localeCompare(b.username));
    for (const p of players) {
      const row = el('tr', state.winners.includes(p.username) ? 'winner' : '');
      row.append(el('td', null, p.isYou ? `${p.username} (you)` : p.username));
      for (let i = 0; i < state.totalRounds; i++) {
        row.append(el('td', null, p.roundScores[i] === undefined ? '\u2013' : String(p.roundScores[i])));
      }
      row.append(el('td', 'total', String(p.total)));
      for (const medal of ['gold', 'silver', 'bronze']) row.append(el('td', 'medal-count', String(p.medals[medal])));
      body.append(row);
    }

    $('playAgainBtn').hidden = !state.isHost;
    $('playAgainWait').hidden = state.isHost;
    $('lastRoundTitle').textContent = `Round ${state.result.round} was ${state.result.baseWord}`;
    renderResultCards($('finalResultsGrid'), state.result);
  }

  // --------------------------------------------------- round-end popup

  const popup = $('popup');
  let popupKey = null;   // "gameId:round" of the popup already shown (or dismissed)
  let popupRun = 0;      // bumped to cancel an animation in progress
  let popupTimers = [];

  const later = (fn, ms) => popupTimers.push(setTimeout(fn, ms));
  function stopPopupAnimation() {
    popupRun++;
    popupTimers.forEach(clearTimeout);
    popupTimers = [];
  }
  function closePopup() {
    stopPopupAnimation();
    popup.hidden = true;
  }

  /** Opens the popup once per finished round; closes it as soon as the phase moves on. */
  function syncPopup() {
    const result = state && state.you && state.result;
    const finished = state && (state.phase === 'roundEnd' || state.phase === 'gameOver');
    if (!result || !finished) {
      closePopup();
      popupKey = null;
      return;
    }
    const key = `${state.gameId}:${result.round}`;
    if (popupKey === key) return;
    popupKey = key;
    openPopup(result);
  }

  /** Competition ranking: equal scores share a rank. */
  function rankMap(order, totalOf) {
    const ranks = new Map();
    for (const p of order) ranks.set(p.username, 1 + order.filter((o) => totalOf(o) > totalOf(p)).length);
    return ranks;
  }

  function openPopup(result) {
    stopPopupAnimation();
    const run = popupRun;
    const finalRound = state.phase === 'gameOver';
    const me = state.you.username;

    $('popupTitle').textContent = `Scores after round ${result.round} of ${state.totalRounds}`;
    $('popupClose').textContent = finalRound ? 'See final results' : 'See all words';
    renderMedalSummary($('popupMedals'), result);

    // Order before this round's points, and order after.
    const before = [...result.players].sort((a, b) => b.prevTotal - a.prevTotal || a.username.localeCompare(b.username));
    const beforeIndex = new Map(before.map((p, i) => [p.username, i]));
    const after = [...result.players].sort(
      (a, b) => b.total - a.total || beforeIndex.get(a.username) - beforeIndex.get(b.username)
    );
    const afterIndex = new Map(after.map((p, i) => [p.username, i]));
    const rankBefore = rankMap(before, (p) => p.prevTotal);
    const rankAfter = rankMap(after, (p) => p.total);

    const list = $('popupList');
    list.replaceChildren();
    list.style.height = `${result.players.length * ROW_H - 8}px`;

    const rows = new Map();
    for (const p of before) {
      const row = el('li', `rank-row${p.username === me ? ' mine' : ''}`);
      row.style.transform = `translateY(${beforeIndex.get(p.username) * ROW_H}px)`;

      const pos = el('span', 'rank-pos', String(rankBefore.get(p.username)));
      const name = el('span', 'rank-name');
      name.append(el('span', null, p.username === me ? `${p.username} (you)` : p.username));
      if (p.medal) name.append(medalDisc(p.medal));
      const gain = el('span', 'rank-gain', `+${p.score}`);
      const move = el('span', 'rank-move');
      const total = el('span', 'rank-total', String(p.prevTotal));

      const shift = beforeIndex.get(p.username) - afterIndex.get(p.username); // > 0: moved up
      const rankShift = rankBefore.get(p.username) - rankAfter.get(p.username);
      if (rankShift > 0) { move.textContent = `\u25B2 ${rankShift}`; move.classList.add('up'); }
      else if (rankShift < 0) { move.textContent = `\u25BC ${-rankShift}`; move.classList.add('down'); }

      row.append(pos, name, gain, move, total);
      list.append(row);
      rows.set(p.username, { row, pos, gain, move, total, shift, p });
    }

    const showGains = () => {
      for (const { gain, total, p } of rows.values()) {
        gain.classList.add('show');
        countUp(total, p.prevTotal, p.total, 700, run);
      }
    };
    const moveRows = () => {
      for (const { row, pos, p, shift } of rows.values()) {
        row.style.transform = `translateY(${afterIndex.get(p.username) * ROW_H}px)`;
        if (shift > 0) row.classList.add('lifted');
        later(() => { pos.textContent = String(rankAfter.get(p.username)); }, 450);
      }
    };
    const showMoves = () => {
      for (const { move } of rows.values()) move.classList.add('show');
    };

    popup.hidden = false;
    $('popupClose').focus();

    if (reducedMotion.matches) {
      // No animation: jump straight to the final standings.
      for (const { row, pos, gain, move, total, p } of rows.values()) {
        row.style.transform = `translateY(${afterIndex.get(p.username) * ROW_H}px)`;
        pos.textContent = String(rankAfter.get(p.username));
        total.textContent = String(p.total);
        gain.classList.add('show');
        move.classList.add('show');
      }
      return;
    }
    later(showGains, 800);
    later(moveRows, 1800);
    later(showMoves, 2900);
  }

  function countUp(node, from, to, ms, run) {
    if (from === to) return;
    const start = performance.now();
    const step = (now) => {
      if (run !== popupRun) return;
      const k = Math.min(1, (now - start) / ms);
      node.textContent = String(Math.round(from + (to - from) * k));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  $('popupClose').addEventListener('click', closePopup);
  popup.addEventListener('click', (e) => { if (e.target === popup) closePopup(); });
  popup.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePopup();
    if (e.key === 'Tab') { e.preventDefault(); $('popupClose').focus(); } // the button is the only focusable element
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !popup.hidden) closePopup(); });

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
      const s = cfg.roundSeconds;
      $('ruleTime').textContent = s % 60 === 0 ? plural(s / 60, 'minute', 'minutes') : plural(s, 'second', 'seconds');
    })
    .catch(() => {});

  $('usernameInput').focus();
})();
