/* Pure checkers (American/English draughts) rules engine: mandatory
 * captures, multi-jump chains, and king promotion. No DOM dependency so
 * it can be unit-tested under Node as well as used in the browser.
 *
 * Board: 8x8, row 0 = top (black start), row 7 = bottom (white start).
 * Piece = color ('w'/'b') + type ('M' man, 'K' king). Pieces only occupy
 * dark squares where (r + c) is odd.
 */
(function (root) {
  function initialState() {
    const board = Array.from({ length: 8 }, () => Array(8).fill(null));
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 !== 1) continue;
        if (r < 3) board[r][c] = "bM";
        else if (r > 4) board[r][c] = "wM";
      }
    }
    return { board, turn: "w", mustContinueFrom: null };
  }

  function inBounds(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  function cloneBoard(board) {
    return board.map((row) => row.slice());
  }

  function forwardDirs(piece) {
    const color = piece[0];
    const type = piece[1];
    if (type === "K") return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    return color === "w" ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
  }

  function captureMovesForPiece(state, r, c) {
    const piece = state.board[r][c];
    if (!piece) return [];
    const color = piece[0];
    const moves = [];
    for (const [dr, dc] of forwardDirs(piece)) {
      const mr = r + dr;
      const mc = c + dc;
      const jr = r + dr * 2;
      const jc = c + dc * 2;
      if (!inBounds(jr, jc)) continue;
      const midPiece = state.board[mr] && state.board[mr][mc];
      if (midPiece && midPiece[0] !== color && !state.board[jr][jc]) {
        moves.push({ from: { r, c }, to: { r: jr, c: jc }, capture: { r: mr, c: mc } });
      }
    }
    return moves;
  }

  function simpleMovesForPiece(state, r, c) {
    const piece = state.board[r][c];
    if (!piece) return [];
    const moves = [];
    for (const [dr, dc] of forwardDirs(piece)) {
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(nr, nc) && !state.board[nr][nc]) {
        moves.push({ from: { r, c }, to: { r: nr, c: nc } });
      }
    }
    return moves;
  }

  function allCaptures(state, color) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = state.board[r][c];
        if (piece && piece[0] === color) moves.push(...captureMovesForPiece(state, r, c));
      }
    }
    return moves;
  }

  function legalMovesForPiece(state, r, c) {
    const piece = state.board[r][c];
    if (!piece || piece[0] !== state.turn) return [];

    if (state.mustContinueFrom) {
      if (state.mustContinueFrom.r !== r || state.mustContinueFrom.c !== c) return [];
      return captureMovesForPiece(state, r, c);
    }

    const anyCapture = allCaptures(state, state.turn).length > 0;
    if (anyCapture) return captureMovesForPiece(state, r, c);
    return simpleMovesForPiece(state, r, c);
  }

  function allLegalMoves(state, color) {
    const moves = [];
    if (state.mustContinueFrom && state.turn === color) {
      return captureMovesForPiece(state, state.mustContinueFrom.r, state.mustContinueFrom.c);
    }
    const anyCapture = allCaptures(state, color).length > 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = state.board[r][c];
        if (!piece || piece[0] !== color) continue;
        moves.push(...(anyCapture ? captureMovesForPiece(state, r, c) : simpleMovesForPiece(state, r, c)));
      }
    }
    return moves;
  }

  function applyMove(state, move) {
    const { from, to, capture } = move;
    const newBoard = cloneBoard(state.board);
    const piece = newBoard[from.r][from.c];
    newBoard[from.r][from.c] = null;

    let promoted = piece;
    if (piece[1] === "M") {
      const promoRow = piece[0] === "w" ? 0 : 7;
      if (to.r === promoRow) promoted = piece[0] + "K";
    }
    newBoard[to.r][to.c] = promoted;

    if (capture) {
      newBoard[capture.r][capture.c] = null;
    }

    let mustContinueFrom = null;
    let turn = state.turn === "w" ? "b" : "w";

    if (capture) {
      const nextState = { board: newBoard, turn: state.turn, mustContinueFrom: null };
      const furtherCaptures = captureMovesForPiece(nextState, to.r, to.c);
      if (furtherCaptures.length > 0) {
        mustContinueFrom = { r: to.r, c: to.c };
        turn = state.turn;
      }
    }

    return { board: newBoard, turn, mustContinueFrom };
  }

  function getStatus(state) {
    const color = state.turn;
    const hasPieces = state.board.some((row) => row.some((p) => p && p[0] === color));
    if (!hasPieces) return "loss";
    const moves = allLegalMoves(state, color);
    if (moves.length === 0) return "loss";
    return "normal";
  }

  const CheckersEngine = {
    initialState,
    cloneBoard,
    legalMovesForPiece,
    allLegalMoves,
    applyMove,
    getStatus,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = CheckersEngine;
  } else {
    root.CheckersEngine = CheckersEngine;
  }
})(typeof window !== "undefined" ? window : globalThis);
