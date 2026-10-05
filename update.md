# Spliinter: page-by-page content

Everything you need to paste, one page at a time. No HTML here; use your existing page styles.

## How to read this document

- **[Square brackets]** = a fact only you know. Replace it or delete the sentence. Never publish a bracket, and don't invent anything to fill one.
- **Bold** in the copy = emphasise it in the page (your `<strong>` style).
- Every example word below was checked by hand against the base word's letter counts. I could not check them against your dictionary, so verify each before publishing.

---

## 0. Site-wide changes (do these first, on every page)

- **Header navigation on every page:** How to play · Strategy · FAQ · About. Right now the guides are only reachable from the footer; crawlers and reviewers miss them.
- **One contact address everywhere:** contact@spliinter.in. The About page uses it; Contact and FAQ currently say supportbacktick@gmail.com. Set up forwarding if needed.
- **"Last updated: [DD Month YYYY]"** at the bottom of About, Privacy and Terms.
- **Footer:** add a link to each new guide as you publish it.
- **Cold start:** make sure a first-time visitor never sees "Reconnecting…". Serve the static pages from a Render Static Site or Cloudflare Pages, and ping the socket backend every 5 minutes.

---

## 1. Homepage (`index.html`)

**Where:** on the first screen, directly below the five rule bullets, so it's visible to visitors and crawlers and disappears once a player picks a username. Keep the existing H1, intro line and username box exactly as they are.

**Result:** 341 → ~1,250 visible words.

### Section: How a round works

**Small label:** HOW A ROUND WORKS

**Heading:** One word for everyone. Two minutes. Only unique finds count.

Everyone gets the same base word. It appears as a row of letter tiles, with the same word and the same clock for every player in the room.

Type smaller words made from those letters. Three letters or more, and never use a letter more times than the base word has it. The tiles dim as you type so you can see what's left.

When time's up, every list is revealed at once. A word that two or more players found is crossed out for everyone. Each word only you found is worth **1 point**, whether it has three letters or nine.

### Section: Worked example

**Small label:** WORKED EXAMPLE

**Heading:** What a round of CHOCOLATE looks like

CHOCOLATE has nine tiles: two Cs, two Os, and one each of H, L, A, T and E. Three players get two minutes. Here is how the round is scored once the lists are revealed.

| Player | Words submitted | Round |
|--------|-----------------|-------|
| Asha | COAT TACO EACH HOTEL LOCATE | 2 · silver |
| Ben | COAT EACH COOL CHEAT TEACH | 2 · silver |
| Chloe | TACO COOL ECHO CHALET COACH | 3 · gold |

*(Style the words as the chips you already use on the results screen: green for unique, crossed out for shared.)*

**Legend line:** green = found by one player only, 1 point. ~~Crossed out~~ = found by two or more players, 0 points.

COAT, TACO, EACH and COOL were the obvious words. More than one person found each of them, so nobody scored for them. COACH uses both Cs, which is legal because CHOCOLATE has two. Chloe also tried LOCAL and the server rejected it on the spot: every letter is in CHOCOLATE, but LOCAL needs two Ls and there is only one.

Chloe takes gold with 3. Asha and Ben tie on 2, so they share silver and nobody gets bronze that round. Points carry across rounds, and the highest total after the last round wins the game.

### Section: Why it plays differently

**Small label:** WHY IT PLAYS DIFFERENTLY

**Heading:** Length doesn't matter. Being the only one who saw it does.

Most word games pay for length: a seven-letter word in Scrabble or Countdown is the whole point. Spliinter borrows Boggle's duplicate rule instead, where a word found by more than one player is cancelled, and then flattens the scoring to one point per unique word. That changes how you should search.

- **Obvious words are cheap to type but rarely score.** In a room of six, the word everyone sees first is almost certainly going to be crossed out. Submit it if it costs you two seconds, then move on.
- **Short, odd words beat long, common ones.** A three-letter word nobody else noticed is worth exactly as much as a nine-letter one.
- **The letter inventory is the puzzle.** The most common reason a word is rejected isn't spelling; it's using a letter one more time than the base word allows.

