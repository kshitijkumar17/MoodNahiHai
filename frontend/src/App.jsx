import { useEffect, useState } from "react";
import "./App.css";

import MusicPlayer from "./components/MusicPlayer";
import Lyrics from "./components/Lyrics";

const EMPTY_TRACKS = [];
const PRESENCE_KEY = "mnhy-active-listeners";
const PRESENCE_HEARTBEAT_MS = 5000;
const PRESENCE_EXPIRY_MS = 15000;
// API requests stay same-origin in production and are proxied by Vite locally.
const API_BASE_URL = "";

function createSessionId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `listener-${crypto.randomUUID()}`;
  }

  return `listener-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function shuffleTrackIndexes(
  totalTracks,
  currentIndex
) {
  const remainingIndexes = Array.from(
    { length: totalTracks },
    (_, index) => index
  ).filter(
    (index) => index !== currentIndex
  );

  for (
    let index = remainingIndexes.length - 1;
    index > 0;
    index -= 1
  ) {
    const randomIndex = Math.floor(
      Math.random() * (index + 1)
    );

    [
      remainingIndexes[index],
      remainingIndexes[randomIndex],
    ] = [
      remainingIndexes[randomIndex],
      remainingIndexes[index],
    ];
  }

  return [currentIndex, ...remainingIndexes];
}

function App() {
  const [playlist, setPlaylist] = useState(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [shuffleEnabled, setShuffleEnabled] =
    useState(false);
  const [repeatMode, setRepeatMode] =
    useState("off");
  const [playbackHistory, setPlaybackHistory] =
    useState([]);
  const [queueOrder, setQueueOrder] = useState([]);

  const [currentTime, setCurrentTime] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clockTime, setClockTime] = useState(
    () => new Date()
  );
  const [listenerCount, setListenerCount] =
    useState(1);

  useEffect(() => {
    const sessionId = createSessionId();

    const readPresence = () => {
      try {
        const rawPresence =
          localStorage.getItem(
            PRESENCE_KEY
          );

        return rawPresence
          ? JSON.parse(rawPresence)
          : {};
      } catch {
        return {};
      }
    };

    const writePresence = (
      presenceMap
    ) => {
      localStorage.setItem(
        PRESENCE_KEY,
        JSON.stringify(presenceMap)
      );
    };

    const syncPresence = () => {
      const now = Date.now();
      const presenceMap = readPresence();
      const activePresence = Object.fromEntries(
        Object.entries(presenceMap).filter(
          ([, timestamp]) =>
            now - Number(timestamp) <
            PRESENCE_EXPIRY_MS
        )
      );

      activePresence[sessionId] = now;
      writePresence(activePresence);
      setListenerCount(
        Object.keys(activePresence).length
      );
    };

    const removePresence = () => {
      const presenceMap = readPresence();

      delete presenceMap[sessionId];
      writePresence(presenceMap);
    };

    const handleStorage = (event) => {
      if (event.key !== PRESENCE_KEY) {
        return;
      }

      const presenceMap = readPresence();
      const now = Date.now();
      const activeCount = Object.values(
        presenceMap
      ).filter(
        (timestamp) =>
          now - Number(timestamp) <
          PRESENCE_EXPIRY_MS
      ).length;

      setListenerCount(
        activeCount || 1
      );
    };

    syncPresence();

    const intervalId = window.setInterval(
      syncPresence,
      PRESENCE_HEARTBEAT_MS
    );

    window.addEventListener(
      "storage",
      handleStorage
    );
    window.addEventListener(
      "beforeunload",
      removePresence
    );

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(
        "storage",
        handleStorage
      );
      window.removeEventListener(
        "beforeunload",
        removePresence
      );
      removePresence();
    };
  }, []);

  useEffect(() => {
    async function fetchPlaylist() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/playlist`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch playlist");
        }

        const data = await response.json();
        const normalizedTracks =
          Array.isArray(data?.tracks)
            ? data.tracks
            : [];

        setPlaylist({
          ...data,
          tracks: normalizedTracks,
        });
      } catch (err) {
        console.error(err);
        setError("Unable to load playlist.");
      } finally {
        setLoading(false);
      }
    }

    fetchPlaylist();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(
      () => {
        setClockTime(new Date());
      },
      1000
    );

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  /*
   * Reset playback position whenever
   * the current track changes.
   */
  useEffect(() => {
    setCurrentTime(0);
  }, [currentTrackIndex]);

  const formattedClockTime =
    clockTime.toLocaleTimeString(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );

  const tracks = Array.isArray(
    playlist?.tracks
  )
    ? playlist.tracks
    : EMPTY_TRACKS;

  useEffect(() => {
    if (!tracks.length) {
      setQueueOrder((existingOrder) =>
        existingOrder.length === 0
          ? existingOrder
          : []
      );
      return;
    }

    setQueueOrder((existingOrder) => {
      if (
        existingOrder.length === tracks.length &&
        existingOrder.every(
          (index) =>
            index >= 0 &&
            index < tracks.length
        )
      ) {
        return existingOrder;
      }

      if (shuffleEnabled) {
        return shuffleTrackIndexes(
          tracks.length,
          currentTrackIndex
        );
      }

      return tracks.map(
        (_, index) => index
      );
    });
  }, [
    tracks,
    shuffleEnabled,
    currentTrackIndex,
  ]);

  useEffect(() => {
    if (!tracks.length) {
      return;
    }

    if (
      !Number.isInteger(currentTrackIndex) ||
      currentTrackIndex < 0 ||
      currentTrackIndex >= tracks.length
    ) {
      setCurrentTrackIndex(0);
    }
  }, [tracks, currentTrackIndex]);

  if (loading) {
    return (
      <div className="app">

        <video
          className="background-video"
          src="/video/background.mp4"
          autoPlay
          muted
          loop
          playsInline
        />

        <div className="video-overlay" />

        <div className="app-clock">
          {formattedClockTime}
        </div>

        <div className="app-listeners">
          <span className="listener-dot" />
          <span>
            {listenerCount}{" "}
            <span className="listener-lonely">
              LONELY
            </span>{" "}
            LISTENERS
          </span>
        </div>

        <div
          className="app-signature"
          aria-hidden="true"
        />

        <div className="loading">
          Loading playlist...
        </div>

      </div>
    );
  }

  if (error) {
    return (
      <div className="app">

        <video
          className="background-video"
          src="/video/background.mp4"
          autoPlay
          muted
          loop
          playsInline
        />

        <div className="video-overlay" />

        <div className="app-clock">
          {formattedClockTime}
        </div>

        <div className="app-listeners">
          <span className="listener-dot" />
          <span>
            {listenerCount}{" "}
            <span className="listener-lonely">
              LONELY
            </span>{" "}
            LISTENERS
          </span>
        </div>

        <div
          className="app-signature"
          aria-hidden="true"
        />

        <div className="loading">
          {error}
        </div>

      </div>
    );
  }

  const orderedTrackIndexes =
    queueOrder.length === tracks.length
      ? queueOrder
      : tracks.map((_, index) => index);
  const currentQueueIndex =
    orderedTrackIndexes.indexOf(
      currentTrackIndex
    );

  if (tracks.length === 0) {
    return (
      <div className="app">

        <video
          className="background-video"
          src="/video/background.mp4"
          autoPlay
          muted
          loop
          playsInline
        />

        <div className="video-overlay" />

        <div className="app-clock">
          {formattedClockTime}
        </div>

        <div className="app-listeners">
          <span className="listener-dot" />
          <span>
            {listenerCount}{" "}
            <span className="listener-lonely">
              LONELY
            </span>{" "}
            LISTENERS
          </span>
        </div>

        <div
          className="app-signature"
          aria-hidden="true"
        />

        <div className="loading">
          Playlist is empty.
        </div>

      </div>
    );
  }

  const currentTrack =
    tracks[currentTrackIndex] ||
    tracks[0];

  const nextTrack = () => {
    if (tracks.length <= 1) {
      return;
    }

    setPlaybackHistory((history) => [
      ...history,
      currentTrackIndex,
    ]);

    if (
      currentQueueIndex === -1
    ) {
      return;
    }

    const nextQueueIndex =
      (currentQueueIndex + 1) %
      orderedTrackIndexes.length;

    setCurrentTrackIndex(
      orderedTrackIndexes[nextQueueIndex]
    );
  };

  const previousTrack = () => {
    setPlaybackHistory((history) => {
      if (history.length > 0) {
        const previousIndex =
          history[history.length - 1];

        setCurrentTrackIndex(previousIndex);

        return history.slice(0, -1);
      }

      setCurrentTrackIndex(
        orderedTrackIndexes[
          (currentQueueIndex - 1 +
            orderedTrackIndexes.length) %
            orderedTrackIndexes.length
        ]
      );

      return history;
    });
  };

  const selectTrack = (index) => {
    if (index === currentTrackIndex) {
      return;
    }

    setPlaybackHistory((history) => [
      ...history,
      currentTrackIndex,
    ]);

    setCurrentTrackIndex(index);
  };

  const toggleShuffle = () => {
    setShuffleEnabled((enabled) => {
      const nextEnabled = !enabled;

      setQueueOrder(
        nextEnabled
          ? shuffleTrackIndexes(
              tracks.length,
              currentTrackIndex
            )
          : tracks.map(
              (_, index) => index
            )
      );

      return nextEnabled;
    });
  };

  const cycleRepeatMode = () => {
    setRepeatMode((mode) => {
      if (mode === "off") {
        return "all";
      }

      if (mode === "all") {
        return "one";
      }

      return "off";
    });
  };

  return (
    <div className="app">

      <video
        className="background-video"
        src="/video/background.mp4"
        autoPlay
        muted
        loop
        playsInline
      />

      <div className="video-overlay" />

      <div className="app-clock">
        {formattedClockTime}
      </div>

      <div className="app-listeners">
        <span className="listener-dot" />
        <span>
          {listenerCount}{" "}
          <span className="listener-lonely">
            LONELY
          </span>{" "}
          LISTENERS
        </span>
      </div>

      <div
        className="app-signature"
        aria-hidden="true"
      />

      <Lyrics
        videoId={currentTrack.videoId}
        currentTime={currentTime}
      />

      <MusicPlayer
        tracks={tracks}
        track={currentTrack}
        currentTrackIndex={currentTrackIndex}
        totalTracks={tracks.length}
        shuffleEnabled={shuffleEnabled}
        repeatMode={repeatMode}
        onNext={nextTrack}
        onPrevious={previousTrack}
        onSelectTrack={selectTrack}
        onToggleShuffle={toggleShuffle}
        onCycleRepeatMode={cycleRepeatMode}
        onTimeUpdate={setCurrentTime}
      />

    </div>
  );
}

export default App;
