(function () {
  const boardEl = document.getElementById("board");
  const statusEl = document.getElementById("status");
  const mineCountEl = document.getElementById("mineCount");
  const timerEl = document.getElementById("timer");

  const LEVELS = {
    easy: { size: 9, mines: 10 },
    medium: { size: 12, mines: 24 },
    hard: { size: 16, mines: 50 },
  };

  let level = "easy";
  let size, mineTotal;
  let cells; // {mine, revealed, flagged, adj}
  let firstClick, over, won, flagsPlaced, timerId, elapsed;

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status-line" + (cls ? " " + cls : "");
  }

  function reset() {
    const cfg = LEVELS[level];
    size = cfg.size;
    mineTotal = cfg.mines;
    cells = Array.from({ length: size * size }, () => ({ mine: false, revealed: false, flagged: false, adj: 0 }));
    firstClick = true;
    over = false;
    won = false;
    flagsPlaced = 0;
    elapsed = 0;
    clearInterval(timerId);
    timerEl.textContent = "0";
    mineCountEl.textContent = mineTotal;
    setStatus("Left click to reveal, right click to flag.");
    boardEl.style.gridTemplateColumns = `repeat(${size}, 28px)`;
    render();
  }

  function idx(r, c) {
    return r * size + c;
  }

  function neighbors(r, c) {
    const list = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) list.push([nr, nc]);
      }
    }
    return list;
  }

  function placeMines(excludeIdx) {
    let placed = 0;
    while (placed < mineTotal) {
      const i = Math.floor(Math.random() * size * size);
      if (i === excludeIdx || cells[i].mine) continue;
      cells[i].mine = true;
      placed++;
    }
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (cells[idx(r, c)].mine) continue;
        cells[idx(r, c)].adj = neighbors(r, c).filter(([nr, nc]) => cells[idx(nr, nc)].mine).length;
      }
    }
  }

  function reveal(r, c) {
    const cell = cells[idx(r, c)];
    if (cell.revealed || cell.flagged) return;
    cell.revealed = true;
    if (cell.adj === 0 && !cell.mine) {
      neighbors(r, c).forEach(([nr, nc]) => reveal(nr, nc));
    }
  }

  function onCellClick(r, c) {
    if (over) return;
    const cell = cells[idx(r, c)];
    if (cell.flagged) return;

    if (firstClick) {
      placeMines(idx(r, c));
      firstClick = false;
      elapsed = 0;
      timerId = setInterval(() => {
        elapsed++;
        timerEl.textContent = elapsed;
      }, 1000);
    }

    if (cell.mine) {
      cell.revealed = true;
      endGame(false);
      return;
    }

    reveal(r, c);
    checkWin();
    render();
  }

  function onCellRightClick(r, c, evt) {
    evt.preventDefault();
    if (over) return;
    const cell = cells[idx(r, c)];
    if (cell.revealed) return;
    cell.flagged = !cell.flagged;
    flagsPlaced += cell.flagged ? 1 : -1;
    mineCountEl.textContent = mineTotal - flagsPlaced;
    render();
  }

  function checkWin() {
    const allSafeRevealed = cells.every((c) => c.mine || c.revealed);
    if (allSafeRevealed) endGame(true);
  }

  function endGame(didWin) {
    over = true;
    won = didWin;
    clearInterval(timerId);
    cells.forEach((c) => {
      if (c.mine) c.revealed = true;
    });
    setStatus(didWin ? `You cleared the board in ${elapsed}s! 🎉` : "Boom! You hit a mine.", didWin ? "good" : "bad");
    render();
  }

  function render() {
    boardEl.innerHTML = "";
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = cells[idx(r, c)];
        const el = document.createElement("div");
        el.className = "mine-cell";
        if (cell.revealed) {
          el.classList.add("revealed");
          if (cell.mine) {
            el.classList.add("mine");
            el.textContent = "💣";
          } else if (cell.adj > 0) {
            el.textContent = cell.adj;
            el.classList.add("n" + cell.adj);
          }
        } else if (cell.flagged) {
          el.classList.add("flag");
          el.textContent = "🚩";
        }
        el.addEventListener("click", () => onCellClick(r, c));
        el.addEventListener("contextmenu", (e) => onCellRightClick(r, c, e));
        boardEl.appendChild(el);
      }
    }
  }

  document.querySelectorAll(".mode-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".mode-tabs button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      level = btn.dataset.level;
      reset();
    });
  });

  document.getElementById("restartBtn").addEventListener("click", reset);

  reset();
})();
