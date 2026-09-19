"""Connect Four authoritative game logic (7 columns x 6 rows, 2 players)."""

ROWS = 6
COLS = 7


def new_state(players):
    return {
        "board": [[None] * COLS for _ in range(ROWS)],
        "turn": 0,
        "winner": None,
        "winning_cells": None,
        "draw": False,
    }


def _drop_row(board, col):
    for row in range(ROWS - 1, -1, -1):
        if board[row][col] is None:
            return row
    return None


def _check_winner(board):
    directions = [(0, 1), (1, 0), (1, 1), (1, -1)]
    for r in range(ROWS):
        for c in range(COLS):
            mark = board[r][c]
            if mark is None:
                continue
            for dr, dc in directions:
                cells = [(r + dr * i, c + dc * i) for i in range(4)]
                if all(0 <= rr < ROWS and 0 <= cc < COLS for rr, cc in cells) and all(
                    board[rr][cc] == mark for rr, cc in cells
                ):
                    return mark, cells
    return None, None


def apply_move(state, player_index, move, players):
    if state.get("winner") is not None or state.get("draw"):
        return state, "Game already finished"
    if player_index != state["turn"]:
        return state, "Not your turn"

    col = move.get("col")
    if not isinstance(col, int) or col < 0 or col >= COLS:
        return state, "Invalid column"

    row = _drop_row(state["board"], col)
    if row is None:
        return state, "Column is full"

    mark = "R" if player_index == 0 else "Y"
    state["board"][row][col] = mark

    winner_mark, cells = _check_winner(state["board"])
    if winner_mark:
        state["winner"] = player_index
        state["winning_cells"] = cells
    elif all(state["board"][0][c] is not None for c in range(COLS)):
        state["draw"] = True
    else:
        state["turn"] = 1 - state["turn"]

    return state, None


def is_finished(state):
    return bool(state.get("winner") is not None or state.get("draw"))
