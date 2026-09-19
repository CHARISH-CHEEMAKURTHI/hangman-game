(function () {
  const boardEl = document.getElementById("board");
  const movesEl = document.getElementById("moves");
  const bestEl = document.getElementById("best");
  const statusEl = document.getElementById("status");
  const BEST_KEY = "mgp_slide_best";
  const SIZE = 4;

  let tiles; // array of 16, values 1-15 and 0 for blank
  let moves;
  let won;

  const best = localStorage.getItem(BEST_KEY);
  bestEl.textContent = best || "-";

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status-line" + (cls ? " " + cls : "");
  }

  function solvedTiles() {
    const arr = [];
    for (let i = 1; i < SIZE * SIZE; i++) arr.push(i);
    arr.push(0);
    return arr;
  }

  function isSolvable(arr) {
    const flat = arr.filter((v) => v !== 0);
    let inversions = 0;
    for (let i = 0; i < flat.length; i++) {
      for (let j = i + 1; j < flat.length; j++) {
        if (flat[i] > flat[j]) inversions++;
      }
    }
    const blankRow = Math.floor(arr.indexOf(0) / SIZE);
    const blankRowFromBottom = SIZE - blankRow;
    if (SIZE % 2 === 1) return inversions % 2 === 0;
    if (blankRowFromBottom % 2 === 0) return inversions % 2 === 1;
    return inversions % 2 === 0;
  }

  function shuffle() {
    let arr;
    do {
      arr = solvedTiles();
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    } while (!isSolvable(arr) || arr.every((v, i) => v === solvedTiles()[i]));
    return arr;
  }

  function reset() {
    tiles = shuffle();
    moves = 0;
    won = false;
    movesEl.textContent = 0;
    setStatus("Click a tile next to the blank space to slide it. Arrange 1-15 in order.");
    render();
  }

  function render() {
    boardEl.innerHTML = "";
    tiles.forEach((v, i) => {
      const el = document.createElement("div");
      el.className = "slide-tile" + (v === 0 ? " blank" : "");
      if (v !== 0) el.textContent = v;
      el.addEventListener("click", () => onTileClick(i));
      boardEl.appendChild(el);
    });
  }

  function onTileClick(i) {
    if (won) return;
    const blankIndex = tiles.indexOf(0);
    const row = Math.floor(i / SIZE);
    const col = i % SIZE;
    const blankRow = Math.floor(blankIndex / SIZE);
    const blankCol = blankIndex % SIZE;
    const adjacent = (row === blankRow && Math.abs(col - blankCol) === 1) || (col === blankCol && Math.abs(row - blankRow) === 1);
    if (!adjacent) return;

    [tiles[i], tiles[blankIndex]] = [tiles[blankIndex], tiles[i]];
    moves++;
    movesEl.textContent = moves;
    render();

    if (tiles.every((v, idx) => v === solvedTiles()[idx])) {
      won = true;
      const currentBest = parseInt(localStorage.getItem(BEST_KEY) || "999999", 10);
      if (moves < currentBest) {
        localStorage.setItem(BEST_KEY, String(moves));
        bestEl.textContent = moves;
        setStatus(`Solved in ${moves} moves — new best! 🎉`, "good");
      } else {
        setStatus(`Solved in ${moves} moves! 🎉`, "good");
      }
    }
  }

  document.getElementById("restartBtn").addEventListener("click", reset);

  reset();
})();
