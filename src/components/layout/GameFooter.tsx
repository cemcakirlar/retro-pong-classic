import { SiteLink } from "../shared/SiteLink";

type GameFooterProps = {
  winningScore: number;
  isTouchMobile: boolean;
  isPlaying: boolean;
};

export function GameFooter({ winningScore, isTouchMobile, isPlaying }: GameFooterProps) {
  return (
    <>
      {isPlaying && (
        <div
          data-paddle-touch-ignore
          className={`flex justify-center ${isTouchMobile ? "mt-1 shrink-0 py-1" : "mt-6"}`}
        >
          <SiteLink className="text-[10px] uppercase tracking-widest text-neutral-500 hover:text-cyan-400/90" />
        </div>
      )}

      <div
        className={`flex flex-col items-center gap-2 text-xs text-neutral-600 ${isTouchMobile && isPlaying ? "hidden" : ""} ${isTouchMobile ? "mt-2 shrink-0" : "mt-12"}`}
      >
        <p>FIRST TO {winningScore} POINTS WINS</p>
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <div className="h-2 w-2 bg-white"></div> PLAYER
          </span>
          <span className="flex items-center gap-1">
            <div className="h-2 w-2 bg-white opacity-50"></div> AI
          </span>
        </div>
      </div>
    </>
  );
}
