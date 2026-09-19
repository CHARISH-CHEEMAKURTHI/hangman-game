(function () {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const statusEl = document.getElementById("status");
  const hp1El = document.getElementById("hp1");
  const hp2El = document.getElementById("hp2");
  const p2Label = document.getElementById("p2Label");

  const TANK_SIZE = 30;
  const TURN_RATE = 0.06;
  const MOVE_SPEED = 2.4;
  const BULLET_SPEED = 6.5;
  const FIRE_COOLDOWN = 25;
  const MAX_HP = 3;

  let mode = "local";
  let walls = [];
  let tanks = [];
  let bullets = [];
  let keys = {};
  let running = false;
  let gameOver = false;
  let aiState = { turnBias: Math.random() < 0.5 ? 1 : -1, retarget: 0 };

  function makeWalls() {
    return [
      { x: W / 2 - 12, y: 60, w: 24, h: 140 },
      { x: W / 2 - 12, y: H - 200, w: 24, h: 140 },
      { x: 160, y: H / 2 - 70, w: 140, h: 24 },
      { x: W - 300, y: H / 2 - 70, w: 140, h: 24 },
    ];
  }

  function makeTank(x, y, angle, color) {
    return { x, y, angle, color, cooldown: 0, hp: MAX_HP, invuln: 0, alive: true };
  }

  function reset() {
    walls = makeWalls();
    tanks = [makeTank(70, H / 2, 0, "#6cd0ff"), makeTank(W - 70, H / 2, Math.PI, "#ff8f6c")];
    bullets = [];
    running = false;
    gameOver = false;
    hp1El.textContent = MAX_HP;
    hp2El.textContent = MAX_HP;
    statusEl.textContent = "Press Space or click to begin!";
    draw();
  }

  function start() {
    if (running || gameOver) return;
    running = true;
    statusEl.textContent = "Fight!";
    requestAnimationFrame(loop);
  }

  function rectFromTank(t) {
    return { x: t.x - TANK_SIZE / 2, y: t.y - TANK_SIZE / 2, w: TANK_SIZE, h: TANK_SIZE };
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function canMoveTo(tank, nx, ny) {
    const box = { x: nx - TANK_SIZE / 2, y: ny - TANK_SIZE / 2, w: TANK_SIZE, h: TANK_SIZE };
    if (box.x < 0 || box.y < 0 || box.x + box.w > W || box.y + box.h > H) return false;
    for (const wall of walls) if (rectsOverlap(box, wall)) return false;
    for (const other of tanks) {
      if (other === tank || !other.alive) continue;
      const dx = nx - other.x;
      const dy = ny - other.y;
      if (Math.hypot(dx, dy) < TANK_SIZE) return false;
    }
    return true;
  }

  function tryMove(tank, forward) {
    const dist = forward * MOVE_SPEED;
    const nx = tank.x + Math.cos(tank.angle) * dist;
    const ny = tank.y + Math.sin(tank.angle) * dist;
    if (canMoveTo(tank, nx, ny)) {
      tank.x = nx;
      tank.y = ny;
    }
  }

  function fire(tank, ownerIndex) {
    if (tank.cooldown > 0 || !tank.alive) return;
    tank.cooldown = FIRE_COOLDOWN;
    bullets.push({
      x: tank.x + Math.cos(tank.angle) * (TANK_SIZE / 2 + 6),
      y: tank.y + Math.sin(tank.angle) * (TANK_SIZE / 2 + 6),
      vx: Math.cos(tank.angle) * BULLET_SPEED,
      vy: Math.sin(tank.angle) * BULLET_SPEED,
      owner: ownerIndex,
    });
  }

  function handleInput() {
    const t1 = tanks[0];
    if (t1.alive) {
      if (keys["a"]) t1.angle -= TURN_RATE;
      if (keys["d"]) t1.angle += TURN_RATE;
      if (keys["w"]) tryMove(t1, 1);
      if (keys["s"]) tryMove(t1, -1);
      if (keys["f"]) fire(t1, 0);
    }

    const t2 = tanks[1];
    if (mode === "local") {
      if (t2.alive) {
        if (keys["ArrowLeft"]) t2.angle -= TURN_RATE;
        if (keys["ArrowRight"]) t2.angle += TURN_RATE;
        if (keys["ArrowUp"]) tryMove(t2, 1);
        if (keys["ArrowDown"]) tryMove(t2, -1);
        if (keys["Enter"]) fire(t2, 1);
      }
    } else if (t2.alive) {
      runAi(t2, t1);
    }
  }

  function runAi(ai, target) {
    aiState.retarget--;
    const dx = target.x - ai.x;
    const dy = target.y - ai.y;
    const desiredAngle = Math.atan2(dy, dx);
    let diff = desiredAngle - ai.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    if (Math.abs(diff) > 0.05) {
      ai.angle += Math.sign(diff) * TURN_RATE;
    } else if (aiState.retarget <= 0) {
      ai.angle += aiState.turnBias * TURN_RATE * 0.6;
      if (Math.random() < 0.02) {
        aiState.turnBias *= -1;
        aiState.retarget = 30;
      }
    }

    const dist = Math.hypot(dx, dy);
    if (dist > 180) tryMove(ai, 1);
    else if (dist < 100) tryMove(ai, -1);

    if (Math.abs(diff) < 0.12 && dist < 420) fire(ai, 1);
  }

  function updateBullets() {
    bullets = bullets.filter((b) => {
      b.x += b.vx;
      b.y += b.vy;
      if (b.x < 0 || b.x > W || b.y < 0 || b.y > H) return false;
      for (const wall of walls) {
        if (b.x > wall.x && b.x < wall.x + wall.w && b.y > wall.y && b.y < wall.y + wall.h) return false;
      }
      for (let i = 0; i < tanks.length; i++) {
        const t = tanks[i];
        if (i === b.owner || !t.alive || t.invuln > 0) continue;
        if (Math.hypot(b.x - t.x, b.y - t.y) < TANK_SIZE / 2) {
          t.hp -= 1;
          t.invuln = 45;
          (i === 0 ? hp1El : hp2El).textContent = Math.max(t.hp, 0);
          if (t.hp <= 0) {
            t.alive = false;
            endGame(1 - i);
          }
          return false;
        }
      }
      return true;
    });
  }

  function endGame(winnerIndex) {
    running = false;
    gameOver = true;
    const name = winnerIndex === 0 ? "Player 1" : mode === "ai" ? "The AI" : "Player 2";
    statusEl.textContent = `${name} wins! Press Restart to play again.`;
  }

  function draw() {
    ctx.fillStyle = "#0b0e1c";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#232a52";
    walls.forEach((w) => ctx.fillRect(w.x, w.y, w.w, w.h));

    ctx.fillStyle = "#ffd166";
    bullets.forEach((b) => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    tanks.forEach((t) => {
      if (!t.alive) return;
      if (t.invuln > 0 && Math.floor(t.invuln / 4) % 2 === 0) return;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.angle);
      ctx.fillStyle = t.color;
      ctx.fillRect(-TANK_SIZE / 2, -TANK_SIZE / 2, TANK_SIZE, TANK_SIZE);
      ctx.fillStyle = "#0b0e1c";
      ctx.fillRect(0, -4, TANK_SIZE / 2 + 8, 8);
      ctx.restore();
    });
  }

  function loop() {
    if (!running) return;
    handleInput();
    tanks.forEach((t) => {
      if (t.cooldown > 0) t.cooldown--;
      if (t.invuln > 0) t.invuln--;
    });
    updateBullets();
    draw();
    if (running) requestAnimationFrame(loop);
  }

  window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Enter"].includes(e.key)) e.preventDefault();
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
      p2Label.childNodes[0].textContent = mode === "ai" ? "AI HP: " : "Player 2 HP: ";
      reset();
    });
  });

  reset();
})();
