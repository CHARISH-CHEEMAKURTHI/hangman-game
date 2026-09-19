"""Group Trivia Quiz: up to 6 players, timed multiple-choice questions with
speed-weighted scoring and a final leaderboard.

The server times each question authoritatively (from when the round
starts to when each answer arrives) so scoring can't be gamed by a
client reporting a fake elapsed time. A round ends and the correct
answer is revealed once every player has answered; any player can then
trigger the next question.
"""
import random
import time

TOTAL_QUESTIONS = 8
TIME_LIMIT = 15.0
MIN_PLAYERS = 2
MAX_PLAYERS = 6

QUESTION_BANK = [
    {"q": "What is the capital of France?", "options": ["Berlin", "Madrid", "Paris", "Rome"], "answer": 2},
    {"q": "Which planet is known as the Red Planet?", "options": ["Venus", "Mars", "Jupiter", "Saturn"], "answer": 1},
    {"q": "What is the largest ocean on Earth?", "options": ["Atlantic", "Indian", "Arctic", "Pacific"], "answer": 3},
    {"q": "Who wrote 'Romeo and Juliet'?", "options": ["Charles Dickens", "William Shakespeare", "Mark Twain", "Jane Austen"], "answer": 1},
    {"q": "What is the chemical symbol for gold?", "options": ["Go", "Gd", "Au", "Ag"], "answer": 2},
    {"q": "How many continents are there on Earth?", "options": ["5", "6", "7", "8"], "answer": 2},
    {"q": "What is the smallest prime number?", "options": ["0", "1", "2", "3"], "answer": 2},
    {"q": "Which language has the most native speakers worldwide?", "options": ["English", "Hindi", "Mandarin Chinese", "Spanish"], "answer": 2},
    {"q": "What gas do plants primarily absorb from the atmosphere?", "options": ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], "answer": 2},
    {"q": "In which year did the Titanic sink?", "options": ["1905", "1912", "1918", "1923"], "answer": 1},
    {"q": "What is the tallest mountain in the world?", "options": ["K2", "Kangchenjunga", "Mount Everest", "Lhotse"], "answer": 2},
    {"q": "Which country invented paper?", "options": ["Egypt", "China", "Greece", "India"], "answer": 1},
    {"q": "What is the hardest natural substance on Earth?", "options": ["Gold", "Iron", "Diamond", "Quartz"], "answer": 2},
    {"q": "How many strings does a standard guitar have?", "options": ["4", "5", "6", "7"], "answer": 2},
    {"q": "What is the largest organ in the human body?", "options": ["Liver", "Heart", "Skin", "Lungs"], "answer": 2},
    {"q": "Which planet has the most moons?", "options": ["Earth", "Mars", "Jupiter", "Saturn"], "answer": 3},
    {"q": "What does 'www' stand for?", "options": ["World Wide Web", "World Wide Wire", "Web World Wide", "Wide World Web"], "answer": 0},
    {"q": "Which animal is known as the 'Ship of the Desert'?", "options": ["Horse", "Camel", "Donkey", "Goat"], "answer": 1},
    {"q": "What is the currency of Japan?", "options": ["Won", "Yuan", "Yen", "Ringgit"], "answer": 2},
    {"q": "Who painted the Mona Lisa?", "options": ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Claude Monet"], "answer": 2},
    {"q": "What is the freezing point of water in Celsius?", "options": ["-10", "0", "10", "32"], "answer": 1},
    {"q": "Which country hosted the 2016 Summer Olympics?", "options": ["China", "United Kingdom", "Brazil", "Japan"], "answer": 2},
    {"q": "What is the main ingredient in guacamole?", "options": ["Tomato", "Avocado", "Onion", "Lime"], "answer": 1},
    {"q": "How many players are on a standard soccer team on the field?", "options": ["9", "10", "11", "12"], "answer": 2},
    {"q": "What is the closest star to Earth?", "options": ["Proxima Centauri", "The Sun", "Sirius", "Alpha Centauri"], "answer": 1},
    {"q": "Which element has the atomic number 1?", "options": ["Helium", "Hydrogen", "Oxygen", "Carbon"], "answer": 1},
    {"q": "What is the longest river in the world?", "options": ["Amazon", "Yangtze", "Nile", "Mississippi"], "answer": 2},
    {"q": "Which Shakespeare play features the character Hamlet?", "options": ["Macbeth", "Hamlet", "Othello", "King Lear"], "answer": 1},
    {"q": "What does HTML stand for?", "options": ["HyperText Markup Language", "HighText Machine Language", "HyperTransfer Markup Language", "Home Tool Markup Language"], "answer": 0},
    {"q": "Which gas do humans exhale the most of?", "options": ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"], "answer": 2},
    {"q": "What is the smallest country in the world by area?", "options": ["Monaco", "San Marino", "Vatican City", "Liechtenstein"], "answer": 2},
    {"q": "Which instrument has keys, pedals, and strings?", "options": ["Violin", "Piano", "Flute", "Trumpet"], "answer": 1},
]


def new_state(players):
    picked = random.sample(QUESTION_BANK, min(TOTAL_QUESTIONS, len(QUESTION_BANK)))
    return {
        "questions": picked,
        "round": 0,
        "phase": "question",
        "answers": [None for _ in players],
        "scores": [0 for _ in players],
        "question_started_at": time.time(),
    }


def apply_move(state, player_index, move, players):
    action = move.get("action")
    num_players = len(players)
    current_q = state["questions"][state["round"]]

    if action == "answer":
        if state["phase"] != "question":
            return state, "This round is already over"
        if state["answers"][player_index] is not None:
            return state, "You already answered this question"

        choice = move.get("choice")
        if not isinstance(choice, int) or not (0 <= choice < len(current_q["options"])):
            return state, "Invalid choice"

        elapsed = max(0.0, min(TIME_LIMIT, time.time() - state["question_started_at"]))
        correct = choice == current_q["answer"]
        points = 0
        if correct:
            points = round(500 + 500 * (1 - elapsed / TIME_LIMIT))
        state["answers"][player_index] = {"choice": choice, "correct": correct, "points": points}
        state["scores"][player_index] += points

        if all(a is not None for a in state["answers"]):
            state["phase"] = "reveal"
        return state, None

    if action == "next":
        if state["phase"] != "reveal":
            return state, "Wait for everyone to answer first"
        state["round"] += 1
        if state["round"] >= len(state["questions"]):
            state["phase"] = "finished"
        else:
            state["phase"] = "question"
            state["answers"] = [None for _ in range(num_players)]
            state["question_started_at"] = time.time()
        return state, None

    return state, "Unknown action"


def redact_for_player(state, player_index):
    view = dict(state)
    current_q = state["questions"][state["round"]]
    view["question"] = {
        "text": current_q["q"],
        "options": current_q["options"],
        "answer": current_q["answer"] if state["phase"] in ("reveal", "finished") else None,
    }
    view["questions"] = None
    view["my_answer"] = state["answers"][player_index]
    view["answered_count"] = sum(1 for a in state["answers"] if a is not None)
    view["total_players"] = len(state["answers"])
    view["total_questions"] = len(state["questions"])
    view["question_started_at"] = None

    if state["phase"] == "question":
        # Never reveal another player's in-progress pick before the round
        # is scored — only whether they've locked in an answer yet.
        view["answers"] = [
            (a if i == player_index else ({"answered": True} if a is not None else None))
            for i, a in enumerate(state["answers"])
        ]

    return view


def is_finished(state):
    return state.get("phase") == "finished"