The strategy guide covers a repeatable search pattern, and the full rules explain medals, ties, and what happens when the host disconnects.

### Section: Rooms (four small cards)

**Small label:** ROOMS

**Heading:** Two to twelve players, no accounts, nothing to install

**Private rooms with a code or link**
Create a room, copy the invite link, and send it on any chat. Friends who open it pick a username and land straight in your lobby. Room codes are short enough to read out loud on a call.

**Public rooms when you're on your own**
Leave "Show in the public room list" ticked and anyone browsing can join until the room fills up or a game starts. Untick it for a private game.

**The host sets the pace**
Whoever creates the room chooses the number of rounds, from a one-round warm-up to a ten-round game. If the host drops out, the longest-serving player takes over automatically, so a room never gets stuck.

**Disconnections aren't fatal**
Lost your connection mid-round? Refresh in the same tab and you're back in your room with your words and score intact. Other players simply see you marked as away until you return.

### Section: Fair by design

**Small label:** FAIR BY DESIGN

**Heading:** The server is the referee

Every rule is checked on the server, not in your browser: the timer, the letter counts, the dictionary lookup, and the duplicate detection at the end of the round. Nobody's device can be more lenient than anyone else's, and nobody can see other players' words until the reveal.

Word validity comes from a large open-source English word list, the same list for every player and every room. Read more about how Spliinter is built.

### Section: Get better

**Small label:** GET BETTER

**Heading:** Guides for your next round

- **How to play** Spliinter: rooms, rules, scoring, medals and ties, with examples.
- **Word game strategy:** a search pattern that finds more words without giving points away.
- **FAQ:** rejected words, crossed-out words, refreshing mid-game, and what the site stores.

*(Add one line per new guide as you publish it; this list is your main internal-linking hub.)*

### Section: Quick answers

**Small label:** QUICK ANSWERS

**Heading:** Before your first game

**Do I need an account?**
No. Pick a username and play. Your username and room live only in server memory while the room is open. See the privacy policy for details.

**Does it work on a phone?**
Yes. Spliinter runs in any modern browser on phones, tablets and desktops. There is nothing to download.

**Can I play on my own?**
A game needs at least two players. If nobody you know is free, check the public room list, or create a public room and leave it open for someone to join.

**Why was my word rejected?**
Usually a letter count: the word uses a letter more times than the base word has it. Otherwise it is under three letters, it is the base word itself, or it is not in the dictionary.

---

## 2. About page (`about.html`)

**Where:** replace the whole page body. Keep the "Think smaller." heading, it's good.

**Result:** 186 → ~950 words.

**Title tag:** About Spliinter: who makes it and how it works | Spliinter

**Meta description:** Who makes Spliinter, why it exists, how the real-time word game is built, which dictionary it uses, and how to get in touch.

**Small label:** ABOUT

**Heading:** Think smaller.

**Intro:** Spliinter is a free, real-time multiplayer word game. Everyone in a room sees the same long word and has two minutes to find the smaller words hidden inside it. Only the words nobody else found score.

### Who makes it

Spliinter is designed, built and run by [Your Name], a software engineer based in [City, Country]. It is an independent side project: there is no company behind it, no investors, and no plan to add accounts or subscriptions.

[One or two true sentences about you: what you do, how long you have been building things, and anything that explains why you care about word games.]

Everything on this site, from the game rules and the interface to the guides and strategy articles, is written and maintained by me. If something is wrong, unclear, or unfair, I would like to know; see the contact details at the bottom of this page.

### Why it exists

[Edit this to match your real story. An honest version might be:]

I wanted a word game I could play with friends over a video call that didn't require everyone to install an app, create an account, or sit through a tutorial. Share a link, type a name, play. The games that came closest either rewarded length above everything else, or were built for one player.

