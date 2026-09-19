(function () {
  const boardEl = document.getElementById("board");
  const numpadEl = document.getElementById("numpad");
  const statusEl = document.getElementById("status");
  const GIVENS = { easy: 42, medium: 34, hard: 27 };

  let level = "easy";
  let solution, puzzle, given, entries, selected;

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status-line" + (cls ? " " + cls : "");
  }

  function emptyGrid() {
    return Array.from({ length: 9 }, () => Array(9).fill(0));
  }

  function shuffledRange(n) {
    const arr = Array.from({ length: n }, (_, i) => i + 1);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function isValidPlacement(grid, r, c, v) {
    for (let i = 0; i < 9; i++) {
      if (grid[r][i] === v || grid[i][c] === v) return false;
    }
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        if (grid[br + dr][bc + dc] === v) return false;
      }
    }
    return true;
  }

  function fillGrid(grid) {
    for (let i = 0; i < 81; i++) {
      const r = Math.floor(i / 9);
      const c = i % 9;
      if (grid[r][c] !== 0) continue;
      for (const v of shuffledRange(9)) {
        if (isValidPlacement(grid, r, c, v)) {
          grid[r][c] = v;
          if (fillGrid(grid)) return true;
          grid[r][c] = 0;
        }
      }
      return false;
    }
    return true;
  }

  function countSolutions(grid, limit) {
    let count = 0;
    function solve() {
      if (count >= limit) return;
      for (let i = 0; i < 81; i++) {
        const r = Math.floor(i / 9);
        const c = i % 9;
        if (grid[r][c] === 0) {
          for (let v = 1; v <= 9; v++) {
            if (isValidPlacement(grid, r, c, v)) {
              grid[r][c] = v;
              solve();
              grid[r][c] = 0;
              if (count >= limit) return;
            }
          }
          return;
        }
      }
      count++;
    }
    solve();
    return count;
  }

  function generatePuzzle(targetGivens) {
    const full = emptyGrid();
    fillGrid(full);
    const grid = full.map((row) => row.slice());

    const cells = [];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) cells.push([r, c]);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    let filledCount = 81;
    for (const [r, c] of cells) {
      if (filledCount <= targetGivens) break;
      const backup = grid[r][c];
      grid[r][c] = 0;
      const testGrid = grid.map((row) => row.slice());
      if (countSolutions(testGrid, 2) === 1) {
        filledCount--;
      } else {
        grid[r][c] = backup;
      }
    }
    return { puzzle: grid, solution: full };
  }

  function reset() {
    setStatus("Generating a new puzzle...");
    setTimeout(() => {
      const result = generatePuzzle(GIVENS[level]);
      puzzle = result.puzzle;
      solution = result.solution;
      given = puzzle.map((row) => row.map((v) => v !== 0));
      entries = puzzle.map((row) => row.slice());
      selected = null;
      setStatus("Fill every row, column and 3x3 box with 1-9.");
      render();
    }, 10);
  }

  function render() {
    boardEl.innerHTML = "";
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const el = document.createElement("div");
        el.className = "sudoku-cell";
        if (given[r][c]) el.classList.add("given");
        if (c % 3 === 2 && c !== 8) el.classList.add("border-right");
        if (r % 3 === 2 && r !== 8) el.classList.add("border-bottom");
        if (selected && selected[0] === r && selected[1] === c) el.classList.add("selected");
        const v = entries[r][c];
        if (v !== 0) {
          el.textContent = v;
          if (!given[r][c] && v !== solution[r][c]) el.classList.add("error");
        }
        el.addEventListener("click", () => {
          if (given[r][c]) return;
          selected = [r, c];
          render();
        });
        boardEl.appendChild(el);
      }
    }
  }

  function setValue(v) {
    if (!selected) return;
    const [r, c] = selected;
    if (given[r][c]) return;
    entries[r][c] = v;
    render();
    if (entries.every((row, ri) => row.every((val, ci) => val === solution[ri][ci]))) {
      setStatus("Solved! 🎉", "good");
    }
  }

  function buildNumpad() {
    numpadEl.innerHTML = "";
    for (let v = 1; v <= 9; v++) {
      const btn = document.createElement("button");
      btn.textContent = v;
      btn.addEventListener("click", () => setValue(v));
      numpadEl.appendChild(btn);
    }
  }

  window.addEventListener("keydown", (e) => {
    if (e.key >= "1" && e.key <= "9") setValue(parseInt(e.key, 10));
    if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") setValue(0);
  });

  document.getElementById("eraseBtn").addEventListener("click", () => setValue(0));
  document.getElementById("checkBtn").addEventListener("click", () => {
    const hasEmpty = entries.some((row) => row.some((v) => v === 0));
    const hasError = entries.some((row, r) => row.some((v, c) => v !== 0 && v !== solution[r][c]));
    if (hasError) setStatus("There are some mistakes — cells in red.", "bad");
    else if (hasEmpty) setStatus("No mistakes so far — keep going!", "good");
    else setStatus("Solved! 🎉", "good");
  });
  document.getElementById("newGameBtn").addEventListener("click", reset);

  document.querySelectorAll(".mode-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".mode-tabs button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      level = btn.dataset.level;
      reset();
    });
  });

  buildNumpad();
  reset();
})();
