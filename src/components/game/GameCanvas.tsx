import type { MouseEventHandler, RefObject, TouchEventHandler } from "react";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../constants";

type GameCanvasProps = {
  canvasRef: RefObject<HTMLCanvasElement>;
  onMouseMove: MouseEventHandler<HTMLCanvasElement>;
  onTouchMove?: TouchEventHandler<HTMLCanvasElement>;
};

export function GameCanvas({ canvasRef, onMouseMove, onTouchMove }: GameCanvasProps) {
  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      onMouseMove={onMouseMove}
      onTouchMove={onTouchMove}
      aria-label="Pong game canvas"
      className="relative z-0 aspect-4/3 w-full cursor-none rounded-lg bg-black shadow-[0_0_50px_rgba(255,255,255,0.1)]"
    />
  );
}
