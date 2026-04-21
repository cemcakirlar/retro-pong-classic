import { describe, expect, it } from "vitest";
import { updateAiPaddleY } from "./ai";

describe("updateAiPaddleY", () => {
  it("moves toward ball with easy difficulty speed cap", () => {
    const next = updateAiPaddleY(100, 500, "easy");
    expect(next).toBe(103.5);
  });

  it("returns same value inside deadzone", () => {
    const next = updateAiPaddleY(200, 235, "medium");
    expect(next).toBe(200);
  });

  it("clamps to playfield bounds", () => {
    const high = updateAiPaddleY(590, 900, "hard");
    expect(high).toBeLessThanOrEqual(520);

    const low = updateAiPaddleY(-10, -100, "hard");
    expect(low).toBeGreaterThanOrEqual(0);
  });
});
