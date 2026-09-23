# Spliinter

A real-time multiplayer word game. Everyone in a room gets the same long word and two minutes to split it into as many shorter words as they can. Words that two or more players find cancel out; words only you found score. The best score each round wins a gold, silver or bronze medal.

Node.js + Socket.io on the server, plain HTML/CSS/JavaScript on the client. No database: all state lives in server memory.

The multiplayer app does not load advertising. Public editorial pages such as
`/how-to-play.html`, `/strategy.html`, and `/faq.html` are separate static pages
and are listed in `public/sitemap.xml`. Keep any future advertising limited to
these substantive pages, never to the room browser, lobby, round, results, or
standings screens.

### Google Analytics

The site includes a consent-aware Google Analytics 4 tag for property
`G-6G16BK3GC0`. Analytics storage is denied until a visitor accepts optional
cookies. GA4 reports daily users and page views, and its Realtime report shows
active users. Custom events include room creation, room joins, game starts,
rematches, and accepted word submissions; usernames, room codes, and submitted
words are not sent.

## Run it locally

Requires Node.js 18 or newer.

```bash
npm install
npm start
```

Open http://localhost:3000 in two browser tabs. Each tab is its own player (the session is kept per tab), so you can test alone: pick a username in each tab, create a room in one, join it from the other with the room code, then press **Start game** as the host.

To play with other people on the same Wi-Fi, run the server on your machine and have them open `http://<your-local-IP>:3000`.

### Settings

```bash
# macOS / Linux
ROUND_SECONDS=20 INTERMISSION_SECONDS=8 npm start

# Windows PowerShell
$env:ROUND_SECONDS=20; $env:INTERMISSION_SECONDS=8; npm start
```

## Deploy with Render

The server uses Socket.IO and in-memory state, so it needs a long-running web
service. The included `render.yaml` deploys the Docker image as one Render web
service, which supports WebSockets without any additional proxy setup.

1. Push this repository to GitHub or GitLab.
2. In the Render dashboard, choose **New > Blueprint** and select the repository.
3. Confirm the `splinter` service from `render.yaml` and click **Apply**.

Render will build the included `Dockerfile`, set the `PORT` value used by
`server.js`, run the `/api/config` health check, and provide the public URL.
Keep the service at one instance because the lobby and scores live in process
memory. A deploy, restart, or sleeping free instance resets the current game.

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `ROUND_SECONDS` | `120` | Length of each round |
| `INTERMISSION_SECONDS` | `20` | Pause between rounds (the scoreboard popup and results screen) |
| `EMPTY_ROOM_SECONDS` | `45` | How long a room with nobody connected is kept before it is closed |
| `BASE_WORDS` | `random` | `random`: any suitable word from the full dictionary. `common`: a hand-picked list of about 90 everyday long words |

## Rooms

- After choosing a username, a player lands on the **room browser**: a live list of public rooms, a "Create a room" form and a "Join with a code" box.
- **Creating a room:** optional name (2-24 characters, defaults to "<username>'s room"), max players (2-12, default 8) and whether it is listed publicly. The creator is the **host**.
- **Sharing:** every room has a 5-character code (no look-alike characters such as 0/O or 1/I) and an invite link, `/?room=CODE`. The address bar always shows the invite link while you are in a room. Opening one asks for a username, then joins straight away.
- **Public vs private:** public rooms appear in the browser (name, host, players, and whether they are waiting or in a game). Private rooms only join by code or link.
- **Host controls:** only the host can start a game, pick the number of rounds (1-10) and press Play again. If the host leaves or disconnects, the longest-present connected player becomes host.
- **Full or running rooms:** a new player can't join a room that is full or mid-game (the browser shows the button disabled). A player who dropped out of a running game can rejoin by using the same username.
- **Leaving:** the "Leave room" button returns to the browser. Empty rooms are closed after `EMPTY_ROOM_SECONDS`, so a page refresh never loses a room. The server keeps at most 200 rooms.
- Usernames are unique per room, not globally.

## Rules as implemented

- At least 2 players are needed to start.
- Each round uses one long word (9-12 letters), the same for everyone in the room, with a server-enforced countdown. Words don't repeat within a game.
- The server validates every submission: at least 3 letters, not the base word, only letters from the base word and no letter more often than the base word has it, and present in the dictionary.
- At the end of a round, a word found by 2+ players scores 0 for everyone; each word found by exactly one player scores 1 point. Other players' words stay hidden until the round ends.
- **Medals:** the top round score wins gold, then silver and bronze. Ties share a medal and skip the next one (two golds means no silver). A score of 0 never earns a medal.
- **Scoreboard popup:** after every round a popup shows the standings before the round, then the points being added and the rows sliding up or down into their new places. It closes on its own when the next round starts, or with the button, Escape or a click outside.
- Totals accumulate across rounds. After the last round the highest total wins (equal totals are a tie), and the final table shows each player's medal counts.
- "Play again" returns the room to its lobby with scores reset.

## Dictionary and round words

Words come from the [`word-list`](https://www.npmjs.com/package/word-list) package (274,137 words, MIT licensed). It is ESM-only, so `lib/dictionary.js` loads it with a dynamic `import()`, reads it once into a `Set` for validation, and keeps the array for picking words.

In `random` mode, each round's word is drawn at random from the dictionary's 9-12 letter words, skipping plain inflections (plurals, -ed, -ing, -ly and similar) and words that hide fewer than 120 other valid words. The word list is a Scrabble-style list, so some random picks are obscure. If that isn't fun, start with `BASE_WORDS=common`.

## Project layout

```
server.js          Express static server + Socket.io event wiring (rooms, lobby, game events)
lib/rooms.js       RoomManager: creates rooms and codes, lists public rooms, closes empty ones
lib/game.js        One room's state machine: players, host, phases, timers, medals, snapshots
lib/rules.js       Pure functions: word validation, round scoring, medals
lib/dictionary.js  Loads word-list into memory
lib/baseWords.js   Picks the random (or common) base word for each round
public/            index.html, style.css, app.js (client), editorial and policy pages
```

## How it works

- **Server is the authority.** The client never decides validity, scores or time. Events: `rooms:subscribe`, `createRoom`, `joinRoom`, `leaveRoom`, `start` (with `rounds`), `submit`, `playAgain`. The server answers each with an acknowledgement, pushes a per-player `state` snapshot to everyone in the room whenever anything changes, and pushes the public room list (batched, at most every 300 ms) to everyone who is browsing.
- **Rooms are independent.** Each room is its own `Game` with its own timers, players and scores, so a game in one room never touches another.
- **Timers** are `setTimeout`s on the server (round end, then next round start). Snapshots include `endsAt` plus the server's current time, so each client corrects for clock differences. Submissions arriving after `endsAt` are rejected.
- **Reconnecting:** each player gets a secret token, stored with the room code in `sessionStorage`. A page refresh or dropped connection resumes the same player, words and score. In a lobby, a player who disconnects is removed (they can rejoin).
- **Disconnected players** in a running game stay on the scoreboard and their words still count for cancellation.

## Putting it online

Any host that runs a long-lived Node process with WebSocket support works (a VPS, Render, Railway, Fly.io and similar). Set `PORT` if the host asks for it; `/healthz` returns `ok` for health checks.

- **Run a single instance.** All rooms live in one process's memory. A restart ends every game, and several instances would need shared state and sticky sessions.
- **Public names are user-generated.** Usernames and room names are shown to strangers. There is no profanity filter, moderation, accounts or rate limiting beyond a one-room-per-connection rule, a 1.5-second cooldown on creating rooms and the 200-room cap. Add a filter and IP-based rate limits before promoting it widely.
