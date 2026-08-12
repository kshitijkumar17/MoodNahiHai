from flask import Flask

from backend.app import get_playlist


app = Flask(__name__)
app.add_url_rule(
    "/api/playlist",
    view_func=get_playlist,
)
