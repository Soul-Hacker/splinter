# Splinter

A real-time multiplayer word game. Everyone gets the same long word and two minutes to split it into as many shorter words as they can. Words that two or more players find cancel out; words only you found score.

Node.js + Socket.io on the server, plain HTML/CSS/JavaScript on the client. No database: all state lives in server memory.

## Run it locally

Requires Node.js 18 or newer.

```bash
npm install
npm start
```

Open http://localhost:3000 in two browser tabs. Each tab is its own player (the session is kept per tab), so you can test alone. Pick a different username in each tab, then press **Start game**.

To play with other people on the same Wi-Fi, run the server on your machine and have them open `http://<your-local-IP>:3000`.

### Shorter timers for testing

```bash
# macOS / Linux
ROUND_SECONDS=20 INTERMISSION_SECONDS=5 npm start

# Windows PowerShell
$env:ROUND_SECONDS=20; $env:INTERMISSION_SECONDS=5; npm start
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
| `INTERMISSION_SECONDS` | `15` | Pause on the results screen before the next round starts |

## Rules as implemented

- Join with a unique username (2-16 characters, case-insensitive). At least 2 players are needed to start; anyone in the lobby can press Start.
- A game is exactly 5 rounds. Each round uses one random long word from a curated list (5 distinct words per game), the same for every player, with a server-enforced 2-minute countdown.
- The server validates every submission: at least 3 letters, not the base word, only letters from the base word and no letter more often than the base word has it, and present in the dictionary.
- At the end of a round, a word found by 2+ players scores 0 for everyone; each word found by exactly one player scores 1 point. Other players' words stay hidden until the round ends.
- Totals accumulate across rounds. After round 5 the highest total wins; equal totals are declared a tie.
- "Play again" returns everyone to the lobby with scores reset.

## Project layout

```
server.js          Express static server + Socket.io event wiring
lib/game.js        Game state machine: players, phases, timers, snapshots
lib/rules.js       Pure functions: word validation and round scoring
lib/dictionary.js  Loads the check-word English list into a Set
lib/baseWords.js   Curated long words, filtered against the dictionary
public/            index.html, style.css, app.js (client)
```

## How it works

- **Server is the authority.** The client never decides validity, scores or time. It sends `join`, `start`, `submit` and `playAgain`; the server answers with an acknowledgement and pushes a per-player `state` snapshot to everyone whenever anything changes.
- **Timers** are `setTimeout`s on the server (round end, then next round start). Snapshots include `endsAt` plus the server's current time, so each client corrects for clock differences and shows a countdown that matches the server. Submissions arriving after `endsAt` are rejected.
- **Reconnecting:** each player gets a secret session token stored in `sessionStorage`. A page refresh or dropped connection resumes the same player, words and score. If a tab was closed mid-game, typing the same username reclaims that (disconnected) player. In the lobby, a player who disconnects is removed.
- **Late joiners:** new usernames can't join while a game is in progress. If every player disconnects mid-game, the game is discarded.
- **Disconnected players** stay on the scoreboard and their words still count for cancellation.

## Notes and limits

- **Dictionary:** `check-word` bundles a large Scrabble-style list (about 275,000 words), so obscure words like "aah" are valid. The package's own `check()` re-reads a 2.8 MB file per lookup, so `lib/dictionary.js` loads its word list once into a Set instead. The package is GPL-2.0 licensed; if that matters for your use, swap in another list by changing only `lib/dictionary.js`.
- **One lobby, one process.** State is in memory, so a server restart wipes the game, and running several Node processes would need shared state and sticky sessions. To support multiple rooms, create one `Game` per room code and route sockets to it.
- There is no authentication or rate limiting; it's meant for friends, not the open internet.
