export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const PADDLE_HEIGHT = 80;
export const PADDLE_WIDTH = 10;
export const BALL_SIZE = 10;
export const PADDLE_OFFSET = 60;
export const MAX_PARTICLES = 256;
export const MIN_WINNING_SCORE = 1;
export const MAX_WINNING_SCORE = 99;

/** Mobilde göreli sürükleme ölçeği: tam paddle dikey aralığı (oyun biriminde) şu kadar ekran pikseline yayılır. */
export const MOBILE_PADDLE_DRAG_CANVAS_HEIGHT_FRACTION = 0.5;

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTY_CONFIG: Record<Difficulty, { aiSpeed: number; errorMargin: number }> = {
  easy: { aiSpeed: 3.5, errorMargin: 40 },
  medium: { aiSpeed: 5.5, errorMargin: 20 },
  hard: { aiSpeed: 8.0, errorMargin: 5 },
};

export const SITE_HREF = "https://cemcakirlar.com";
