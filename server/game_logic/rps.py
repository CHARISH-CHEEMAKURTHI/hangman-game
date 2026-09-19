"""Rock-Paper-Scissors authoritative game logic, best-of-N rounds, 2 players."""

BEATS = {"rock": "scissors", "paper": "rock", "scissors": "paper"}
BEST_OF = 5
WINS_NEEDED = BEST_OF // 2 + 1


def new_state(players):
    return {
        "scores": [0, 0],
        "picks": [None, None],
        "round": 1,
        "last_result": None,
        "winner": None,
    }


def apply_move(state, player_index, move, players):
    if state.get("winner") is not None:
        return state, "Game already finished"

    pick = move.get("pick")
    if pick not in BEATS:
        return state, "Invalid pick"

    if state["picks"][player_index] is not None:
        return state, "Already picked this round"

    state["picks"][player_index] = pick

    if state["picks"][0] is not None and state["picks"][1] is not None:
        p0, p1 = state["picks"]
        if p0 == p1:
            result = "draw"
        elif BEATS[p0] == p1:
            result = "p0"
            state["scores"][0] += 1
        else:
            result = "p1"
            state["scores"][1] += 1

        state["last_result"] = {"p0": p0, "p1": p1, "result": result}

        if state["scores"][0] >= WINS_NEEDED:
            state["winner"] = 0
        elif state["scores"][1] >= WINS_NEEDED:
            state["winner"] = 1
        else:
            state["round"] += 1
            state["picks"] = [None, None]

    return state, None


def is_finished(state):
    return state.get("winner") is not None
