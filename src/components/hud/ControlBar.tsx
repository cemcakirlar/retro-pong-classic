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
  const controlsPositionClass = isTouchMobile ? "absolute top-4 left-4 right-4" : "fixed top-4 left-4";
  const pausePositionClass = isTouchMobile ? "absolute top-4 right-4" : "fixed top-4 right-4";
  const baseControlButtonClass =
    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 transition-colors";

  return (
    <>
      <div data-paddle-touch-ignore className={`${controlsPositionClass} z-10 flex gap-2`}>
        <button
          type="button"
          onClick={onToggleMuted}
          className={`${baseControlButtonClass} bg-white/10 hover:bg-white/20`}
          title="Toggle Sound"
          aria-label="Toggle sound"
          aria-pressed={!isMuted}
        >
          {isMuted ? <VolumeX size={20} aria-hidden="true" /> : <Volume2 size={20} aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={onToggleFullscreen}
          className={`${baseControlButtonClass} bg-white/10 hover:bg-white/20`}
          title="Toggle Fullscreen"
          aria-label="Toggle fullscreen"
        >
          <Maximize size={20} aria-hidden="true" />
        </button>
        {isPlaying && (
          <button
            type="button"
            onClick={onToggleEffects}
            className={`${baseControlButtonClass} ${
              showEffects ? "bg-purple-500/20 text-purple-400" : "bg-white/10 hover:bg-white/20"
            }`}
            title="Toggle Effects"
            aria-label="Toggle visual effects"
            aria-pressed={showEffects}
          >
            <motion.div animate={reduceMotion ? { rotate: 0 } : { rotate: showEffects ? 0 : 45 }}>
              <RotateCcw size={20} aria-hidden="true" />
            </motion.div>
          </button>
        )}
      </div>

      {isPlaying && (
        <button
          type="button"
          data-paddle-touch-ignore
          onClick={onPause}
          className={`${pausePositionClass} z-10 ${baseControlButtonClass} bg-white/10 hover:bg-white/20`}
          aria-label="Pause game"
        >
          <Pause size={20} aria-hidden="true" />
        </button>
      )}
    </>
  );
}
