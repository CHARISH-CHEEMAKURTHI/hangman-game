(function () {
  const SUIT_GLYPH = { S: "♠", H: "♥", D: "♦", C: "♣" };
  const RED_SUITS = ["H", "D"];

  const lobbyPanel = document.getElementById("lobbyPanel");
  const gamePanel = document.getElementById("gamePanel");
  const resultPanel = document.getElementById("resultPanel");
  const roomInfo = document.getElementById("roomInfo");
  const startGameBtn = document.getElementById("startGameBtn");
  const teamModeCheck = document.getElementById("teamModeCheck");
  const teamSelect = document.getElementById("teamSelect");
  const statusEl = document.getElementById("status");
  const opponentsEl = document.getElementById("opponents");
  const handEl = document.getElementById("hand");
  const drawPileBtn = document.getElementById("drawPileBtn");
  const drawPileCountEl = document.getElementById("drawPileCount");
  const discardPileBtn = document.getElementById("discardPileBtn");
  const declareModeBtn = document.getElementById("declareModeBtn");
  const declareBtn = document.getElementById("declareBtn");
  const selCountEl = document.getElementById("selCount");

  let lobby = null;
  let latestLobby = null;
  let declareMode = false;
  let selectedCards = new Set();

  function cardLabel(card) {
    if (!card) return "";
    const rank = card.slice(0, -1);
    const suit = card.slice(-1);
    return `${rank}${SUIT_GLYPH[suit] || suit}`;
  }

  function cardClasses(card, extra) {
    const suit = card ? card.slice(-1) : null;
    const classes = ["card"];
    if (suit && RED_SUITS.includes(suit)) classes.push("red");
    if (extra) classes.push(...extra);
    return classes.join(" ");
  }

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status-line" + (cls ? " " + cls : "");
  }

  teamModeCheck.addEventListener("change", () => {
    teamSelect.style.display = teamModeCheck.checked ? "flex" : "none";
  });

  function currentTeam() {
    if (!teamModeCheck.checked) return null;
    const checked = document.querySelector('input[name="team"]:checked');
    return checked ? parseInt(checked.value, 10) : 0;
  }

  function renderLobby(data) {
    latestLobby = data;
    const showTeams = teamModeCheck.checked || data.players.length > 2;
    const players = data.players
      .map((p, i) => `<li>${p.name}${showTeams ? ` (Team ${p.team === 1 ? "B" : "A"})` : ""}${i === 0 ? " — host" : ""}</li>`)
      .join("");
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

  function renderState(data) {
    const s = data.state;
    const me = lobby.you;
    const myHand = s.hands[me];
    const isMyTurn = s.turn === me;

    resultPanel.style.display = "none";
    gamePanel.style.display = "block";

    opponentsEl.innerHTML = latestLobby.players
      .map((p, i) => {
        if (i === me) return "";
        const showTeams = teamModeCheck.checked || latestLobby.players.length > 2;
        const teamClass = showTeams && p.team !== undefined ? (p.team === 1 ? "teamB" : "teamA") : "";
        return `<div class="opponent-tile ${teamClass} ${s.turn === i ? "turn" : ""}">
          <strong>${p.name}</strong><br/>${s.hand_counts[i]} cards
        </div>`;
      })
      .join("");

    drawPileCountEl.textContent = `${s.draw_pile_count} cards`;
    const topDiscard = s.discard_pile[s.discard_pile.length - 1];
    discardPileBtn.className = cardClasses(topDiscard);
    discardPileBtn.textContent = cardLabel(topDiscard) || "empty";

    handEl.innerHTML = "";
    myHand.forEach((card) => {
      const el = document.createElement("div");
      const canAct = isMyTurn && s.phase === "discard_or_declare" && s.winner === null;
      el.className = cardClasses(card, [selectedCards.has(card) ? "selected" : ""]);
      el.textContent = cardLabel(card);
      el.addEventListener("click", () => onCardClick(card, canAct));
      handEl.appendChild(el);
    });

    drawPileBtn.style.cursor = isMyTurn && s.phase === "draw" && s.winner === null ? "pointer" : "default";
    discardPileBtn.style.cursor = isMyTurn && s.phase === "draw" && s.winner === null && topDiscard ? "pointer" : "default";

    declareBtn.style.display = declareMode ? "inline-flex" : "none";
    selCountEl.textContent = selectedCards.size;

    if (s.winner !== null) {
      const teamMode = teamModeCheck.checked || latestLobby.players.length > 2;
      let text;
      if (teamMode && s.winning_team !== null) {
        const myTeam = currentPlayerTeam(me);
        text = myTeam === s.winning_team ? "Your team wins this hand! 🎉" : "The other team wins this hand.";
      } else {
        text = s.winner === me ? "You win this hand! 🎉" : `${latestLobby.players[s.winner].name} wins this hand.`;
      }
      setStatus(text, s.winner === me ? "good" : "");
      showResult(s);
      return;
    }

    if (isMyTurn) {
      setStatus(s.phase === "draw" ? "Your turn — draw a card." : "Your turn — discard a card or declare.", "good");
    } else {
      setStatus(`Waiting for ${latestLobby.players[s.turn].name}...`);
    }
  }

  function currentPlayerTeam(index) {
    if (!latestLobby) return index;
    return latestLobby.players[index] && latestLobby.players[index].team !== undefined ? latestLobby.players[index].team : index;
  }

  function showResult(s) {
    const rows = s.final_scores
      .map((score, i) => `<li>${latestLobby.players[i].name}: ${i === s.winner ? "Winner!" : score + " points"}</li>`)
      .join("");
    let teamRows = "";
    if (s.team_totals) {
      teamRows = Object.entries(s.team_totals)
        .map(([team, total]) => `<li>Team ${team === "1" ? "B" : "A"}: ${total} points</li>`)
        .join("");
    }
    resultPanel.style.display = "block";
    resultPanel.innerHTML = `<h3>Hand finished</h3><ul>${rows}</ul>${teamRows ? `<h4>Team totals</h4><ul>${teamRows}</ul>` : ""}`;
  }

  function onCardClick(card, canAct) {
    if (!canAct) return;
    if (declareMode) {
      if (selectedCards.has(card)) selectedCards.delete(card);
      else if (selectedCards.size < 13) selectedCards.add(card);
      lobby.lastRenderState && renderState(lobby.lastRenderState);
    } else {
      lobby.makeMove({ action: "discard", card });
    }
  }

  declareModeBtn.addEventListener("click", () => {
    declareMode = !declareMode;
    selectedCards.clear();
    declareModeBtn.textContent = `Declare Mode: ${declareMode ? "On" : "Off"}`;
    if (lobby && lobby.lastRenderState) renderState(lobby.lastRenderState);
  });

  declareBtn.addEventListener("click", () => {
    if (selectedCards.size !== 13) {
      setStatus("Select exactly 13 cards to keep before declaring.", "bad");
      return;
    }
    lobby.makeMove({ action: "declare", keep: Array.from(selectedCards) });
    declareMode = false;
    selectedCards.clear();
    declareModeBtn.textContent = "Declare Mode: Off";
  });

  drawPileBtn.addEventListener("click", () => {
    if (!lobby || !lobby.lastRenderState) return;
    const s = lobby.lastRenderState.state;
    if (s.turn === lobby.you && s.phase === "draw" && s.winner === null) {
      lobby.makeMove({ action: "draw", source: "pile" });
    }
  });

  discardPileBtn.addEventListener("click", () => {
    if (!lobby || !lobby.lastRenderState) return;
    const s = lobby.lastRenderState.state;
    if (s.turn === lobby.you && s.phase === "draw" && s.winner === null && s.discard_pile.length) {
      lobby.makeMove({ action: "draw", source: "discard" });
    }
  });

  function setupOnline() {
    lobby = new MGP.GameLobby("rummy", {
      onRoomCreated: () => {
        roomInfo.innerHTML = `<div class="room-code">${lobby.code}</div><p>Share this code with friends to play.</p>`;
      },
      onLobbyUpdate: renderLobby,
      onStateUpdate: (data) => {
        lobby.lastRenderState = data;
        renderState(data);
      },
      onError: (data) => setStatus(data.message, "bad"),
      onMoveError: (data) => setStatus(data.message, "bad"),
      onOpponentLeft: () => setStatus("A player left the game.", "bad"),
    });
  }

  document.getElementById("createRoomBtn").addEventListener("click", () => {
    if (!lobby) setupOnline();
    lobby.createRoom(currentTeam());
  });
  document.getElementById("joinRoomBtn").addEventListener("click", () => {
    if (!lobby) setupOnline();
    const code = document.getElementById("joinCodeInput").value;
    if (code) lobby.joinRoom(code, currentTeam());
  });
  startGameBtn.addEventListener("click", () => {
    if (lobby) lobby.startGame();
  });
})();
