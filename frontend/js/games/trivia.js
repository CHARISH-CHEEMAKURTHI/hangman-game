(function () {
  const lobbyPanel = document.getElementById("lobbyPanel");
  const gamePanel = document.getElementById("gamePanel");
  const finishPanel = document.getElementById("finishPanel");
  const roomInfo = document.getElementById("roomInfo");
  const startGameBtn = document.getElementById("startGameBtn");
  const statusEl = document.getElementById("status");
  const progressEl = document.getElementById("progress");
  const questionTextEl = document.getElementById("questionText");
  const optionsEl = document.getElementById("options");
  const leaderboardEl = document.getElementById("leaderboard");
  const nextBtn = document.getElementById("nextBtn");
  const finalLeaderboardEl = document.getElementById("finalLeaderboard");

  let lobby = null;
  let latestLobby = null;

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status-line" + (cls ? " " + cls : "");
  }

  function renderLobby(data) {
    latestLobby = data;
    const players = data.players.map((p, i) => `<li>${p.name}${i === 0 ? " — host" : ""}</li>`).join("");
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

  function renderLeaderboard(el, scores) {
    el.innerHTML = latestLobby.players
      .map((p, i) => `<li><span>${p.name}</span><span>${scores[i]}</span></li>`)
      .join("");
  }

  function renderState(data) {
    const s = data.state;
    const me = lobby.you;

    if (s.phase === "finished") {
      gamePanel.style.display = "none";
      finishPanel.style.display = "block";
      const sorted = latestLobby.players.map((p, i) => ({ name: p.name, score: s.scores[i] })).sort((a, b) => b.score - a.score);
      finalLeaderboardEl.innerHTML = sorted.map((p, i) => `<li><span>${i + 1}. ${p.name}</span><span>${p.score}</span></li>`).join("");
      return;
    }

    progressEl.textContent = `Question ${s.round + 1} of ${s.total_questions}`;
    questionTextEl.textContent = s.question.text;

    const myAnswer = s.my_answer;
    const revealed = s.phase === "reveal";

    optionsEl.innerHTML = "";
    s.question.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "trivia-option";
      btn.textContent = opt;
      if (myAnswer && myAnswer.choice === i) btn.classList.add("selected");
      if (revealed) {
        btn.classList.add("locked");
        if (i === s.question.answer) btn.classList.add("correct");
        else if (myAnswer && myAnswer.choice === i) btn.classList.add("wrong");
        btn.disabled = true;
      } else if (myAnswer) {
        btn.disabled = true;
        btn.classList.add("locked");
      } else {
        btn.addEventListener("click", () => lobby.makeMove({ action: "answer", choice: i }));
      }
      optionsEl.appendChild(btn);
    });

    renderLeaderboard(leaderboardEl, s.scores);

    nextBtn.style.display = revealed ? "inline-flex" : "none";

    if (revealed) {
      const correctCount = s.answers.filter((a) => a && a.correct).length;
      setStatus(`${correctCount}/${s.total_players} got it right! Correct answer highlighted.`, "good");
    } else if (myAnswer) {
      setStatus(`Answer locked in (${s.answered_count}/${s.total_players} answered) — waiting for others...`);
    } else {
      setStatus("Pick an answer — faster answers score more points!", "good");
    }
  }

  function setupOnline() {
    lobby = new MGP.GameLobby("trivia", {
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
  nextBtn.addEventListener("click", () => lobby.makeMove({ action: "next" }));
})();
