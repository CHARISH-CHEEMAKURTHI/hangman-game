(function () {
  const boardEl = document.getElementById("board");
  const scoreEl = document.getElementById("score");
  const timeEl = document.getElementById("time");
  const bestEl = document.getElementById("best");
  const statusEl = document.getElementById("status");
  const startBtn = document.getElementById("startBtn");
  const BEST_KEY = "mgp_whack_best";
  const HOLES = 9;
  const GAME_SECONDS = 30;

  let best = parseInt(localStorage.getItem(BEST_KEY) || "0", 10);
  bestEl.textContent = best;

  let holes = [];
  let score = 0;
  let timeLeft = GAME_SECONDS;
  let running = false;
  let moleTimer, countdownTimer;
  let activeHole = -1;

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status-line" + (cls ? " " + cls : "");
  }

  function buildBoard() {
    boardEl.innerHTML = "";
    holes = [];
    for (let i = 0; i < HOLES; i++) {
      const el = document.createElement("div");
      el.className = "whack-hole";
      el.addEventListener("click", () => onWhack(i));
      boardEl.appendChild(el);
      holes.push(el);
    }
  }

  function popMole() {
    if (activeHole !== -1) holes[activeHole].classList.remove("up");
    activeHole = Math.floor(Math.random() * HOLES);
    holes[activeHole].classList.add("up");
    holes[activeHole].textContent = "🐹";
    const upTime = Math.max(420, 950 - score * 12);
    moleTimer = setTimeout(() => {
      if (holes[activeHole]) {
        holes[activeHole].classList.remove("up");
        holes[activeHole].textContent = "";
      }
      if (running) popMole();
    }, upTime);
  }

  function onWhack(i) {
    if (!running) return;
    if (i === activeHole) {
      score += 10;
      scoreEl.textContent = score;
      holes[i].classList.remove("up");
      holes[i].textContent = "";
      activeHole = -1;
      clearTimeout(moleTimer);
      popMole();
    }
  }

  function start() {
    clearTimeout(moleTimer);
    clearInterval(countdownTimer);
    buildBoard();
    score = 0;
    timeLeft = GAME_SECONDS;
    running = true;
    scoreEl.textContent = 0;
    timeEl.textContent = timeLeft;
    setStatus("Go! Whack the moles!", "good");
    popMole();
    countdownTimer = setInterval(() => {
      timeLeft--;
      timeEl.textContent = timeLeft;
      if (timeLeft <= 0) endGame();
    }, 1000);
  }

  function endGame() {
    running = false;
    clearTimeout(moleTimer);
    clearInterval(countdownTimer);
    holes.forEach((h) => {
      h.classList.remove("up");
      h.textContent = "";
    });
    if (score > best) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
      bestEl.textContent = best;
      setStatus(`Time's up! New best score: ${score}! 🎉`, "good");
    } else {
      setStatus(`Time's up! Final score: ${score}.`);
    }
  }

  startBtn.addEventListener("click", start);
  buildBoard();
})();
