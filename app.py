from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit, send

import os
from werkzeug.utils import secure_filename


app = Flask(__name__)

# ================= FILE UPLOAD CONFIG =================

UPLOAD_FOLDER = "uploads"
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_SIZE

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# ================= SOCKET.IO =================

socketio = SocketIO(app)

users = {}


# ================= HOME =================

@app.route("/")
def home():
    return render_template("index.html")


# ================= USER JOIN =================

@socketio.on("join")
def handle_join(username):

    username = username.strip()

    if not username:
        return

    username = username[:20]

    users[request.sid] = username

    print(f"{username} joined the chat")

    send(
        {
            "type": "system",
            "message": f"{username} joined the chat"
        },
        broadcast=True
    )

    emit(
        "user_list",
        list(users.values()),
        broadcast=True
    )


# ================= CHAT MESSAGE =================

@socketio.on("message")
def handle_message(data):

    username = users.get(request.sid)

    if not username:
        return

    message = data.get("message", "").strip()

    if not message:
        return

    message = message[:1000]

    print(f"{username}: {message}")

    send(
        {
            "type": "chat",
            "username": username,
            "message": message
        },
        broadcast=True
    )


# ================= USER DISCONNECT =================

@socketio.on("disconnect")
def handle_disconnect():

    username = users.pop(request.sid, None)

    if username is None:
        return

    print(f"{username} disconnected")

    send(
        {
            "type": "system",
            "message": f"{username} left the chat"
        },
        broadcast=True
    )

    emit(
        "user_list",
        list(users.values()),
        broadcast=True
    )


# ================= FILE UPLOAD =================

@app.route("/upload", methods=["POST"])
def upload_file():

    if "file" not in request.files:
        return jsonify({
            "success": False,
            "error": "No file received"
        }), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({
            "success": False,
            "error": "No file selected"
        }), 400

    filename = secure_filename(file.filename)

    if not filename:
        return jsonify({
            "success": False,
            "error": "Invalid filename"
        }), 400

    filepath = os.path.join(
        app.config["UPLOAD_FOLDER"],
        filename
    )

    file.save(filepath)

    # Find uploader
    username = request.form.get("username", "Unknown")

    # Tell all connected users about the file
    socketio.emit(
        "file_shared",
        {
            "username": username,
            "filename": filename,
            "download_url": f"/download/{filename}"
        }
    )

    print(f"{username} shared file: {filename}")

    return jsonify({
        "success": True,
        "filename": filename,
        "download_url": f"/download/{filename}"
    })


# ================= FILE DOWNLOAD =================

@app.route("/download/<filename>")
def download_file(filename):

    return send_from_directory(
        app.config["UPLOAD_FOLDER"],
        filename,
        as_attachment=True
    )


# ================= START SERVER =================

if __name__ == "__main__":

    socketio.run(
        app,
        host="0.0.0.0",
        port=5000,
        debug=True
    )