The rule I kept coming back to was Boggle's: a word that two players both found is cancelled. Applied to a single shared base word and flattened to one point per unique word, it produces a game where a quiet three-letter find can beat a flashy nine-letter one, and where the reveal at the end of each round is the best part. That rule is the whole reason Spliinter exists. It launched in [month year].

### How the game works under the hood

Spliinter is a single-page web app talking to a [Node.js] server over Socket.IO. Rooms, players, timers and word lists live in the server's memory for as long as a room is open; nothing is written to a database, and when the last player leaves a room, it is gone.

The server is deliberately the referee for everything:

- **Timing.** The two-minute clock runs on the server. Your browser only displays it, so a slow connection or a clever devtools session cannot buy extra seconds.
- **Letter counts.** Each submission is checked letter by letter against the base word's inventory. A word may use a letter only as many times as the base word contains it, which is why LOCAL is rejected for CHOCOLATE: it needs two Ls and there is one.
- **Dictionary.** Every word is looked up in the same in-memory word list for every player and every room. No browser can be more lenient than another.
- **Privacy during the round.** Other players' words are held on the server and only sent to the room when the round ends, so there is nothing to peek at.
- **Resilience.** If your connection drops, a short-lived token in your browser tab lets you reconnect to the same room with your words and score intact. If the host disconnects, the longest-present player becomes host automatically.

[Once Guide 7 is published, add:] A longer write-up is in the guide *How Spliinter validates a word*.

### The dictionary

Spliinter validates words against [name the list, e.g. "the open-source ENABLE word list" or "the word-list npm package"], a large English word list with [approximate count] entries. It is used under its open licence and is not modified, except for [what you filter, e.g. "removing words shorter than three letters"].

Because it is a general-purpose list, it accepts many obscure words and some coarse ones, the same way a physical word game would, and it does not include proper nouns or abbreviations. Base words are chosen from the same list: [your rule, e.g. "words of 8 to 12 letters that contain at least 40 valid sub-words"].

If you believe a word was wrongly accepted or rejected, send it to the address below with the base word and I will check it against the list.

### Principles

