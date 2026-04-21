type GameStatusAnnouncerProps = {
  gameState: "start" | "playing" | "paused" | "gameOver";
  playerScore: number;
  aiScore: number;
  winner: "player" | "ai" | null;
};

export function GameStatusAnnouncer({ gameState, playerScore, aiScore, winner }: GameStatusAnnouncerProps) {
  let status = "Pong ready.";

  if (gameState === "playing") {
    status = `Game in progress. Player ${playerScore}, AI ${aiScore}.`;
  } else if (gameState === "paused") {
    status = `Game paused. Score is ${playerScore}-${aiScore}.`;
  } else if (gameState === "gameOver") {
    status =
      winner === "player"
        ? `You win. Final score ${playerScore}-${aiScore}.`
        : `AI wins. Final score ${playerScore}-${aiScore}.`;
  }

  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {status}
    </div>
  );
}
