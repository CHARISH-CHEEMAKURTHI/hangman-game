(function () {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const scoreEl = document.getElementById("score");
  const livesEl = document.getElementById("lives");
  const waveEl = document.getElementById("wave");
  const bestEl = document.getElementById("best");
  const statusEl = document.getElementById("status");
  const BEST_KEY = "mgp_invaders_best";

  const PLAYER_W = 34;
  const PLAYER_SPEED = 4.5;
  const BULLET_SPEED = 7;
  const ENEMY_BULLET_SPEED = 4;
  const ROWS = 4;
  const COLS = 8;

  let best = parseInt(localStorage.getItem(BEST_KEY) || "0", 10);
  bestEl.textContent = best;

  let player, bullets, enemyBullets, enemies, score, lives, wave, dir, enemySpeed, keys = {}, running, over, fireTimer;

  function reset() {
    player = { x: W / 2 - PLAYER_W / 2, y: H - 40 };
    bullets = [];
    enemyBullets = [];
    score = 0;
    lives = 3;
    wave = 1;
    dir = 1;
    fireTimer = 0;
    running = false;
    over = false;
    scoreEl.textContent = 0;
    livesEl.textContent = lives;
    waveEl.textContent = wave;
    spawnWave();
    setStatus("Arrow keys / A-D to move, Space to shoot. Press Space to start.");
    draw();
  }

  function spawnWave() {
    enemies = [];
    enemySpeed = 0.6 + wave * 0.15;
    const startX = 50;
    const startY = 50;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        enemies.push({ x: startX + c * 44, y: startY + r * 40, alive: true });
      }
    }
    waveEl.textContent = wave;
  }

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status-line" + (cls ? " " + cls : "");
  }

  function start() {
    if (running || over) return;
    running = true;
    setStatus("Fight!");
    requestAnimationFrame(loop);
  }

  function update() {
    if (keys["ArrowLeft"] || keys["a"]) player.x -= PLAYER_SPEED;
    if (keys["ArrowRight"] || keys["d"]) player.x += PLAYER_SPEED;
    player.x = Math.max(0, Math.min(W - PLAYER_W, player.x));

    bullets.forEach((b) => (b.y -= BULLET_SPEED));
    bullets = bullets.filter((b) => b.y > -10);

    enemyBullets.forEach((b) => (b.y += ENEMY_BULLET_SPEED));
    enemyBullets = enemyBullets.filter((b) => b.y < H + 10);

    let hitEdge = false;
    const alive = enemies.filter((e) => e.alive);
    for (const e of alive) {
      e.x += enemySpeed * dir;
      if (e.x < 10 || e.x > W - 30) hitEdge = true;
    }
    if (hitEdge) {
      dir *= -1;
      alive.forEach((e) => (e.y += 16));
    }

    fireTimer--;
    if (fireTimer <= 0 && alive.length > 0) {
      const shooter = alive[Math.floor(Math.random() * alive.length)];
      enemyBullets.push({ x: shooter.x + 10, y: shooter.y + 16 });
      fireTimer = Math.max(20, 55 - wave * 5);
    }

    for (const b of bullets) {
      for (const e of alive) {
        if (e.alive && Math.abs(b.x - (e.x + 10)) < 14 && Math.abs(b.y - (e.y + 10)) < 14) {
          e.alive = false;
          b.hit = true;
          score += 15;
          scoreEl.textContent = score;
        }
      }
    }
    bullets = bullets.filter((b) => !b.hit);

    for (const b of enemyBullets) {
      if (Math.abs(b.x - (player.x + PLAYER_W / 2)) < 16 && Math.abs(b.y - player.y) < 14) {
        b.hit = true;
        loseLife();
      }
    }
    enemyBullets = enemyBullets.filter((b) => !b.hit);

    for (const e of alive) {
      if (e.y + 16 >= player.y) {
        loseLife();
        break;
      }
    }

    if (alive.length === 0) {
      wave++;
      spawnWave();
      setStatus(`Wave ${wave}!`, "good");
    }
  }

  function loseLife() {
    lives--;
    livesEl.textContent = lives;
    if (lives <= 0) endGame();
  }

  function endGame() {
    running = false;
    over = true;
    if (score > best) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
      bestEl.textContent = best;
    }
    setStatus(`Game over! Score ${score} at wave ${wave}. Press Restart.`, "bad");
  }

  function draw() {
    ctx.fillStyle = "#0b0e1c";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#00d2ff";
    ctx.fillRect(player.x, player.y, PLAYER_W, 14);
    ctx.fillRect(player.x + PLAYER_W / 2 - 3, player.y - 8, 6, 8);

    ctx.fillStyle = "#eef0fb";
    bullets.forEach((b) => ctx.fillRect(b.x - 2, b.y - 8, 4, 10));

    ctx.fillStyle = "#ff6b6b";
    enemyBullets.forEach((b) => ctx.fillRect(b.x - 2, b.y - 6, 4, 10));

    ctx.fillStyle = "#2ecc71";
    enemies.forEach((e) => {
      if (!e.alive) return;
      ctx.fillRect(e.x, e.y, 26, 18);
      ctx.fillStyle = "#0b0e1c";
      ctx.fillRect(e.x + 5, e.y + 5, 4, 4);
      ctx.fillRect(e.x + 17, e.y + 5, 4, 4);
      ctx.fillStyle = "#2ecc71";
    });
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
    if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
    if (e.key === " ") {
      if (!running && !over) start();
      else if (running) bullets.push({ x: player.x + PLAYER_W / 2, y: player.y });
      else if (over) reset();
    }
  });
  window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
  });

  document.getElementById("restartBtn").addEventListener("click", reset);

  reset();
})();
