"""Multi-Game Platform server.

Serves the static frontend and runs a Socket.IO room/lobby manager that
powers real-time online multiplayer for several of the games. Each game
that supports online play has an authoritative logic module in
game_logic/ which validates moves and updates shared room state.
"""
import os
import random
import string

from flask import Flask, request
from flask_socketio import SocketIO, join_room, leave_room, emit

from game_logic import tictactoe, connect_four, rps, rummy, hangman_online, relay, battleship, ludo, trivia

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
app.config["SECRET_KEY"] = "hangman-multi-game-platform"
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

GAME_MODULES = {
    "tictactoe": tictactoe,
    "connect4": connect_four,
    "rps": rps,
    "hangman": hangman_online,
    "chess": relay,
    "checkers": relay,
    "reversi": relay,
    "dotsandboxes": relay,
    "battleship": battleship,
    "rummy": rummy,
    "ludo": ludo,
    "trivia": trivia,
}

MAX_PLAYERS = {
    "tictactoe": 2,
    "connect4": 2,
    "rps": 2,
    "hangman": 2,
    "chess": 2,
    "checkers": 2,
    "reversi": 2,
    "dotsandboxes": 2,
    "battleship": 2,
    "rummy": 6,
    "ludo": 4,
    "trivia": 6,
}

MIN_PLAYERS = {"rummy": 2, "ludo": 2, "trivia": 2}
AUTO_START_GAMES = {
    "tictactoe", "connect4", "rps", "hangman", "chess",
    "checkers", "reversi", "dotsandboxes", "battleship",
}

# code -> room dict
ROOMS = {}
# sid -> room code
SID_ROOM = {}


def _new_code():
    alphabet = string.ascii_uppercase.replace("O", "").replace("I", "") + "23456789"
    while True:
        code = "".join(random.choices(alphabet, k=5))
        if code not in ROOMS:
            return code


def _public_players(room):
    return [{"name": p["name"], "team": p.get("team", i)} for i, p in enumerate(room["players"])]


def _broadcast_lobby(room):
    emit(
        "lobby_update",
        {
            "code": room["code"],
            "game": room["game"],
            "players": _public_players(room),
            "host_index": 0,
            "started": room["started"],
            "max_players": MAX_PLAYERS[room["game"]],
            "min_players": MIN_PLAYERS.get(room["game"], 2),
        },
        room=room["code"],
    )


def _broadcast_state(room):
    module = GAME_MODULES[room["game"]]
    finished = module.is_finished(room["state"])
    if hasattr(module, "redact_for_player"):
        for idx, player in enumerate(room["players"]):
            view = module.redact_for_player(room["state"], idx)
            emit("state_update", {"state": view, "finished": finished}, room=player["sid"])
    else:
        emit(
            "state_update",
            {"state": room["state"], "finished": finished},
            room=room["code"],
        )


def _start_game(room):
    module = GAME_MODULES[room["game"]]
    room["state"] = module.new_state(room["players"])
    room["started"] = True
    _broadcast_lobby(room)
    _broadcast_state(room)


@app.route("/")
def index():
    return app.send_static_file("index.html")


@socketio.on("create_room")
def on_create_room(data):
    game = data.get("game")
    if game not in GAME_MODULES:
        emit("room_error", {"message": "Unknown game"})
        return

    name = (data.get("name") or "Player 1")[:20]
    team = data.get("team", 0)
    code = _new_code()
    room = {
        "code": code,
        "game": game,
        "players": [{"sid": request.sid, "name": name, "team": team}],
        "started": False,
        "state": None,
    }
    ROOMS[code] = room
    SID_ROOM[request.sid] = code
    join_room(code)
    emit("room_created", {"code": code, "you": 0, "game": game})
    _broadcast_lobby(room)


@socketio.on("join_room_request")
def on_join_room(data):
    code = (data.get("code") or "").strip().upper()
    room = ROOMS.get(code)
    if not room:
        emit("room_error", {"message": "Room not found"})
        return
    if room["started"]:
        emit("room_error", {"message": "Game already started"})
        return
    if len(room["players"]) >= MAX_PLAYERS[room["game"]]:
        emit("room_error", {"message": "Room is full"})
        return

    name = (data.get("name") or f"Player {len(room['players']) + 1}")[:20]
    team = data.get("team", len(room["players"]) % 2)
    you = len(room["players"])
    room["players"].append({"sid": request.sid, "name": name, "team": team})
    SID_ROOM[request.sid] = code
    join_room(code)
    emit("room_joined", {"code": code, "you": you, "game": room["game"]})
    _broadcast_lobby(room)

    if room["game"] in AUTO_START_GAMES and len(room["players"]) == MAX_PLAYERS[room["game"]]:
        _start_game(room)


@socketio.on("start_game")
def on_start_game(data):
    code = (data.get("code") or "").strip().upper()
    room = ROOMS.get(code)
    if not room:
        emit("room_error", {"message": "Room not found"})
        return
    if room["started"]:
        return
    if request.sid != room["players"][0]["sid"]:
        emit("room_error", {"message": "Only the host can start the game"})
        return
    min_players = MIN_PLAYERS.get(room["game"], 2)
    if len(room["players"]) < min_players:
        emit("room_error", {"message": f"Need at least {min_players} players"})
        return
    _start_game(room)


@socketio.on("make_move")
def on_make_move(data):
    code = (data.get("code") or "").strip().upper()
    room = ROOMS.get(code)
    if not room or not room["started"]:
        emit("room_error", {"message": "Game not active"})
        return

    player_index = next((i for i, p in enumerate(room["players"]) if p["sid"] == request.sid), None)
    if player_index is None:
        emit("room_error", {"message": "You are not in this room"})
        return

    module = GAME_MODULES[room["game"]]
    new_state, error = module.apply_move(room["state"], player_index, data.get("move", {}), room["players"])
    if error:
        emit("move_error", {"message": error})
        return

    room["state"] = new_state
    _broadcast_state(room)


@socketio.on("send_chat")
def on_send_chat(data):
    code = (data.get("code") or "").strip().upper()
    room = ROOMS.get(code)
    if not room:
        return
    player_index = next((i for i, p in enumerate(room["players"]) if p["sid"] == request.sid), None)
    if player_index is None:
        return
    text = (data.get("text") or "")[:200]
    if not text.strip():
        return
    emit(
        "chat_message",
        {"name": room["players"][player_index]["name"], "text": text},
        room=code,
    )


def _leave_current_room():
    code = SID_ROOM.pop(request.sid, None)
    if not code:
        return
    room = ROOMS.get(code)
    if not room:
        return

    leave_room(code)
    room["players"] = [p for p in room["players"] if p["sid"] != request.sid]

    if not room["players"]:
        ROOMS.pop(code, None)
        return

    if room["started"]:
        emit("opponent_left", {"message": "A player has left the game."}, room=code)
    _broadcast_lobby(room)


@socketio.on("leave_room_request")
def on_leave_room(data):
    _leave_current_room()


@socketio.on("disconnect")
def on_disconnect():
    _leave_current_room()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Multi-Game Platform running at http://localhost:{port}")
    socketio.run(app, host="0.0.0.0", port=port, allow_unsafe_werkzeug=True)
