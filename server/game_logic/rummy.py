"""Simplified Indian Rummy authoritative game logic.

Rules implemented (deliberately simplified, no joker/wildcard):
  - 2 standard 52-card decks (no jokers), 13 cards dealt per player.
  - Players take turns: draw one card (from the closed pile or the open
    discard pile), then either discard one card or declare.
  - A declare is valid only if the kept 13 cards can be fully partitioned
    into groups of 3+ cards that are each a valid "run" (3+ consecutive
    cards of the same suit) or a valid "set" (3-4 cards of the same rank,
    all different suits), with at least one run among the groups.
  - The first valid declare wins the hand immediately for their team.
    Supports "group vs group" play via a `team` field on each player.
"""
import random
from itertools import combinations

RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
RANK_ORDER = {r: i + 1 for i, r in enumerate(RANKS)}
SUITS = ["S", "H", "D", "C"]
POINT_VALUE = {**{r: 10 for r in ["A", "J", "Q", "K"]}, **{str(n): n for n in range(2, 11)}}

MAX_PLAYERS = 6
MIN_PLAYERS = 2
HAND_SIZE = 13


def _rank_of(card):
    return card[:-1]


def _suit_of(card):
    return card[-1]


def _card_points(card):
    return POINT_VALUE[_rank_of(card)]


def _sort_key(card):
    return (RANK_ORDER[_rank_of(card)], _suit_of(card))


def _build_deck():
    deck = []
    for _ in range(2):
        for suit in SUITS:
            for rank in RANKS:
                deck.append(rank + suit)
    random.shuffle(deck)
    return deck


def new_state(players):
    deck = _build_deck()
    hands = []
    for _ in players:
        hands.append(sorted(deck[:HAND_SIZE], key=_sort_key))
        deck = deck[HAND_SIZE:]
    discard = [deck.pop()]
    return {
        "hands": hands,
        "draw_pile": deck,
        "discard_pile": discard,
        "turn": 0,
        "phase": "draw",
        "winner": None,
        "winning_team": None,
        "final_scores": None,
        "team_totals": None,
        "last_action": None,
    }


def _reshuffle_discard_into_draw(state):
    if len(state["discard_pile"]) <= 1:
        return
    top = state["discard_pile"][-1]
    rest = state["discard_pile"][:-1]
    random.shuffle(rest)
    state["draw_pile"] = rest
    state["discard_pile"] = [top]


def _valid_groups(cards):
    n = len(cards)
    groups = []

    for size in (3, 4):
        for combo in combinations(range(n), size):
            ranks = {_rank_of(cards[i]) for i in combo}
            suits = [_suit_of(cards[i]) for i in combo]
            if len(ranks) == 1 and len(set(suits)) == size:
                mask = 0
                for i in combo:
                    mask |= 1 << i
                groups.append((mask, False))

    by_suit = {}
    for i, c in enumerate(cards):
        by_suit.setdefault(_suit_of(c), []).append(i)

    for idxs in by_suit.values():
        idxs_sorted = sorted(idxs, key=lambda i: RANK_ORDER[_rank_of(cards[i])])
        for size in range(3, len(idxs_sorted) + 1):
            for combo in combinations(idxs_sorted, size):
                order_vals = [RANK_ORDER[_rank_of(cards[i])] for i in combo]
                if len(set(order_vals)) != size:
                    continue
                sorted_vals = sorted(order_vals)
                if all(sorted_vals[k + 1] - sorted_vals[k] == 1 for k in range(size - 1)):
                    mask = 0
                    for i in combo:
                        mask |= 1 << i
                    groups.append((mask, True))

    return groups


def _is_valid_meld(cards):
    if len(cards) != HAND_SIZE:
        return False

    groups = _valid_groups(cards)
    full_mask = (1 << HAND_SIZE) - 1
    memo = {}

    def solve(mask, found_run):
        if mask == 0:
            return found_run
        key = (mask, found_run)
        if key in memo:
            return memo[key]
        result = False
        for g_mask, is_run in groups:
            if g_mask and (g_mask & mask) == g_mask:
                if solve(mask & ~g_mask, found_run or is_run):
                    result = True
                    break
        memo[key] = result
        return result

    return solve(full_mask, False)


def apply_move(state, player_index, move, players):
    if state.get("winner") is not None:
        return state, "Game already finished"
    if player_index != state["turn"]:
        return state, "Not your turn"

    action = move.get("action")
    hand = state["hands"][player_index]

    if action == "draw":
        if state["phase"] != "draw":
            return state, "You must discard or declare first"
        source = move.get("source")
        if source == "discard":
            if not state["discard_pile"]:
                return state, "Discard pile is empty"
            card = state["discard_pile"].pop()
        elif source == "pile":
            if not state["draw_pile"]:
                _reshuffle_discard_into_draw(state)
            if not state["draw_pile"]:
                return state, "No cards left to draw"
            card = state["draw_pile"].pop()
        else:
            return state, "Invalid draw source"
        hand.append(card)
        hand.sort(key=_sort_key)
        state["phase"] = "discard_or_declare"
        state["last_action"] = {"type": "draw", "player": player_index, "source": source}
        return state, None

    if action == "discard":
        if state["phase"] != "discard_or_declare":
            return state, "You must draw first"
        card = move.get("card")
        if card not in hand:
            return state, "Card not in hand"
        hand.remove(card)
        state["discard_pile"].append(card)
        state["turn"] = (state["turn"] + 1) % len(players)
        state["phase"] = "draw"
        state["last_action"] = {"type": "discard", "player": player_index, "card": card}
        return state, None

    if action == "declare":
        if state["phase"] != "discard_or_declare":
            return state, "You must draw before declaring"
        keep = move.get("keep")
        if not isinstance(keep, list) or len(keep) != HAND_SIZE:
            return state, f"You must select exactly {HAND_SIZE} cards to keep"
        hand_copy = list(hand)
        for c in keep:
            if c not in hand_copy:
                return state, "Invalid card selection"
            hand_copy.remove(c)
        if not _is_valid_meld(keep):
            return state, "Not a valid declare: need a run plus valid sets/runs covering all cards"

        finish_card = hand_copy[0] if hand_copy else None
        state["hands"][player_index] = sorted(keep, key=_sort_key)
        if finish_card:
            state["discard_pile"].append(finish_card)

        state["winner"] = player_index

        scores = []
        for i, h in enumerate(state["hands"]):
            scores.append(0 if i == player_index else sum(_card_points(c) for c in h))
        state["final_scores"] = scores

        teams = [p.get("team", i) for i, p in enumerate(players)]
        team_totals = {}
        for i, s in enumerate(scores):
            t = teams[i]
            team_totals[t] = team_totals.get(t, 0) + s
        state["winning_team"] = teams[player_index]
        state["team_totals"] = team_totals
        state["last_action"] = {"type": "declare", "player": player_index}
        return state, None

    return state, "Unknown action"


def redact_for_player(state, player_index):
    hands = state["hands"]
    return {
        "hands": [hands[i] if i == player_index else [None] * len(hands[i]) for i in range(len(hands))],
        "hand_counts": [len(h) for h in hands],
        "draw_pile_count": len(state["draw_pile"]),
        "discard_pile": state["discard_pile"],
        "turn": state["turn"],
        "phase": state["phase"],
        "winner": state["winner"],
        "winning_team": state.get("winning_team"),
        "final_scores": state.get("final_scores"),
        "team_totals": state.get("team_totals"),
        "last_action": state.get("last_action"),
        "you": player_index,
    }


def is_finished(state):
    return state.get("winner") is not None
