(function () {
  const EMOJIS = ["🍕", "🚀", "🎈", "🐙", "🎧", "🌵", "🦖", "🍩"];
  const gridEl = document.getElementById("grid");
  const statusEl = document.getElementById("status");
  const hudEl = document.getElementById("hud");
  const restartBtn = document.getElementById("restartBtn");

  const BEST_KEY = "mgp_memory_best_moves";

  let mode = "solo";
  let cards = [];
  let flipped = [];
  let matchedCount = 0;
  let moves = 0;
  let busy = false;
  let scores = [0, 0];
  let currentPlayer = 0;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status-line" + (cls ? " " + cls : "");
  }

  function renderHud() {
    if (mode === "solo") {
      const best = localStorage.getItem(BEST_KEY);
      hudEl.innerHTML = `<div>Moves: ${moves}</div><div>Best: ${best || "-"}</div>`;
    } else {
      hudEl.innerHTML = `<div>Player 1: ${scores[0]}</div><div>Player 2: ${scores[1]}</div>`;
    }
  }

  function reset() {
    const deck = shuffle(EMOJIS.concat(EMOJIS)).map((emoji, i) => ({ id: i, emoji, matched: false }));
    cards = deck;
    flipped = [];
    matchedCount = 0;
    moves = 0;
    busy = false;
    scores = [0, 0];
    currentPlayer = 0;
    setStatus(mode === "solo" ? "Find every pair!" : "Player 1's turn — find a pair!");
    renderHud();
    render();
  }

  function render() {
    gridEl.innerHTML = "";
    cards.forEach((card) => {
      const el = document.createElement("div");
      el.className = "mem-card";
      if (card.matched) el.classList.add("matched");
      if (flipped.includes(card.id) || card.matched) {
        el.textContent = card.emoji;
        el.classList.add("flipped");
      }
      el.addEventListener("click", () => onCardClick(card));
      gridEl.appendChild(el);
    });
  }

  function onCardClick(card) {
    if (busy || card.matched || flipped.includes(card.id)) return;
    flipped.push(card.id);
    render();

    if (flipped.length === 2) {
      moves++;
      busy = true;
      const [aId, bId] = flipped;
      const a = cards.find((c) => c.id === aId);
      const b = cards.find((c) => c.id === bId);

      if (a.emoji === b.emoji) {
        setTimeout(() => {
          a.matched = true;
          b.matched = true;
          matchedCount += 2;
          if (mode === "local2p") scores[currentPlayer]++;
          flipped = [];
          busy = false;
          renderHud();
          render();
          if (matchedCount === cards.length) {
            finishGame();
          } else if (mode === "local2p") {
            setStatus(`Player ${currentPlayer + 1} found a pair — go again!`, "good");
          } else {
            setStatus("Nice match!", "good");
          }
        }, 500);
      } else {
        setTimeout(() => {
          flipped = [];
          busy = false;
          if (mode === "local2p") {
            currentPlayer = 1 - currentPlayer;
            setStatus(`Player ${currentPlayer + 1}'s turn — find a pair!`);
          } else {
            setStatus("No match, try again.");
          }
          render();
        }, 800);
      }
    }
  }

  function finishGame() {
    if (mode === "solo") {
      const best = parseInt(localStorage.getItem(BEST_KEY) || "999", 10);
      if (moves < best) {
        localStorage.setItem(BEST_KEY, String(moves));
        setStatus(`New best! Completed in ${moves} moves.`, "good");
      } else {
        setStatus(`Completed in ${moves} moves.`, "good");
      }
    } else {
      if (scores[0] === scores[1]) setStatus(`It's a tie ${scores[0]}-${scores[1]}!`, "good");
      else setStatus(`Player ${scores[0] > scores[1] ? 1 : 2} wins ${Math.max(...scores)}-${Math.min(...scores)}!`, "good");
    }
    renderHud();
  }

  document.querySelectorAll(".mode-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".mode-tabs button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      mode = btn.dataset.mode;
      reset();
    });
  });

  restartBtn.addEventListener("click", reset);

  reset();
})();
