from flask import Flask

from backend.app import stream_song


app = Flask(__name__)
app.add_url_rule(
    "/api/stream/<video_id>",
    view_func=stream_song,
)
