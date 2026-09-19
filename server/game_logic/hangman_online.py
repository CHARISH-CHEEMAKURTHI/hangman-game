"""Online 1v1 Hangman: player 0 sets a secret word, player 1 guesses letters."""

MAX_WRONG = 6


def new_state(players):
    return {
        "phase": "setting",
        "word": None,
        "guessed": [],
        "wrong": 0,
        "winner": None,
    }


def apply_move(state, player_index, move, players):
    action = move.get("action")

    if action == "set_word":
        if player_index != 0:
            return state, "Only the word-setter can set the word"
        if state["phase"] != "setting":
            return state, "Word already set"
        word = (move.get("word") or "").strip().lower()
        if not word or not word.isalpha() or len(word) > 20:
            return state, "Invalid word (letters only, max 20 chars)"
        state["word"] = word
        state["phase"] = "guessing"
        return state, None

    if action == "guess":
        if player_index != 1:
            return state, "Only the guesser can guess letters"
        if state["phase"] != "guessing":
            return state, "Not in guessing phase yet"
        letter = (move.get("letter") or "").strip().lower()
        if not letter or len(letter) != 1 or not letter.isalpha():
            return state, "Invalid letter"
        if letter in state["guessed"]:
            return state, "Letter already guessed"

        state["guessed"].append(letter)
        if letter not in state["word"]:
            state["wrong"] += 1

        if all(ch in state["guessed"] for ch in state["word"]):
            state["phase"] = "finished"
            state["winner"] = 1
        elif state["wrong"] >= MAX_WRONG:
            state["phase"] = "finished"
            state["winner"] = 0
        return state, None

    return state, "Unknown action"


def redact_for_player(state, player_index):
    view = dict(state)
    word = state["word"]
    view["word_length"] = len(word) if word else 0
    view["wrong_letters"] = [ch for ch in state["guessed"] if word and ch not in word]
    if word:
        view["masked_word"] = "".join(ch if ch in state["guessed"] else "_" for ch in word)
    else:
        view["masked_word"] = ""
    if player_index == 1 and state["phase"] != "finished":
        view["word"] = None
    return view


def is_finished(state):
    return state.get("phase") == "finished"
