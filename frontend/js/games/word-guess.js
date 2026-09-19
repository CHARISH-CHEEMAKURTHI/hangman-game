(function () {
  const WORDS = [
    "apple", "brave", "chess", "dream", "eagle", "flame", "grape", "house",
    "input", "joker", "knife", "lemon", "mango", "night", "ocean", "piano",
    "queen", "river", "stone", "tiger", "unity", "vivid", "water", "xenon",
    "yield", "zebra", "beach", "cloud", "drift", "earth", "fable", "ghost",
    "honey", "ivory", "jelly", "koala", "light", "magic", "noble", "olive",
  ];
  const WORD_LEN = 5;
  const MAX_TRIES = 6;
  const KEY_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

  const gridEl = document.getElementById("grid");
  const keyboardEl = document.getElementById("keyboard");
  const statusEl = document.getElementById("status");

  let answer, guesses, current, over, keyStates;

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status-line" + (cls ? " " + cls : "");
  }

  function reset() {
    answer = WORDS[Math.floor(Math.random() * WORDS.length)];
    guesses = [];
    current = "";
    over = false;
    keyStates = {};
    setStatus("Guess the 5-letter word in 6 tries.");
    renderGrid();
    renderKeyboard();
  }

  function evaluateGuess(guess) {
    const result = Array(WORD_LEN).fill("absent");
    const letterCount = {};
    for (const ch of answer) letterCount[ch] = (letterCount[ch] || 0) + 1;

    for (let i = 0; i < WORD_LEN; i++) {
      if (guess[i] === answer[i]) {
        result[i] = "correct";
        letterCount[guess[i]]--;
      }
    }
    for (let i = 0; i < WORD_LEN; i++) {
      if (result[i] === "correct") continue;
      const ch = guess[i];
      if (letterCount[ch] > 0) {
        result[i] = "present";
        letterCount[ch]--;
      }
    }
    return result;
  }

  function renderGrid() {
    gridEl.innerHTML = "";
    for (let r = 0; r < MAX_TRIES; r++) {
      const rowEl = document.createElement("div");
      rowEl.className = "wg-row";
      const word = guesses[r] ? guesses[r].word : r === guesses.length ? current : "";
      const result = guesses[r] ? guesses[r].result : null;
      for (let c = 0; c < WORD_LEN; c++) {
        const tile = document.createElement("div");
        tile.className = "wg-tile" + (result ? " " + result[c] : "");
        tile.textContent = word[c] || "";
        rowEl.appendChild(tile);
      }
      gridEl.appendChild(rowEl);
    }
  }

  function renderKeyboard() {
    keyboardEl.innerHTML = "";
    KEY_ROWS.forEach((row, i) => {
      const rowEl = document.createElement("div");
      rowEl.className = "wg-keyrow";
      if (i === 2) rowEl.appendChild(makeKey("Enter", "wide"));
      for (const ch of row) rowEl.appendChild(makeKey(ch));
      if (i === 2) rowEl.appendChild(makeKey("⌫", "wide"));
      keyboardEl.appendChild(rowEl);
    });
  }

  function makeKey(label, extraClass) {
    const btn = document.createElement("button");
    btn.textContent = label;
    if (extraClass) btn.classList.add(extraClass);
    const state = keyStates[label.toLowerCase()];
    if (state) btn.classList.add(state);
    btn.addEventListener("click", () => handleKey(label));
    return btn;
  }

  function handleKey(label) {
    if (over) return;
    if (label === "Enter") {
      submitGuess();
    } else if (label === "⌫") {
      current = current.slice(0, -1);
      renderGrid();
    } else if (/^[a-z]$/.test(label) && current.length < WORD_LEN) {
      current += label;
      renderGrid();
    }
  }

  function submitGuess() {
    if (current.length !== WORD_LEN) {
      setStatus("Not enough letters.", "bad");
      return;
    }
    const result = evaluateGuess(current);
    guesses.push({ word: current, result });

    for (let i = 0; i < WORD_LEN; i++) {
      const ch = current[i];
      const rank = { absent: 0, present: 1, correct: 2 };
      if (!keyStates[ch] || rank[result[i]] > rank[keyStates[ch]]) {
        keyStates[ch] = result[i];
      }
    }

    const won = current === answer;
    current = "";
    renderGrid();
    renderKeyboard();

    if (won) {
      over = true;
      setStatus(`You got it in ${guesses.length}/${MAX_TRIES}! 🎉`, "good");
    } else if (guesses.length >= MAX_TRIES) {
      over = true;
      setStatus(`Out of tries! The word was "${answer.toUpperCase()}".`, "bad");
    } else {
      setStatus(`${MAX_TRIES - guesses.length} tries left.`);
    }
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleKey("Enter");
    else if (e.key === "Backspace") handleKey("⌫");
    else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toLowerCase());
  });

  document.getElementById("restartBtn").addEventListener("click", reset);

  reset();
})();
