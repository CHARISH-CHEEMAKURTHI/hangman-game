(function () {
  const boardEl = document.getElementById("board");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const statusEl = document.getElementById("status");
  const BEST_KEY = "mgp_2048_best";
  const SIZE = 4;

  let grid, score, best, over, won, announcedWin;

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status-line" + (cls ? " " + cls : "");
  }

  function emptyGrid() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  }

  function reset() {
    grid = emptyGrid();
    score = 0;
    over = false;
    won = false;
    announcedWin = false;
    best = parseInt(localStorage.getItem(BEST_KEY) || "0", 10);
    addRandomTile();
    addRandomTile();
    setStatus("Use arrow keys / WASD or swipe to merge tiles.");
    render();
  }

  function addRandomTile() {
    const empties = [];
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (grid[r][c] === 0) empties.push([r, c]);
    if (empties.length === 0) return;
    const [r, c] = empties[Math.floor(Math.random() * empties.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  function render() {
    boardEl.innerHTML = "";
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = document.createElement("div");
        cell.className = "g2048-cell";
        const v = grid[r][c];
        if (v) {
          cell.textContent = v;
          cell.dataset.v = v;
        }
        boardEl.appendChild(cell);
      }
    }
    scoreEl.textContent = score;
    bestEl.textContent = Math.max(best, score);
  }

  function slideLine(line) {
    const vals = line.filter((v) => v !== 0);
    const merged = [];
    let gained = 0;
    for (let i = 0; i < vals.length; i++) {
      if (i < vals.length - 1 && vals[i] === vals[i + 1]) {
        const mergedVal = vals[i] * 2;
        merged.push(mergedVal);
        gained += mergedVal;
        if (mergedVal === 2048) won = true;
        i++;
      } else {
        merged.push(vals[i]);
      }
    }
    while (merged.length < SIZE) merged.push(0);
    return { line: merged, gained };
  }

  function transpose(g) {
    return g[0].map((_, c) => g.map((row) => row[c]));
  }

  function move(dir) {
    if (over) return;
    let moved = false;
    let gainedTotal = 0;
    let working = grid.map((row) => row.slice());

    if (dir === "left" || dir === "right") {
      working = working.map((row) => {
        const input = dir === "right" ? row.slice().reverse() : row;
        const { line, gained } = slideLine(input);
        gainedTotal += gained;
        return dir === "right" ? line.reverse() : line;
      });
    } else {
      let t = transpose(working);
      t = t.map((row) => {
        const input = dir === "down" ? row.slice().reverse() : row;
        const { line, gained } = slideLine(input);
        gainedTotal += gained;
        return dir === "down" ? line.reverse() : line;
      });
      working = transpose(t);
    }

    moved = JSON.stringify(working) !== JSON.stringify(grid);
    if (!moved) return;

    grid = working;
    score += gainedTotal;
    addRandomTile();
    render();

    if (won && !announcedWin) {
      announcedWin = true;
      setStatus("You reached 2048! Keep going for a higher score.", "good");
    }

    if (!canMove()) {
      over = true;
      if (score > best) {
        best = score;
        localStorage.setItem(BEST_KEY, String(best));
      }
      setStatus(`Game over! Final score ${score}. Press Restart to try again.`, "bad");
    }
  }

  function canMove() {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (grid[r][c] === 0) return true;
        if (c < SIZE - 1 && grid[r][c] === grid[r][c + 1]) return true;
        if (r < SIZE - 1 && grid[r][c] === grid[r + 1][c]) return true;
      }
    }
    return false;
  }

  window.addEventListener("keydown", (e) => {
    const map = {
      ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
      a: "left", d: "right", w: "up", s: "down",
    };
    if (map[e.key]) {
      e.preventDefault();
      move(map[e.key]);
    }
  });

  let touchStart = null;
  boardEl.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  boardEl.addEventListener("touchend", (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 20) {
      if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
      else move(dy > 0 ? "down" : "up");
    }
    touchStart = null;
  });

  document.getElementById("restartBtn").addEventListener("click", reset);

  reset();
})();
