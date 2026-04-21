import { describe, expect, it, vi } from "vitest";
import {
  applyTopBottomWallCollision,
  capBallVelocity,
  detectHorizontalOutOfBounds,
  getSubStepCount,
  reflectHorizontalFromBoundary,
  resetBall,
  resolvePaddleCollision,
  type Vec2,
} from "./physics";

describe("resetBall", () => {
  it("resets to center and serves with direction", () => {
    const ballPos: Vec2 = { x: 12, y: 45 };
    const ballVel: Vec2 = { x: -8, y: 2 };
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.75);

    resetBall(ballPos, ballVel, -1);

    expect(ballPos).toEqual({ x: 400, y: 300 });
    expect(ballVel.x).toBe(-5);
    expect(ballVel.y).toBe(2.5);

    randomSpy.mockRestore();
  });
});

describe("capBallVelocity", () => {
  it("keeps velocity under max speed", () => {
    const ballVel: Vec2 = { x: 30, y: 40 };
    capBallVelocity(ballVel, 25);
    const mag = Math.sqrt(ballVel.x ** 2 + ballVel.y ** 2);
    expect(mag).toBeCloseTo(25, 6);
  });
});

describe("getSubStepCount", () => {
  it("returns at least 5", () => {
    expect(getSubStepCount({ x: 1, y: 1 })).toBe(5);
  });

  it("increases for high speed", () => {
    expect(getSubStepCount({ x: 30, y: 2 })).toBeGreaterThan(5);
  });
});

describe("applyTopBottomWallCollision", () => {
  it("bounces on top wall", () => {
    const ballPos: Vec2 = { x: 10, y: 0 };
    const ballVel: Vec2 = { x: 2, y: -3 };
    const hit = applyTopBottomWallCollision(ballPos, ballVel);
    expect(hit).toBe(true);
    expect(ballPos.y).toBe(1);
    expect(ballVel.y).toBe(3);
  });

  it("returns false when no collision", () => {
    const ballPos: Vec2 = { x: 10, y: 100 };
    const ballVel: Vec2 = { x: 2, y: 3 };
    const hit = applyTopBottomWallCollision(ballPos, ballVel);
    expect(hit).toBe(false);
  });
});

describe("resolvePaddleCollision", () => {
  it("detects player front collision", () => {
    const ballPos: Vec2 = { x: 8, y: 280 };
    const ballVel: Vec2 = { x: -5, y: 0 };
    const hit = resolvePaddleCollision(ballPos, ballVel, 260, 260, false);

    expect(hit).toEqual({ paddle: "player", hitSide: "front" });
    expect(ballVel.x).toBeGreaterThan(0);
  });

  it("returns null when there is no paddle collision", () => {
    const ballPos: Vec2 = { x: 400, y: 300 };
    const ballVel: Vec2 = { x: 1, y: 1 };
    const hit = resolvePaddleCollision(ballPos, ballVel, 0, 0, false);
    expect(hit).toBeNull();
  });
});

describe("horizontal bounds", () => {
  it("detects out-of-bounds sides", () => {
    expect(detectHorizontalOutOfBounds({ x: -1, y: 10 })).toBe("left");
    expect(detectHorizontalOutOfBounds({ x: 791, y: 10 })).toBe("right");
    expect(detectHorizontalOutOfBounds({ x: 400, y: 10 })).toBeNull();
  });

  it("reflects ball from boundaries", () => {
    const leftPos: Vec2 = { x: -2, y: 1 };
    const leftVel: Vec2 = { x: -4, y: 0 };
    reflectHorizontalFromBoundary(leftPos, leftVel, "left");
    expect(leftPos.x).toBe(1);
    expect(leftVel.x).toBe(4);

    const rightPos: Vec2 = { x: 999, y: 1 };
    const rightVel: Vec2 = { x: 4, y: 0 };
    reflectHorizontalFromBoundary(rightPos, rightVel, "right");
    expect(rightPos.x).toBe(789);
    expect(rightVel.x).toBe(-4);
  });
});
