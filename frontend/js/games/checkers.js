(function () {
  const boardEl = document.getElementById("board");
  const statusEl = document.getElementById("status");
  const resetBtn = document.getElementById("resetBtn");
  const resignBtn = document.getElementById("resignBtn");
  const onlinePanel = document.getElementById("onlinePanel");
  const roomInfo = document.getElementById("roomInfo");

  let mode = "local";
  let state = CheckersEngine.initialState();
  let selected = null;
  let legalDestinations = [];
  let gameOverText = null;
  let waitingForServer = false;

  let lobby = null;
  let myColor = "w";

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status-line" + (cls ? " " + cls : "");
  }

  function render() {
    boardEl.innerHTML = "";
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = document.createElement("div");
        sq.className = "checkers-sq " + ((r + c) % 2 === 0 ? "light" : "dark");
        if (selected && selected.r === r && selected.c === c) sq.classList.add("selected");

        const piece = state.board[r][c];
        if (piece) {
          const p = document.createElement("div");
          p.className = "checker-piece " + piece[0] + (piece[1] === "K" ? " king" : "");
          sq.appendChild(p);
        }

        const dest = legalDestinations.find((m) => m.to.r === r && m.to.c === c);
        if (dest) {
          const marker = document.createElement("div");
          marker.className = "dot";
          sq.appendChild(marker);
        }

        sq.addEventListener("click", () => onSquareClick(r, c));
        boardEl.appendChild(sq);
      }
    }
  }

  function updateStatusFromEngine() {
    if (gameOverText) {
      setStatus(gameOverText, "bad");
      return;
    }
    const status = CheckersEngine.getStatus(state);
    const sideName = state.turn === "w" ? "White" : "Black";
    if (status === "loss") {
      gameOverText = `${sideName} has no moves left — ${sideName === "White" ? "Black" : "White"} wins!`;
      setStatus(gameOverText, "good");
      return;
    }
    if (mode === "online") {
      const myTurn = state.turn === myColor && !waitingForServer;
      setStatus(`${myTurn ? "Your" : "Opponent's"} turn (${sideName} to move)`, myTurn ? "good" : "");
    } else {
      setStatus(`${sideName}'s turn`);
    }
  }

  function onSquareClick(r, c) {
    if (gameOverText) return;
    if (mode === "online") {
      if (waitingForServer || state.turn !== myColor) return;
    }

    const piece = state.board[r][c];

    if (selected) {
      const move = legalDestinations.find((m) => m.to.r === r && m.to.c === c);
      if (move) {
        finalizeMove(move);
        return;
      }
    }

    const moves = CheckersEngine.legalMovesForPiece(state, r, c);
    if (piece && piece[0] === state.turn && moves.length > 0) {
      selected = { r, c };
      legalDestinations = moves;
    } else {
      selected = null;
      legalDestinations = [];
    }
    render();
  }

  function finalizeMove(move) {
    selected = null;
    legalDestinations = [];

    if (mode === "online") {
      waitingForServer = true;
      const resultPreview = CheckersEngine.applyMove(state, move);
      const keepTurn = !!resultPreview.mustContinueFrom;
      lobby.makeMove({ from: move.from, to: move.to, capture: move.capture || null, keep_turn: keepTurn });
      render();
      updateStatusFromEngine();
      return;
    }

    state = CheckersEngine.applyMove(state, move);
    if (state.mustContinueFrom) {
      selected = state.mustContinueFrom;
      legalDestinations = CheckersEngine.legalMovesForPiece(state, selected.r, selected.c);
    }
    render();
    updateStatusFromEngine();
  }

  function resetLocal() {
    state = CheckersEngine.initialState();
    selected = null;
    legalDestinations = [];
    gameOverText = null;
    waitingForServer = false;
    render();
    updateStatusFromEngine();
  }

  // ---- Online ----
  function renderOnlineLobby(data) {
    if (!lobby || !lobby.code) return;
    const players = data.players.map((p, i) => `<li>${p.name}${i === 0 ? " (White)" : " (Black)"}</li>`).join("");
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
      const move = { from: s.last_move.from, to: s.last_move.to, capture: s.last_move.capture || null };
      state = CheckersEngine.applyMove(state, move);
    }
    waitingForServer = false;

    if (state.mustContinueFrom) {
      selected = state.mustContinueFrom;
      legalDestinations = CheckersEngine.legalMovesForPiece(state, selected.r, selected.c);
    } else {
      selected = null;
      legalDestinations = [];
    }

    if (s.winner !== null && !gameOverText) {
      const iWon = s.winner === lobby.you;
      gameOverText = iWon ? "You win! Opponent resigned or has no moves left." : "You lost.";
    }

    render();
    updateStatusFromEngine();
  }

  function setupOnline() {
    lobby = new MGP.GameLobby("checkers", {
      onRoomCreated: (data) => {
        myColor = data.you === 0 ? "w" : "b";
        roomInfo.innerHTML = `<div class="room-code">${data.code}</div><p>Share this code with a friend to play. You are White.</p>`;
      },
      onRoomJoined: (data) => {
        myColor = data.you === 0 ? "w" : "b";
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
        state = CheckersEngine.initialState();
        gameOverText = null;
        selected = null;
        legalDestinations = [];
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
