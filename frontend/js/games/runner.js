(function () {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const statusEl = document.getElementById("status");

  const LANES = 3;
  const LANE_W = W / LANES;
  const PLAYER_Y = H - 90;
  const JUMP_MS = 480;
  const DUCK_MS = 480;
  const BEST_KEY = "mgp_runner_best";

  let best = parseInt(localStorage.getItem(BEST_KEY) || "0", 10);
  bestEl.textContent = best;

  let player, obstacles, coins, speed, distance, score, running, over, lastTime, spawnTimer;

  function laneX(lane) {
    return lane * LANE_W + LANE_W / 2;
  }

  function reset() {
    player = { lane: 1, jumpT: 0, duckT: 0 };
    obstacles = [];
    coins = [];
    speed = 220; // px/sec
    distance = 0;
    score = 0;
    running = false;
    over = false;
    spawnTimer = 0;
    scoreEl.textContent = 0;
    statusEl.textContent = "Arrow keys / WASD: switch lanes, jump, duck. Press Space to start.";
    draw();
  }

  function start() {
    if (running || over) return;
    running = true;
    statusEl.textContent = "Go!";
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function spawnWave() {
    const pattern = Math.random();
    if (pattern < 0.4) {
      const lane = Math.floor(Math.random() * LANES);
      const type = Math.random() < 0.5 ? "jump" : "duck";
      obstacles.push({ lane, y: -40, type });
    } else if (pattern < 0.7) {
      const blockedLane = Math.floor(Math.random() * LANES);
      for (let l = 0; l < LANES; l++) {
        if (l !== blockedLane) obstacles.push({ lane: l, y: -40, type: "train" });
      }
    } else {
      const lane = Math.floor(Math.random() * LANES);
      obstacles.push({ lane, y: -40, type: "train" });
    }
    if (Math.random() < 0.6) {
      const lane = Math.floor(Math.random() * LANES);
      coins.push({ lane, y: -100 });
    }
  }

  function update(dt) {
    distance += speed * dt;
    speed = 220 + Math.min(260, distance / 18);
    score = Math.floor(distance / 10);
    scoreEl.textContent = score;

    if (player.jumpT > 0) player.jumpT -= dt * 1000;
    if (player.duckT > 0) player.duckT -= dt * 1000;

    spawnTimer -= dt * 1000;
    if (spawnTimer <= 0) {
      spawnWave();
      spawnTimer = Math.max(550, 1050 - distance / 12);
    }

    const moveY = speed * dt;
    obstacles.forEach((o) => (o.y += moveY));
    coins.forEach((c) => (c.y += moveY));

    obstacles = obstacles.filter((o) => {
      if (o.y > H + 40) return false;
      if (Math.abs(o.y - PLAYER_Y) < 26 && o.lane === player.lane) {
        const jumping = player.jumpT > 0;
        const ducking = player.duckT > 0;
        const dodged = (o.type === "jump" && jumping) || (o.type === "duck" && ducking);
        if (!dodged) {
          endGame();
        }
      }
      return true;
    });

    coins = coins.filter((c) => {
      if (c.y > H + 40) return false;
      if (Math.abs(c.y - PLAYER_Y) < 26 && c.lane === player.lane) {
        score += 5;
        scoreEl.textContent = score;
        return false;
      }
      return true;
    });
  }

  function endGame() {
    running = false;
    over = true;
    if (score > best) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
      bestEl.textContent = best;
      statusEl.textContent = `New best score! ${score}. Press Space to try again.`;
    } else {
      statusEl.textContent = `Crashed! Score ${score}. Press Space to try again.`;
    }
  }

  function draw() {
    ctx.fillStyle = "#0b0e1c";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 2;
    for (let l = 1; l < LANES; l++) {
      ctx.beginPath();
      ctx.moveTo(l * LANE_W, 0);
      ctx.lineTo(l * LANE_W, H);
      ctx.stroke();
    }

    coins.forEach((c) => {
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(laneX(c.lane), c.y, 10, 0, Math.PI * 2);
      ctx.fill();
    });

    obstacles.forEach((o) => {
      if (o.type === "train") {
        ctx.fillStyle = "#ff6b6b";
        ctx.fillRect(laneX(o.lane) - LANE_W / 2 + 6, o.y - 60, LANE_W - 12, 90);
      } else if (o.type === "jump") {
        ctx.fillStyle = "#00d2ff";
        ctx.fillRect(laneX(o.lane) - 26, o.y - 12, 52, 24);
      } else {
        ctx.fillStyle = "#6c5ce7";
        ctx.fillRect(laneX(o.lane) - 30, o.y - 50, 60, 20);
      }
    });

    const jumping = player.jumpT > 0;
    const ducking = player.duckT > 0;
    const px = laneX(player.lane);
    const scale = jumping ? 1.25 : ducking ? 0.6 : 1;
    const h = 46 * scale;
    ctx.fillStyle = jumping ? "#a6ecff" : ducking ? "#c9c2ff" : "#00d2ff";
    ctx.fillRect(px - 18, PLAYER_Y - h, 36, h);

    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, W, H);
    }
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    update(dt);
    draw();
    if (running) requestAnimationFrame(loop);
    else draw();
  }

  function doJump() {
    if (!running) {
      start();
      return;
    }
    if (player.duckT <= 0) player.jumpT = JUMP_MS;
  }
  function doDuck() {
    if (!running) {
      start();
      return;
    }
    if (player.jumpT <= 0) player.duckT = DUCK_MS;
  }
  function moveLane(delta) {
    if (!running) {
      start();
      return;
    }
    player.lane = Math.max(0, Math.min(LANES - 1, player.lane + delta));
  }

  window.addEventListener("keydown", (e) => {
    const keyMap = {
      ArrowLeft: () => moveLane(-1), a: () => moveLane(-1),
      ArrowRight: () => moveLane(1), d: () => moveLane(1),
      ArrowUp: doJump, w: doJump, " ": doJump,
      ArrowDown: doDuck, s: doDuck,
    };
    if (keyMap[e.key]) {
      e.preventDefault();
      if (over) {
        reset();
        return;
      }
      keyMap[e.key]();
    }
  });

  document.querySelectorAll("#touchControls button").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (over) {
        reset();
        return;
      }
      const act = btn.dataset.act;
      if (act === "left") moveLane(-1);
      if (act === "right") moveLane(1);
      if (act === "jump") doJump();
      if (act === "duck") doDuck();
    });
  });

  document.getElementById("restartBtn").addEventListener("click", reset);

  reset();
})();
