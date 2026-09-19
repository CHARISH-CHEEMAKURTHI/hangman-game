"""Tic-Tac-Toe authoritative game logic (3x3, 2 players)."""

WIN_LINES = [
    (0, 1, 2), (3, 4, 5), (6, 7, 8),
    (0, 3, 6), (1, 4, 7), (2, 5, 8),
    (0, 4, 8), (2, 4, 6),
]


def new_state(players):
    return {
        "board": [None] * 9,
        "turn": 0,
        "winner": None,
        "winning_line": None,
        "draw": False,
    }


def _check_winner(board):
    for line in WIN_LINES:
        a, b, c = line
        if board[a] is not None and board[a] == board[b] == board[c]:
            return board[a], line
    return None, None


def apply_move(state, player_index, move, players):
    if state.get("winner") or state.get("draw"):
        return state, "Game already finished"
    if player_index != state["turn"]:
        return state, "Not your turn"

    cell = move.get("cell")
    if not isinstance(cell, int) or cell < 0 or cell > 8:
        return state, "Invalid cell"
    if state["board"][cell] is not None:
        return state, "Cell already taken"

    mark = "X" if player_index == 0 else "O"
    state["board"][cell] = mark

    winner_mark, line = _check_winner(state["board"])
    if winner_mark:
        state["winner"] = player_index
        state["winning_line"] = list(line)
    elif all(v is not None for v in state["board"]):
        state["draw"] = True
    else:
        state["turn"] = 1 - state["turn"]

    return state, None


def is_finished(state):
    return bool(state.get("winner") is not None or state.get("draw"))
