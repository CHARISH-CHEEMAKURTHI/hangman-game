(function () {
  const SIZE = 4; // 4x4 boxes
  const MARGIN = 30;
  const CELL = (420 - MARGIN * 2) / SIZE;
  const HIT_RADIUS = 16;
  const PLAYER_COLORS = ["#00d2ff", "#ff8f6c"];

  const canvas = document.getElementById("dbCanvas");
  const ctx = canvas.getContext("2d");
  const statusEl = document.getElementById("status");
  const score1El = document.getElementById("score1");
  const score2El = document.getElementById("score2");
  const onlinePanel = document.getElementById("onlinePanel");
  const roomInfo = document.getElementById("roomInfo");

  let mode = "local";
  let state = DotsAndBoxesEngine.initialState(SIZE);
  let gameOverText = null;
  let waitingForServer = false;

  let lobby = null;
  let myIndex = 0;

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status-line" + (cls ? " " + cls : "");
  }

  function dotX(c) {
    return MARGIN + c * CELL;
  }
  function dotY(r) {
    return MARGIN + r * CELL;
  }

  function candidateEdges() {
    const edges = [];
    for (let r = 0; r <= SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!state.hEdges[r][c]) {
          edges.push({ type: "h", r, c, x: (dotX(c) + dotX(c + 1)) / 2, y: dotY(r) });
        }
      }
    }
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c <= SIZE; c++) {
        if (!state.vEdges[r][c]) {
          edges.push({ type: "v", r, c, x: dotX(c), y: (dotY(r) + dotY(r + 1)) / 2 });
        }
      }
    }
    return edges;
  }

  function canAct() {
    if (gameOverText) return false;
    if (mode === "online") return state.turn === myIndex && !waitingForServer;
    return true;
  }

  function render() {
    ctx.fillStyle = "#0b0e1c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const owner = state.boxOwner[r][c];
        if (owner !== null) {
          ctx.fillStyle = PLAYER_COLORS[owner] + "33";
          ctx.fillRect(dotX(c), dotY(r), CELL, CELL);
        }
      }
    }

    ctx.strokeStyle = "#eef0fb";
    ctx.lineWidth = 4;
    for (let r = 0; r <= SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (state.hEdges[r][c]) {
          ctx.beginPath();
          ctx.moveTo(dotX(c), dotY(r));
          ctx.lineTo(dotX(c + 1), dotY(r));
          ctx.stroke();
        }
      }
    }
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c <= SIZE; c++) {
        if (state.vEdges[r][c]) {
          ctx.beginPath();
          ctx.moveTo(dotX(c), dotY(r));
          ctx.lineTo(dotX(c), dotY(r + 1));
          ctx.stroke();
        }
      }
    }

    ctx.fillStyle = "#9aa0c3";
    for (let r = 0; r <= SIZE; r++) {
      for (let c = 0; c <= SIZE; c++) {
        ctx.beginPath();
        ctx.arc(dotX(c), dotY(r), 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    score1El.textContent = state.scores[0];
    score2El.textContent = state.scores[1];
  }

  function onCanvasClick(evt) {
    if (!canAct()) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((evt.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((evt.clientY - rect.top) / rect.height) * canvas.height;

    let best = null;
    let bestDist = HIT_RADIUS;
    for (const edge of candidateEdges()) {
      const d = Math.hypot(edge.x - x, edge.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = edge;
      }
    }
    if (best) finalizeMove(best);
  }

  function finalizeMove(move) {
    if (mode === "online") {
      waitingForServer = true;
      const preview = JSON.parse(JSON.stringify(state));
      const { completed } = DotsAndBoxesEngine.applyMove(preview, move);
      lobby.makeMove({ type: move.type, r: move.r, c: move.c, keep_turn: completed > 0 });
      render();
      updateStatus();
      return;
    }

    DotsAndBoxesEngine.applyMove(state, move);
    render();
    updateStatus();
  }

  function updateStatus() {
    if (DotsAndBoxesEngine.isFinished(state)) {
      if (state.scores[0] === state.scores[1]) {
        gameOverText = `It's a tie, ${state.scores[0]}-${state.scores[1]}!`;
      } else {
        const winner = state.scores[0] > state.scores[1] ? 1 : 2;
        gameOverText = `Player ${winner} wins ${Math.max(...state.scores)}-${Math.min(...state.scores)}!`;
      }
      setStatus(gameOverText, "good");
      return;
    }
    if (gameOverText) {
      setStatus(gameOverText, "bad");
      return;
    }
    if (mode === "online") {
      const myTurn = state.turn === myIndex && !waitingForServer;
      setStatus(myTurn ? "Your turn — click an edge." : "Opponent's turn...", myTurn ? "good" : "");
    } else {
      setStatus(`Player ${state.turn + 1}'s turn — click an edge to draw it.`);
    }
  }

  function resetLocal() {
    state = DotsAndBoxesEngine.initialState(SIZE);
    gameOverText = null;
    waitingForServer = false;
    render();
    updateStatus();
  }

  // ---- Online ----
  function renderOnlineLobby(data) {
    if (!lobby || !lobby.code) return;
    const players = data.players.map((p, i) => `<li>${p.name} (Player ${i + 1})</li>`).join("");
    roomInfo.innerHTML = `
      <div class="room-code">${lobby.code}</div>
      <p>Share this code with a friend. Waiting for opponent...</p>
      <ul class="player-list">${players}</ul>
    `;
  }

  function renderOnlineState(data) {
    const s = data.state;
    if (s.last_move) {
      DotsAndBoxesEngine.applyMove(state, { type: s.last_move.type, r: s.last_move.r, c: s.last_move.c });
    }
    waitingForServer = false;
    render();
    updateStatus();
  }

  function setupOnline() {
    lobby = new MGP.GameLobby("dotsandboxes", {
      onRoomCreated: (data) => {
        myIndex = data.you;
        roomInfo.innerHTML = `<div class="room-code">${data.code}</div><p>Share this code with a friend to play.</p>`;
      },
      onRoomJoined: (data) => {
        myIndex = data.you;
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

  canvas.addEventListener("click", onCanvasClick);

  document.querySelectorAll(".mode-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".mode-tabs button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      mode = btn.dataset.mode;
      onlinePanel.style.display = mode === "online" ? "block" : "none";
      if (mode === "online") {
        roomInfo.innerHTML = "";
        state = DotsAndBoxesEngine.initialState(SIZE);
        gameOverText = null;
        setStatus("Create or join a room to start.");
        render();
      } else {
        resetLocal();
      }
    });
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    if (mode === "online") return;
    resetLocal();
  });

  resetLocal();
})();
