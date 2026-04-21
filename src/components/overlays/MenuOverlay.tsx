import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Maximize, Play, Volume2, VolumeX } from "lucide-react";
import { type Difficulty, MAX_WINNING_SCORE, MIN_WINNING_SCORE } from "../../constants";

type CanvasSize = "small" | "medium" | "large";

type MenuOverlayProps = {
  difficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
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
  customScoreInput: string;
  onCustomScoreInputChange: (value: string) => void;
  canvasSize: CanvasSize;
  onCanvasSizeChange: (size: CanvasSize) => void;
  onToggleFullscreen: () => void;
  onStartGame: () => void;
  reduceMotion: boolean;
};

const menuOverlayShell = "fixed inset-0 z-40 flex overflow-hidden";
const menuOverlayScroll =
  "h-full w-full overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch] [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))] [padding-bottom:max(1rem,env(safe-area-inset-bottom))] [padding-top:max(0.5rem,env(safe-area-inset-top))]";
const menuOverlayInner = "mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center py-4 sm:py-6";

export function MenuOverlay({
  difficulty,
  onDifficultyChange,
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
  customScoreInput,
  onCustomScoreInputChange,
  canvasSize,
  onCanvasSizeChange,
  onToggleFullscreen,
  onStartGame,
  reduceMotion,
}: MenuOverlayProps) {
  const startButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    startButtonRef.current?.focus();
  }, []);

  const shellProps = {
    role: "dialog" as const,
    "aria-modal": true,
    "aria-labelledby": "menu-title",
    className: `${menuOverlayShell} bg-emerald-950/65 backdrop-blur-[2px]`,
  };

  const content = (
    <>
      <h1 id="menu-title" className="mb-4 text-6xl font-black italic tracking-tighter">
        PONG
      </h1>

      <div className="mb-8 flex gap-2">
        {(["easy", "medium", "hard"] as Difficulty[]).map((nextDifficulty) => (
          <button
            key={nextDifficulty}
            onClick={() => onDifficultyChange(nextDifficulty)}
            className={`rounded border px-4 py-1 text-xs uppercase tracking-widest transition-all ${
              difficulty === nextDifficulty
                ? "border-white bg-white text-black"
                : "border-white/20 bg-transparent text-white hover:border-white/50"
            }`}
          >
            {nextDifficulty}
          </button>
        ))}
      </div>

      <div className="mb-8 flex gap-4">
        <button
          onClick={onToggleMuted}
          className={`min-h-11 flex items-center gap-2 rounded-lg border px-4 py-2 text-xs uppercase tracking-widest transition-all ${
            !isMuted ? "border-white/20 bg-white/10" : "border-red-500/50 bg-red-500/20 text-red-400"
          }`}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          SOUND: {isMuted ? "OFF" : "ON"}
        </button>
        <button
          onClick={onToggleEffects}
          className={`min-h-11 flex items-center gap-2 rounded-lg border px-4 py-2 text-xs uppercase tracking-widest transition-all ${
            showEffects ? "border-purple-500/50 bg-purple-500/20 text-purple-400" : "border-white/20 bg-white/10"
          }`}
        >
          EFFECTS: {showEffects ? "ON" : "OFF"}
        </button>
        <button
          onClick={onToggleGoalMode}
          className={`min-h-11 flex items-center gap-2 rounded-lg border px-4 py-2 text-xs uppercase tracking-widest transition-all ${
            isGoalMode ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-400" : "border-white/20 bg-white/10"
          }`}
        >
          GOAL MODE: {isGoalMode ? "ON" : "OFF"}
        </button>
      </div>

      {isGoalMode && (
        <div className="mb-8 flex flex-col items-center gap-3">
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

      <div className="mb-8 flex flex-col items-center gap-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Winning Score</p>
        <div className="flex flex-wrap justify-center gap-2">
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
          <div className="ml-2 flex items-center gap-1">
            <input
              type="number"
              value={customScoreInput}
              min={MIN_WINNING_SCORE}
              max={MAX_WINNING_SCORE}
              onChange={(e) => onCustomScoreInputChange(e.target.value)}
              className={`w-12 rounded border px-2 py-1 text-center text-[10px] outline-none transition-all ${
                ![5, 11, 15, 21].includes(winningScore) ? "border-white text-white" : "border-white/20 text-white/50"
              }`}
              aria-label="Custom winning score"
              placeholder="?"
            />
          </div>
        </div>
      </div>

      <div className="mb-8 flex flex-col items-center gap-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Screen & Size</p>
        <div className="flex gap-4">
          <button
            onClick={onToggleFullscreen}
            className="min-h-11 flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-widest transition-all hover:bg-white/20"
          >
            <Maximize size={16} />
            FULLSCREEN
          </button>
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
      </div>

      <button
        ref={startButtonRef}
        onClick={onStartGame}
        className="group flex min-h-11 items-center gap-2 rounded-full bg-white px-8 py-4 font-bold text-black transition-colors hover:bg-neutral-200"
      >
        <Play className="fill-current" />
        START GAME
      </button>
      <p className="mt-8 text-sm uppercase tracking-widest text-neutral-500">USE MOUSE OR TOUCH TO MOVE</p>
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} {...shellProps}>
      <div className={menuOverlayScroll}>
        <div className={menuOverlayInner}>{content}</div>
      </div>
    </motion.div>
  );
}
