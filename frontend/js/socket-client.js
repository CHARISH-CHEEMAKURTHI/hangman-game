/* Shared multiplayer lobby helper, reused by every online-capable game page.
 * Wraps Socket.IO room create/join/start/move/chat events behind a small API.
 */
(function (global) {
  function getNickname() {
    return localStorage.getItem("mgp_nickname") || "Player";
  }

  function setNickname(name) {
    localStorage.setItem("mgp_nickname", name);
  }

  class GameLobby {
    constructor(gameKey, handlers) {
      this.gameKey = gameKey;
      this.handlers = handlers || {};
      this.socket = io();
      this.code = null;
      this.you = null;

      this.socket.on("room_created", (data) => {
        this.code = data.code;
        this.you = data.you;
        this._call("onRoomCreated", data);
      });
      this.socket.on("room_joined", (data) => {
        this.code = data.code;
        this.you = data.you;
        this._call("onRoomJoined", data);
      });
      this.socket.on("room_error", (data) => this._call("onError", data));
      this.socket.on("lobby_update", (data) => this._call("onLobbyUpdate", data));
      this.socket.on("state_update", (data) => this._call("onStateUpdate", data));
      this.socket.on("move_error", (data) => this._call("onMoveError", data));
      this.socket.on("opponent_left", (data) => this._call("onOpponentLeft", data));
      this.socket.on("chat_message", (data) => this._call("onChat", data));
    }

    _call(name, data) {
      if (typeof this.handlers[name] === "function") {
        this.handlers[name](data);
      }
    }

    createRoom(team) {
      this.socket.emit("create_room", { game: this.gameKey, name: getNickname(), team: team || 0 });
    }

    joinRoom(code, team) {
      this.socket.emit("join_room_request", { code: code.trim().toUpperCase(), name: getNickname(), team });
    }

    startGame() {
      this.socket.emit("start_game", { code: this.code });
    }

    makeMove(move) {
      this.socket.emit("make_move", { code: this.code, move });
    }

    sendChat(text) {
      this.socket.emit("send_chat", { code: this.code, text });
    }

    leaveRoom() {
      this.socket.emit("leave_room_request", { code: this.code });
      this.code = null;
    }
  }

  global.MGP = { getNickname, setNickname, GameLobby };
})(window);
