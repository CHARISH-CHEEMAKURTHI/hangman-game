(function () {
  const COLORS = ["green", "red", "yellow", "blue"];
  const pads = Array.from(document.querySelectorAll(".simon-pad"));
  const statusEl = document.getElementById("status");
  const roundEl = document.getElementById("round");
  const bestEl = document.getElementById("best");
  const startBtn = document.getElementById("startBtn");
  const BEST_KEY = "mgp_simon_best";

  let best = parseInt(localStorage.getItem(BEST_KEY) || "0", 10);
  bestEl.textContent = best;

  let sequence = [];
  let playerIndex = 0;
  let accepting = false;
  let playing = false;

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status-line" + (cls ? " " + cls : "");
  }

  function padFor(color) {
    return pads.find((p) => p.dataset.c === color);
  }

  function lightUp(color, duration) {
    return new Promise((resolve) => {
      const pad = padFor(color);
      pad.classList.add("lit");
      setTimeout(() => {
        pad.classList.remove("lit");
        setTimeout(resolve, 120);
      }, duration);
    });
  }

  async function playSequence() {
    accepting = false;
    setStatus("Watch closely...");
    await new Promise((r) => setTimeout(r, 400));
    for (const color of sequence) {
      await lightUp(color, Math.max(280, 500 - sequence.length * 10));
    }
    playerIndex = 0;
    accepting = true;
    setStatus("Your turn — repeat the sequence.", "good");
  }

  function nextRound() {
    sequence.push(COLORS[Math.floor(Math.random() * COLORS.length)]);
    roundEl.textContent = sequence.length;
    playSequence();
  }

  function start() {
    sequence = [];
    playing = true;
    nextRound();
  }

  function onPadClick(color) {
    if (!accepting || !playing) return;
    padFor(color).classList.add("lit");
    setTimeout(() => padFor(color).classList.remove("lit"), 200);

    if (color !== sequence[playerIndex]) {
      accepting = false;
      playing = false;
      if (sequence.length - 1 > best) {
        best = sequence.length - 1;
        localStorage.setItem(BEST_KEY, String(best));
        bestEl.textContent = best;
      }
      setStatus(`Wrong! You reached round ${sequence.length}. Press Start to try again.`, "bad");
      return;
    }

    playerIndex++;
    if (playerIndex === sequence.length) {
      accepting = false;
      setTimeout(nextRound, 700);
    }
  }

  pads.forEach((pad) => pad.addEventListener("click", () => onPadClick(pad.dataset.c)));
  startBtn.addEventListener("click", start);

  setStatus("Watch the sequence, then repeat it.");
})();
