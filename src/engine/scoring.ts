import { BALL_SIZE, CANVAS_HEIGHT } from "../constants";

export type BoundarySide = "left" | "right";

export type BoundaryOutcome = { type: "goal"; scorer: "player" | "ai" } | { type: "wall" };

export function resolveBoundaryOutcome(
  side: BoundarySide,
  ballY: number,
  isGoalMode: boolean,
  goalSizeRatio: number,
): BoundaryOutcome {
  const goalSize = CANVAS_HEIGHT * goalSizeRatio;
  const isGoal =
    !isGoalMode || (ballY + BALL_SIZE > (CANVAS_HEIGHT - goalSize) / 2 && ballY < (CANVAS_HEIGHT + goalSize) / 2);

  if (isGoal) {
    return { type: "goal", scorer: side === "left" ? "ai" : "player" };
  }

  return { type: "wall" };
}

export function isWinningScore(score: number, winningScore: number) {
  return score >= winningScore;
}
