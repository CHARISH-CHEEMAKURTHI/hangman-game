(function () {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const scoreEl = document.getElementById("score");
  const livesEl = document.getElementById("lives");
  const bestEl = document.getElementById("best");
  const statusEl = document.getElementById("status");
  const BEST_KEY = "mgp_breakout_best";

  const PADDLE_W = 90;
  const PADDLE_H = 12;
  const BALL_R = 7;
  const ROWS = 5;
  const COLS = 8;
  const BRICK_W = 52;
  const BRICK_H = 20;
  const BRICK_GAP = 6;
  const BRICK_TOP = 40;

  let best = parseInt(localStorage.getItem(BEST_KEY) || "0", 10);
  bestEl.textContent = best;

  let paddleX, ball, bricks, score, lives, launched, over, running;

  function reset() {
    paddleX = W / 2 - PADDLE_W / 2;
    ball = { x: W / 2, y: H - 40, vx: 3, vy: -3 };
    bricks = [];
    const colors = ["#ff6b6b", "#ffd166", "#2ecc71", "#00d2ff", "#6c5ce7"];
    const totalWidth = COLS * (BRICK_W + BRICK_GAP) - BRICK_GAP;
    const startX = (W - totalWidth) / 2;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        bricks.push({
          x: startX + c * (BRICK_W + BRICK_GAP),
          y: BRICK_TOP + r * (BRICK_H + BRICK_GAP),
          alive: true,
          color: colors[r % colors.length],
        });
      }
    }
    score = 0;
    lives = 3;
    launched = false;
    over = false;
    running = false;
    scoreEl.textContent = score;
    livesEl.textContent = lives;
    setStatus("Move mouse / arrow keys to steer paddle. Click or press Space to launch.");
    draw();
  }

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status-line" + (cls ? " " + cls : "");
  }

  function launch() {
    if (launched || over) return;
    launched = true;
    running = true;
    requestAnimationFrame(loop);
  }

  function update() {
    if (!launched) {
      ball.x = paddleX + PADDLE_W / 2;
      ball.y = H - 40;
      return;
    }

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.x < BALL_R || ball.x > W - BALL_R) ball.vx *= -1;
    if (ball.y < BALL_R) ball.vy *= -1;

    if (ball.y > H - 30 - BALL_R && ball.y < H - 18 && ball.x > paddleX && ball.x < paddleX + PADDLE_W) {
      const hitPos = (ball.x - (paddleX + PADDLE_W / 2)) / (PADDLE_W / 2);
      const speed = Math.hypot(ball.vx, ball.vy);
      ball.vx = hitPos * speed;
      ball.vy = -Math.abs(ball.vy);
      const normSpeed = Math.hypot(ball.vx, ball.vy) || 1;
      ball.vx = (ball.vx / normSpeed) * Math.min(speed * 1.02, 8);
      ball.vy = (ball.vy / normSpeed) * Math.min(speed * 1.02, 8);
    }

    for (const b of bricks) {
      if (!b.alive) continue;
      if (ball.x > b.x && ball.x < b.x + BRICK_W && ball.y > b.y && ball.y < b.y + BRICK_H) {
        b.alive = false;
        ball.vy *= -1;
        score += 10;
        scoreEl.textContent = score;
        break;
      }
    }

    if (ball.y > H + BALL_R) {
      lives--;
      livesEl.textContent = lives;
      launched = false;
      if (lives <= 0) {
        endGame(false);
      }
    }

    if (bricks.every((b) => !b.alive)) {
      endGame(true);
    }
  }

  function endGame(didWin) {
    running = false;
    over = true;
    if (score > best) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
      bestEl.textContent = best;
    }
    setStatus(didWin ? `All bricks cleared! Score ${score}.` : `Game over. Score ${score}.`, didWin ? "good" : "bad");
  }

  function draw() {
    ctx.fillStyle = "#0b0e1c";
    ctx.fillRect(0, 0, W, H);

    bricks.forEach((b) => {
      if (!b.alive) return;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, BRICK_W, BRICK_H);
    });

    ctx.fillStyle = "#eef0fb";
    ctx.fillRect(paddleX, H - 30, PADDLE_W, PADDLE_H);

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fillStyle = "#00d2ff";
    ctx.fill();
  }

  function loop() {
    if (!running) return;
    update();
    draw();
    if (!over) requestAnimationFrame(loop);
    else draw();
  }

  function movePaddle(x) {
    paddleX = Math.max(0, Math.min(W - PADDLE_W, x - PADDLE_W / 2));
    if (!launched) draw();
  }

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    movePaddle(((e.clientX - rect.left) / rect.width) * W);
  });
  canvas.addEventListener("touchmove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const t = e.touches[0];
    movePaddle(((t.clientX - rect.left) / rect.width) * W);
  }, { passive: true });
  canvas.addEventListener("click", () => {
    if (over) reset();
    else launch();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === " ") {
      e.preventDefault();
      if (over) reset();
      else launch();
    }
    if (e.key === "ArrowLeft") paddleX = Math.max(0, paddleX - 25);
    if (e.key === "ArrowRight") paddleX = Math.min(W - PADDLE_W, paddleX + 25);
    if (!launched) draw();
  });

  document.getElementById("restartBtn").addEventListener("click", () => {
    running = false;
    reset();
  });

  reset();
})();
