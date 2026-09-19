(function () {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const GRID = 24;
  const CELLS = canvas.width / GRID;
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const statusEl = document.getElementById("status");

  const BEST_KEY = "mgp_snake_best";
  let best = parseInt(localStorage.getItem(BEST_KEY) || "0", 10);
  bestEl.textContent = best;

  let snake, dir, nextDir, food, score, running, tickMs, timer;

  function reset() {
    snake = [{ x: 8, y: 12 }, { x: 7, y: 12 }, { x: 6, y: 12 }];
    dir = { x: 1, y: 0 };
    nextDir = dir;
    score = 0;
    tickMs = 130;
    running = false;
    placeFood();
    scoreEl.textContent = score;
    statusEl.textContent = "Use arrow keys / WASD to move. Press Space to start.";
    draw();
  }

  function placeFood() {
    while (true) {
      const f = { x: Math.floor(Math.random() * CELLS), y: Math.floor(Math.random() * CELLS) };
      if (!snake.some((s) => s.x === f.x && s.y === f.y)) {
        food = f;
        return;
      }
    }
  }

  function start() {
    if (running) return;
    running = true;
    statusEl.textContent = "Go!";
    loop();
  }

  function loop() {
    if (!running) return;
    step();
    draw();
    timer = setTimeout(loop, tickMs);
  }

  function step() {
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    if (head.x < 0 || head.y < 0 || head.x >= CELLS || head.y >= CELLS || snake.some((s) => s.x === head.x && s.y === head.y)) {
      gameOver();
      return;
    }

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      scoreEl.textContent = score;
      tickMs = Math.max(60, tickMs - 3);
      placeFood();
    } else {
      snake.pop();
    }
  }

  function gameOver() {
    running = false;
    clearTimeout(timer);
    if (score > best) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
      bestEl.textContent = best;
      statusEl.textContent = `New best score! ${score}. Press Space to try again.`;
    } else {
      statusEl.textContent = `Game over — score ${score}. Press Space to try again.`;
    }
  }

  function draw() {
    ctx.fillStyle = "#0b0e1c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ff6b6b";
    ctx.beginPath();
    ctx.arc(food.x * GRID + GRID / 2, food.y * GRID + GRID / 2, GRID / 2.4, 0, Math.PI * 2);
    ctx.fill();

    snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? "#00d2ff" : "#6c5ce7";
      ctx.fillRect(s.x * GRID + 1, s.y * GRID + 1, GRID - 2, GRID - 2);
    });
  }

  function setDirection(x, y) {
    if (dir.x === -x && dir.y === -y) return; // no reversing into self
    nextDir = { x, y };
    start();
  }

  window.addEventListener("keydown", (e) => {
    const map = {
      ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
      w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
    };
    if (e.key === " ") {
      e.preventDefault();
      if (!running && score === 0) start();
      else if (!running) reset();
      return;
    }
    const m = map[e.key];
    if (m) {
      e.preventDefault();
      setDirection(m[0], m[1]);
    }
  });

  document.querySelectorAll("#touchControls button").forEach((btn) => {
    const map = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    btn.addEventListener("click", () => setDirection(...map[btn.dataset.dir]));
  });

  document.getElementById("restartBtn").addEventListener("click", () => {
    clearTimeout(timer);
    reset();
  });

  reset();
})();
