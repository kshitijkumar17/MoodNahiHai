import { useEffect, useRef, useState } from "react";

const API_BASE_URL = "";

function Lyrics({
  videoId,
  currentTime,
}) {
  const [lyrics, setLyrics] =
    useState(null);

  const [hasTimestamps, setHasTimestamps] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const lyricsContentRef =
    useRef(null);

  const activeLineRef =
    useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchLyrics() {
      setLoading(true);
      setLyrics(null);
      setHasTimestamps(false);

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/lyrics/${videoId}`
        );

        if (!response.ok) {
          throw new Error(
            "Unable to fetch lyrics"
          );
        }

        const data =
          await response.json();

        if (!cancelled) {
          setLyrics(data.lyrics);

          setHasTimestamps(
            data.hasTimestamps === true
          );
        }
      } catch (error) {
        console.error(
          "Lyrics error:",
          error
        );

        if (!cancelled) {
          setLyrics(null);
          setHasTimestamps(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchLyrics();

    return () => {
      cancelled = true;
    };
  }, [videoId]);

  /*
   * Find currently active lyric.
   */
  const getActiveLine = () => {
    if (
      !hasTimestamps ||
      !Array.isArray(lyrics)
    ) {
      return -1;
    }

    const currentTimeMs =
      currentTime * 1000;

    return lyrics.findIndex(
      (line) => {
        const start =
          Number(line.start_time) || 0;

        const end =
          Number(line.end_time) ||
          Infinity;

        return (
          currentTimeMs >= start &&
          currentTimeMs < end
        );
      }
    );
  };

  const activeLine =
    getActiveLine();

  /*
   * Automatically scroll active lyric
   * into the center of the lyrics area.
   */
  useEffect(() => {
    const container =
      lyricsContentRef.current;

    const activeLineElement =
      activeLineRef.current;

    if (
      !container ||
      !activeLineElement ||
      activeLine < 0
    ) {
      return undefined;
    }

    let animationFrameId;

    const targetScrollTop =
      activeLineElement.offsetTop -
      container.clientHeight / 2 +
      activeLineElement.clientHeight / 2;

    const maxScrollTop =
      container.scrollHeight -
      container.clientHeight;

    const clampedTarget =
      Math.max(
        0,
        Math.min(
          targetScrollTop,
          maxScrollTop
        )
      );

    const animateScroll = () => {
      const currentScrollTop =
        container.scrollTop;

      const distance =
        clampedTarget -
        currentScrollTop;

      if (
        Math.abs(distance) < 0.5
      ) {
        container.scrollTop =
          clampedTarget;
        return;
      }

      container.scrollTop =
        currentScrollTop +
        distance * 0.12;

      animationFrameId =
        window.requestAnimationFrame(
          animateScroll
        );
    };

    animationFrameId =
      window.requestAnimationFrame(
        animateScroll
      );

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(
          animationFrameId
        );
      }
    };
  }, [activeLine]);

  /*
   * Loading
   */
  if (loading) {
    return (
      <div className="lyrics-panel">
        <div className="lyrics-loading">
          Loading lyrics...
        </div>
      </div>
    );
  }

  /*
   * No lyrics
   */
  if (!lyrics) {
    return (
      <div className="lyrics-panel lyrics-empty">
        <div className="lyrics-unavailable">
          Lyrics unavailable
        </div>
      </div>
    );
  }

  /*
   * Timestamped lyrics
   */
  if (
    hasTimestamps &&
    Array.isArray(lyrics)
  ) {
    return (
      <div className="lyrics-panel timed-lyrics">
        <div
          ref={lyricsContentRef}
          className="lyrics-content"
        >

          {lyrics.map(
            (line, index) => {
              const isActive =
                index === activeLine;

              const distanceFromActive =
                activeLine >= 0
                  ? Math.min(
                      Math.abs(
                        index -
                          activeLine
                      ),
                      3
                    )
                  : 3;

              return (
                <p
                  key={
                    line.id ??
                    index
                  }
                  ref={
                    isActive
                      ? activeLineRef
                      : null
                  }
                  className={
                    isActive
                      ? "lyric-line active"
                      : "lyric-line"
                  }
                  data-distance={
                    distanceFromActive
                  }
                >
                  {line.text}
                </p>
              );
            }
          )}

        </div>

      </div>
    );
  }

  /*
   * Lyrics without timestamps
   */
  return (
    <div className="lyrics-panel untimed-lyrics">

      <div className="lyrics-content">

        {typeof lyrics === "string" &&
          lyrics
            .split("\n")
            .map(
              (line, index) => (
                <p
                  key={index}
                  className="lyric-line"
                >
                  {line ||
                    "\u00A0"}
                </p>
              )
            )}

      </div>

    </div>
  );
}

export default Lyrics;
