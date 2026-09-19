/* Pure chess rules engine: move generation, check/checkmate/stalemate,
 * castling, en passant, promotion. No DOM dependency so it can be
 * unit-tested under Node as well as used directly in the browser.
 *
 * Board: 8x8 array, row 0 = rank 8 (black back rank), row 7 = rank 1
 * (white back rank), col 0 = file a, col 7 = file h.
 * Piece = two-char string: color ('w'/'b') + type ('P','N','B','R','Q','K').
 */
(function (root) {
  const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const BISHOP_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const QUEEN_DIRS = ROOK_DIRS.concat(BISHOP_DIRS);
  const KNIGHT_OFFSETS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];

  function initialState() {
    const board = Array.from({ length: 8 }, () => Array(8).fill(null));
    const backRank = ["R", "N", "B", "Q", "K", "B", "N", "R"];
    for (let c = 0; c < 8; c++) {
      board[0][c] = "b" + backRank[c];
      board[1][c] = "bP";
      board[6][c] = "wP";
      board[7][c] = "w" + backRank[c];
    }
    return {
      board,
      turn: "w",
      castling: { wK: true, wQ: true, bK: true, bQ: true },
      enPassant: null,
      lastMove: null,
    };
  }

  function inBounds(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  function cloneBoard(board) {
    return board.map((row) => row.slice());
  }

  function findKing(board, color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c] === color + "K") return { r, c };
      }
    }
    return null;
  }

  function isSquareAttacked(board, r, c, byColor) {
    const pawnDir = byColor === "w" ? 1 : -1;
    for (const dc of [-1, 1]) {
      const pr = r + pawnDir;
      const pc = c + dc;
      if (inBounds(pr, pc) && board[pr][pc] === byColor + "P") return true;
    }

    for (const [dr, dc] of KNIGHT_OFFSETS) {
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(nr, nc) && board[nr][nc] === byColor + "N") return true;
    }

    for (const [dr, dc] of QUEEN_DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(nr, nc) && board[nr][nc] === byColor + "K") return true;
    }

    for (const [dr, dc] of ROOK_DIRS) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc)) {
        const piece = board[nr][nc];
        if (piece) {
          if (piece[0] === byColor && (piece[1] === "R" || piece[1] === "Q")) return true;
          break;
        }
        nr += dr;
        nc += dc;
      }
    }

    for (const [dr, dc] of BISHOP_DIRS) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc)) {
        const piece = board[nr][nc];
        if (piece) {
          if (piece[0] === byColor && (piece[1] === "B" || piece[1] === "Q")) return true;
          break;
        }
        nr += dr;
        nc += dc;
      }
    }

    return false;
  }

  function isInCheck(board, color) {
    const king = findKing(board, color);
    if (!king) return false;
    return isSquareAttacked(board, king.r, king.c, color === "w" ? "b" : "w");
  }

  function pseudoMovesForPiece(state, r, c) {
    const { board } = state;
    const piece = board[r][c];
    if (!piece) return [];
    const color = piece[0];
    const type = piece[1];
    const moves = [];

    const addMove = (to, extra) => {
      moves.push(Object.assign({ from: { r, c }, to }, extra || {}));
    };

    if (type === "P") {
      const dir = color === "w" ? -1 : 1;
      const startRow = color === "w" ? 6 : 1;
      const promoRow = color === "w" ? 0 : 7;

      if (inBounds(r + dir, c) && !board[r + dir][c]) {
        if (r + dir === promoRow) addMove({ r: r + dir, c }, { promotion: "Q" });
        else addMove({ r: r + dir, c });

        if (r === startRow && !board[r + 2 * dir][c]) {
          addMove({ r: r + 2 * dir, c }, { doubleStep: true });
        }
      }

      for (const dc of [-1, 1]) {
        const nr = r + dir;
        const nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        const target = board[nr][nc];
        if (target && target[0] !== color) {
          if (nr === promoRow) addMove({ r: nr, c: nc }, { promotion: "Q", capture: true });
          else addMove({ r: nr, c: nc }, { capture: true });
        } else if (!target && state.enPassant && state.enPassant.r === nr && state.enPassant.c === nc) {
          addMove({ r: nr, c: nc }, { enPassant: true, capture: true });
        }
      }
    } else if (type === "N") {
      for (const [dr, dc] of KNIGHT_OFFSETS) {
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        const target = board[nr][nc];
        if (!target || target[0] !== color) addMove({ r: nr, c: nc }, { capture: !!target });
      }
    } else if (type === "K") {
      for (const [dr, dc] of QUEEN_DIRS) {
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        const target = board[nr][nc];
        if (!target || target[0] !== color) addMove({ r: nr, c: nc }, { capture: !!target });
      }

      const enemyColor = color === "w" ? "b" : "w";
      const homeRow = color === "w" ? 7 : 0;
      if (r === homeRow && c === 4 && !isInCheck(board, color)) {
        const canCastle = state.castling[color + "K"];
        if (canCastle && !board[homeRow][5] && !board[homeRow][6] && board[homeRow][7] === color + "R") {
          if (!isSquareAttacked(board, homeRow, 5, enemyColor) && !isSquareAttacked(board, homeRow, 6, enemyColor)) {
            addMove({ r: homeRow, c: 6 }, { castle: "K" });
          }
        }
        const canCastleQ = state.castling[color + "Q"];
        if (
          canCastleQ &&
          !board[homeRow][1] &&
          !board[homeRow][2] &&
          !board[homeRow][3] &&
          board[homeRow][0] === color + "R"
        ) {
          if (!isSquareAttacked(board, homeRow, 3, enemyColor) && !isSquareAttacked(board, homeRow, 2, enemyColor)) {
            addMove({ r: homeRow, c: 2 }, { castle: "Q" });
          }
        }
      }
    } else {
      const dirs = type === "R" ? ROOK_DIRS : type === "B" ? BISHOP_DIRS : QUEEN_DIRS;
      for (const [dr, dc] of dirs) {
        let nr = r + dr;
        let nc = c + dc;
        while (inBounds(nr, nc)) {
          const target = board[nr][nc];
          if (!target) {
            addMove({ r: nr, c: nc });
          } else {
            if (target[0] !== color) addMove({ r: nr, c: nc }, { capture: true });
            break;
          }
          nr += dr;
          nc += dc;
        }
      }
    }

    return moves;
  }

  function applyMove(state, move) {
    const { from, to, promotion } = move;
    const newBoard = cloneBoard(state.board);
    const piece = newBoard[from.r][from.c];
    const color = piece[0];
    const type = piece[1];

    if (move.enPassant) {
      const capturedRow = color === "w" ? to.r + 1 : to.r - 1;
      newBoard[capturedRow][to.c] = null;
    }

    newBoard[to.r][to.c] = piece;
    newBoard[from.r][from.c] = null;

    if (type === "P" && (to.r === 0 || to.r === 7)) {
      newBoard[to.r][to.c] = color + (promotion || "Q");
    }

    if (type === "K" && Math.abs(to.c - from.c) === 2) {
      const row = from.r;
      if (to.c === 6) {
        newBoard[row][5] = newBoard[row][7];
        newBoard[row][7] = null;
      } else {
        newBoard[row][3] = newBoard[row][0];
        newBoard[row][0] = null;
      }
    }

    const castling = Object.assign({}, state.castling);
    if (type === "K") {
      castling[color + "K"] = false;
      castling[color + "Q"] = false;
    }
    const clearRookRight = (r, c) => {
      if (r === 7 && c === 0) castling.wQ = false;
      if (r === 7 && c === 7) castling.wK = false;
      if (r === 0 && c === 0) castling.bQ = false;
      if (r === 0 && c === 7) castling.bK = false;
    };
    clearRookRight(from.r, from.c);
    clearRookRight(to.r, to.c);

    let enPassant = null;
    if (type === "P" && Math.abs(to.r - from.r) === 2) {
      enPassant = { r: (to.r + from.r) / 2, c: from.c };
    }

    return {
      board: newBoard,
      turn: color === "w" ? "b" : "w",
      castling,
      enPassant,
      lastMove: { from, to, promotion: promotion || null, piece },
    };
  }

  function legalMovesForPiece(state, r, c) {
    const piece = state.board[r][c];
    if (!piece) return [];
    const color = piece[0];
    const pseudo = pseudoMovesForPiece(state, r, c);
    return pseudo.filter((m) => {
      const next = applyMove(state, m);
      return !isInCheck(next.board, color);
    });
  }

  function allLegalMoves(state, color) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = state.board[r][c];
        if (piece && piece[0] === color) {
          moves.push(...legalMovesForPiece(state, r, c));
        }
      }
    }
    return moves;
  }

  function getStatus(state) {
    const color = state.turn;
    const inCheck = isInCheck(state.board, color);
    const moves = allLegalMoves(state, color);
    if (moves.length === 0) {
      return inCheck ? "checkmate" : "stalemate";
    }
    return inCheck ? "check" : "normal";
  }

  const ChessEngine = {
    initialState,
    cloneBoard,
    isInCheck,
    legalMovesForPiece,
    allLegalMoves,
    applyMove,
    getStatus,
    findKing,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = ChessEngine;
  } else {
    root.ChessEngine = ChessEngine;
  }
})(typeof window !== "undefined" ? window : globalThis);
