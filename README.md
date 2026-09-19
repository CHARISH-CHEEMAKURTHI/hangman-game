# Arcade Hub — Multi-Game Platform

What started as a simple terminal Hangman game is now a small multi-game
arcade with **31 games**: one Flask + Socket.IO backend serving a hub of
browser games, many of which support real-time online multiplayer (1v1
and group vs group).

## Games

### Multiplayer (online, via room codes)

| Game | Modes |
|---|---|
| 🪢 Hangman | Solo (random word) · Online 1v1 (set a secret word for a friend) |
| ❌ Tic-Tac-Toe | Local 2P · vs AI (minimax) · Online 1v1 |
| 🔴 Connect Four | Local 2P · vs AI (heuristic) · Online 1v1 |
| ♟️ Chess | Local 2P · Online 1v1 — full rules: check, checkmate, stalemate, castling, en passant, promotion |
| ⚫ Checkers | Local 2P · Online 1v1 — mandatory captures, multi-jump chains, king promotion |
| ⚪ Reversi | Local 2P · vs AI (corner-weighted heuristic) · Online 1v1 |
| 🔲 Dots and Boxes | Local 2P · Online 1v1 — completing a box earns another turn |
| ✂️ Rock Paper Scissors | Online 1v1, best of 5 |
| 🚢 Battleship | Online 1v1 — private ship placement, then alternating fire |
| 🃏 Rummy | Online, 2-6 players, with a Team Mode for group-vs-group play |
| 🎲 Ludo Race | Online, 2-4 players — simplified Ludo: roll, race, capture rivals |
| 🧩 Trivia Quiz | Online, up to 6 players — speed-weighted scoring, live leaderboard |

### Solo & local pass-and-play

| Game | Modes |
|---|---|
| 🐍 Snake | Solo, with local high score |
| 🧠 Memory Match | Solo · Local 2P pass-and-play |
| 🏃 Subway Dash | Solo endless runner — switch lanes, jump, duck, dodge trains, collect coins |
| 🛡️ Tank Battle | Local 2P (split keyboard) · vs AI |
| 🟤 Carrom | Local 2P pass-and-play, simplified 2D board physics |
| 🏒 Air Hockey | Local 2P, simplified 2D board physics |
| 🏓 Pong | Local 2P · vs AI |
| 🔢 2048 | Solo sliding-tile merge puzzle |
| 💣 Minesweeper | Solo, three difficulty levels |
| 🧱 Breakout | Solo brick-breaker |
| 🐤 Flappy Bird | Solo endless flyer |
| 🎵 Simon Says | Solo memory sequence game |
| 🧩 Sliding Puzzle | Solo classic 15-puzzle |
| 🔨 Whack-a-Mole | Solo 30-second reflex challenge |
| 🗼 Tower of Hanoi | Solo puzzle, 3-6 disks |
| ⌨️ Typing Speed Test | Solo WPM/accuracy test |
| 👾 Space Invaders | Solo arcade shooter with escalating waves |
| 🔢 Sudoku | Solo, freshly generated & uniquely-solvable puzzles |
| 🟩 Word Guess | Solo Wordle-style 5-letter word game |

Every game is playable straight from the hub at `/` — no build step, no
npm install for the frontend (Socket.IO's client is loaded from a CDN).

## Architecture

```
server/
  app.py                 Flask app + Socket.IO room/lobby manager
  game_logic/             Authoritative server-side rules for online games
    tictactoe.py
    connect_four.py
    rps.py
    rummy.py              Full meld validation (bitmask DP), team scoring
    hangman_online.py
    battleship.py          Hidden ship placement + fire/hit/sink logic
    ludo.py                Dice rolls, captures, 6-goes-again
    trivia.py              Server-timed scoring, hides in-progress answers
    relay.py              Generic turn-tracking relay (Chess, Checkers,
                           Reversi, Dots and Boxes — client-side rules
                           engines validate moves, server enforces turns)

frontend/
  index.html               Hub / game picker
  css/style.css
  js/socket-client.js       Shared room create/join/move/chat helper
  js/games/*.js             One file per game (rendering + input + rules)
  js/games/*-engine.js       Pure, Node-testable rules engines (chess,
                             checkers, reversi, dots-and-boxes)
  games/*.html              One page per game

legacy-python/              The original terminal & Pygame Hangman scripts
```

**Online multiplayer** works through a lightweight room system: one player
creates a room and gets a 5-character code, others join with that code,
and the game starts automatically (2-player games) or when the host clicks
Start (Rummy, Ludo, Trivia). Tic-Tac-Toe, Connect Four, Rock-Paper-Scissors,
Hangman, Rummy, Battleship, Ludo and Trivia are fully server-authoritative.
Chess, Checkers, Reversi and Dots and Boxes use a lighter "relay" model:
each client runs the same pure rules engine and the server only relays
moves and enforces whose turn it is (including a `keep_turn` flag for
moves that grant another turn, like a checkers multi-jump or completing a
box).

**Rummy** deals two standard decks (no jokers) and validates a declare with
a real algorithm: it checks whether the 13 kept cards can be fully
partitioned into valid runs/sets with at least one run, using a bitmask
dynamic-programming search over all card subsets. Team Mode lets players
pick Team A/B when joining; whichever team the declaring player belongs to
wins the hand.

**Battleship** never sends a player's own unfired ship layout to their
opponent — each client only ever receives its own board plus the public
hit/miss history. **Trivia** times each question server-side (not from a
client-reported duration) so speed scoring can't be spoofed, and hides
other players' in-progress picks until everyone has answered.

## Setup

```bash
pip install -r requirements.txt
python server/app.py
```

Then open `http://localhost:5000` in a browser. Open it in a second tab
(or on a second device on the same network) to try the multiplayer games —
create a room in one tab and join with the code in the other.

## Notes on scope

This is a from-scratch build focused on breadth: a real, playable game
platform rather than a single perfected title. A few deliberate
simplifications keep things tractable:

- Chess and Checkers have no AI opponent (local 2P and online 1v1 only).
- Carrom, Air Hockey, and Tank Battle are local/AI only (2D physics don't
  relay well over the network without extra engineering).
- Rummy has no jokers/wildcards, and non-declaring players' hand points are
  their raw card total rather than a full deadwood-minimizing calculation.
- Ludo Race is a simplified single-token variant (no home yard, no need to
  roll a 6 to start) rather than full 4-token Ludo.
- Word Guess accepts any 5-letter guess rather than checking a full
  dictionary of valid words.

## Legacy

The original CLI and Pygame Hangman implementations that this project
grew out of are kept in `legacy-python/` for history.
