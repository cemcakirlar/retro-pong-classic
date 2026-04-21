import { describe, expect, it } from "vitest";
import { isWinningScore, resolveBoundaryOutcome } from "./scoring";

describe("resolveBoundaryOutcome", () => {
  it("returns goal in normal mode", () => {
    const outcome = resolveBoundaryOutcome("left", 10, false, 0.2);
    expect(outcome).toEqual({ type: "goal", scorer: "ai" });
  });

  it("returns wall in goal mode outside opening", () => {
    const outcome = resolveBoundaryOutcome("right", 0, true, 0.2);
    expect(outcome).toEqual({ type: "wall" });
  });

  it("returns goal in goal mode inside opening", () => {
    const outcome = resolveBoundaryOutcome("right", 270, true, 0.33);
    expect(outcome).toEqual({ type: "goal", scorer: "player" });
  });
});

describe("isWinningScore", () => {
  it("is true on threshold and above", () => {
    expect(isWinningScore(5, 5)).toBe(true);
    expect(isWinningScore(6, 5)).toBe(true);
  });

  it("is false below threshold", () => {
    expect(isWinningScore(4, 5)).toBe(false);
  });
});
