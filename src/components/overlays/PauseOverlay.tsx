import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Home, Maximize, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";

type CanvasSize = "small" | "medium" | "large";

type PauseOverlayProps = {
  isMuted: boolean;
  onToggleMuted: () => void;
  showEffects: boolean;
  onToggleEffects: () => void;
  isGoalMode: boolean;
  onToggleGoalMode: () => void;
  goalSizeRatio: number;
  onGoalSizeRatioChange: (ratio: number) => void;
  winningScore: number;
  onWinningScoreChange: (score: number) => void;
  canvasSize: CanvasSize;
  onCanvasSizeChange: (size: CanvasSize) => void;
  onToggleFullscreen: () => void;
  onRestart: () => void;
  onHome: () => void;
  onResume: () => void;
  reduceMotion: boolean;
};

const menuOverlayShell = "fixed inset-0 z-40 flex overflow-hidden";
const menuOverlayScroll =
  "h-full w-full overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch] [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))] [padding-bottom:max(1rem,env(safe-area-inset-bottom))] [padding-top:max(0.5rem,env(safe-area-inset-top))]";
const menuOverlayInner = "mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center py-4 sm:py-6";

export function PauseOverlay({
  isMuted,
  onToggleMuted,
  showEffects,
  onToggleEffects,
  isGoalMode,
  onToggleGoalMode,
  goalSizeRatio,
  onGoalSizeRatioChange,
  winningScore,
  onWinningScoreChange,
  canvasSize,
  onCanvasSizeChange,
  onToggleFullscreen,
  onRestart,
  onHome,
  onResume,
  reduceMotion,
}: PauseOverlayProps) {
  const resumeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    resumeButtonRef.current?.focus();
  }, []);

  const shellProps = {
    role: "dialog" as const,
    "aria-modal": true,
    "aria-labelledby": "pause-title",
    className: `${menuOverlayShell} bg-emerald-950/65 backdrop-blur-[2px]`,
  };

  const content = (
    <>
      <h2 id="pause-title" className="mb-4 text-4xl font-bold italic sm:mb-8">
        PAUSED
      </h2>

      <div className="mb-5 flex flex-col items-center gap-4 sm:mb-8 sm:gap-6">
        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={onToggleFullscreen}
            className="min-h-11 flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-[10px] uppercase tracking-widest transition-all"
          >
            <Maximize size={14} />
            FULLSCREEN
          </button>
          <button
            onClick={onToggleMuted}
            className={`min-h-11 flex items-center gap-2 rounded-lg border px-4 py-2 text-[10px] uppercase tracking-widest transition-all ${
              !isMuted ? "border-white/20 bg-white/10" : "border-red-500/50 bg-red-500/20 text-red-400"
            }`}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            SOUND: {isMuted ? "OFF" : "ON"}
          </button>
          <button
            onClick={onToggleEffects}
            className={`min-h-11 flex items-center gap-2 rounded-lg border px-4 py-2 text-[10px] uppercase tracking-widest transition-all ${
              showEffects ? "border-purple-500/50 bg-purple-500/20 text-purple-400" : "border-white/20 bg-white/10"
            }`}
          >
            EFFECTS: {showEffects ? "ON" : "OFF"}
          </button>
          <button
            onClick={onToggleGoalMode}
            className={`min-h-11 flex items-center gap-2 rounded-lg border px-4 py-2 text-[10px] uppercase tracking-widest transition-all ${
              isGoalMode ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-400" : "border-white/20 bg-white/10"
            }`}
          >
            GOAL MODE: {isGoalMode ? "ON" : "OFF"}
          </button>
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Game Size</p>
          <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
            {(["small", "medium", "large"] as const).map((size) => (
              <button
                key={size}
                onClick={() => onCanvasSizeChange(size)}
                className={`min-h-11 rounded px-3 py-1 text-[10px] uppercase transition-all ${
                  canvasSize === size ? "bg-white text-black" : "text-white/50 hover:text-white"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {isGoalMode && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Goal Size</p>
            <div className="flex gap-2">
              {[0.2, 0.33, 0.5, 0.75].map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => onGoalSizeRatioChange(ratio)}
                  className={`min-h-11 rounded border px-3 py-1 text-[10px] transition-all ${
                    goalSizeRatio === ratio
                      ? "border-cyan-500 bg-cyan-500 text-white"
                      : "border-white/20 bg-transparent text-white hover:border-white/50"
                  }`}
                >
                  {Math.round(ratio * 100)}%
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Winning Score</p>
          <div className="flex gap-2">
            {[5, 11, 15, 21].map((score) => (
              <button
                key={score}
                onClick={() => onWinningScoreChange(score)}
                className={`min-h-11 rounded border px-3 py-1 text-[10px] transition-all ${
                  winningScore === score
                    ? "border-white bg-white text-black"
                    : "border-white/20 bg-transparent text-white hover:border-white/50"
                }`}
              >
                {score}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={onHome}
          className="flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 font-bold text-white transition-colors hover:bg-white/20"
        >
          <Home size={18} />
          HOME
        </button>
        <button
          onClick={onRestart}
          className="flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 font-bold text-white transition-colors hover:bg-white/20"
        >
          <RotateCcw size={18} />
          START OVER
        </button>
        <button
          ref={resumeButtonRef}
          onClick={onResume}
          className="flex min-h-11 items-center gap-2 rounded-full bg-white px-8 py-4 font-bold text-black transition-colors hover:bg-neutral-200"
        >
          <Play className="fill-current" />
          RESUME
        </button>
      </div>
    </>
  );

  if (reduceMotion) {
    return (
      <div {...shellProps}>
        <div className={menuOverlayScroll}>
          <div className={menuOverlayInner}>{content}</div>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} {...shellProps}>
      <div className={menuOverlayScroll}>
        <div className={menuOverlayInner}>{content}</div>
      </div>
    </motion.div>
  );
}
