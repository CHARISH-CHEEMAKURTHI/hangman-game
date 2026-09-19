"""Generic client-authoritative relay used for Chess online play.

The server only enforces whose turn it is and relays the move payload
verbatim to the other player; move legality is validated client-side by
the full chess engine in js/games/chess.js.
"""


def new_state(players):
    return {"turn": 0, "winner": None, "last_move": None}


def apply_move(state, player_index, move, players):
    if state.get("winner") is not None:
        return state, "Game already finished"
    if player_index != state["turn"]:
        return state, "Not your turn"

    state["last_move"] = move
    if move.get("game_over"):
        state["winner"] = move.get("winner_index", player_index)
    else:
        state["turn"] = 1 - state["turn"]
    return state, None


def is_finished(state):
    return state.get("winner") is not None
