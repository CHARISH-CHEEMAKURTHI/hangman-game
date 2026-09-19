"""Simplified Ludo Race: 2-4 players, one token each, server-rolled dice.

This is deliberately a simplified variant of Ludo for fast online group
play: every token starts already on a shared circular track (no "roll a
six to leave home" step, no separate finishing lane). Landing exactly on
an opponent's token sends it back to its start, unless that cell is a
player's safe starting square. Rolling a 6 grants another roll. First
player to complete the lap wins outright.
"""
import random

TRACK_LENGTH = 28
MAX_PLAYERS = 4
MIN_PLAYERS = 2


def _start_offset(player_index):
    return player_index * (TRACK_LENGTH // MAX_PLAYERS)


def _absolute_cell(player_index, progress):
    return (_start_offset(player_index) + progress) % TRACK_LENGTH


def new_state(players):
    return {
        "positions": [0 for _ in players],
        "turn": 0,
        "phase": "roll",
        "last_roll": None,
        "winner": None,
        "last_capture": None,
    }


def apply_move(state, player_index, move, players):
    if state.get("winner") is not None:
        return state, "Game already finished"
    if player_index != state["turn"]:
        return state, "Not your turn"

    action = move.get("action")
    num_players = len(players)

    if action == "roll":
        if state["phase"] != "roll":
            return state, "You already rolled — move your token"
        state["last_roll"] = random.randint(1, 6)
        state["phase"] = "move"
        return state, None

    if action == "move":
        if state["phase"] != "move":
            return state, "Roll the dice first"

        roll = state["last_roll"]
        new_progress = state["positions"][player_index] + roll
        state["last_capture"] = None

        if new_progress >= TRACK_LENGTH:
            state["positions"][player_index] = TRACK_LENGTH
            state["winner"] = player_index
            state["phase"] = "finished"
            return state, None

        state["positions"][player_index] = new_progress
        landing_cell = _absolute_cell(player_index, new_progress)

        is_safe = any(landing_cell == _start_offset(i) for i in range(MAX_PLAYERS))
        if not is_safe:
            for other in range(num_players):
                if other == player_index:
                    continue
                if state["positions"][other] == 0:
                    continue
                if _absolute_cell(other, state["positions"][other]) == landing_cell:
                    state["positions"][other] = 0
                    state["last_capture"] = other

        if roll == 6:
            state["phase"] = "roll"
        else:
            state["turn"] = (player_index + 1) % num_players
            state["phase"] = "roll"
        state["last_roll"] = None
        return state, None

    return state, "Unknown action"


def is_finished(state):
    return state.get("winner") is not None
