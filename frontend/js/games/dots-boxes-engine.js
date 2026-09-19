/* Pure Dots and Boxes rules engine for an N x N grid of boxes.
 * No DOM dependency so it can be unit-tested under Node as well as used
 * in the browser.
 */
(function (root) {
  function initialState(size) {
    return {
      size,
      hEdges: Array.from({ length: size + 1 }, () => Array(size).fill(false)),
      vEdges: Array.from({ length: size }, () => Array(size + 1).fill(false)),
      boxOwner: Array.from({ length: size }, () => Array(size).fill(null)),
      scores: [0, 0],
      turn: 0,
    };
  }

  function boxComplete(state, r, c) {
    const { size } = state;
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    return state.hEdges[r][c] && state.hEdges[r + 1][c] && state.vEdges[r][c] && state.vEdges[r][c + 1];
  }

  function isEdgeDrawn(state, move) {
    const arr = move.type === "h" ? state.hEdges : state.vEdges;
    return arr[move.r][move.c];
  }

  function applyMove(state, move) {
    const arr = move.type === "h" ? state.hEdges : state.vEdges;
    arr[move.r][move.c] = true;

    let completed = 0;
    const mover = state.turn;
    if (move.type === "h") {
      if (boxComplete(state, move.r - 1, move.c)) {
        state.boxOwner[move.r - 1][move.c] = mover;
        completed++;
      }
      if (boxComplete(state, move.r, move.c)) {
        state.boxOwner[move.r][move.c] = mover;
        completed++;
      }
    } else {
      if (boxComplete(state, move.r, move.c - 1)) {
        state.boxOwner[move.r][move.c - 1] = mover;
        completed++;
      }
      if (boxComplete(state, move.r, move.c)) {
        state.boxOwner[move.r][move.c] = mover;
        completed++;
      }
    }

    state.scores[mover] += completed;
    if (completed === 0) {
      state.turn = 1 - mover;
    }
    return { state, completed };
  }

  function isFinished(state) {
    const totalBoxes = state.size * state.size;
    return state.scores[0] + state.scores[1] === totalBoxes;
  }

  const DotsAndBoxesEngine = { initialState, boxComplete, isEdgeDrawn, applyMove, isFinished };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = DotsAndBoxesEngine;
  } else {
    root.DotsAndBoxesEngine = DotsAndBoxesEngine;
  }
})(typeof window !== "undefined" ? window : globalThis);
