import { SiteLink } from "../shared/SiteLink";

type GameFooterProps = {
  winningScore: number;
  isTouchMobile: boolean;
};

export function GameFooter({ winningScore, isTouchMobile }: GameFooterProps) {
  const compactMobile = isTouchMobile;

  return (
    <footer
      data-paddle-touch-ignore
      className={`fixed inset-x-0 bottom-0 z-50 flex justify-center ${compactMobile ? "pb-[max(0.5rem,env(safe-area-inset-bottom))]" : "px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"}`}
    >
      {compactMobile ? (
        <div className="text-[10px] font-medium tracking-wide">
          <SiteLink />
        </div>
      ) : (
        <div className="flex w-full max-w-2xl flex-col items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-xs text-neutral-400 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-md">
          <SiteLink />
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
      )}
    </footer>
  );
}
