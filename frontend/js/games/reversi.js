(function () {
  const WEIGHTS = [
    [120, -20, 20, 5, 5, 20, -20, 120],
    [-20, -40, -5, -5, -5, -5, -40, -20],
    [20, -5, 15, 3, 3, 15, -5, 20],
    [5, -5, 3, 3, 3, 3, -5, 5],
    [5, -5, 3, 3, 3, 3, -5, 5],
    [20, -5, 15, 3, 3, 15, -5, 20],
    [-20, -40, -5, -5, -5, -5, -40, -20],
    [120, -20, 20, 5, 5, 20, -20, 120],
  ];

  const boardEl = document.getElementById("board");
  const statusEl = document.getElementById("status");
  const blackCountEl = document.getElementById("blackCount");
  const whiteCountEl = document.getElementById("whiteCount");
  const resetBtn = document.getElementById("resetBtn");
  const resignBtn = document.getElementById("resignBtn");
  const onlinePanel = document.getElementById("onlinePanel");
  const roomInfo = document.getElementById("roomInfo");

  let mode = "local";
  let state = ReversiEngine.initialState();
  let gameOverText = null;
  let waitingForServer = false;

  let lobby = null;
  let myColor = "b";

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status-line" + (cls ? " " + cls : "");
  }

  function render() {
    const legal = gameOverText ? [] : ReversiEngine.legalMoves(state, state.turn);
    boardEl.innerHTML = "";
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = document.createElement("div");
        sq.className = "reversi-sq";
        const v = state.board[r][c];
        if (v) {
          const disc = document.createElement("div");
          disc.className = "reversi-disc " + v;
          sq.appendChild(disc);
        } else if (legal.some((m) => m.r === r && m.c === c) && canAct()) {
          const dot = document.createElement("div");
          dot.className = "dot";
          sq.appendChild(dot);
        }
        sq.addEventListener("click", () => onSquareClick(r, c, legal));
        boardEl.appendChild(sq);
      }
    }
    const counts = ReversiEngine.counts(state.board);
    blackCountEl.textContent = counts.b;
    whiteCountEl.textContent = counts.w;
  }

  function canAct() {
    if (gameOverText) return false;
    if (mode === "online") return state.turn === myColor && !waitingForServer;
    if (mode === "ai") return state.turn === "b";
    return true;
  }

  function updateStatusFromEngine() {
    if (gameOverText) {
      setStatus(gameOverText, "bad");
      return;
    }
    if (ReversiEngine.getStatus(state) === "over") {
      finishGame();
      return;
    }
    const sideName = state.turn === "b" ? "Black" : "White";
    if (mode === "online") {
      const myTurn = state.turn === myColor && !waitingForServer;
      setStatus(`${myTurn ? "Your" : "Opponent's"} turn (${sideName})`, myTurn ? "good" : "");
    } else if (mode === "ai") {
      setStatus(state.turn === "b" ? "Your turn (Black)" : "AI is thinking...", state.turn === "b" ? "good" : "");
    } else {
      setStatus(`${sideName}'s turn`);
    }
  }

  function finishGame() {
    const counts = ReversiEngine.counts(state.board);
    if (counts.b === counts.w) gameOverText = `Game over — tie ${counts.b}-${counts.w}!`;
    else {
      const winner = counts.b > counts.w ? "Black" : "White";
      gameOverText = `Game over — ${winner} wins ${Math.max(counts.b, counts.w)}-${Math.min(counts.b, counts.w)}!`;
    }
    setStatus(gameOverText, "good");
  }

  function onSquareClick(r, c, legal) {
    if (!canAct()) return;
    const move = legal.find((m) => m.r === r && m.c === c);
    if (!move) return;
    finalizeMove(move);
  }

  function finalizeMove(move) {
    if (mode === "online") {
      waitingForServer = true;
      const preview = ReversiEngine.applyMove(state, move);
      const keepTurn = preview.turn === state.turn;
      lobby.makeMove({ r: move.r, c: move.c, flips: move.flips, keep_turn: keepTurn });
      render();
      updateStatusFromEngine();
      return;
    }

    state = ReversiEngine.applyMove(state, move);
    render();
    updateStatusFromEngine();

    if (mode === "ai" && state.turn === "w" && ReversiEngine.getStatus(state) === "normal") {
      setTimeout(aiMove, 400);
    }
  }

  function aiMove() {
    const legal = ReversiEngine.legalMoves(state, "w");
    if (legal.length === 0) return;
    let best = null;
    let bestScore = -Infinity;
    for (const move of legal) {
      const result = ReversiEngine.applyMove(state, move);
      let score = 0;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (result.board[r][c] === "w") score += WEIGHTS[r][c];
          else if (result.board[r][c] === "b") score -= WEIGHTS[r][c];
        }
      }
      if (score > bestScore) {
        bestScore = score;
        best = move;
      }
    }
    finalizeMove(best);
  }

  function resetLocal() {
    state = ReversiEngine.initialState();
    gameOverText = null;
    waitingForServer = false;
    render();
    updateStatusFromEngine();
  }

  // ---- Online ----
  function renderOnlineLobby(data) {
    if (!lobby || !lobby.code) return;
    const players = data.players.map((p, i) => `<li>${p.name}${i === 0 ? " (Black)" : " (White)"}</li>`).join("");
    roomInfo.innerHTML = `
      <div class="room-code">${lobby.code}</div>
      <p>Share this code with a friend. Waiting for opponent...</p>
      <ul class="player-list">${players}</ul>
    `;
    if (data.started) resignBtn.style.display = "inline-flex";
  }

  function renderOnlineState(data) {
    const s = data.state;
    if (s.last_move) {
      state = ReversiEngine.applyMove(state, { r: s.last_move.r, c: s.last_move.c, flips: s.last_move.flips });
    }
    waitingForServer = false;

    if (s.winner !== null && !gameOverText) {
      const iWon = s.winner === lobby.you;
      gameOverText = iWon ? "You win! Opponent resigned." : "You lost.";
    }

    render();
    updateStatusFromEngine();
  }

  function setupOnline() {
    lobby = new MGP.GameLobby("reversi", {
      onRoomCreated: (data) => {
        myColor = data.you === 0 ? "b" : "w";
        roomInfo.innerHTML = `<div class="room-code">${data.code}</div><p>Share this code with a friend to play. You are Black.</p>`;
      },
      onRoomJoined: (data) => {
        myColor = data.you === 0 ? "b" : "w";
      },
      onLobbyUpdate: renderOnlineLobby,
      onStateUpdate: renderOnlineState,
      onError: (data) => setStatus(data.message, "bad"),
      onMoveError: (data) => {
        waitingForServer = false;
        setStatus(data.message, "bad");
      },
      onOpponentLeft: () => {
        gameOverText = "Opponent left the game.";
        setStatus(gameOverText, "bad");
      },
    });
  }

  document.getElementById("createRoomBtn").addEventListener("click", () => {
    if (!lobby) setupOnline();
    lobby.createRoom();
  });
  document.getElementById("joinRoomBtn").addEventListener("click", () => {
    if (!lobby) setupOnline();
    const code = document.getElementById("joinCodeInput").value;
    if (code) lobby.joinRoom(code);
  });

  resignBtn.addEventListener("click", () => {
    if (mode !== "online" || gameOverText) return;
    lobby.makeMove({ game_over: true, winner_index: 1 - lobby.you });
  });

  document.querySelectorAll(".mode-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".mode-tabs button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      mode = btn.dataset.mode;
      onlinePanel.style.display = mode === "online" ? "block" : "none";
      resignBtn.style.display = "none";
      if (mode === "online") {
        roomInfo.innerHTML = "";
        state = ReversiEngine.initialState();
        gameOverText = null;
        setStatus("Create or join a room to start.");
        render();
      } else {
        resetLocal();
      }
    });
  });

  resetBtn.addEventListener("click", () => {
    if (mode === "online") return;
    resetLocal();
  });

  resetLocal();
})();
