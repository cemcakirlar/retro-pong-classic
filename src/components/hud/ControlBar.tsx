import { motion } from "motion/react";
import { Maximize, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";

type ControlBarProps = {
  isMuted: boolean;
  onToggleMuted: () => void;
  showEffects: boolean;
  onToggleEffects: () => void;
  isPlaying: boolean;
  onToggleFullscreen: () => void;
  onPause: () => void;
  isTouchMobile: boolean;
  reduceMotion: boolean;
};

export function ControlBar({
  isMuted,
  onToggleMuted,
  showEffects,
  onToggleEffects,
  isPlaying,
  onToggleFullscreen,
  onPause,
  isTouchMobile,
  reduceMotion,
}: ControlBarProps) {
  const overlaySafeX = isTouchMobile ? "left-4 right-4" : "left-4";
  const pauseSafeRight = isTouchMobile ? "right-4" : "right-4";

  return (
    <>
      <div data-paddle-touch-ignore className={`absolute top-4 ${overlaySafeX} z-10 flex gap-2`}>
        <button
          onClick={onToggleMuted}
          className="min-h-11 min-w-11 rounded-full bg-white/10 p-2 transition-colors hover:bg-white/20"
          title="Toggle Sound"
          aria-label="Toggle sound"
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <button
          onClick={onToggleFullscreen}
          className="min-h-11 min-w-11 rounded-full bg-white/10 p-2 transition-colors hover:bg-white/20"
          title="Toggle Fullscreen"
          aria-label="Toggle fullscreen"
        >
          <Maximize size={20} />
        </button>
        {isPlaying && (
          <button
            onClick={onToggleEffects}
            className={`rounded-full p-2 transition-colors ${
              showEffects ? "bg-purple-500/20 text-purple-400" : "bg-white/10 hover:bg-white/20"
            }`}
            title="Toggle Effects"
            aria-label="Toggle visual effects"
          >
            <motion.div animate={reduceMotion ? { rotate: 0 } : { rotate: showEffects ? 0 : 45 }}>
              <RotateCcw size={20} />
            </motion.div>
          </button>
        )}
      </div>

      {isPlaying && (
        <button
          type="button"
          data-paddle-touch-ignore
          onClick={onPause}
          className={`absolute top-4 ${pauseSafeRight} z-10 min-h-11 min-w-11 rounded-full bg-white/10 p-2 transition-colors hover:bg-white/20`}
          aria-label="Pause game"
        >
          <Pause size={20} />
        </button>
      )}
    </>
  );
}
