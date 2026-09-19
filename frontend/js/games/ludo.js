(function () {
  const TRACK_LENGTH = 28;
  const MAX_PLAYERS = 4;
  const COLORS = ["#00d2ff", "#ff8f6c", "#2ecc71", "#ffd166"];

  const lobbyPanel = document.getElementById("lobbyPanel");
  const gamePanel = document.getElementById("gamePanel");
  const roomInfo = document.getElementById("roomInfo");
  const startGameBtn = document.getElementById("startGameBtn");
  const statusEl = document.getElementById("status");
  const playersHud = document.getElementById("playersHud");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const diceDisplay = document.getElementById("diceDisplay");
  const rollBtn = document.getElementById("rollBtn");
  const moveBtn = document.getElementById("moveBtn");

  let lobby = null;
  let latestLobby = null;

  function startOffset(i) {
    return i * (TRACK_LENGTH / MAX_PLAYERS);
  }
  function absoluteCell(playerIndex, progress) {
    return (startOffset(playerIndex) + progress) % TRACK_LENGTH;
  }

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status-line" + (cls ? " " + cls : "");
  }

  function renderLobby(data) {
    latestLobby = data;
    const players = data.players.map((p, i) => `<li style="color:${COLORS[i]}">${p.name}${i === 0 ? " — host" : ""}</li>`).join("");
    roomInfo.innerHTML = `
      <div class="room-code">${lobby.code}</div>
      <p>Share this code with friends (${data.players.length}/${data.max_players} players).</p>
      <ul class="player-list">${players}</ul>
    `;
    const isHost = lobby.you === 0;
    startGameBtn.style.display = isHost && !data.started && data.players.length >= 2 ? "inline-flex" : "none";
    if (data.started) {
      lobbyPanel.style.display = "none";
      gamePanel.style.display = "block";
    }
  }

  function drawTrack(positions) {
    ctx.fillStyle = "#0b0e1c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = 170;

    for (let i = 0; i < TRACK_LENGTH; i++) {
      const angle = (2 * Math.PI * i) / TRACK_LENGTH - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      const isSafe = [0, 1, 2, 3].some((p) => startOffset(p) === i);
      ctx.beginPath();
      ctx.arc(x, y, isSafe ? 10 : 6, 0, Math.PI * 2);
      ctx.fillStyle = isSafe ? "#ffd166" : "#2a2f4f";
      ctx.fill();
    }

    const stacks = {};
    positions.forEach((progress, playerIndex) => {
      const cell = absoluteCell(playerIndex, progress);
      stacks[cell] = stacks[cell] || [];
      stacks[cell].push(playerIndex);
    });

    Object.entries(stacks).forEach(([cell, playerIndices]) => {
      const i = parseInt(cell, 10);
      const angle = (2 * Math.PI * i) / TRACK_LENGTH - Math.PI / 2;
      const baseX = cx + Math.cos(angle) * radius;
      const baseY = cy + Math.sin(angle) * radius;
      playerIndices.forEach((playerIndex, stackPos) => {
        const offset = (stackPos - (playerIndices.length - 1) / 2) * 12;
        ctx.beginPath();
        ctx.arc(baseX + offset, baseY - 14, 9, 0, Math.PI * 2);
        ctx.fillStyle = COLORS[playerIndex];
        ctx.fill();
        ctx.strokeStyle = "#0b0e1c";
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    });
  }

  function renderState(data) {
    const s = data.state;
    const me = lobby.you;

    playersHud.innerHTML = latestLobby.players
      .map((p, i) => {
        const done = s.positions[i] >= TRACK_LENGTH;
        return `<span class="ludo-player-chip" style="background:${COLORS[i]}22; color:${COLORS[i]}; ${s.turn === i ? "outline:2px solid " + COLORS[i] : ""}">${p.name}: ${done ? "🏁" : s.positions[i]}</span>`;
      })
      .join("");

    drawTrack(s.positions);

    diceDisplay.textContent = s.last_roll ? "🎲 " + s.last_roll : "🎲";

    const myTurn = s.turn === me;
    rollBtn.style.display = myTurn && s.phase === "roll" && s.winner === null ? "inline-flex" : "none";
    moveBtn.style.display = myTurn && s.phase === "move" && s.winner === null ? "inline-flex" : "none";

    if (s.winner !== null) {
      const iWon = s.winner === me;
      setStatus(iWon ? "You won the race! 🏆" : `${latestLobby.players[s.winner].name} wins the race!`, iWon ? "good" : "");
    } else if (myTurn) {
      setStatus(s.phase === "roll" ? "Your turn — roll the dice!" : `You rolled a ${s.last_roll} — move your token!`, "good");
    } else {
      setStatus(`Waiting for ${latestLobby.players[s.turn].name}...`);
    }
  }

  function setupOnline() {
    lobby = new MGP.GameLobby("ludo", {
      onRoomCreated: () => {
        roomInfo.innerHTML = `<div class="room-code">${lobby.code}</div><p>Share this code with friends to play.</p>`;
      },
      onLobbyUpdate: renderLobby,
      onStateUpdate: renderState,
      onError: (data) => setStatus(data.message, "bad"),
      onMoveError: (data) => setStatus(data.message, "bad"),
      onOpponentLeft: () => setStatus("A player left the game.", "bad"),
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
  startGameBtn.addEventListener("click", () => {
    if (lobby) lobby.startGame();
  });
  rollBtn.addEventListener("click", () => lobby.makeMove({ action: "roll" }));
  moveBtn.addEventListener("click", () => lobby.makeMove({ action: "move" }));

  drawTrack([0, 0, 0, 0]);
})();
