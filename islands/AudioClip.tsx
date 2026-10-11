import { useRef, useState } from "preact/hooks";
import { Pause, Play } from "lucide-preact";

// Bar heights (percent) of the decorative waveform.
const WAVE = [
  20,
  45,
  75,
  40,
  65,
  25,
  90,
  50,
  30,
  70,
  45,
  20,
  55,
  85,
  40,
  65,
  25,
  50,
  75,
  30,
  55,
  20,
  40,
];

/** A play/pause button for a short audio clip. One clip plays at a time. */
export default function AudioClip({ src, label }: {
  src: string;
  /** What's playing, for the button's label, e.g. "Snoop Dogg's endorsement". */
  label: string;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  function toggle() {
    const el = audio.current;
    if (!el) return;
    if (!el.paused) {
      el.pause();
      return;
    }
    document.querySelectorAll("audio").forEach((other) => {
      if (other !== el) other.pause();
    });
    el.play().catch((error) => console.error("Failed to play audio:", error));
  }

  return (
    <div class="flex items-center gap-4 rounded-box border border-base-300 bg-base-200 py-2 pl-2 pr-4">
      <audio
        ref={audio}
        src={src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        class="btn btn-primary btn-circle shrink-0"
        aria-label={`${playing ? "Pause" : "Play"} ${label}`}
        onClick={toggle}
      >
        {playing
          ? <Pause class="size-5 fill-current" />
          : <Play class="size-5 fill-current" />}
      </button>
      <div
        class="flex h-8 min-w-0 flex-1 items-center gap-[3px] overflow-hidden"
        aria-hidden="true"
      >
        {WAVE.map((height, i) => (
          <span
            key={i}
            class={`w-[3px] shrink-0 rounded-full ${
              playing ? "bg-secondary" : "bg-base-content/25"
            }`}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <span class="shrink-0 font-mono text-xs text-base-content/60">
        {playing ? "ON AIR" : "PLAY"}
      </span>
    </div>
  );
}
