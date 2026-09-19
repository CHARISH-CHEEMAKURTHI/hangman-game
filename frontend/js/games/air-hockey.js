(function () {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const statusEl = document.getElementById("status");
  const score1El = document.getElementById("score1");
  const score2El = document.getElementById("score2");

  const MALLET_R = 26;
  const PUCK_R = 14;
  const GOAL_HALF = 65;
  const MALLET_SPEED = 5.5;
  const FRICTION = 0.992;
  const WIN_SCORE = 7;

  let p1, p2, puck, score1, score2, running, over, keys = {};

  function reset() {
    p1 = { x: W / 2, y: H - 70, vx: 0, vy: 0 };
    p2 = { x: W / 2, y: 70, vx: 0, vy: 0 };
    puck = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
    score1 = 0;
    score2 = 0;
    running = false;
    over = false;
    score1El.textContent = score1;
    score2El.textContent = score2;
    setStatus("Player 1 (bottom): WASD   Player 2 (top): Arrow keys. Press Space to start.");
    draw();
  }

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status-line" + (cls ? " " + cls : "");
  }

  function start() {
    if (running || over) return;
    running = true;
    setStatus("Go!");
    launchPuck();
    requestAnimationFrame(loop);
  }

  function launchPuck() {
    const angle = Math.random() * Math.PI * 2;
    puck.x = W / 2;
    puck.y = H / 2;
    puck.vx = Math.cos(angle) * 3;
    puck.vy = Math.sin(angle) * 3;
  }

  function movemallet(m, dx, dy, minY, maxY) {
    m.vx = dx * MALLET_SPEED;
    m.vy = dy * MALLET_SPEED;
    m.x = Math.max(MALLET_R, Math.min(W - MALLET_R, m.x + m.vx));
    m.y = Math.max(minY, Math.min(maxY, m.y + m.vy));
  }

  function update() {
    let dx1 = 0, dy1 = 0;
    if (keys["a"]) dx1 -= 1;
    if (keys["d"]) dx1 += 1;
    if (keys["w"]) dy1 -= 1;
    if (keys["s"]) dy1 += 1;
    movemallet(p1, dx1, dy1, H / 2 + MALLET_R, H - MALLET_R);

    let dx2 = 0, dy2 = 0;
    if (keys["ArrowLeft"]) dx2 -= 1;
    if (keys["ArrowRight"]) dx2 += 1;
    if (keys["ArrowUp"]) dy2 -= 1;
    if (keys["ArrowDown"]) dy2 += 1;
    movemallet(p2, dx2, dy2, MALLET_R, H / 2 - MALLET_R);

    puck.x += puck.vx;
    puck.y += puck.vy;
    puck.vx *= FRICTION;
    puck.vy *= FRICTION;

    if (puck.x < PUCK_R) {
      puck.x = PUCK_R;
      puck.vx *= -1;
    }
    if (puck.x > W - PUCK_R) {
      puck.x = W - PUCK_R;
      puck.vx *= -1;
    }

    if (puck.y < PUCK_R) {
      if (Math.abs(puck.x - W / 2) < GOAL_HALF) {
        score1++;
        score1El.textContent = score1;
        afterGoal();
        return;
      }
      puck.y = PUCK_R;
      puck.vy *= -1;
    }
    if (puck.y > H - PUCK_R) {
      if (Math.abs(puck.x - W / 2) < GOAL_HALF) {
        score2++;
        score2El.textContent = score2;
        afterGoal();
        return;
      }
      puck.y = H - PUCK_R;
      puck.vy *= -1;
    }

    [p1, p2].forEach((m) => {
      const dx = puck.x - m.x;
      const dy = puck.y - m.y;
      const dist = Math.hypot(dx, dy) || 0.001;
      const minDist = MALLET_R + PUCK_R;
      if (dist < minDist) {
        const nx = dx / dist;
        const ny = dy / dist;
        puck.x = m.x + nx * minDist;
        puck.y = m.y + ny * minDist;
        const speed = Math.hypot(puck.vx, puck.vy);
        const malletSpeed = Math.hypot(m.vx, m.vy);
        const newSpeed = Math.max(speed, 4) + malletSpeed * 0.5;
        puck.vx = nx * newSpeed;
        puck.vy = ny * newSpeed;
      }
    });
  }

  function afterGoal() {
    if (score1 >= WIN_SCORE || score2 >= WIN_SCORE) {
      endGame();
    } else {
      setTimeout(() => {
        if (!over) launchPuck();
      }, 500);
      puck.vx = 0;
      puck.vy = 0;
      puck.x = -100;
      puck.y = -100;
    }
  }

  function endGame() {
    running = false;
    over = true;
    const winner = score1 > score2 ? "Player 1" : "Player 2";
    setStatus(`${winner} wins ${Math.max(score1, score2)}-${Math.min(score1, score2)}! Press Restart.`, "good");
  }

  function draw() {
    ctx.fillStyle = "#0b1e3a";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 60, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(W / 2 - GOAL_HALF, 2);
    ctx.lineTo(W / 2 + GOAL_HALF, 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W / 2 - GOAL_HALF, H - 2);
    ctx.lineTo(W / 2 + GOAL_HALF, H - 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(p1.x, p1.y, MALLET_R, 0, Math.PI * 2);
    ctx.fillStyle = "#00d2ff";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p2.x, p2.y, MALLET_R, 0, Math.PI * 2);
    ctx.fillStyle = "#ff8f6c";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(puck.x, puck.y, PUCK_R, 0, Math.PI * 2);
    ctx.fillStyle = "#eef0fb";
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
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
    if (e.key === " ") start();
  });
  window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
  });

  document.getElementById("restartBtn").addEventListener("click", reset);

  reset();
})();
