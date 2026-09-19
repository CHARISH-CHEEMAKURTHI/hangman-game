# Arcade Hub — Multi-Game Platform

What started as a simple terminal Hangman game is now a small multi-game
arcade: one Flask + Socket.IO backend serving a hub of browser games,
several of which support real-time online multiplayer (1v1 and group vs
group).

## Games

| Game | Modes |
|---|---|
| 🪢 Hangman | Solo (random word) · Online 1v1 (set a secret word for a friend) |
| ❌ Tic-Tac-Toe | Local 2P · vs AI (minimax) · Online 1v1 |
| 🔴 Connect Four | Local 2P · vs AI (heuristic) · Online 1v1 |
| ♟️ Chess | Local 2P · Online 1v1 — full rules: check, checkmate, stalemate, castling, en passant, promotion |
| ✂️ Rock Paper Scissors | Online 1v1, best of 5 |
| 🐍 Snake | Solo, with local high score |
| 🧠 Memory Match | Solo · Local 2P pass-and-play |
| 🏃 Subway Dash | Solo endless runner — switch lanes, jump, duck, dodge trains, collect coins |
| 🛡️ Tank Battle | Local 2P (split keyboard) · vs AI |
| 🟤 Carrom | Local 2P pass-and-play, simplified 2D board physics |
| 🃏 Rummy | Online, 2-6 players, with a Team Mode for group-vs-group play |

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
    relay.py              Generic turn-tracking relay used by online Chess

frontend/
  index.html               Hub / game picker
  css/style.css
  js/socket-client.js       Shared room create/join/move/chat helper
  js/games/*.js             One file per game (rendering + input + rules)
  games/*.html              One page per game

legacy-python/              The original terminal & Pygame Hangman scripts
```

**Online multiplayer** works through a lightweight room system: one player
creates a room and gets a 5-character code, others join with that code,
and the game starts automatically (2-player games) or when the host clicks
Start (Rummy). For Tic-Tac-Toe, Connect Four, Rock-Paper-Scissors, Hangman
and Rummy the server holds the authoritative game state and validates every
move. Chess uses a lighter "relay" model: each client runs the same full
chess engine (`js/games/chess-engine.js`) and the server only relays moves
and enforces turn order.

**Rummy** deals two standard decks (no jokers) and validates a declare with
a real algorithm: it checks whether the 13 kept cards can be fully
partitioned into valid runs/sets with at least one run, using a bitmask
dynamic-programming search over all card subsets. Team Mode lets players
pick Team A/B when joining; whichever team the declaring player belongs to
wins the hand.

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

- Chess has no AI opponent (local 2P and online 1v1 only).
- Carrom is local pass-and-play only (2D physics don't relay well over the
  network without extra engineering); Tank Battle is likewise local/AI.
- Rummy has no jokers/wildcards, and non-declaring players' hand points are
  their raw card total rather than a full deadwood-minimizing calculation.

## Legacy

The original CLI and Pygame Hangman implementations that this project
grew out of are kept in `legacy-python/` for history.
