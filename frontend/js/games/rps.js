(function () {
  const EMOJI = { rock: "🪨", paper: "📄", scissors: "✂️" };

  const lobbyPanel = document.getElementById("lobbyPanel");
  const gamePanel = document.getElementById("gamePanel");
  const roomInfo = document.getElementById("roomInfo");
  const statusEl = document.getElementById("status");
  const revealEl = document.getElementById("reveal");
  const myScoreEl = document.getElementById("myScore");
  const oppScoreEl = document.getElementById("oppScore");
  const choiceButtons = document.querySelectorAll(".rps-choice");

  let lobby = null;
  let hasPickedThisRound = false;

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status-line" + (cls ? " " + cls : "");
  }

  function renderLobby(data) {
    const players = data.players.map((p) => `<li>${p.name}</li>`).join("");
    roomInfo.innerHTML = `
      <div class="room-code">${lobby.code}</div>
      <p>Share this code with a friend. Waiting for opponent...</p>
      <ul class="player-list">${players}</ul>
    `;
    if (data.started) {
      lobbyPanel.style.display = "none";
      gamePanel.style.display = "block";
    }
  }

  function renderState(data) {
    const s = data.state;
    const me = lobby.you;
    const opp = 1 - me;
    myScoreEl.textContent = s.scores[me];
    oppScoreEl.textContent = s.scores[opp];
    hasPickedThisRound = s.picks[me] !== null;

    choiceButtons.forEach((btn) => {
      btn.disabled = hasPickedThisRound || s.winner !== null;
      btn.classList.toggle("picked", btn.dataset.pick === s.picks[me]);
    });

    if (s.winner !== null) {
      const iWon = s.winner === me;
      setStatus(iWon ? "You win the match! 🏆" : "You lost the match.", iWon ? "good" : "bad");
    } else if (s.last_result) {
      const mine = me === 0 ? s.last_result.p0 : s.last_result.p1;
      const theirs = me === 0 ? s.last_result.p1 : s.last_result.p0;
      let text;
      if (s.last_result.result === "draw") text = `Draw! Both picked ${EMOJI[mine]}`;
      else {
        const iWonRound = (me === 0 && s.last_result.result === "p0") || (me === 1 && s.last_result.result === "p1");
        text = `${EMOJI[mine]} vs ${EMOJI[theirs]} — ${iWonRound ? "You won that round!" : "Opponent won that round."}`;
      }
      revealEl.textContent = text;
      setStatus(`Round ${s.round}`);
    } else if (hasPickedThisRound) {
      setStatus("Waiting for opponent to pick...");
    } else {
      setStatus(`Round ${s.round} — make your pick!`);
    }
  }

  function setupOnline() {
    lobby = new MGP.GameLobby("rps", {
      onRoomCreated: () => {
        roomInfo.innerHTML = `<div class="room-code">${lobby.code}</div><p>Share this code with a friend to play.</p>`;
      },
      onLobbyUpdate: renderLobby,
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

  choiceButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!lobby || hasPickedThisRound) return;
      lobby.makeMove({ pick: btn.dataset.pick });
    });
  });
})();
