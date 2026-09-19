"""Authoritative game logic modules for online multiplayer rooms.

Each module exposes:
    new_state(players) -> dict
    apply_move(state, player_index, move, players) -> (new_state, error_or_None)
    is_finished(state) -> bool
"""
