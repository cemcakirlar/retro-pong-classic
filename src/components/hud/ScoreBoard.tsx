type ScoreBoardProps = {
  playerScore: number;
  aiScore: number;
};

export function ScoreBoard({ playerScore, aiScore }: ScoreBoardProps) {
  return (
    <div
      className="pointer-events-none absolute left-0 right-0 top-8 z-10 flex select-none justify-around text-6xl font-bold opacity-50"
      aria-live="polite"
      aria-label={`Score: Player ${playerScore}, AI ${aiScore}`}
    >
      <span>{playerScore}</span>
      <span>{aiScore}</span>
    </div>
  );
}
