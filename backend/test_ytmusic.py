from ytmusicapi import YTMusic

yt = YTMusic()

results = yt.search("Blinding Lights")

for result in results[:5]:
    print(
        result.get("title"),
        "-",
        result.get("artists")
    )