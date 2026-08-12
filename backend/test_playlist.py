from ytmusicapi import YTMusic

PLAYLIST_ID = "PLeatb7hupNV_AWUl_7ttbsKeCQh8tF5N4"

yt = YTMusic()

playlist = yt.get_playlist(
    PLAYLIST_ID,
    limit=None
)

print("Playlist:")
print(playlist["title"])

print("\nTracks:")

for track in playlist["tracks"]:
    print(
        track["title"],
        "-",
        ", ".join(
            artist["name"]
            for artist in track.get("artists", [])
        )
    )