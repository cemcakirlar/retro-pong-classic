import { CANVAS_HEIGHT, MOBILE_PADDLE_DRAG_CANVAS_HEIGHT_FRACTION, PADDLE_HEIGHT } from "../constants";

type NumRef = { current: number };
type NullableNumRef = { current: number | null };

export function isPaddleTouchIgnoredTarget(target: EventTarget | null) {
  return target instanceof Element && !!target.closest("[data-paddle-touch-ignore]");
}

export function captureTouchGestureOrigin(
  clientY: number,
  canvas: HTMLCanvasElement | null,
  playerPaddleY: number,
  anchorYRef: NullableNumRef,
  anchorPaddleRef: NumRef,
) {
  if (!canvas) return false;
  const rect = canvas.getBoundingClientRect();
  if (rect.height <= 0) return false;

  anchorYRef.current = clientY;
  anchorPaddleRef.current = playerPaddleY;
  return true;
}

export function updatePaddleFromTouch(
  clientY: number,
  canvas: HTMLCanvasElement | null,
  anchorYRef: NullableNumRef,
  anchorPaddleRef: NumRef,
) {
  if (!canvas || anchorYRef.current === null) return null;
  const rect = canvas.getBoundingClientRect();
  if (rect.height <= 0) return null;

  const playable = CANVAS_HEIGHT - PADDLE_HEIGHT;
  const fingerTravelPxForFullRange = rect.height * MOBILE_PADDLE_DRAG_CANVAS_HEIGHT_FRACTION;
  const dy = clientY - anchorYRef.current;
  const gameUnitsPerFingerPx = playable / fingerTravelPxForFullRange;

  return Math.max(0, Math.min(playable, anchorPaddleRef.current + dy * gameUnitsPerFingerPx));
}

export function computePaddleYFromClientY(clientY: number, rectTop: number, rectHeight: number) {
  const relativeY = clientY - rectTop;
  const scaleY = CANVAS_HEIGHT / rectHeight;
  const nextY = relativeY * scaleY - PADDLE_HEIGHT / 2;
  return Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, nextY));
}
