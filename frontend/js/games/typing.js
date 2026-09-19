(function () {
  const TEXTS = [
    "the quick brown fox jumps over the lazy dog while the sun sets slowly behind the distant hills",
    "practice makes perfect when you keep trying even after making a few small mistakes along the way",
    "a good programmer writes code that other people can read and understand without much explanation",
    "the arcade hub brings together many small games so friends can play together on any device",
    "typing quickly and accurately takes patience and regular practice over many short daily sessions",
    "the chess engine calculates every legal move before deciding which piece to advance next turn",
    "rainy afternoons are perfect for board games cards and puzzles shared with family and friends",
    "success comes from consistent effort rather than a single burst of motivation that fades quickly",
  ];

  const textDisplay = document.getElementById("textDisplay");
  const input = document.getElementById("typingInput");
  const wpmEl = document.getElementById("wpm");
  const accuracyEl = document.getElementById("accuracy");
  const timerEl = document.getElementById("timer");
  const bestEl = document.getElementById("best");
  const statusEl = document.getElementById("status");
  const BEST_KEY = "mgp_typing_best_wpm";
  const DURATION = 60;

  let best = parseInt(localStorage.getItem(BEST_KEY) || "0", 10);
  bestEl.textContent = best;

  let text, startTime, timerId, timeLeft, totalTyped, totalErrors, finished;

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status-line" + (cls ? " " + cls : "");
  }

  function reset() {
    text = TEXTS[Math.floor(Math.random() * TEXTS.length)];
    startTime = null;
    clearInterval(timerId);
    timeLeft = DURATION;
    totalTyped = 0;
    totalErrors = 0;
    finished = false;
    timerEl.textContent = timeLeft;
    wpmEl.textContent = 0;
    accuracyEl.textContent = 100;
    input.value = "";
    input.disabled = false;
    setStatus("Start typing to begin the test.");
    renderText("");
    input.focus();
  }

  function renderText(typed) {
    let html = "";
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (i < typed.length) {
        html += `<span class="${typed[i] === ch ? "correct" : "wrong"}">${escapeHtml(ch)}</span>`;
      } else if (i === typed.length) {
        html += `<span class="current">${escapeHtml(ch)}</span>`;
      } else {
        html += escapeHtml(ch);
      }
    }
    textDisplay.innerHTML = html;
  }

  function escapeHtml(ch) {
    return ch === " " ? "&nbsp;" : ch.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
  }

  function updateStats(typed) {
    totalTyped = typed.length;
    totalErrors = 0;
    for (let i = 0; i < typed.length; i++) {
      if (typed[i] !== text[i]) totalErrors++;
    }
    const elapsedMin = Math.max((Date.now() - startTime) / 60000, 1 / 60);
    const wordsTyped = totalTyped / 5;
    const wpm = Math.max(0, Math.round(wordsTyped / elapsedMin));
    const accuracy = totalTyped > 0 ? Math.round(((totalTyped - totalErrors) / totalTyped) * 100) : 100;
    wpmEl.textContent = wpm;
    accuracyEl.textContent = accuracy;
    return wpm;
  }

  input.addEventListener("input", () => {
    if (finished) return;
    const typed = input.value;

    if (!startTime) {
      startTime = Date.now();
      setStatus("Go!", "good");
      timerId = setInterval(() => {
        timeLeft--;
        timerEl.textContent = timeLeft;
        if (timeLeft <= 0) finish();
      }, 1000);
    }

    renderText(typed);
    const wpm = updateStats(typed);

    if (typed === text) {
      finish(wpm);
    }
  });

  function finish(finalWpm) {
    if (finished) return;
    finished = true;
    clearInterval(timerId);
    input.disabled = true;
    const wpm = finalWpm !== undefined ? finalWpm : parseInt(wpmEl.textContent, 10);
    if (wpm > best) {
      best = wpm;
      localStorage.setItem(BEST_KEY, String(best));
      bestEl.textContent = best;
      setStatus(`New best! ${wpm} WPM at ${accuracyEl.textContent}% accuracy.`, "good");
    } else {
      setStatus(`Finished at ${wpm} WPM, ${accuracyEl.textContent}% accuracy.`, "good");
    }
  }

  document.getElementById("restartBtn").addEventListener("click", reset);

  reset();
})();
