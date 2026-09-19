(function () {
  const WORDS = [
    "python", "hangman", "keyboard", "developer", "computer",
    "elephant", "guitar", "mountain", "sunshine", "javascript",
    "internet", "backpack", "umbrella", "asteroid", "dinosaur",
  ];
  const MAX_WRONG = 6;

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const statusEl = document.getElementById("status");
  const wordDisplayEl = document.getElementById("wordDisplay");
  const keyboardEl = document.getElementById("keyboard");
  const onlinePanel = document.getElementById("onlinePanel");
  const roomInfo = document.getElementById("roomInfo");
  const setWordBox = document.getElementById("setWordBox");
  const resetBtn = document.getElementById("resetBtn");

  let mode = "solo";
  let word = "";
  let guessed = new Set();
  let wrong = 0;
  let over = false;

  let lobby = null;
  let onlineState = null;

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status-line" + (cls ? " " + cls : "");
  }

  function buildKeyboard() {
    keyboardEl.innerHTML = "";
    for (const ch of "abcdefghijklmnopqrstuvwxyz") {
      const btn = document.createElement("button");
      btn.textContent = ch.toUpperCase();
      btn.addEventListener("click", () => guessLetter(ch));
      keyboardEl.appendChild(btn);
    }
  }

  function drawHangman(wrongCount) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#eef0fb";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(30, 230);
    ctx.lineTo(140, 230);
    ctx.moveTo(60, 230);
    ctx.lineTo(60, 30);
    ctx.lineTo(180, 30);
    ctx.lineTo(180, 60);
    ctx.stroke();

    ctx.strokeStyle = "#ff6b6b";
    if (wrongCount >= 1) {
      ctx.beginPath();
      ctx.arc(180, 85, 25, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (wrongCount >= 2) {
      ctx.beginPath();
      ctx.moveTo(180, 110);
      ctx.lineTo(180, 170);
      ctx.stroke();
    }
    if (wrongCount >= 3) {
      ctx.beginPath();
      ctx.moveTo(180, 125);
      ctx.lineTo(150, 150);
      ctx.stroke();
    }
    if (wrongCount >= 4) {
      ctx.beginPath();
      ctx.moveTo(180, 125);
      ctx.lineTo(210, 150);
      ctx.stroke();
    }
    if (wrongCount >= 5) {
      ctx.beginPath();
      ctx.moveTo(180, 170);
      ctx.lineTo(155, 210);
      ctx.stroke();
    }
    if (wrongCount >= 6) {
      ctx.beginPath();
      ctx.moveTo(180, 170);
      ctx.lineTo(205, 210);
      ctx.stroke();
    }
  }

  // ---- Solo mode ----
  function resetSolo() {
    word = WORDS[Math.floor(Math.random() * WORDS.length)];
    guessed = new Set();
    wrong = 0;
    over = false;
    setStatus(`Attempts left: ${MAX_WRONG}`);
    renderSolo();
  }

  function renderSolo() {
    drawHangman(wrong);
    wordDisplayEl.textContent = word
      .split("")
      .map((ch) => (guessed.has(ch) ? ch.toUpperCase() : "_"))
      .join(" ");
    Array.from(keyboardEl.children).forEach((btn) => {
      const ch = btn.textContent.toLowerCase();
      btn.classList.remove("correct", "wrong");
      btn.disabled = over || guessed.has(ch);
      if (guessed.has(ch)) btn.classList.add(word.includes(ch) ? "correct" : "wrong");
    });
  }

  function guessLetter(ch) {
    if (mode === "online") {
      onlineGuess(ch);
      return;
    }
    if (over || guessed.has(ch)) return;
    guessed.add(ch);
    if (!word.includes(ch)) wrong++;

    if ([...word].every((c) => guessed.has(c))) {
      over = true;
      setStatus("You won! 🎉", "good");
    } else if (wrong >= MAX_WRONG) {
      over = true;
      setStatus(`You lost! The word was "${word}".`, "bad");
    } else {
      setStatus(`Attempts left: ${MAX_WRONG - wrong}`);
    }
    renderSolo();
  }

  // ---- Online mode ----
  function renderOnlineLobby(data) {
    if (!lobby || !lobby.code) return;
    const players = data.players.map((p, i) => `<li>${p.name}${i === 0 ? " (sets the word)" : " (guesses)"}</li>`).join("");
    roomInfo.innerHTML = `
      <div class="room-code">${lobby.code}</div>
      <p>Share this code with a friend. Waiting for opponent...</p>
      <ul class="player-list">${players}</ul>
    `;
  }

  function renderOnlineState(data) {
    const s = data.state;
    onlineState = s;
    const iAmSetter = lobby.you === 0;

    wrong = s.wrong;
    drawHangman(wrong);

    if (s.phase === "setting") {
      wordDisplayEl.textContent = "";
      setWordBox.style.display = iAmSetter ? "block" : "none";
      keyboardEl.style.display = "none";
      setStatus(iAmSetter ? "Choose a secret word." : "Waiting for the word to be set...");
      return;
    }

    setWordBox.style.display = "none";
    keyboardEl.style.display = "grid";

    wordDisplayEl.textContent = s.masked_word.split("").map((ch) => (ch === "_" ? "_" : ch.toUpperCase())).join(" ");

    Array.from(keyboardEl.children).forEach((btn) => {
      const ch = btn.textContent.toLowerCase();
      btn.classList.remove("correct", "wrong");
      const guessedIt = s.guessed.includes(ch);
      btn.disabled = s.phase !== "guessing" || iAmSetter || guessedIt;
      if (guessedIt) {
        btn.classList.add(s.wrong_letters.includes(ch) ? "wrong" : "correct");
      }
    });

    if (s.phase === "finished") {
      const iWon = s.winner === lobby.you;
      setStatus(iWon ? "You win! 🎉" : `You lost! The word was "${s.word}".`, iWon ? "good" : "bad");
    } else if (iAmSetter) {
      setStatus(`Opponent is guessing. Wrong: ${s.wrong}/${MAX_WRONG}`);
    } else {
      setStatus(`Your turn to guess. Wrong: ${s.wrong}/${MAX_WRONG}`, "good");
    }
  }

  function onlineGuess(ch) {
    if (!onlineState || onlineState.phase !== "guessing" || lobby.you !== 1) return;
    if (onlineState.guessed.includes(ch)) return;
    lobby.makeMove({ action: "guess", letter: ch });
  }

  function setupOnline() {
    lobby = new MGP.GameLobby("hangman", {
      onRoomCreated: () => {
        roomInfo.innerHTML = `<div class="room-code">${lobby.code}</div><p>Share this code with a friend to play. You set the secret word.</p>`;
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
  document.getElementById("setWordBtn").addEventListener("click", () => {
    const value = document.getElementById("secretWordInput").value;
    if (!value) return;
    lobby.makeMove({ action: "set_word", word: value });
  });

  document.querySelectorAll(".mode-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".mode-tabs button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      mode = btn.dataset.mode;
      onlinePanel.style.display = mode === "online" ? "block" : "none";
      setWordBox.style.display = "none";
      keyboardEl.style.display = "grid";
      if (mode === "online") {
        roomInfo.innerHTML = "";
        wordDisplayEl.textContent = "";
        drawHangman(0);
        setStatus("Create or join a room to start.");
      } else {
        resetSolo();
      }
    });
  });

  resetBtn.addEventListener("click", () => {
    if (mode === "online") return;
    resetSolo();
  });

  window.addEventListener("keydown", (e) => {
    const ch = e.key.toLowerCase();
    if (ch.length === 1 && ch >= "a" && ch <= "z") guessLetter(ch);
  });

  buildKeyboard();
  resetSolo();
})();
