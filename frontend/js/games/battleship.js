(function () {
  const SIZE = 10;
  const SHIP_SIZES = [5, 4, 3, 3, 2];

  const lobbyPanel = document.getElementById("lobbyPanel");
  const gamePanel = document.getElementById("gamePanel");
  const roomInfo = document.getElementById("roomInfo");
  const statusEl = document.getElementById("status");
  const myBoardEl = document.getElementById("myBoard");
  const enemyBoardEl = document.getElementById("enemyBoard");
  const placementControls = document.getElementById("placementControls");
  const placingLabel = document.getElementById("placingLabel");
  const orientationBtn = document.getElementById("orientationBtn");
  const randomBtn = document.getElementById("randomBtn");
  const undoShipBtn = document.getElementById("undoShipBtn");

  let lobby = null;
  let myShips = []; // array of ship cell-arrays [[r,c], ...]
  let orientation = "h";
  let hasSentPlacement = false;
  let hoverCell = null;
  let latestState = null;

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status-line" + (cls ? " " + cls : "");
  }

  function cellsOccupied() {
    const set = new Set();
    myShips.forEach((ship) => ship.forEach(([r, c]) => set.add(r + "," + c)));
    return set;
  }

  function shipCellsFrom(r, c, size, orient) {
    const cells = [];
    for (let i = 0; i < size; i++) {
      cells.push(orient === "h" ? [r, c + i] : [r + i, c]);
    }
    return cells;
  }

  function isValidPlacement(cells) {
    const occupied = cellsOccupied();
    return cells.every(([r, c]) => r >= 0 && r < SIZE && c >= 0 && c < SIZE && !occupied.has(r + "," + c));
  }

  function renderPlacement() {
    const nextIndex = myShips.length;
    const done = nextIndex >= SHIP_SIZES.length;
    placingLabel.textContent = done ? "All ships placed! Waiting..." : `Placing ship of size ${SHIP_SIZES[nextIndex]}`;
    orientationBtn.textContent = "Orientation: " + (orientation === "h" ? "Horizontal" : "Vertical");
    orientationBtn.style.display = done ? "none" : "inline-flex";
    undoShipBtn.style.display = myShips.length > 0 && !hasSentPlacement ? "inline-flex" : "none";
    randomBtn.style.display = hasSentPlacement ? "none" : "inline-flex";

    myBoardEl.innerHTML = "";
    const occupied = cellsOccupied();
    let previewCells = [];
    let previewValid = false;
    if (!done && hoverCell) {
      previewCells = shipCellsFrom(hoverCell[0], hoverCell[1], SHIP_SIZES[nextIndex], orientation);
      previewValid = isValidPlacement(previewCells);
    }

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const el = document.createElement("div");
        el.className = "bs-cell";
        if (occupied.has(r + "," + c)) el.classList.add("ship");
        if (previewCells.some(([pr, pc]) => pr === r && pc === c)) {
          el.classList.add(previewValid ? "preview" : "preview-invalid");
        }
        if (!done) {
          el.addEventListener("mouseenter", () => {
            hoverCell = [r, c];
            renderPlacement();
          });
          el.addEventListener("click", () => tryPlaceShip(r, c));
        }
        myBoardEl.appendChild(el);
      }
    }
  }

  function tryPlaceShip(r, c) {
    const nextIndex = myShips.length;
    if (nextIndex >= SHIP_SIZES.length) return;
    const cells = shipCellsFrom(r, c, SHIP_SIZES[nextIndex], orientation);
    if (!isValidPlacement(cells)) {
      setStatus("Can't place there — out of bounds or overlapping.", "bad");
      return;
    }
    myShips.push(cells);
    if (myShips.length === SHIP_SIZES.length) {
      sendPlacement();
    }
    renderPlacement();
  }

  function randomizePlacement() {
    for (let attempt = 0; attempt < 200; attempt++) {
      myShips = [];
      let ok = true;
      for (const size of SHIP_SIZES) {
        let placed = false;
        for (let tries = 0; tries < 200; tries++) {
          const orient = Math.random() < 0.5 ? "h" : "v";
          const r = Math.floor(Math.random() * SIZE);
          const c = Math.floor(Math.random() * SIZE);
          const cells = shipCellsFrom(r, c, size, orient);
          if (isValidPlacement(cells)) {
            myShips.push(cells);
            placed = true;
            break;
          }
        }
        if (!placed) {
          ok = false;
          break;
        }
      }
      if (ok) break;
    }
    sendPlacement();
    renderPlacement();
  }

  function sendPlacement() {
    hasSentPlacement = true;
    lobby.makeMove({ action: "place", ships: myShips });
    setStatus("Ships placed! Waiting for opponent...");
  }

  function renderBattle(s) {
    placementControls.style.display = "none";

    myBoardEl.innerHTML = "";
    const myCells = new Set();
    (s.my_board.ships || []).forEach(([r, c]) => myCells.add(r + "," + c));
    const incoming = {};
    (s.my_board.incoming_shots || []).forEach((shot) => {
      incoming[shot.r + "," + shot.c] = shot.hit;
    });
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const el = document.createElement("div");
        el.className = "bs-cell";
        const key = r + "," + c;
        if (myCells.has(key)) el.classList.add("ship");
        if (key in incoming) el.classList.add(incoming[key] ? "hit" : "miss");
        myBoardEl.appendChild(el);
      }
    }

    enemyBoardEl.innerHTML = "";
    const myShots = {};
    (s.my_shots || []).forEach((shot) => {
      myShots[shot.r + "," + shot.c] = shot.hit;
    });
    const canFire = s.phase === "battle" && s.turn === lobby.you;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const el = document.createElement("div");
        el.className = "bs-cell enemy";
        const key = r + "," + c;
        if (key in myShots) {
          el.classList.add(myShots[key] ? "hit" : "miss");
        } else if (canFire) {
          el.addEventListener("click", () => lobby.makeMove({ action: "fire", r, c }));
        }
        enemyBoardEl.appendChild(el);
      }
    }
  }

  function renderState(data) {
    const s = data.state;
    latestState = s;
    gamePanel.style.display = "block";
    lobbyPanel.style.display = "none";

    if (s.phase === "placing") {
      placementControls.style.display = "flex";
      if (!hasSentPlacement) renderPlacement();
      if (s.you_placed && !s.opponent_placed) setStatus("Waiting for opponent to place their ships...");
      else if (!s.you_placed) setStatus("Place your ships to begin.");
      return;
    }

    renderBattle(s);

    if (s.phase === "finished") {
      const iWon = s.winner === lobby.you;
      setStatus(iWon ? "You sank the enemy fleet! 🎉" : "Your fleet was destroyed.", iWon ? "good" : "bad");
    } else {
      const myTurn = s.turn === lobby.you;
      setStatus(myTurn ? "Your turn — fire at the enemy waters!" : "Waiting for opponent's shot...", myTurn ? "good" : "");
    }
  }

  function setupOnline() {
    lobby = new MGP.GameLobby("battleship", {
      onRoomCreated: () => {
        roomInfo.innerHTML = `<div class="room-code">${lobby.code}</div><p>Share this code with a friend to play.</p>`;
      },
      onLobbyUpdate: (data) => {
        const players = data.players.map((p) => `<li>${p.name}</li>`).join("");
        roomInfo.innerHTML = `
          <div class="room-code">${lobby.code}</div>
          <p>Waiting for opponent...</p>
          <ul class="player-list">${players}</ul>
        `;
      },
      onStateUpdate: renderState,
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

  orientationBtn.addEventListener("click", () => {
    orientation = orientation === "h" ? "v" : "h";
    renderPlacement();
  });
  randomBtn.addEventListener("click", randomizePlacement);
  undoShipBtn.addEventListener("click", () => {
    myShips.pop();
    renderPlacement();
  });

  renderPlacement();
})();
