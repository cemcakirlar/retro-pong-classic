import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Trophy, RotateCcw } from "lucide-react";

type GameOverOverlayProps = {
  winner: "player" | "ai" | null;
  playerScore: number;
  aiScore: number;
  onRestart: () => void;
  reduceMotion: boolean;
};

const menuOverlayShell = "fixed inset-0 z-40 flex overflow-hidden";
const menuOverlayScroll =
  "h-full w-full overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch] [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))] [padding-bottom:max(1rem,env(safe-area-inset-bottom))] [padding-top:max(0.5rem,env(safe-area-inset-top))]";
const menuOverlayInner = "mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center py-4 sm:py-6";

export function GameOverOverlay({ winner, playerScore, aiScore, onRestart, reduceMotion }: GameOverOverlayProps) {
  const restartButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    restartButtonRef.current?.focus();
  }, []);

  const shellProps = {
    role: "dialog" as const,
    "aria-modal": true,
    "aria-labelledby": "game-over-title",
    className: `${menuOverlayShell} bg-emerald-950/65 backdrop-blur-[2px]`,
  };

  const content = (
    <>
      <Trophy className={`mb-4 h-20 w-20 ${winner === "player" ? "text-yellow-400" : "text-neutral-600"}`} />
      <h2 id="game-over-title" className="mb-2 text-4xl font-bold">
        {winner === "player" ? "YOU WIN!" : "AI WINS!"}
      </h2>
      <p className="mb-8 text-neutral-400">
        Final Score: {playerScore} - {aiScore}
      </p>
      <button
        ref={restartButtonRef}
        onClick={onRestart}
        className="flex min-h-11 items-center gap-2 rounded-full bg-white px-8 py-4 font-bold text-black transition-colors hover:bg-neutral-200"
      >
        <RotateCcw />
        PLAY AGAIN
      </button>
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
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      {...shellProps}
    >
      <div className={menuOverlayScroll}>
        <div className={menuOverlayInner}>{content}</div>
      </div>
    </motion.div>
  );
}
