import { BALL_SIZE, CANVAS_HEIGHT, CANVAS_WIDTH, PADDLE_HEIGHT, PADDLE_OFFSET, PADDLE_WIDTH } from "../constants";

export type PaddleCollision = { paddle: "player" | "ai"; hitSide: "front" | "back" } | null;

export type BoundarySide = "left" | "right" | null;

export type Vec2 = { x: number; y: number };

export function resetBall(ballPos: Vec2, ballVel: Vec2, direction: number) {
  ballPos.x = CANVAS_WIDTH / 2;
  ballPos.y = CANVAS_HEIGHT / 2;
  ballVel.x = 5 * direction;
  ballVel.y = (Math.random() - 0.5) * 10;
}

export function capBallVelocity(ballVel: Vec2, maxSpeed: number = 25) {
  const velocityMagnitude = Math.sqrt(ballVel.x ** 2 + ballVel.y ** 2);
  if (velocityMagnitude <= maxSpeed) return;
  const ratio = maxSpeed / velocityMagnitude;
  ballVel.x *= ratio;
  ballVel.y *= ratio;
}

export function getSubStepCount(ballVel: Vec2) {
  const maxStepSize = BALL_SIZE / 2;
  return Math.max(5, Math.ceil(Math.max(Math.abs(ballVel.x), Math.abs(ballVel.y)) / maxStepSize));
}

export function applyTopBottomWallCollision(ballPos: Vec2, ballVel: Vec2) {
  if (ballPos.y <= 0) {
    ballPos.y = 1;
    ballVel.y *= -1;
    return true;
  }

  if (ballPos.y >= CANVAS_HEIGHT - BALL_SIZE) {
    ballPos.y = CANVAS_HEIGHT - BALL_SIZE - 1;
    ballVel.y *= -1;
    return true;
  }

  return false;
}

export function resolvePaddleCollision(
  ballPos: Vec2,
  ballVel: Vec2,
  playerPaddleY: number,
  aiPaddleY: number,
  isGoalMode: boolean,
): PaddleCollision {
  const currentOffset = isGoalMode ? PADDLE_OFFSET : 0;

  const playerPaddleX = currentOffset;
  if (
    ballPos.x <= playerPaddleX + PADDLE_WIDTH &&
    ballPos.x + BALL_SIZE >= playerPaddleX &&
    ballPos.y + BALL_SIZE >= playerPaddleY &&
    ballPos.y <= playerPaddleY + PADDLE_HEIGHT
  ) {
    const ballCenterX = ballPos.x + BALL_SIZE / 2;
    const paddleCenterX = playerPaddleX + PADDLE_WIDTH / 2;
    const speedMult = isGoalMode && ballPos.x < playerPaddleX ? 1.02 : 1.05;

    if (ballVel.x < 0 && ballCenterX > paddleCenterX) {
      ballVel.x *= -speedMult;
      const deltaY = ballPos.y - (playerPaddleY + PADDLE_HEIGHT / 2);
      ballVel.y = deltaY * 0.2;
      ballPos.x = playerPaddleX + PADDLE_WIDTH + 1;
      return { paddle: "player", hitSide: "front" };
    }

    if (ballVel.x > 0 && ballCenterX < paddleCenterX) {
      ballVel.x *= -speedMult;
      ballPos.x = playerPaddleX - BALL_SIZE - 1;
      return { paddle: "player", hitSide: "back" };
    }
  }

  const aiPaddleX = CANVAS_WIDTH - currentOffset - PADDLE_WIDTH;
  if (
    ballPos.x + BALL_SIZE >= aiPaddleX &&
    ballPos.x <= aiPaddleX + PADDLE_WIDTH &&
    ballPos.y + BALL_SIZE >= aiPaddleY &&
    ballPos.y <= aiPaddleY + PADDLE_HEIGHT
  ) {
    const ballCenterX = ballPos.x + BALL_SIZE / 2;
    const paddleCenterX = aiPaddleX + PADDLE_WIDTH / 2;
    const speedMult = isGoalMode && ballPos.x > aiPaddleX ? 1.02 : 1.05;

    if (ballVel.x > 0 && ballCenterX < paddleCenterX) {
      ballVel.x *= -speedMult;
      const deltaY = ballPos.y - (aiPaddleY + PADDLE_HEIGHT / 2);
      ballVel.y = deltaY * 0.2;
      ballPos.x = aiPaddleX - BALL_SIZE - 1;
      return { paddle: "ai", hitSide: "front" };
    }

    if (ballVel.x < 0 && ballCenterX > paddleCenterX) {
      ballVel.x *= -speedMult;
      ballPos.x = aiPaddleX + PADDLE_WIDTH + 1;
      return { paddle: "ai", hitSide: "back" };
    }
  }

  return null;
}

export function detectHorizontalOutOfBounds(ballPos: Vec2): BoundarySide {
  if (ballPos.x < 0) return "left";
  if (ballPos.x > CANVAS_WIDTH - BALL_SIZE) return "right";
  return null;
}

export function reflectHorizontalFromBoundary(ballPos: Vec2, ballVel: Vec2, side: "left" | "right") {
  ballVel.x *= -1;
  if (side === "left") {
    ballPos.x = 1;
  } else {
    ballPos.x = CANVAS_WIDTH - BALL_SIZE - 1;
  }
}
