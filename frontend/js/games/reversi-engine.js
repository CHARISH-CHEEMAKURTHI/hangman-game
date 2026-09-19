/* Pure Reversi/Othello rules engine: legal move + flip detection and
 * automatic turn passing when a side has no legal moves. No DOM
 * dependency so it can be unit-tested under Node as well as used in the
 * browser.
 *
 * Board: 8x8, cell is 'w', 'b', or null.
 */
(function (root) {
  const DIRS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1],
  ];

  function initialState() {
    const board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[3][3] = "w";
    board[3][4] = "b";
    board[4][3] = "b";
    board[4][4] = "w";
    return { board, turn: "b" };
  }

  function inBounds(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  function cloneBoard(board) {
    return board.map((row) => row.slice());
  }

  function flipsForMove(board, r, c, color) {
    if (board[r][c] !== null) return [];
    const opponent = color === "w" ? "b" : "w";
    const allFlips = [];

    for (const [dr, dc] of DIRS) {
      const lineFlips = [];
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc) && board[nr][nc] === opponent) {
        lineFlips.push([nr, nc]);
        nr += dr;
        nc += dc;
      }
      if (lineFlips.length > 0 && inBounds(nr, nc) && board[nr][nc] === color) {
        allFlips.push(...lineFlips);
      }
    }
    return allFlips;
  }

  function legalMoves(state, color) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const flips = flipsForMove(state.board, r, c, color);
        if (flips.length > 0) moves.push({ r, c, flips });
      }
    }
    return moves;
  }

  function applyMove(state, move) {
    const newBoard = cloneBoard(state.board);
    const color = state.turn;
    newBoard[move.r][move.c] = color;
    for (const [fr, fc] of move.flips) {
      newBoard[fr][fc] = color;
    }

    const opponent = color === "w" ? "b" : "w";
    let turn = opponent;
    let passed = false;
    if (legalMoves({ board: newBoard, turn: opponent }, opponent).length === 0) {
      if (legalMoves({ board: newBoard, turn: color }, color).length > 0) {
        turn = color;
        passed = true;
      }
    }

    return { board: newBoard, turn, passed };
  }

  function counts(board) {
    let w = 0;
    let b = 0;
    board.forEach((row) =>
      row.forEach((v) => {
        if (v === "w") w++;
        if (v === "b") b++;
      })
    );
    return { w, b };
  }

  function getStatus(state) {
    const hasMoves = legalMoves(state, "w").length > 0 || legalMoves(state, "b").length > 0;
    if (hasMoves) return "normal";
    return "over";
  }

  const ReversiEngine = {
    initialState,
    cloneBoard,
    legalMoves,
    applyMove,
    counts,
    getStatus,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = ReversiEngine;
  } else {
    root.ReversiEngine = ReversiEngine;
  }
})(typeof window !== "undefined" ? window : globalThis);
