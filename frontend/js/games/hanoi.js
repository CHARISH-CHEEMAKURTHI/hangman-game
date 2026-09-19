(function () {
  const pegsEl = document.getElementById("pegs");
  const movesEl = document.getElementById("moves");
  const minMovesEl = document.getElementById("minMoves");
  const statusEl = document.getElementById("status");
  const COLORS = ["#ff6b6b", "#ffd166", "#2ecc71", "#00d2ff", "#6c5ce7", "#ff8f6c"];

  let numDisks = 3;
  let pegs; // array of 3 arrays, largest disk number at bottom (index 0)
  let selected = null;
  let moves = 0;
  let won = false;

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status-line" + (cls ? " " + cls : "");
  }

  function reset() {
    pegs = [[], [], []];
    for (let d = numDisks; d >= 1; d--) pegs[0].push(d);
    selected = null;
    moves = 0;
    won = false;
    movesEl.textContent = 0;
    minMovesEl.textContent = Math.pow(2, numDisks) - 1;
    setStatus("Move all disks to the last peg. Click a peg to pick up, click another to drop.");
    render();
  }

  function render() {
    pegsEl.innerHTML = "";
    pegs.forEach((peg, i) => {
      const pegEl = document.createElement("div");
      pegEl.className = "hanoi-peg" + (selected === i ? " selected" : "");
      const base = document.createElement("div");
      base.className = "hanoi-base";
      pegEl.appendChild(base);
      peg.forEach((disk) => {
        const diskEl = document.createElement("div");
        diskEl.className = "hanoi-disk";
        const widthPct = 30 + (disk / numDisks) * 65;
        diskEl.style.width = widthPct + "%";
        diskEl.style.background = COLORS[(disk - 1) % COLORS.length];
        pegEl.appendChild(diskEl);
      });
      pegEl.addEventListener("click", () => onPegClick(i));
      pegsEl.appendChild(pegEl);
    });
  }

  function onPegClick(i) {
    if (won) return;
    if (selected === null) {
      if (pegs[i].length === 0) return;
      selected = i;
    } else if (selected === i) {
      selected = null;
    } else {
      const fromPeg = pegs[selected];
      const disk = fromPeg[fromPeg.length - 1];
      const toPeg = pegs[i];
      const topOfTo = toPeg[toPeg.length - 1];
      if (topOfTo === undefined || disk < topOfTo) {
        fromPeg.pop();
        toPeg.push(disk);
        moves++;
        movesEl.textContent = moves;
        selected = null;
        if (pegs[2].length === numDisks) {
          won = true;
          const minMoves = Math.pow(2, numDisks) - 1;
          setStatus(
            moves === minMoves
              ? `Perfect! Solved in the minimum ${moves} moves! 🎉`
              : `Solved in ${moves} moves (minimum is ${minMoves}).`,
            "good"
          );
        }
      } else {
        setStatus("You can't place a larger disk on a smaller one.", "bad");
        selected = null;
      }
    }
    render();
  }

  document.querySelectorAll(".mode-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".mode-tabs button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      numDisks = parseInt(btn.dataset.n, 10);
      reset();
    });
  });

  document.getElementById("restartBtn").addEventListener("click", reset);

  reset();
})();