- **No accounts, no downloads.** A username is all the identity the game needs, and it is forgotten when the room closes.
- **Same rules for everyone.** One clock, one dictionary, one set of rules, enforced in one place.
- **As little data as possible.** The game works without cookies. Optional analytics and advertising only run with your consent where that is required, and you can change your choice at any time from the footer. Details are in the privacy policy.
- **Free to play.** Spliinter is free and is intended to stay free. Hosting is paid for by [me / advertising shown on the site's guide pages].
- **Accessible by default.** The game is playable with a keyboard alone, announces submissions and errors to screen readers, and respects reduced-motion settings. If something gets in your way, please tell me. *(These claims match your markup; test them before publishing.)*

### What's next

[Keep this honest and update it when things ship.]

Planned additions include a daily word with a shareable solution page, a browsable archive of base words with every valid find, and room-level statistics such as the most common crossed-out words. Ideas and requests are welcome.

### Get in touch

Support, accessibility feedback, privacy requests, press, or just a word you think should have counted: **contact@spliinter.in**. I read everything and usually reply within a few days.

Last updated: [DD Month YYYY].

---

## 3. How to play (`how-to-play.html`)

**One correction.** The page currently says "PLAYGROUND has two As and one of every other letter" and "a word needing three As would not be valid because PLAYGROUND contains only two." PLAYGROUND has **one** A: P‑L‑A‑Y‑G‑R‑O‑U‑N‑D, ten different letters, no repeats.

Replace that paragraph and its three bullets with:

> For example, PLAYGROUND has ten different letters and no repeats, so every word must use each letter at most once. That means:
>
> - **PLAY** is valid because each letter is available.
> - **GROUND** is valid for the same reason.
> - **ROUNDUP** is not valid: every one of its letters is in PLAYGROUND, but it needs two Us and PLAYGROUND has only one.

Everything else on this page is fine. Add the header nav and a "Related guides" block at the bottom once the guides exist.

---

## 4. FAQ (`faq.html`)

**Changes:** replace the Gmail address in "How do I report a problem?" with contact@spliinter.in, and add the entries below. Add each new question to the FAQPage structured data you already have on the page.

**Is Spliinter free?**
Yes. There is nothing to buy and no premium tier. [Hosting is paid for by me / by advertising shown on the guide pages.]

**Which dictionary does Spliinter use?**
[Name of the list], a general-purpose English word list. It includes many obscure words and excludes proper nouns and abbreviations. If you think a word was wrongly accepted or rejected, email the word and the base word to contact@spliinter.in.

**How are base words chosen?**
[Your rule, e.g. "Base words are 8 to 12 letters long and are picked from words that contain at least 40 valid smaller words, so every round has enough to find."]

**Does it work on a phone?**
Yes. Spliinter runs in any modern browser on phones, tablets and desktops. There is nothing to download.

**What do you store about me?**
Your username and room exist only in server memory while the room is open. A reconnect token sits in your browser tab's session storage until you close the tab. Analytics and advertising technologies run only with your consent where that is required. See the privacy policy.

**Can I play with more than twelve people?**
Not in one room. Twelve is the limit so the reveal stays readable. For a bigger group, create two rooms and compare winners afterwards.

**Can I use the same word in two different rounds?**
Yes. The duplicate rule applies within a round only.

---

## 5. Contact (`contact.html`)

**Where:** replace the page text.

**Small label:** GET IN TOUCH

**Heading:** Contact Spliinter

For support, privacy requests, accessibility feedback, a word you think should have counted, or partnership questions, email **contact@spliinter.in**.

### What to include

- **For a game problem:** the room code, the approximate time, what you expected and what happened.
- **For a dictionary question:** the word and the base word it was tried on.
- **For a privacy request:** what you are asking for and the approximate date or room involved.

Do not send passwords, payment details, or other sensitive information by email.

**Response time:** I read everything and usually reply within [a few days].

**Who you're writing to:** Spliinter is built and run by [Your Name]. More on the About page.

---

## 6. Strategy (`strategy.html`)

**Where:** keep the seven existing sections; add the four below after "Search unusual letters deliberately" and before "Protect your best finds".

**Result:** 459 → ~1,100 words.

### A two-minute plan

A round is short enough that a fixed routine beats inspiration. One that works:

- **0 to 15 seconds.** Count the letters. Note any repeats and whether there is an S. Type the three- and four-letter words you see instantly.
- **15 to 60 seconds.** Run the ladders. Take every stem you have found and try its plural, its ‑ED, ‑ER and ‑ING forms, then the common prefixes. This is where most of your words come from.
- **60 to 100 seconds.** Go after the rare letters. Pair any J, Q, X or Z with the vowels you have and test short words first.
- **Last 20 seconds.** Look at the tiles you have barely used and try to build around them. Stop guessing with ten seconds left; a rejected word costs time you no longer have.

### Worked example: the suffix ladder on GENERATIONS

GENERATIONS has eleven tiles: two Es, two Ns, and one each of G, R, A, T, I, O and S. Start with a stem and climb:

- RATION gives RATIONS.
- NATION gives NATIONS, legal because there are two Ns.
- TRAIN gives TRAINS and, rearranged, STRAIN.
- REASON gives TREASON and REASONING, nine letters and still legal.
- SENATOR is fine. **SENATORS is not:** it needs two Ss and there is one.
- GENERATION is a valid ten-letter word, the base word minus its S.
- **GENERATE and ENTERING are not:** each needs three Es.

Smaller finds along the way: AGENTS, GIANTS, ORIENT, TENSION, GRANITE, TEARING, RATINGS, STARING, RESTING, INGEST, SIGNET.

Notice how many came from one stem and one ladder rather than from scanning.

### Worked example: rare letters in EXPLANATION

EXPLANATION has two As and two Ns; everything else, including the X, appears once. The X is where the uncontested points are:

- **Short and quick:** APEX, AXLE, TAXI, EXIT, NEXT, OXEN.
- **A little longer:** TOXIN, LATEX, PIXEL, EXALT, EXTOL, ANNEX (two Ns, allowed).
- **The long one most people miss:** EXPLAIN.
- **The traps:** TEXT needs two Ts and there is one. EXPIATION needs two Is and there is one.

In a room of eight, the first six words everyone finds will be crossed out. Four or five of the X words will not be.

### Adjust to the room size

With **two players**, collisions are rare. Most of what you find will score, so speed and volume win: type everything, including the obvious words.

With **eight to twelve players**, almost every common word is found by someone else. Still type the obvious ones if they cost you nothing, but spend your real effort on the ladders and the rare letters, and expect your score to come from five or six words nobody else saw.

---

## 7. Privacy (`privacy.html`) and Terms (`terms.html`)

Add "Last updated: [DD Month YYYY]" to both. Keep the consent wording you already have.

When ads go live (not before approval), AdSense requires this disclosure in the privacy policy. Add a section:

### Advertising

Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this website or other websites. Google's use of advertising cookies enables it and its partners to serve ads to you based on your visit to this site and other sites on the internet. You can opt out of personalised advertising by visiting Google's Ads Settings, or opt out of some third-party vendors' use of cookies for personalised advertising at www.aboutads.info.

Where consent is required, advertising cookies are only set after you accept them in the cookie banner, and you can change your choice at any time from "Cookie settings" in the footer.

---

## 8. New pages: the first eight guides

**Conventions:**

- URL `/guides/<slug>.html`
- Same page layout as How to play
- Author name and "Updated" date at the top
- Add each to `sitemap.xml`
- End each with a "Play a round" link and two or three related guides
- Length targets are for substantive words. If a guide is genuinely done at 800 words, stop.

**Fastest route to approval:** write 7, 3 and 4 first (most original, least research), then the daily word (section 9), then the rest.

---

### Guide 1 · The most useful three-letter words, ranked by how often you can actually play them

- **Slug:** `three-letter-words`
- **Length:** 1,200–1,500
- **People search for:** "3 letter words for word games", "common three letter words list"
- **Your unique data:** for each three-letter word in your dictionary, compute the percentage of your base words whose letters can form it. Publish the top 60 ranked by availability. Nobody else has this for your word pool.

**Sections:**

1. Why three-letter words matter under unique-only scoring (the first five everyone types get crossed out; the next twenty usually don't)
2. The top 60 by availability (word · % of base words · note)
3. Shapes to scan for: consonant‑vowel‑consonant, vowel‑first (ASK, OLD, END, ICE), Y as a vowel (SKY, TRY, GYM)
4. Three-letter words with J, X, Z, Q that are really in the dictionary
5. Strings that look like words but are rejected
6. A 60-second pre-game drill

**Link to:** Strategy, Guide 3, Guide 5

---

### Guide 2 · Prefix and suffix stripping: a systematic way to find hidden words

- **Slug:** `prefix-and-suffix-stripping`
- **Length:** 1,200+
- **People search for:** "how to find words in a word", "word within a word game tips"
- **Your unique data:** the full GENERATIONS ladder from section 6, expanded step by step, including the SENATORS / GENERATE / ENTERING traps.

**Sections:**

1. Why random scanning dries up after 30 seconds
2. The suffix ladder: ‑S, ‑ED, ‑ER, ‑ING, ‑LY, ‑EST, ‑ION, ‑NESS, and the letters each needs
3. The prefix ladder: RE‑, UN‑, IN‑, DE‑, PRE‑, OUT‑, OVER‑
4. Worked example: GENERATIONS
5. Stems first, then forms: noun → verb → plural → agent noun
6. When the ladder lies: forms the dictionary doesn't have

**Link to:** Strategy, Guide 3, Guide 8

---

### Guide 3 · Letter-count traps: why LOCAL isn't in CHOCOLATE

- **Slug:** `letter-count-traps`
- **Length:** 900–1,200
- **People search for:** "why was my word rejected word game"; also your own players
- **Your unique data:** if the server logs rejections, publish "the 20 most-rejected words last month and the base word they were tried on". If it doesn't log them yet, add a counter; it's cheap and gives the page a reason to be updated monthly.

**Sections:**

1. The rule in one sentence, and the "letter inventory" idea in plain words
2. How the dimming tiles warn you before the server does
3. The usual suspects: LL, SS, EE, OO, TT, FF, and plural‑of‑a‑plural
4. Twenty tempting‑but‑illegal words for common base words (base word · attempted word · the letter that breaks it)
5. A ten-second check before pressing Enter
6. Practice set: five base words, three traps each, answers at the bottom

**Link to:** How to play, Guide 2, Guide 7

---

### Guide 4 · Unique-only scoring: how Spliinter compares with Boggle, Scrabble, Countdown and Text Twist

- **Slug:** `unique-only-scoring`
- **Length:** 1,200–1,500
- **People search for:** "games like Boggle online", "word game where duplicate words cancel"
- **Your unique data:** the comparison and its consequences, written by the person who chose the rule.

**Sections:**

1. Comparison table: where letters come from (grid / rack / nine picks / anagram) · timer · scoring · what happens to duplicates · length bonus · players
2. What one‑point‑per‑unique‑word does: volume and obscurity beat length
3. No penalty for a cancelled word, so an obvious word costs only the two seconds to type; when that is worth paying
4. Room size changes the maths: collision odds at 2, 4, 8 and 12 players
5. Second‑order words: the ones people see only after the obvious one
6. What the reveal teaches you

**Link to:** Strategy, Guide 6, Home

---

### Guide 5 · How to read a base word in five seconds

- **Slug:** `reading-a-base-word`
- **Length:** 1,200
- **People search for:** "letter frequency English word games", "which letters make the most words"
- **Your unique data:** from your own pool: average valid sub-words per base word, split by has‑an‑S / no S, has E+D / doesn't, has I+N+G / doesn't, and vowel ratio. A short table.

**Sections:**

1. Vowels against consonants: what the ratio predicts
2. Is there an S? Plurals roughly double your options (your numbers)
3. The letters that do the work: E, S, R, T, A, N, I, O, L
4. Dead weight: Q without U, V, J, and what to do with them
5. General English letter frequency vs frequency inside your dictionary (show both; cite the general source)
6. Three example base words graded easy / medium / hard, with the first ten words to look for in each

**Link to:** Guide 1, Guide 2, Strategy

---

### Guide 6 · How to host a remote word game night with Spliinter

- **Slug:** `host-a-word-game-night`
- **Length:** 1,000–1,300
- **People search for:** "word games to play on Zoom", "online games for video call with friends no download"
- **Your unique data:** timing and group-size advice only the author can give.

**Sections:**

1. What changes at 2, 4, 8 and 12 players
2. Choosing rounds: two minutes plus the reveal per round, so ten rounds is about 30 minutes
3. Running it over Meet / Zoom / Discord: paste the link in chat, cameras on for the reveal
4. House rules to layer on top (themed usernames; "longest unique word gets a bonus point" tallied by hand; team mode with one shared screen per team)
5. Keeping it fun for the weakest speller in the room
6. Troubleshooting: someone dropped (refresh the same tab), host left (automatic hand-over), room full (max players)
7. A one-screen checklist to copy into the group chat

**Link to:** How to play, FAQ, Guide 4

---

### Guide 7 · How Spliinter validates a word: letter counting, dictionaries, and why the server is the referee

- **Slug:** `how-word-validation-works`
- **Length:** 1,200–1,600 · developer write-up
- **People search for:** "how to build a multiplayer word game socket.io", "validate anagram letters javascript"
- **Your unique data:** real code from your server. The most defensibly original page you can write.

**Sections:**

1. The four rules a submission must pass
2. Counting letters: the compare function (26‑slot array or Map, one pass)
3. The dictionary as an in‑memory Set: load once at boot, memory footprint, lookup cost
4. Why not validate in the browser: cheating, dictionary drift, clock drift
5. Duplicate detection at the reveal: word → set of players
6. Timer authority and latency: server timestamps, how late submissions are handled [your actual policy]
7. Reconnection: the session‑storage token, what it proves and what it doesn't
8. What is logged and what isn't

**Link to:** About, Guide 8, Guide 3

---

### Guide 8 · Choosing a dictionary for a word game: what Spliinter accepts, what it rejects, and why

- **Slug:** `choosing-a-word-list`
- **Length:** 1,000–1,300 · developer write-up
- **People search for:** "best word list for word game", "ENABLE vs SOWPODS vs TWL", "open source English word list"
- **Your unique data:** the decision you made and the edge cases you hit. Keep a changelog at the bottom and update it whenever the list changes.

**Sections:**

1. The candidates: ENABLE, Collins/SOWPODS, NWL/TWL, SCOWL‑derived lists, Wiktionary dumps, and their licences
2. What you picked and why
3. Proper nouns, abbreviations, hyphenated and apostrophe words
4. British vs American spellings
5. Coarse words: your policy and reasoning
6. Inflections: plurals, ‑ING, ‑ED, comparatives
7. How base words are chosen
8. How to report a wrong accept or reject
9. Changelog

**Link to:** About, Guide 7, Guide 2

---

## 9. Recurring content (start after the first guides)

This is what turns "a game with some articles" into "a site people come back to", which is what the reviewer is really judging.

### Daily word

**URL:** `/daily/YYYY-MM-DD.html` plus an index at `/daily/`

**Text for each page:**

**Heading:** Today's word: [BASE WORD] · [Day, DD Month YYYY]

[BASE WORD] has [N] tiles: [letter inventory, e.g. "two Es, two Ns, and one each of G, R, A, T, I, O and S"]. There are [N] valid words inside it: [n] three-letter, [n] four-letter, [n] five-letter, [n] six letters or longer.

Two or three real sentences about this word: which ladder pays off, the trap most people fall into, the long word hiding in plain sight.

**Rarest finds** (if you record per-room results): the ten words found by the smallest share of players, with the percentage.

**All valid words** (behind a collapsible "Show all [N] words" so it's crawlable without spoiling).

**Button:** Play this word *(needs a room seeded with a fixed base word, or a solo practice mode; a small product task that makes every one of these pages a landing page)*.

### Word pages

**URL:** `/words/<base-word>.html`

**Heading:** Words inside [BASE WORD]: [N] valid words

Hand-write a 100–150 word intro per page (the traps, the rarest finds, which suffix ladder pays off), then the generated lists grouped by length. Start with 30–50 hand-picked base words. **Do not mass-generate thousands;** that is the pattern the scaled-content rules target, and it reads as thin.

---

## 10. Reapply checklist (in order)

- [ ] Site-wide changes from section 0 done on every page
- [ ] Homepage content live; PLAYGROUND correction made; one contact address everywhere
- [ ] About page live with a real name and no brackets left anywhere on the site
- [ ] Strategy expanded; FAQ and Contact updated; "Last updated" dates on policy pages
- [ ] Eight guides published, each with author, date, and verified example words; each linked from the homepage hub and at least two other pages
- [ ] `sitemap.xml` lists every page; resubmitted in Search Console
- [ ] Search Console → Pages shows the new URLs as indexed (`site:spliinter.in` returned nothing when I checked; this must change before you reapply)
- [ ] Landing page loads instantly for a cold visitor: no "Reconnecting…"
- [ ] Daily word running for at least two weeks
- [ ] 3–4 weeks since indexing, and Analytics shows real visitors on the guide pages
- [ ] Request the AdSense review once, then leave the application alone while it's pending

---

If you want the full text of any guide written out the same way as the sections above, say which number and I'll draft it.