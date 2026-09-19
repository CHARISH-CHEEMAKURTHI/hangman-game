(function () {
  const ROWS = 6;
  const COLS = 7;

  const boardEl = document.getElementById("board");
  const colButtonsEl = document.getElementById("colButtons");
  const statusEl = document.getElementById("status");
  const resetBtn = document.getElementById("resetBtn");
  const onlinePanel = document.getElementById("onlinePanel");
  const roomInfo = document.getElementById("roomInfo");

  let mode = "local";
  let board = makeEmptyBoard();
  let current = "R";
  let over = false;
  let winCells = [];

  let lobby = null;
  let onlineState = null;

  function makeEmptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status-line" + (cls ? " " + cls : "");
  }

  function render() {
    boardEl.innerHTML = "";
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement("div");
        cell.className = "c4-cell";
        const v = board[r][c];
        if (v === "R") cell.classList.add("r");
        if (v === "Y") cell.classList.add("y");
        if (winCells.some(([wr, wc]) => wr === r && wc === c)) cell.classList.add("win");
        boardEl.appendChild(cell);
      }
    }
  }

  function renderColButtons() {
    colButtonsEl.innerHTML = "";
    for (let c = 0; c < COLS; c++) {
      const btn = document.createElement("button");
      btn.className = "c4-col-btn";
      btn.textContent = "↓";
      btn.addEventListener("click", () => dropInColumn(c));
      colButtonsEl.appendChild(btn);
    }
  }

  function findRow(b, col) {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!b[r][col]) return r;
    }
    return -1;
  }

  function checkWinner(b) {
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const mark = b[r][c];
        if (!mark) continue;
        for (const [dr, dc] of dirs) {
          const cells = [0, 1, 2, 3].map((i) => [r + dr * i, c + dc * i]);
          if (
            cells.every(([rr, cc]) => rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) &&
            cells.every(([rr, cc]) => b[rr][cc] === mark)
          ) {
            return { mark, cells };
          }
        }
      }
    }
    return null;
  }

  function isFull(b) {
    return b[0].every((v) => v);
  }

  function resetLocal() {
    board = makeEmptyBoard();
    current = "R";
    over = false;
    winCells = [];
    setStatus("Red's turn");
    render();
  }

  function dropInColumn(col) {
    if (mode === "online") {
      if (!onlineState || onlineState.winner !== null || onlineState.draw) return;
      if (onlineState.turn !== lobby.you) return;
      lobby.makeMove({ col });
      return;
    }

    if (over) return;
    const row = findRow(board, col);
    if (row === -1) return;
    board[row][col] = current;

    const result = checkWinner(board);
    if (result) {
      over = true;
      winCells = result.cells;
      setStatus(`${result.mark === "R" ? "Red" : "Yellow"} wins!`, "good");
    } else if (isFull(board)) {
      over = true;
      setStatus("It's a draw!");
    } else {
      current = current === "R" ? "Y" : "R";
      setStatus(`${current === "R" ? "Red" : "Yellow"}'s turn`);
      if (mode === "ai" && current === "Y" && !over) {
        setTimeout(aiMove, 400);
      }
    }
    render();
  }

  function aiMove() {
    if (over) return;
    const col = pickAiColumn(board, "Y", "R");
    if (col !== -1) dropInColumn(col);
  }

  function pickAiColumn(b, ai, human) {
    const validCols = [];
    for (let c = 0; c < COLS; c++) if (findRow(b, c) !== -1) validCols.push(c);
    if (validCols.length === 0) return -1;

    for (const c of validCols) {
      const clone = b.map((row) => row.slice());
      const r = findRow(clone, c);
      clone[r][c] = ai;
      if (checkWinner(clone)) return c;
    }
    for (const c of validCols) {
      const clone = b.map((row) => row.slice());
      const r = findRow(clone, c);
      clone[r][c] = human;
      if (checkWinner(clone)) return c;
    }
    const order = [3, 2, 4, 1, 5, 0, 6].filter((c) => validCols.includes(c));
    return order[0];
  }

  // ---- Online ----
  function renderOnlineLobby(data) {
    if (!lobby || !lobby.code) return;
    const players = data.players.map((p) => `<li>${p.name}</li>`).join("");
    roomInfo.innerHTML = `
      <div class="room-code">${lobby.code}</div>
      <p>Share this code with a friend. Waiting for opponent...</p>
      <ul class="player-list">${players}</ul>
    `;
  }

  function renderOnlineState(data) {
    const s = data.state;
    onlineState = s;
    board = s.board;
    winCells = s.winning_cells || [];
    render();

    if (s.winner !== null) {
      const iWon = s.winner === lobby.you;
      setStatus(iWon ? "You win! 🎉" : "You lost.", iWon ? "good" : "bad");
    } else if (s.draw) {
      setStatus("It's a draw!");
    } else {
      const myTurn = s.turn === lobby.you;
      setStatus(myTurn ? "Your turn" : "Opponent's turn", myTurn ? "good" : "");
    }
  }

  function setupOnline() {
    lobby = new MGP.GameLobby("connect4", {
      onRoomCreated: (data) => {
        roomInfo.innerHTML = `<div class="room-code">${data.code}</div><p>Share this code with a friend to play.</p>`;
      },
      onLobbyUpdate: renderOnlineLobby,
      onStateUpdate: renderOnlineState,
      onError: (data) => setStatus(data.message, "bad"),
      onMoveError: (data) => setStatus(data.message, "bad"),
      onOpponentLeft: () => setStatus("Opponent left the game.", "bad"),
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

  document.querySelectorAll(".mode-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".mode-tabs button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      mode = btn.dataset.mode;
      onlinePanel.style.display = mode === "online" ? "block" : "none";
      onlineState = null;
      if (mode === "online") {
        roomInfo.innerHTML = "";
        setStatus("Create or join a room to start.");
        board = makeEmptyBoard();
        winCells = [];
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

  renderColButtons();
  resetLocal();
})();
