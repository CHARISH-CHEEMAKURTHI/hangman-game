(function () {
  const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  const boardEl = document.getElementById("board");
  const statusEl = document.getElementById("status");
  const resetBtn = document.getElementById("resetBtn");
  const onlinePanel = document.getElementById("onlinePanel");
  const roomInfo = document.getElementById("roomInfo");

  let mode = "local"; // local | ai | online
  let board = Array(9).fill(null);
  let current = "X"; // local turn tracker
  let over = false;
  let winLine = null;

  let lobby = null;
  let myMark = null;
  let onlineState = null;

  function render() {
    boardEl.innerHTML = "";
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement("div");
      cell.className = "ttt-cell";
      const val = board[i];
      if (val === "O") cell.classList.add("o");
      if (winLine && winLine.includes(i)) cell.classList.add("win");
      cell.textContent = val || "";
      cell.addEventListener("click", () => onCellClick(i));
      boardEl.appendChild(cell);
    }
  }

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status-line" + (cls ? " " + cls : "");
  }

  function checkWinner(b) {
    for (const line of WIN_LINES) {
      const [a, b1, c] = line;
      if (b[a] && b[a] === b[b1] && b[a] === b[c]) return { mark: b[a], line };
    }
    return null;
  }

  // ---- Local / AI mode ----
  function resetLocal() {
    board = Array(9).fill(null);
    current = "X";
    over = false;
    winLine = null;
    setStatus("X's turn");
    render();
  }

  function onCellClick(i) {
    if (mode === "online") {
      if (!onlineState || onlineState.winner !== null || onlineState.draw) return;
      if (onlineState.turn !== lobby.you) return;
      if (onlineState.board[i]) return;
      lobby.makeMove({ cell: i });
      return;
    }

    if (over || board[i]) return;
    board[i] = current;
    const result = checkWinner(board);
    if (result) {
      over = true;
      winLine = result.line;
      setStatus(`${result.mark} wins!`, "good");
    } else if (board.every((v) => v)) {
      over = true;
      setStatus("It's a draw!");
    } else {
      current = current === "X" ? "O" : "X";
      setStatus(`${current}'s turn`);
      if (mode === "ai" && current === "O" && !over) {
        setTimeout(aiMove, 350);
      }
    }
    render();
  }

  function aiMove() {
    if (over) return;
    const move = bestMove(board, "O", "X");
    if (move === -1) return;
    onCellClick(move);
  }

  function minimax(b, player, ai, human) {
    const result = checkWinner(b);
    if (result) return result.mark === ai ? 10 : -10;
    if (b.every((v) => v)) return 0;

    const scores = [];
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        b[i] = player;
        const score = minimax(b, player === ai ? human : ai, ai, human);
        b[i] = null;
        scores.push({ i, score });
      }
    }
    if (player === ai) {
      return Math.max(...scores.map((s) => s.score));
    }
    return Math.min(...scores.map((s) => s.score));
  }

  function bestMove(b, ai, human) {
    let best = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        b[i] = ai;
        const score = minimax(b, human, ai, human);
        b[i] = null;
        if (score > bestScore) {
          bestScore = score;
          best = i;
        }
      }
    }
    return best;
  }

  // ---- Online mode ----
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
    winLine = s.winning_line;
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
    lobby = new MGP.GameLobby("tictactoe", {
      onRoomCreated: (data) => {
        myMark = data.you === 0 ? "X" : "O";
        roomInfo.innerHTML = `<div class="room-code">${data.code}</div><p>Share this code with a friend to play.</p>`;
      },
      onRoomJoined: (data) => {
        myMark = data.you === 0 ? "X" : "O";
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
        board = Array(9).fill(null);
        winLine = null;
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
