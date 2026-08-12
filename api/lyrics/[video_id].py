from flask import Flask

from backend.app import get_lyrics


app = Flask(__name__)
app.add_url_rule(
    "/<video_id>",
    view_func=get_lyrics
)
