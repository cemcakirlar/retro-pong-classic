import { BALL_SIZE, CANVAS_HEIGHT, DIFFICULTY_CONFIG, type Difficulty, PADDLE_HEIGHT } from "../constants";

export function updateAiPaddleY(currentY: number, ballY: number, difficulty: Difficulty) {
  const config = DIFFICULTY_CONFIG[difficulty];
  const aiTarget = ballY - PADDLE_HEIGHT / 2 + BALL_SIZE / 2;
  const dy = aiTarget - currentY;

  if (Math.abs(dy) <= 5) {
    return currentY;
  }

  const moveStep = Math.min(Math.abs(dy), config.aiSpeed);
  const nextY = currentY + Math.sign(dy) * moveStep;
  return Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, nextY));
}
