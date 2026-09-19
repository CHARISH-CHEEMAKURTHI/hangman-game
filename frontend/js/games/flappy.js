(function () {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const statusEl = document.getElementById("status");
  const BEST_KEY = "mgp_flappy_best";

  const GRAVITY = 0.45;
  const FLAP_V = -7.6;
  const PIPE_W = 56;
  const GAP = 150;
  const PIPE_SPEED = 2.6;
  const PIPE_INTERVAL = 95;

  let best = parseInt(localStorage.getItem(BEST_KEY) || "0", 10);
  bestEl.textContent = best;

  let bird, pipes, score, frame, running, over;

  function reset() {
    bird = { y: H / 2, v: 0 };
    pipes = [];
    score = 0;
    frame = 0;
    running = false;
    over = false;
    scoreEl.textContent = 0;
    setStatus("Click, tap, or press Space to flap.");
    draw();
  }

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status-line" + (cls ? " " + cls : "");
  }

  function start() {
    if (over) {
      reset();
      return;
    }
    if (running) {
      flap();
      return;
    }
    running = true;
    setStatus("Go!");
    flap();
    requestAnimationFrame(loop);
  }

  function flap() {
    bird.v = FLAP_V;
  }

  function update() {
    frame++;
    bird.v += GRAVITY;
    bird.y += bird.v;

    if (frame % PIPE_INTERVAL === 0) {
      const top = 50 + Math.random() * (H - GAP - 160);
      pipes.push({ x: W, top, passed: false });
    }

    pipes.forEach((p) => (p.x -= PIPE_SPEED));
    pipes = pipes.filter((p) => p.x > -PIPE_W);

    for (const p of pipes) {
      if (!p.passed && p.x + PIPE_W < 60) {
        p.passed = true;
        score++;
        scoreEl.textContent = score;
      }
      const birdBox = { x: 60 - 12, y: bird.y - 12, w: 24, h: 24 };
      if (
        birdBox.x < p.x + PIPE_W &&
        birdBox.x + birdBox.w > p.x &&
        (birdBox.y < p.top || birdBox.y + birdBox.h > p.top + GAP)
      ) {
        endGame();
      }
    }

    if (bird.y > H - 14 || bird.y < 0) endGame();
  }

  function endGame() {
    running = false;
    over = true;
    if (score > best) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
      bestEl.textContent = best;
      setStatus(`New best! Score ${score}. Click to try again.`, "good");
    } else {
      setStatus(`Crashed! Score ${score}. Click to try again.`, "bad");
    }
  }

  function draw() {
    ctx.fillStyle = "#0b0e1c";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#2ecc71";
    pipes.forEach((p) => {
      ctx.fillRect(p.x, 0, PIPE_W, p.top);
      ctx.fillRect(p.x, p.top + GAP, PIPE_W, H - p.top - GAP);
    });

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(60, bird.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0b0e1c";
    ctx.beginPath();
    ctx.arc(66, bird.y - 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function loop() {
    if (!running) return;
    update();
    draw();
    if (running) requestAnimationFrame(loop);
    else draw();
  }

  canvas.addEventListener("click", start);
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    start();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === " ") {
      e.preventDefault();
      start();
    }
  });

  document.getElementById("restartBtn").addEventListener("click", reset);

  reset();
})();
