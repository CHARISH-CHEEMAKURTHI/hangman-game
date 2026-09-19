"""Generic client-authoritative relay used for Chess, Checkers, Reversi
and Dots and Boxes online play.

The server only enforces whose turn it is and relays the move payload
verbatim to the other player; move legality is validated client-side by
each game's own rules engine. A move may set `keep_turn: true` so the
same player continues (a checkers multi-jump continuation, or a Dots and
Boxes move that completed a box) instead of flipping to the opponent.
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
    elif not move.get("keep_turn"):
        state["turn"] = 1 - state["turn"]
    return state, None


def is_finished(state):
    return state.get("winner") is not None
