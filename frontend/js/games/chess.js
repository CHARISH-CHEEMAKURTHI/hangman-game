(function () {
  const GLYPH = {
    wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
    bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
  };

  const boardEl = document.getElementById("board");
  const statusEl = document.getElementById("status");
  const resetBtn = document.getElementById("resetBtn");
  const resignBtn = document.getElementById("resignBtn");
  const onlinePanel = document.getElementById("onlinePanel");
  const roomInfo = document.getElementById("roomInfo");

  let mode = "local";
  let chessState = ChessEngine.initialState();
  let selected = null;
  let legalDestinations = [];
  let gameOverText = null;
  let pendingPromotion = null;
  let waitingForServer = false;

  let lobby = null;
  let myColor = "w";

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status-line" + (cls ? " " + cls : "");
  }

  function squareClasses(r, c) {
    const classes = ["chess-sq", (r + c) % 2 === 0 ? "light" : "dark"];
    if (selected && selected.r === r && selected.c === c) classes.push("selected");
    if (chessState.lastMove) {
      const { from, to } = chessState.lastMove;
      if ((from.r === r && from.c === c) || (to.r === r && to.c === c)) classes.push("last");
    }
    const king = ChessEngine.findKing(chessState.board, chessState.turn);
    if (king && king.r === r && king.c === c && ChessEngine.isInCheck(chessState.board, chessState.turn)) {
      classes.push("check");
    }
    return classes.join(" ");
  }

  function render() {
    boardEl.innerHTML = "";
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = document.createElement("div");
        sq.className = squareClasses(r, c);
        const piece = chessState.board[r][c];
        if (piece) sq.textContent = GLYPH[piece];

        const dest = legalDestinations.find((m) => m.to.r === r && m.to.c === c);
        if (dest) {
          const marker = document.createElement("div");
          marker.className = dest.capture ? "ring" : "dot";
          sq.appendChild(marker);
        }

        sq.addEventListener("click", () => onSquareClick(r, c));
        boardEl.appendChild(sq);
      }
    }

    if (pendingPromotion) {
      const overlay = document.createElement("div");
      overlay.className = "promo-overlay";
      const color = chessState.board[pendingPromotion.from.r][pendingPromotion.from.c][0];
      for (const type of ["Q", "R", "B", "N"]) {
        const btn = document.createElement("button");
        btn.textContent = GLYPH[color + type];
        btn.addEventListener("click", () => finalizeMove(pendingPromotion, type));
        overlay.appendChild(btn);
      }
      boardEl.appendChild(overlay);
    }
  }

  function updateStatusFromEngine() {
    if (gameOverText) {
      setStatus(gameOverText, "bad");
      return;
    }
    const status = ChessEngine.getStatus(chessState);
    const sideName = chessState.turn === "w" ? "White" : "Black";
    if (status === "checkmate") {
      gameOverText = `Checkmate! ${chessState.turn === "w" ? "Black" : "White"} wins.`;
      setStatus(gameOverText, "good");
    } else if (status === "stalemate") {
      gameOverText = "Stalemate — it's a draw.";
      setStatus(gameOverText);
    } else if (mode === "online") {
      const myTurn = chessState.turn === myColor && !waitingForServer;
      setStatus(
        `${myTurn ? "Your" : "Opponent's"} turn (${sideName} to move)${status === "check" ? " — Check!" : ""}`,
        myTurn ? "good" : ""
      );
    } else {
      setStatus(`${sideName}'s turn${status === "check" ? " — Check!" : ""}`);
    }
  }

  function onSquareClick(r, c) {
    if (gameOverText || pendingPromotion) return;
    if (mode === "online") {
      if (waitingForServer || chessState.turn !== myColor) return;
    }

    const piece = chessState.board[r][c];

    if (selected) {
      const move = legalDestinations.find((m) => m.to.r === r && m.to.c === c);
      if (move) {
        if (move.promotion) {
          pendingPromotion = move;
          render();
          return;
        }
        finalizeMove(move, null);
        return;
      }
    }

    if (piece && piece[0] === chessState.turn) {
      selected = { r, c };
      legalDestinations = ChessEngine.legalMovesForPiece(chessState, r, c);
    } else {
      selected = null;
      legalDestinations = [];
    }
    render();
  }

  function finalizeMove(move, promotionChoice) {
    const finalMove = Object.assign({}, move, promotionChoice ? { promotion: promotionChoice } : {});
    pendingPromotion = null;
    selected = null;
    legalDestinations = [];

    if (mode === "online") {
      waitingForServer = true;
      lobby.makeMove({ from: finalMove.from, to: finalMove.to, promotion: finalMove.promotion || null });
      render();
      updateStatusFromEngine();
      return;
    }

    chessState = ChessEngine.applyMove(chessState, finalMove);
    render();
    updateStatusFromEngine();
  }

  function resetLocal() {
    chessState = ChessEngine.initialState();
    selected = null;
    legalDestinations = [];
    gameOverText = null;
    pendingPromotion = null;
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
      chessState = ChessEngine.applyMove(chessState, s.last_move);
    }
    waitingForServer = false;

    if (s.winner !== null && !gameOverText) {
      const iWon = s.winner === lobby.you;
      gameOverText = iWon ? "You win! Opponent resigned or was checkmated." : "You lost.";
    }

    render();
    updateStatusFromEngine();
  }

  function setupOnline() {
    lobby = new MGP.GameLobby("chess", {
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
    const myIndex = lobby.you;
    lobby.makeMove({ game_over: true, winner_index: 1 - myIndex });
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
        chessState = ChessEngine.initialState();
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
