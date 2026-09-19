(function () {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const statusEl = document.getElementById("status");
  const p1ScoreEl = document.getElementById("p1Score");
  const p2ScoreEl = document.getElementById("p2Score");
  const slider = document.getElementById("strikerSlider");
  const restartBtn = document.getElementById("restartBtn");

  const MARGIN = 34;
  const PLAY_MIN = MARGIN;
  const PLAY_MAX = W - MARGIN;
  const POCKET_R = 26;
  const COIN_R = 13;
  const STRIKER_R = 16;
  const FRICTION = 0.986;
  const STOP_SPEED = 0.06;
  const MAX_PULL = 130;
  const POWER_SCALE = 0.11;
  const BASELINE_Y = PLAY_MAX - 30;
  const BASELINE_RANGE = 90;

  const pockets = [
    { x: PLAY_MIN, y: PLAY_MIN },
    { x: PLAY_MAX, y: PLAY_MIN },
    { x: PLAY_MIN, y: PLAY_MAX },
    { x: PLAY_MAX, y: PLAY_MAX },
  ];

  let coins, striker, scores, turn, simulating, potThisShot, dragStart, dragging, gameOver;

  function makeCoins() {
    const list = [];
    const cx = W / 2;
    const cy = H / 2;
    list.push({ x: cx, y: cy, color: "queen", r: COIN_R, vx: 0, vy: 0, active: true });
    const ringR = COIN_R * 2.3;
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      list.push({
        x: cx + Math.cos(angle) * ringR,
        y: cy + Math.sin(angle) * ringR,
        color: i % 2 === 0 ? "black" : "white",
        r: COIN_R,
        vx: 0,
        vy: 0,
        active: true,
      });
    }
    return list;
  }

  function resetStriker() {
    striker = { x: W / 2, y: BASELINE_Y, r: STRIKER_R, vx: 0, vy: 0, active: true };
    slider.value = 0;
  }

  function reset() {
    coins = makeCoins();
    resetStriker();
    scores = [0, 0];
    turn = 0;
    simulating = false;
    potThisShot = [];
    dragging = false;
    gameOver = false;
    updateHud();
    statusEl.textContent = "Player 1's turn — position the striker, then drag back to shoot.";
    draw();
  }

  function updateHud() {
    p1ScoreEl.textContent = `Player 1: ${scores[0]}`;
    p2ScoreEl.textContent = `Player 2: ${scores[1]}`;
    p1ScoreEl.className = turn === 0 ? "active" : "";
    p2ScoreEl.className = turn === 1 ? "active" : "";
  }

  slider.addEventListener("input", () => {
    if (simulating || gameOver) return;
    striker.x = W / 2 + parseFloat(slider.value) * BASELINE_RANGE;
    draw();
  });

  function allCircles() {
    return [striker, ...coins.filter((c) => c.active)];
  }

  function speedOf(c) {
    return Math.hypot(c.vx, c.vy);
  }

  function stepPhysics() {
    const circles = allCircles();
    circles.forEach((c) => {
      c.x += c.vx;
      c.y += c.vy;
      c.vx *= FRICTION;
      c.vy *= FRICTION;
      if (speedOf(c) < STOP_SPEED) {
        c.vx = 0;
        c.vy = 0;
      }
    });

    for (let i = 0; i < circles.length; i++) {
      for (let j = i + 1; j < circles.length; j++) {
        resolveCollision(circles[i], circles[j]);
      }
    }

    circles.forEach((c) => {
      const minX = PLAY_MIN + c.r;
      const maxX = PLAY_MAX - c.r;
      const minY = PLAY_MIN + c.r;
      const maxY = PLAY_MAX - c.r;
      if (c.x < minX) {
        c.x = minX;
        c.vx *= -0.85;
      }
      if (c.x > maxX) {
        c.x = maxX;
        c.vx *= -0.85;
      }
      if (c.y < minY) {
        c.y = minY;
        c.vy *= -0.85;
      }
      if (c.y > maxY) {
        c.y = maxY;
        c.vy *= -0.85;
      }
    });

    for (const pocket of pockets) {
      for (const c of circles) {
        if (!c.active) continue;
        if (Math.hypot(c.x - pocket.x, c.y - pocket.y) < POCKET_R * 0.55) {
          c.active = false;
          c.vx = 0;
          c.vy = 0;
          potThisShot.push(c);
        }
      }
    }
  }

  function resolveCollision(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const minDist = a.r + b.r;
    if (dist >= minDist) return;

    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minDist - dist;
    a.x -= (nx * overlap) / 2;
    a.y -= (ny * overlap) / 2;
    b.x += (nx * overlap) / 2;
    b.y += (ny * overlap) / 2;

    const v1n = a.vx * nx + a.vy * ny;
    const v2n = b.vx * nx + b.vy * ny;
    const diff = v2n - v1n;
    a.vx += diff * nx;
    a.vy += diff * ny;
    b.vx -= diff * nx;
    b.vy -= diff * ny;
  }

  function allStopped() {
    return allCircles().every((c) => speedOf(c) < STOP_SPEED + 0.001);
  }

  function runSimulation() {
    simulating = true;
    function frame() {
      stepPhysics();
      draw();
      if (!allStopped()) {
        requestAnimationFrame(frame);
      } else {
        finishShot();
      }
    }
    requestAnimationFrame(frame);
  }

  function finishShot() {
    simulating = false;
    let scored = false;
    let strikerFoul = false;

    for (const c of potThisShot) {
      if (c === striker) {
        strikerFoul = true;
        continue;
      }
      scored = true;
      scores[turn] += c.color === "queen" ? 3 : 1;
    }
    potThisShot = [];

    if (!striker.active) {
      strikerFoul = true;
      striker.active = true;
    }

    const remaining = coins.filter((c) => c.active).length;
    if (remaining === 0) {
      gameOver = true;
      resetStriker();
      updateHud();
      const winner = scores[0] === scores[1] ? "It's a tie!" : scores[0] > scores[1] ? "Player 1 wins!" : "Player 2 wins!";
      statusEl.textContent = `All coins pocketed — ${winner}`;
      draw();
      return;
    }

    resetStriker();

    if (strikerFoul) {
      statusEl.textContent = "Foul! Striker pocketed — turn passes.";
      turn = 1 - turn;
    } else if (scored) {
      statusEl.textContent = `Player ${turn + 1} scores and shoots again!`;
    } else {
      statusEl.textContent = `Player ${turn === 0 ? 2 : 1}'s turn.`;
      turn = 1 - turn;
    }
    updateHud();
    draw();
  }

  function draw() {
    ctx.fillStyle = "#3a2a1c";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#d9b88a";
    ctx.fillRect(MARGIN - 8, MARGIN - 8, W - (MARGIN - 8) * 2, H - (MARGIN - 8) * 2);
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(PLAY_MIN, PLAY_MIN, PLAY_MAX - PLAY_MIN, PLAY_MAX - PLAY_MIN);

    ctx.fillStyle = "#1c140c";
    pockets.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, POCKET_R, 0, Math.PI * 2);
      ctx.fill();
    });

    coins.forEach((c) => {
      if (!c.active) return;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fillStyle = c.color === "queen" ? "#e63946" : c.color === "black" ? "#111" : "#f4f1de";
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.stroke();
    });

    if (striker.active) {
      ctx.beginPath();
      ctx.arc(striker.x, striker.y, striker.r, 0, Math.PI * 2);
      ctx.fillStyle = "#ffe066";
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.stroke();
    }

    if (dragging && dragStart) {
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(striker.x, striker.y);
      ctx.lineTo(dragStart.curX, dragStart.curY);
      ctx.stroke();
    }
  }

  function canvasPos(evt) {
    const rect = canvas.getBoundingClientRect();
    const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
    const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * W,
      y: ((clientY - rect.top) / rect.height) * H,
    };
  }

  function onDragStart(evt) {
    if (simulating || gameOver) return;
    const pos = canvasPos(evt);
    dragging = true;
    dragStart = { x: pos.x, y: pos.y, curX: pos.x, curY: pos.y };
  }

  function onDragMove(evt) {
    if (!dragging) return;
    const pos = canvasPos(evt);
    dragStart.curX = pos.x;
    dragStart.curY = pos.y;
    draw();
  }

  function onDragEnd() {
    if (!dragging) return;
    dragging = false;
    const dx = dragStart.curX - striker.x;
    const dy = dragStart.curY - striker.y;
    const dist = Math.min(Math.hypot(dx, dy), MAX_PULL);
    if (dist > 6) {
      const angle = Math.atan2(dy, dx);
      const power = dist * POWER_SCALE;
      striker.vx = -Math.cos(angle) * power;
      striker.vy = -Math.sin(angle) * power;
      statusEl.textContent = "Shooting...";
      runSimulation();
    }
    dragStart = null;
    draw();
  }

  canvas.addEventListener("mousedown", onDragStart);
  canvas.addEventListener("mousemove", onDragMove);
  window.addEventListener("mouseup", onDragEnd);
  canvas.addEventListener("touchstart", onDragStart, { passive: true });
  canvas.addEventListener("touchmove", onDragMove, { passive: true });
  canvas.addEventListener("touchend", onDragEnd);

  restartBtn.addEventListener("click", reset);

  reset();
})();
