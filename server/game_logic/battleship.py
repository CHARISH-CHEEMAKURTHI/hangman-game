"""Battleship: online 1v1 only, with a hidden ship-placement phase.

Standard 10x10 board and classic 5-ship fleet (sizes 5,4,3,3,2). Players
place ships privately, then take alternating shots. Each player's own
board (with incoming shots) and only their fired-shot history against the
opponent are sent to them — the opponent's unfired ship cells are never
revealed to the client.
"""

BOARD_SIZE = 10
SHIP_SIZES = [5, 4, 3, 3, 2]


def new_state(players):
    return {
        "phase": "placing",
        "placed": [False, False],
        "ships": [None, None],
        "shots_at": [[], []],  # shots_at[i] = shots fired AT player i's board
        "turn": 0,
        "winner": None,
    }


def _validate_ships(ships):
    if not isinstance(ships, list) or len(ships) != len(SHIP_SIZES):
        return None, "You must place exactly {} ships".format(len(SHIP_SIZES))

    sizes = sorted(len(ship) for ship in ships)
    if sizes != sorted(SHIP_SIZES):
        return None, "Ship sizes must be {}".format(sorted(SHIP_SIZES))

    all_cells = set()
    for ship in ships:
        cells = [tuple(cell) for cell in ship]
        rows = {c[0] for c in cells}
        cols = {c[1] for c in cells}
        if len(rows) > 1 and len(cols) > 1:
            return None, "Ships must be placed in a straight line"
        if any(not (0 <= r < BOARD_SIZE and 0 <= c < BOARD_SIZE) for r, c in cells):
            return None, "Ship placed out of bounds"

        sorted_cells = sorted(cells)
        if len(rows) == 1:
            expected = [(sorted_cells[0][0], sorted_cells[0][1] + i) for i in range(len(cells))]
        else:
            expected = [(sorted_cells[0][0] + i, sorted_cells[0][1]) for i in range(len(cells))]
        if sorted_cells != sorted(expected):
            return None, "Ship cells must be contiguous"

        if all_cells & set(cells):
            return None, "Ships cannot overlap"
        all_cells |= set(cells)

    return all_cells, None


def apply_move(state, player_index, move, players):
    if state.get("winner") is not None:
        return state, "Game already finished"

    action = move.get("action")

    if action == "place":
        if state["phase"] != "placing":
            return state, "Placement phase is over"
        if state["placed"][player_index]:
            return state, "You have already placed your ships"

        cells, error = _validate_ships(move.get("ships"))
        if error:
            return state, error

        state["ships"][player_index] = sorted(cells)
        state["placed"][player_index] = True
        if all(state["placed"]):
            state["phase"] = "battle"
        return state, None

    if action == "fire":
        if state["phase"] != "battle":
            return state, "Both players must finish placing ships first"
        if player_index != state["turn"]:
            return state, "Not your turn"

        r, c = move.get("r"), move.get("c")
        if not isinstance(r, int) or not isinstance(c, int) or not (0 <= r < BOARD_SIZE and 0 <= c < BOARD_SIZE):
            return state, "Invalid target cell"

        opponent = 1 - player_index
        already_fired = {(s["r"], s["c"]) for s in state["shots_at"][opponent]}
        if (r, c) in already_fired:
            return state, "You already fired at that cell"

        hit = (r, c) in {tuple(cell) for cell in state["ships"][opponent]}
        state["shots_at"][opponent].append({"r": r, "c": c, "hit": hit})

        all_hit_cells = {(s["r"], s["c"]) for s in state["shots_at"][opponent] if s["hit"]}
        if all_hit_cells == {tuple(cell) for cell in state["ships"][opponent]}:
            state["phase"] = "finished"
            state["winner"] = player_index
        else:
            state["turn"] = opponent
        return state, None

    return state, "Unknown action"


def redact_for_player(state, player_index):
    opponent = 1 - player_index
    my_board = None
    if state["placed"][player_index]:
        my_board = {
            "ships": state["ships"][player_index],
            "incoming_shots": state["shots_at"][player_index],
        }
    return {
        "phase": state["phase"],
        "turn": state["turn"],
        "winner": state["winner"],
        "you_placed": state["placed"][player_index],
        "opponent_placed": state["placed"][opponent],
        "my_board": my_board,
        "my_shots": state["shots_at"][opponent],
        "board_size": BOARD_SIZE,
        "ship_sizes": SHIP_SIZES,
    }


def is_finished(state):
    return state.get("winner") is not None
