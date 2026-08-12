from flask import Flask, jsonify
from flask_cors import CORS
from ytmusicapi import YTMusic
from ytmusicapi.parsers.playlists import (
    parse_playlist_items,
)
from yt_dlp import YoutubeDL


app = Flask(__name__)
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                r"http://localhost:5173",
                r"http://127\.0\.0\.1:5173",
                r"http://192\.168\.\d{1,3}\.\d{1,3}:5173",
                r"http://10\.\d{1,3}\.\d{1,3}\.\d{1,3}:5173",
                r"http://172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}:5173",
            ]
        }
    },
)

yt = YTMusic()

PLAYLIST_ID = "PLCWKLJe8IPew"
PLAYLIST_LIMIT = 100


def has_playlist_tracks(playlist):
    tracks = playlist.get("tracks")
    return isinstance(tracks, list) and len(tracks) > 0


def build_playlist_from_raw(response):
    contents = response.get("contents", {})

    renderer = (
        contents.get("singleColumnBrowseResultsRenderer")
        or contents.get("twoColumnBrowseResultsRenderer")
    )

    if not renderer:
        raise ValueError(
            "Playlist response missing expected renderer"
        )

    section_contents = []
    tabs = renderer.get("tabs", [])

    if tabs:
        tab_content = (
            tabs[0]
            .get("tabRenderer", {})
            .get("content", {})
        )

        section_contents = (
            tab_content
            .get("sectionListRenderer", {})
            .get("contents", [])
        )

    if not section_contents:
        section_contents = (
            renderer
            .get("secondaryContents", {})
            .get("sectionListRenderer", {})
            .get("contents", [])
        )

    if not section_contents:
        raise ValueError(
            "Playlist response missing section contents"
        )

    playlist_shelf = next(
        (
            item.get("musicPlaylistShelfRenderer")
            for item in section_contents
            if "musicPlaylistShelfRenderer" in item
        ),
        None,
    )

    if not playlist_shelf:
        raise ValueError(
            "Playlist response missing track shelf"
        )

    tracks = parse_playlist_items(
        playlist_shelf.get("contents", [])
    )

    return {
        "id": PLAYLIST_ID,
        "title": "Mood Nahi Hai",
        "privacy": "PUBLIC",
        "trackCount": len(tracks),
        "tracks": tracks,
    }


def get_playlist_data():
    try:
        playlist = yt.get_playlist(
            PLAYLIST_ID,
            limit=PLAYLIST_LIMIT
        )

        if has_playlist_tracks(playlist):
            return playlist

        print(
            "Playlist response was empty, "
            "falling back to raw browse parser."
        )
    except Exception as error:
        print("Playlist error:", error)

    response = yt._send_request(
        "browse",
        {"browseId": f"VL{PLAYLIST_ID}"}
    )

    playlist = build_playlist_from_raw(response)

    if has_playlist_tracks(playlist):
        return playlist

    raise ValueError("Playlist response did not include tracks")


def get_audio_url(video_id):
    url = f"https://www.youtube.com/watch?v={video_id}"

    options = {
        "format": "bestaudio/best",
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "js_runtimes": {
            "deno": {}
        },
    }

    with YoutubeDL(options) as ydl:
        info = ydl.extract_info(
            url,
            download=False
        )

    return {
        "url": info["url"],
        "duration": info.get("duration"),
        "title": info.get("title"),
    }


@app.route("/api/playlist")
def get_playlist():
    try:
        playlist = get_playlist_data()
        return jsonify(playlist)
    except Exception as error:
        print("Playlist fallback error:", error)
        return jsonify({
            "error": "Unable to load playlist"
        }), 500


@app.route("/api/song/<video_id>")
def get_song(video_id):
    try:
        audio = get_audio_url(video_id)

        return jsonify({
            "videoId": video_id,
            "title": audio["title"],
            "duration": audio["duration"],
            "audioUrl": audio["url"],
        })

    except Exception as e:
        print("Playback error:", e)

        return jsonify({
            "error": "Unable to get audio stream"
        }), 500

@app.route("/api/lyrics/<video_id>")
def get_lyrics(video_id):
    try:
        # Get the watch playlist for this song.
        # This contains the lyrics browse ID.
        watch_playlist = yt.get_watch_playlist(
            videoId=video_id,
            limit=1
        )

        lyrics_browse_id = watch_playlist.get("lyrics")

        if not lyrics_browse_id:
            return jsonify({
                "lyrics": None,
                "hasTimestamps": False
            })

        lyrics = yt.get_lyrics(
            lyrics_browse_id,
            timestamps=True
        )

        if not lyrics:
            return jsonify({
                "lyrics": None,
                "hasTimestamps": False
            })

        return jsonify(lyrics)

    except Exception as e:
        print("Lyrics error:", e)

        return jsonify({
            "lyrics": None,
            "hasTimestamps": False,
            "error": str(e)
        }), 500

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5001,
        debug=False
    )
