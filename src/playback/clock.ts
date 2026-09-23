export interface Playback {
  time: number;
  duration: number;
  ad: boolean;
  seeking: boolean;
  paused: boolean;
  rate: number;
}

export function observePlayback(
  video: HTMLVideoElement,
  player: Element,
  emit: (state: Playback) => void,
) {
  const sample = () =>
    emit({
      time: video.currentTime,
      duration: video.duration,
      ad: player.classList.contains("ad-showing"),
      seeking: video.seeking,
      paused: video.paused,
      rate: video.playbackRate,
    });
  const events = [
    "timeupdate",
    "seeking",
    "seeked",
    "durationchange",
    "loadedmetadata",
    "play",
    "pause",
    "emptied",
    "ratechange",
  ];
  for (const event of events) video.addEventListener(event, sample);
  const observer = new MutationObserver(sample);
  observer.observe(player, { attributes: true, attributeFilter: ["class"] });
  sample();
  return () => {
    for (const event of events) video.removeEventListener(event, sample);
    observer.disconnect();
  };
}
