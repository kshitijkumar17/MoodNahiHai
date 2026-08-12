import { useEffect, useRef, useState } from "react";
import { FaPause, FaPlay, FaStepBackward, FaStepForward } from "react-icons/fa";
import { FaShuffle } from "react-icons/fa6";
import { RiPlayListLine } from "react-icons/ri";

const API_BASE_URL = "";

function MusicPlayer({
  tracks,
  track,
  currentTrackIndex,
  totalTracks,
  shuffleEnabled,
  repeatMode,
  onNext,
  onPrevious,
  onSelectTrack,
  onToggleShuffle,
  onCycleRepeatMode,
  onTimeUpdate,
}) {
  const audioRef = useRef(null);
  const playbackIntentRef = useRef(false);
  const titleViewportRef = useRef(null);
  const artistViewportRef = useRef(null);
  const titleTextRef = useRef(null);
  const artistTextRef = useRef(null);
  const queuePanelRef = useRef(null);
  const queueToggleButtonRef = useRef(null);

  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(
    track.duration_seconds || 0
  );
  const [isLoading, setIsLoading] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] =
    useState(0.8);
  const [showQueue, setShowQueue] =
    useState(true);
  const [isTitleOverflowing, setIsTitleOverflowing] =
    useState(false);
  const [isArtistOverflowing, setIsArtistOverflowing] =
    useState(false);
  const [titleOverflowDistance, setTitleOverflowDistance] =
    useState(0);
  const [artistOverflowDistance, setArtistOverflowDistance] =
    useState(0);

  const title = track.title || "Unknown Song";

  const artist =
    track.artists
      ?.map((artist) => artist.name)
      .join(", ") || "Unknown Artist";
  const artistDisplayText = track.isExplicit
    ? `E ${artist}`
    : artist;

  const artwork =
    track.thumbnails?.[
      track.thumbnails.length - 1
    ]?.url ||
    track.thumbnails?.[0]?.url ||
    "";

  useEffect(() => {
    let cancelled = false;

    async function loadSong() {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      }

      setIsLoading(true);
      setCurrentTime(0);
      setAudioUrl(null);
      setDuration(
        track.duration_seconds || 0
      );

      onTimeUpdate(0);

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/song/${track.videoId}`
        );

        if (!response.ok) {
          throw new Error(
            "Unable to load song"
          );
        }

        const data = await response.json();

        if (!cancelled) {
          setAudioUrl(data.audioUrl);

          if (data.duration) {
            setDuration(
              Number(data.duration)
            );
          }
        }
      } catch (error) {
        console.error(
          "Error loading song:",
          error
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadSong();

    return () => {
      cancelled = true;
    };
  }, [track.videoId, onTimeUpdate]);

  useEffect(() => {
    if (
      !audioRef.current ||
      !audioUrl
    ) {
      return;
    }

    const audio = audioRef.current;

    const handleCanPlay = async () => {
      if (!playbackIntentRef.current) {
        return;
      }

      try {
        await audio.play();
      } catch (error) {
        console.error(
          "Autoplay error:",
          error
        );
      }
    };

    audio.src = audioUrl;
    audio.addEventListener(
      "canplay",
      handleCanPlay,
      { once: true }
    );
    audio.load();

    return () => {
      audio.removeEventListener(
        "canplay",
        handleCanPlay
      );
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!audioRef.current) {
      return;
    }

    audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (!audioRef.current) {
      return;
    }

    audioRef.current.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    const checkOverflow = (
      viewport,
      element,
      setOverflowing,
      setDistance
    ) => {
      if (!viewport || !element) {
        setOverflowing(false);
        setDistance(0);
        return;
      }

      const overflowAmount =
        element.scrollWidth -
        viewport.clientWidth;

      setOverflowing(
        overflowAmount > 0
      );
      setDistance(
        overflowAmount > 0
          ? overflowAmount + 48
          : 0
      );
    };

    const updateOverflow = () => {
      checkOverflow(
        titleViewportRef.current,
        titleTextRef.current,
        setIsTitleOverflowing,
        setTitleOverflowDistance
      );
      checkOverflow(
        artistViewportRef.current,
        artistTextRef.current,
        setIsArtistOverflowing,
        setArtistOverflowDistance
      );
    };

    updateOverflow();

    window.addEventListener(
      "resize",
      updateOverflow
    );

    return () => {
      window.removeEventListener(
        "resize",
        updateOverflow
      );
    };
  }, [title, artistDisplayText]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;

      if (
        target instanceof HTMLElement &&
        (
          target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(
            target.tagName
          )
        )
      ) {
        return;
      }

      if (
        event.code === "Space" &&
        !event.repeat
      ) {
        event.preventDefault();
        void togglePlay();
        return;
      }

      if (event.key === "MediaTrackNext") {
        event.preventDefault();
        onNext();
        return;
      }

      if (event.key === "MediaTrackPrevious") {
        event.preventDefault();
        onPrevious();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [audioUrl, onNext, onPrevious]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) {
      return undefined;
    }

    navigator.mediaSession.setActionHandler(
      "play",
      () => {
        void togglePlay();
      }
    );
    navigator.mediaSession.setActionHandler(
      "pause",
      () => {
        void togglePlay();
      }
    );
    navigator.mediaSession.setActionHandler(
      "nexttrack",
      () => {
        onNext();
      }
    );
    navigator.mediaSession.setActionHandler(
      "previoustrack",
      () => {
        onPrevious();
      }
    );

    return () => {
      navigator.mediaSession.setActionHandler(
        "play",
        null
      );
      navigator.mediaSession.setActionHandler(
        "pause",
        null
      );
      navigator.mediaSession.setActionHandler(
        "nexttrack",
        null
      );
      navigator.mediaSession.setActionHandler(
        "previoustrack",
        null
      );
    };
  }, [onNext, onPrevious, audioUrl]);

  useEffect(() => {
    if (!showQueue) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        queuePanelRef.current?.contains(target) ||
        queueToggleButtonRef.current?.contains(
          target
        )
      ) {
        return;
      }

      setShowQueue(false);
    };

    document.addEventListener(
      "pointerdown",
      handlePointerDown
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown
      );
    };
  }, [showQueue]);

  const togglePlay = async () => {
    if (
      !audioRef.current ||
      !audioUrl
    ) {
      return;
    }

    try {
      if (audioRef.current.paused) {
        playbackIntentRef.current = true;
        await audioRef.current.play();
      } else {
        playbackIntentRef.current = false;
        audioRef.current.pause();
      }
    } catch (error) {
      console.error(
        "Playback error:",
        error
      );
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) {
      return;
    }

    const time =
      audioRef.current.currentTime;

    setCurrentTime(time);
    onTimeUpdate(time);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) {
      return;
    }

    setDuration(
      audioRef.current.duration
    );
  };

  const handleEnded = async () => {
    if (
      repeatMode === "one" &&
      audioRef.current
    ) {
      playbackIntentRef.current = true;
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      onTimeUpdate(0);

      try {
        await audioRef.current.play();
      } catch (error) {
        console.error(
          "Repeat playback error:",
          error
        );
      }

      return;
    }

    setCurrentTime(0);
    onTimeUpdate(0);
    playbackIntentRef.current = true;
    onNext();
  };

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) {
      return "0:00";
    }

    const minutes =
      Math.floor(seconds / 60);

    const remainingSeconds =
      Math.floor(seconds % 60)
        .toString()
        .padStart(2, "0");

    return `${minutes}:${remainingSeconds}`;
  };

  const handleSeek = (event) => {
    if (
      !audioRef.current ||
      !duration
    ) {
      return;
    }

    const rect =
      event.currentTarget.getBoundingClientRect();

    const clickPosition =
      event.clientX - rect.left;

    const percentage =
      clickPosition / rect.width;

    const newTime =
      percentage * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    onTimeUpdate(newTime);
  };

  const getRepeatLabel = () => {
    if (repeatMode === "one") {
      return "Repeat One";
    }

    if (repeatMode === "all") {
      return "Repeat All";
    }

    return "Repeat Off";
  };

  const progressPercentage =
    duration > 0
      ? (currentTime / duration) * 100
      : 0;

  return (
    <div className="music-player">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={
          handleLoadedMetadata
        }
        onEnded={handleEnded}
        onPlay={() => {
          playbackIntentRef.current = true;
          setIsPlaying(true);
        }}
        onPause={() => {
          playbackIntentRef.current = false;
          setIsPlaying(false);
        }}
      />

      <div
        className={
          showQueue
            ? "player-shell"
            : "player-shell queue-hidden"
        }
        >
        <div className="player-main">
          {/* <div className="player-header">
            <div className="player-header-actions">
              <span className="track-counter">
                {currentTrackIndex + 1}
                {" / "}
                {totalTracks}
              </span>
            </div>
          </div> */}

          <div className="player-middle">
            <div className="now-playing">
              <div className="album-art large">
                {artwork && (
                  <img
                    src={artwork}
                    alt={`${title} artwork`}
                  />
                )}
              </div>

              <div className="track-info">
                <div
                  ref={titleViewportRef}
                  className="track-line"
                >
                  <h2
                    className={
                      isTitleOverflowing
                        ? "track-marquee"
                        : ""
                    }
                    style={
                      isTitleOverflowing
                        ? {
                            "--marquee-distance": `${titleOverflowDistance}px`,
                          }
                        : undefined
                    }
                  >
                    <span
                      ref={titleTextRef}
                      className="track-marquee-content"
                    >
                      {title}
                    </span>

                    {isTitleOverflowing && (
                      <span
                        aria-hidden="true"
                        className="track-marquee-content duplicate"
                      >
                        {title}
                      </span>
                    )}
                  </h2>
                </div>

                <div
                  ref={artistViewportRef}
                  className="track-line artist-line"
                >
                  <p
                    className={
                      isArtistOverflowing
                        ? "track-marquee"
                        : ""
                    }
                    style={
                      isArtistOverflowing
                        ? {
                            "--marquee-distance": `${artistOverflowDistance}px`,
                          }
                        : undefined
                    }
                  >
                    <span
                      ref={artistTextRef}
                      className="track-marquee-content"
                    >
                      {track.isExplicit && (
                        <span className="explicit-badge">
                          E
                        </span>
                      )}
                      <span>{artist}</span>
                    </span>

                    {isArtistOverflowing && (
                      <span
                        aria-hidden="true"
                        className="track-marquee-content duplicate"
                      >
                        {track.isExplicit && (
                          <span className="explicit-badge">
                            E
                          </span>
                        )}
                        <span>{artist}</span>
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="progress-container">
              <span>
                {formatTime(
                  currentTime
                )}
              </span>

              <div
                className="progress-bar"
                onClick={handleSeek}
              >
                <div
                  className="progress"
                  style={{
                    width: `${progressPercentage}%`,
                  }}
                />
              </div>

              <span>
                {formatTime(duration)}
              </span>
            </div>

            <div className="transport-row">
              <button
                className={
                  shuffleEnabled
                    ? "mode-button active"
                    : "mode-button"
                }
                onClick={onToggleShuffle}
                aria-label="Toggle shuffle"
              >
                <FaShuffle />
              </button>

              <button
                className="secondary-button"
                onClick={onPrevious}
                aria-label="Previous song"
              >
                {/* <FaStepBackward /> */}
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"></path>
                </svg>
              </button>

              <button
                className="play-button"
                onClick={togglePlay}
                disabled={
                  isLoading ||
                  !audioUrl
                }
                aria-label={
                  isPlaying
                    ? "Pause"
                    : "Play"
                }
              >
                {isLoading
                  ? "..."
                  : isPlaying
                    ? <svg className="i-pause" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
                <path d="M6 5h4v14H6zm8 0h4v14h-4z"></path>
              </svg>
                    : <svg className="i-play" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z"></path>
              </svg>}
              </button>

              <button
                className="secondary-button"
                onClick={onNext}
                aria-label="Next song"
              >
                {/* <FaStepForward /> */}
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                  <path d="M16 6h2v12h-2zm-2 6L5.5 6v12z"></path>
                </svg>
              </button>

              <button
                ref={queueToggleButtonRef}
                className={
                  showQueue
                    ? "mode-button active"
                    : "mode-button"
                }
                onClick={() =>
                  setShowQueue(
                    (visible) => !visible
                  )
                }
                aria-label={
                  showQueue
                    ? "Hide queue"
                    : "Show queue"
                }
              >
                <RiPlayListLine />
              </button>
            </div>
          </div>
        </div>

        <aside
          ref={queuePanelRef}
          className={
            showQueue
              ? "queue-panel open"
              : "queue-panel"
          }
          aria-hidden={!showQueue}
        >
          <div className="queue-list">
            {tracks.map(
              (queueTrack, index) => {
                const queueArtist =
                  queueTrack.artists
                    ?.map(
                      (artist) =>
                        artist.name
                    )
                    .join(", ") ||
                  "Unknown Artist";
                const queueArtistDisplay =
                  queueTrack.isExplicit;

                const isCurrent =
                  index ===
                  currentTrackIndex;

                return (
                  <button
                    key={
                      queueTrack.videoId ??
                      index
                    }
                    className={
                      isCurrent
                        ? "queue-item active"
                        : "queue-item"
                    }
                    onClick={() =>
                      onSelectTrack(index)
                    }
                  >
                    <span className="queue-index">
                      {isCurrent
                        ? "Now"
                        : index + 1}
                    </span>

                    <span className="queue-copy">
                      <strong>
                        {queueTrack.title}
                      </strong>
                      <span>
                        {queueArtistDisplay && (
                          <span className="explicit-badge">
                            E
                          </span>
                        )}
                        <span>{queueArtist}</span>
                      </span>
                    </span>
                  </button>
                );
              }
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default MusicPlayer;
