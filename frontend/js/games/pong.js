(function () {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const statusEl = document.getElementById("status");
  const score1El = document.getElementById("score1");
  const score2El = document.getElementById("score2");

  const PADDLE_W = 12;
  const PADDLE_H = 80;
  const PADDLE_SPEED = 5.5;
  const WIN_SCORE = 7;

  let mode = "local";
  let p1y, p2y, ball, score1, score2, running, over, keys = {};

  function reset() {
    p1y = H / 2 - PADDLE_H / 2;
    p2y = H / 2 - PADDLE_H / 2;
    score1 = 0;
    score2 = 0;
    running = false;
    over = false;
    score1El.textContent = score1;
    score2El.textContent = score2;
    resetBall(Math.random() < 0.5 ? 1 : -1);
    setStatus("Player 1: W/S " + (mode === "local" ? "  Player 2: Arrow Up/Down" : " vs AI") + ". Press Space to start.");
    draw();
  }

  function resetBall(dir) {
    ball = { x: W / 2, y: H / 2, vx: 4 * dir, vy: (Math.random() * 4 - 2) };
  }

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status-line" + (cls ? " " + cls : "");
  }

  function start() {
    if (running || over) return;
    running = true;
    setStatus("Go!");
    requestAnimationFrame(loop);
  }

  function update() {
    if (keys["w"]) p1y -= PADDLE_SPEED;
    if (keys["s"]) p1y += PADDLE_SPEED;
    p1y = Math.max(0, Math.min(H - PADDLE_H, p1y));

    if (mode === "local") {
      if (keys["ArrowUp"]) p2y -= PADDLE_SPEED;
      if (keys["ArrowDown"]) p2y += PADDLE_SPEED;
    } else {
      const target = ball.y - PADDLE_H / 2;
      const diff = target - p2y;
      p2y += Math.sign(diff) * Math.min(Math.abs(diff), PADDLE_SPEED * 0.82);
    }
    p2y = Math.max(0, Math.min(H - PADDLE_H, p2y));

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.y < 7 || ball.y > H - 7) ball.vy *= -1;

    if (ball.x < 28 && ball.y > p1y && ball.y < p1y + PADDLE_H) {
      ball.vx = Math.abs(ball.vx) * 1.05;
      ball.vy += (ball.y - (p1y + PADDLE_H / 2)) * 0.08;
    }
    if (ball.x > W - 28 && ball.y > p2y && ball.y < p2y + PADDLE_H) {
      ball.vx = -Math.abs(ball.vx) * 1.05;
      ball.vy += (ball.y - (p2y + PADDLE_H / 2)) * 0.08;
    }

    if (ball.x < 0) {
      score2++;
      score2El.textContent = score2;
      checkWinOrContinue(-1);
    } else if (ball.x > W) {
      score1++;
      score1El.textContent = score1;
      checkWinOrContinue(1);
    }
  }

  function checkWinOrContinue(dir) {
    if (score1 >= WIN_SCORE || score2 >= WIN_SCORE) {
      endGame();
    } else {
      resetBall(dir);
    }
  }

  function endGame() {
    running = false;
    over = true;
    const winner = score1 > score2 ? "Player 1" : mode === "ai" ? "The AI" : "Player 2";
    setStatus(`${winner} wins ${Math.max(score1, score2)}-${Math.min(score1, score2)}! Press Restart.`, "good");
  }

  function draw() {
    ctx.fillStyle = "#0b0e1c";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#00d2ff";
    ctx.fillRect(16, p1y, PADDLE_W, PADDLE_H);
    ctx.fillStyle = "#ff8f6c";
    ctx.fillRect(W - 16 - PADDLE_W, p2y, PADDLE_W, PADDLE_H);

    ctx.fillStyle = "#eef0fb";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  function loop() {
    if (!running) return;
    update();
    draw();
    if (running) requestAnimationFrame(loop);
    else draw();
  }

  window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (["ArrowUp", "ArrowDown", " "].includes(e.key)) e.preventDefault();
    if (e.key === " ") start();
  });
  window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
  });
  canvas.addEventListener("click", start);

  document.getElementById("restartBtn").addEventListener("click", reset);

  document.querySelectorAll(".mode-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".mode-tabs button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      mode = btn.dataset.mode;
      reset();
    });
  });

  reset();
})();
