/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Play, RotateCcw, Pause, Volume2, VolumeX, Maximize } from "lucide-react";

const PADDLE_HEIGHT = 80;
const PADDLE_WIDTH = 10;
const BALL_SIZE = 10;
const PADDLE_OFFSET = 60; // Distance from back wall in Goal Mode

/**
 * Mobilde göreli sürükleme ölçeği: tam paddle dikey aralığı (oyun biriminde) şu kadar ekran pikseline yayılır:
 *   fingerTravelPxForFullRange = canvas.getBoundingClientRect().height × bu değer
 * 0.5 → canvas’ın görünen yüksekliğinin yarısı kadar parmak yolu ≈ paddle uçtan uca (scroll hassasiyeti).
 */
const MOBILE_PADDLE_DRAG_CANVAS_HEIGHT_FRACTION = 0.5;

// Persistent AudioContext to prevent "too many contexts" error
let globalAudioCtx: AudioContext | null = null;

const playSound = (frequency: number, type: OscillatorType, duration: number, volume: number = 0.1) => {
  try {
    if (!globalAudioCtx) {
      globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Resume context if it was suspended by browser policy
    if (globalAudioCtx.state === "suspended") {
      globalAudioCtx.resume();
    }

    const oscillator = globalAudioCtx.createOscillator();
    const gainNode = globalAudioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, globalAudioCtx.currentTime);

    gainNode.gain.setValueAtTime(volume, globalAudioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, globalAudioCtx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(globalAudioCtx.destination);

    oscillator.start();
    oscillator.stop(globalAudioCtx.currentTime + duration);
  } catch (e) {
    console.warn("Audio playback failed", e);
  }
};

const sounds = {
  hit: () => playSound(440, "square", 0.1),
  wall: () => playSound(220, "square", 0.05),
  score: () => {
    playSound(523.25, "square", 0.1);
    setTimeout(() => playSound(659.25, "square", 0.1), 100);
    setTimeout(() => playSound(783.99, "square", 0.2), 200);
  },
  gameOver: () => {
    playSound(392, "square", 0.2);
    setTimeout(() => playSound(349.23, "square", 0.2), 200);
    setTimeout(() => playSound(329.63, "square", 0.4), 400);
  },
  start: () => playSound(880, "square", 0.1),
};

type Difficulty = "easy" | "medium" | "hard";

const DIFFICULTY_CONFIG = {
  easy: { aiSpeed: 3.5, errorMargin: 40 },
  medium: { aiSpeed: 5.5, errorMargin: 20 },
  hard: { aiSpeed: 8.0, errorMargin: 5 },
};

const SITE_HREF = "https://cemcakirlar.com";

function getFullscreenElement(): Element | null {
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

function enterGameFullscreen(el: HTMLElement | null) {
  if (!el) return;
  const anyEl = el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
  const req = el.requestFullscreen?.bind(el) ?? anyEl.webkitRequestFullscreen?.bind(el);
  if (req) void Promise.resolve(req()).catch(() => {});
}

/** Dar görünüm + dokunmatik: mobil tam ekran, paddle jesti, vb. (masaüstü dokunmatıyı bilerek hariç tutar). */
function useTouchMobileLayout() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)");
    const sync = () => {
      const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      setActive(mq.matches && touch);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return active;
}

/** Tam ekran API açık/kapalı; className senkronu için (document.fullscreenElement tek başına React’i tetiklemez). */
function useFullscreenFlag() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const sync = () => setOn(!!getFullscreenElement());
    sync();
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  return on;
}

function SiteLink({ className = "" }: { className?: string }) {
  return (
    <a
      href={SITE_HREF}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-cyan-400/90 hover:text-cyan-300 underline-offset-4 hover:underline transition-colors ${className}`}
    >
      cemcakirlar.com
    </a>
  );
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"start" | "playing" | "paused" | "gameOver">("start");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [winner, setWinner] = useState<"player" | "ai" | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [isGoalMode, setIsGoalMode] = useState(false);
  const [goalSizeRatio, setGoalSizeRatio] = useState(0.33); // 1/3 of height
  const [winningScore, setWinningScore] = useState(5);
  const [customScoreInput, setCustomScoreInput] = useState("10");
  const [canvasSize, setCanvasSize] = useState<"small" | "medium" | "large">("medium");
  const containerRef = useRef<HTMLDivElement>(null);
  /** Mobil oynarken touch dinleyicisinin bağlandığı kök (tüm ekran jesti). */
  const touchArenaRef = useRef<HTMLDivElement>(null);
  /** Jest başında parmak clientY; null = sürükleme yok / parmak kalktı. */
  const paddleTouchAnchorYRef = useRef<number | null>(null);
  /** Jest başında playerPaddleY (dy ile eklenir; dokunuş anında paddle taşınmaz). */
  const paddleTouchAnchorPaddleRef = useRef(0);
  const isTouchMobile = useTouchMobileLayout();
  const isFullscreen = useFullscreenFlag();

  useEffect(() => {
    if (isTouchMobile) setCanvasSize("large");
  }, [isTouchMobile]);

  useEffect(() => {
    if (!isTouchMobile || gameState !== "playing") return;
    const touchListenerRoot = touchArenaRef.current;
    if (!touchListenerRoot) return;

    /** Paddle’ı oynatmaz; sadece jest başlangıcını kaydeder (Twitter scroll gibi: ilk dokunuşta içerik zıplamaz). */
    const captureTouchGestureOrigin = (clientY: number): boolean => {
      const canvas = canvasRef.current;
      if (!canvas) return false;
      const rect = canvas.getBoundingClientRect();
      if (rect.height <= 0) return false;
      paddleTouchAnchorYRef.current = clientY;
      paddleTouchAnchorPaddleRef.current = playerPaddleY.current;
      return true;
    };

    const onTouchStart = (e: TouchEvent) => {
      const target = e.target;
      if (target instanceof Element && target.closest("[data-paddle-touch-ignore]")) return;
      const touch = e.touches[0];
      if (!touch) return;
      if (captureTouchGestureOrigin(touch.clientY)) e.preventDefault();
    };

    const onTouchMove = (e: TouchEvent) => {
      const target = e.target;
      if (target instanceof Element && target.closest("[data-paddle-touch-ignore]")) return;
      const touch = e.touches[0];
      if (!touch) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.height <= 0) return;
      const playable = 600 - PADDLE_HEIGHT;
      const fingerTravelPxForFullRange = rect.height * MOBILE_PADDLE_DRAG_CANVAS_HEIGHT_FRACTION;

      if (paddleTouchAnchorYRef.current === null) {
        captureTouchGestureOrigin(touch.clientY);
      }

      const dy = touch.clientY - paddleTouchAnchorYRef.current!;
      const gameUnitsPerFingerPx = playable / fingerTravelPxForFullRange;
      playerPaddleY.current = Math.max(
        0,
        Math.min(playable, paddleTouchAnchorPaddleRef.current + dy * gameUnitsPerFingerPx),
      );
      e.preventDefault();
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) paddleTouchAnchorYRef.current = null;
    };

    touchListenerRoot.addEventListener("touchstart", onTouchStart, { passive: false });
    touchListenerRoot.addEventListener("touchmove", onTouchMove, { passive: false });
    touchListenerRoot.addEventListener("touchend", onTouchEnd);
    touchListenerRoot.addEventListener("touchcancel", onTouchEnd);
    return () => {
      touchListenerRoot.removeEventListener("touchstart", onTouchStart);
      touchListenerRoot.removeEventListener("touchmove", onTouchMove);
      touchListenerRoot.removeEventListener("touchend", onTouchEnd);
      touchListenerRoot.removeEventListener("touchcancel", onTouchEnd);
      paddleTouchAnchorYRef.current = null;
    };
  }, [isTouchMobile, gameState]);

  const toggleFullScreen = () => {
    if (!containerRef.current) return;
    if (!getFullscreenElement()) {
      enterGameFullscreen(containerRef.current);
    } else {
      const doc = document as Document & { webkitExitFullscreen?: () => void };
      if (document.exitFullscreen) {
        void document.exitFullscreen().catch(() => {});
      } else {
        doc.webkitExitFullscreen?.();
      }
    }
  };

  // Game state refs for the animation loop to avoid closure issues
  const ballPos = useRef({ x: 400, y: 300 });
  const ballVel = useRef({ x: 5, y: 5 });
  const playerPaddleY = useRef(260);
  const aiPaddleY = useRef(260);
  const requestRef = useRef<number>(null);

  // Visual effects refs
  const playerHitTimer = useRef(0);
  const aiHitTimer = useRef(0);
  const shakeTimer = useRef(0);
  const particles = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);

  const triggerSound = (key: keyof typeof sounds) => {
    if (!isMuted) sounds[key]();
  };

  const resetBall = (direction: number) => {
    ballPos.current = { x: 400, y: 300 };
    ballVel.current = { x: 5 * direction, y: (Math.random() - 0.5) * 10 };
  };

  const createParticles = (x: number, y: number, direction: number) => {
    for (let i = 0; i < 8; i++) {
      particles.current.push({
        x,
        y,
        vx: direction * (Math.random() * 5 + 2),
        vy: (Math.random() - 0.5) * 10,
        life: 1.0,
      });
    }
  };

  const update = () => {
    if (gameState !== "playing") return;

    // Update visual timers (once per frame)
    if (playerHitTimer.current > 0) playerHitTimer.current -= 0.1;
    if (aiHitTimer.current > 0) aiHitTimer.current -= 0.1;
    if (shakeTimer.current > 0) shakeTimer.current -= 0.1;

    // Update particles (once per frame)
    particles.current = particles.current
      .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 0.05 }))
      .filter((p) => p.life > 0);

    // AI Movement (Smoother, less jitter)
    const config = DIFFICULTY_CONFIG[difficulty];
    const aiTarget = ballPos.current.y - PADDLE_HEIGHT / 2 + BALL_SIZE / 2;
    const dy = aiTarget - aiPaddleY.current;

    if (Math.abs(dy) > 5) {
      const moveStep = Math.min(Math.abs(dy), config.aiSpeed);
      aiPaddleY.current += Math.sign(dy) * moveStep;
    }

    // Physics Sub-stepping (Dynamic based on velocity to prevent tunneling)
    const maxStepSize = BALL_SIZE / 2;
    const velocityMagnitude = Math.sqrt(ballVel.current.x ** 2 + ballVel.current.y ** 2);

    // Cap velocity to prevent floating point issues and engine breakdown
    const MAX_SPEED = 25;
    if (velocityMagnitude > MAX_SPEED) {
      const ratio = MAX_SPEED / velocityMagnitude;
      ballVel.current.x *= ratio;
      ballVel.current.y *= ratio;
    }

    const subSteps = Math.max(
      5,
      Math.ceil(Math.max(Math.abs(ballVel.current.x), Math.abs(ballVel.current.y)) / maxStepSize),
    );

    const stepX = ballVel.current.x / subSteps;
    const stepY = ballVel.current.y / subSteps;

    for (let s = 0; s < subSteps; s++) {
      // Move ball
      ballPos.current.x += stepX;
      ballPos.current.y += stepY;

      // Wall collisions (top/bottom)
      if (ballPos.current.y <= 0) {
        ballPos.current.y = 1; // Push out slightly
        ballVel.current.y *= -1;
        if (showEffects) shakeTimer.current = 0.2;
        triggerSound("wall");
      } else if (ballPos.current.y >= 600 - BALL_SIZE) {
        ballPos.current.y = 600 - BALL_SIZE - 1; // Push out slightly
        ballVel.current.y *= -1;
        if (showEffects) shakeTimer.current = 0.2;
        triggerSound("wall");
      }

      // Paddle collisions
      const currentOffset = isGoalMode ? PADDLE_OFFSET : 0;
      const goalSize = 600 * goalSizeRatio;

      // Player Paddle (Left)
      const playerPaddleX = currentOffset;
      if (
        ballPos.current.x <= playerPaddleX + PADDLE_WIDTH &&
        ballPos.current.x + BALL_SIZE >= playerPaddleX &&
        ballPos.current.y + BALL_SIZE >= playerPaddleY.current &&
        ballPos.current.y <= playerPaddleY.current + PADDLE_HEIGHT
      ) {
        const ballCenterX = ballPos.current.x + BALL_SIZE / 2;
        const paddleCenterX = playerPaddleX + PADDLE_WIDTH / 2;
        const speedMult = isGoalMode && ballPos.current.x < playerPaddleX ? 1.02 : 1.05;

        if (ballVel.current.x < 0 && ballCenterX > paddleCenterX) {
          // Front hit
          ballVel.current.x *= -speedMult;
          const deltaY = ballPos.current.y - (playerPaddleY.current + PADDLE_HEIGHT / 2);
          ballVel.current.y = deltaY * 0.2;
          ballPos.current.x = playerPaddleX + PADDLE_WIDTH + 1;
          playerHitTimer.current = 1.0;
          if (showEffects) {
            shakeTimer.current = 0.5;
            createParticles(playerPaddleX + PADDLE_WIDTH, ballPos.current.y + BALL_SIZE / 2, 1);
          }
          triggerSound("hit");
          break; // Exit sub-steps for this frame to prevent double hits
        } else if (ballVel.current.x > 0 && ballCenterX < paddleCenterX) {
          // Back hit
          ballVel.current.x *= -speedMult;
          ballPos.current.x = playerPaddleX - BALL_SIZE - 1;
          playerHitTimer.current = 1.0;
          if (showEffects) {
            shakeTimer.current = 0.5;
            createParticles(playerPaddleX, ballPos.current.y + BALL_SIZE / 2, -1);
          }
          triggerSound("hit");
          break;
        }
      }

      // AI Paddle (Right)
      const aiPaddleX = 800 - currentOffset - PADDLE_WIDTH;
      if (
        ballPos.current.x + BALL_SIZE >= aiPaddleX &&
        ballPos.current.x <= aiPaddleX + PADDLE_WIDTH &&
        ballPos.current.y + BALL_SIZE >= aiPaddleY.current &&
        ballPos.current.y <= aiPaddleY.current + PADDLE_HEIGHT
      ) {
        const ballCenterX = ballPos.current.x + BALL_SIZE / 2;
        const paddleCenterX = aiPaddleX + PADDLE_WIDTH / 2;
        const speedMult = isGoalMode && ballPos.current.x > aiPaddleX ? 1.02 : 1.05;

        if (ballVel.current.x > 0 && ballCenterX < paddleCenterX) {
          // Front hit
          ballVel.current.x *= -speedMult;
          const deltaY = ballPos.current.y - (aiPaddleY.current + PADDLE_HEIGHT / 2);
          ballVel.current.y = deltaY * 0.2;
          ballPos.current.x = aiPaddleX - BALL_SIZE - 1;
          aiHitTimer.current = 1.0;
          if (showEffects) {
            shakeTimer.current = 0.5;
            createParticles(aiPaddleX, ballPos.current.y + BALL_SIZE / 2, -1);
          }
          triggerSound("hit");
          break;
        } else if (ballVel.current.x < 0 && ballCenterX > paddleCenterX) {
          // Back hit
          ballVel.current.x *= -speedMult;
          ballPos.current.x = aiPaddleX + PADDLE_WIDTH + 1;
          aiHitTimer.current = 1.0;
          if (showEffects) {
            shakeTimer.current = 0.5;
            createParticles(aiPaddleX + PADDLE_WIDTH, ballPos.current.y + BALL_SIZE / 2, 1);
          }
          triggerSound("hit");
          break;
        }
      }

      // Scoring / Back wall collisions
      if (ballPos.current.x < 0) {
        const isGoal =
          !isGoalMode ||
          (ballPos.current.y + BALL_SIZE > (600 - goalSize) / 2 && ballPos.current.y < (600 + goalSize) / 2);
        if (isGoal) {
          if (showEffects) shakeTimer.current = 1.5;
          setAiScore((s) => {
            const newScore = s + 1;
            if (newScore >= winningScore) {
              setGameState("gameOver");
              setWinner("ai");
              triggerSound("gameOver");
            } else {
              resetBall(1);
              triggerSound("score");
            }
            return newScore;
          });
          return; // Stop sub-stepping
        } else {
          ballVel.current.x *= -1;
          ballPos.current.x = 1; // Push out
          triggerSound("wall");
        }
      } else if (ballPos.current.x > 800 - BALL_SIZE) {
        const isGoal =
          !isGoalMode ||
          (ballPos.current.y + BALL_SIZE > (600 - goalSize) / 2 && ballPos.current.y < (600 + goalSize) / 2);
        if (isGoal) {
          if (showEffects) shakeTimer.current = 1.5;
          setPlayerScore((s) => {
            const newScore = s + 1;
            if (newScore >= winningScore) {
              setGameState("gameOver");
              setWinner("player");
              triggerSound("gameOver");
            } else {
              resetBall(-1);
              triggerSound("score");
            }
            return newScore;
          });
          return; // Stop sub-stepping
        } else {
          ballVel.current.x *= -1;
          ballPos.current.x = 800 - BALL_SIZE - 1; // Push out
          triggerSound("wall");
        }
      }
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.save();

    // Apply screen shake
    if (showEffects && shakeTimer.current > 0) {
      const intensity = shakeTimer.current * 5;
      ctx.translate((Math.random() - 0.5) * intensity, (Math.random() - 0.5) * intensity);
    }

    // Clear
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 800, 600);

    // Draw center line
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(400, 0);
    ctx.lineTo(400, 600);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Goals if in Goal Mode
    const goalSize = 600 * goalSizeRatio;
    const currentOffset = isGoalMode ? PADDLE_OFFSET : 0;

    if (isGoalMode) {
      const goalTop = (600 - goalSize) / 2;
      ctx.fillStyle = "#fff";

      // Left Walls
      ctx.fillRect(0, 0, 4, goalTop);
      ctx.fillRect(0, goalTop + goalSize, 4, 600 - (goalTop + goalSize));

      // Right Walls
      ctx.fillRect(796, 0, 4, goalTop);
      ctx.fillRect(796, goalTop + goalSize, 4, 600 - (goalTop + goalSize));

      // Goal indicators (subtle glow)
      ctx.fillStyle = "rgba(0, 255, 255, 0.2)";
      ctx.fillRect(0, goalTop, 2, goalSize);
      ctx.fillStyle = "rgba(255, 0, 255, 0.2)";
      ctx.fillRect(798, goalTop, 2, goalSize);
    }

    // Draw paddles
    // Player paddle
    ctx.fillStyle = showEffects && playerHitTimer.current > 0 ? "#0ff" : "#fff"; // Flash cyan on hit
    ctx.fillRect(currentOffset, playerPaddleY.current, PADDLE_WIDTH, PADDLE_HEIGHT);

    // AI paddle
    ctx.fillStyle = showEffects && aiHitTimer.current > 0 ? "#f0f" : "#fff"; // Flash magenta on hit
    ctx.fillRect(800 - PADDLE_WIDTH - currentOffset, aiPaddleY.current, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Draw ball
    ctx.fillStyle = "#fff";
    ctx.fillRect(ballPos.current.x, ballPos.current.y, BALL_SIZE, BALL_SIZE);

    // Draw particles
    if (showEffects) {
      particles.current.forEach((p) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`;
        ctx.fillRect(p.x, p.y, 3, 3);
      });
    }

    ctx.restore();

    // CRT Scanlines effect (drawn outside shake)
    if (showEffects) {
      ctx.fillStyle = "rgba(18, 16, 16, 0.1)";
      for (let i = 0; i < 600; i += 4) {
        ctx.fillRect(0, i, 800, 1);
      }
    }
  };

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    update();
    draw(ctx);
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (gameState === "playing") {
          setGameState("paused");
        } else if (gameState === "paused") {
          setGameState("playing");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, difficulty, isMuted, showEffects, winningScore, isGoalMode, goalSizeRatio]);

  /** Fare veya geniş ekran dokunması: paddle, canvas içindeki Y ile doğrudan eşlenir. Mobilde touch kök dinleyicide (göreli sürükleme). */
  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientY;
    if ("touches" in e) {
      clientY = e.touches[0].clientY;
    } else {
      clientY = (e as React.MouseEvent).clientY;
    }

    const relativeY = clientY - rect.top;
    // Canvas görünen yüksekliğine göre 600px oyun alanına ölçekle
    const scaleY = 600 / rect.height;
    const newY = relativeY * scaleY - PADDLE_HEIGHT / 2;

    // Constrain paddle
    playerPaddleY.current = Math.max(0, Math.min(600 - PADDLE_HEIGHT, newY));
  };

  const startGame = () => {
    if (isTouchMobile) {
      enterGameFullscreen(containerRef.current);
    }
    setPlayerScore(0);
    setAiScore(0);
    setWinner(null);
    resetBall(1);
    setGameState("playing");
    triggerSound("start");
  };

  const getSizeClass = () => {
    switch (canvasSize) {
      case "small":
        return "max-w-xl";
      case "large":
        return "max-w-5xl";
      default:
        return "max-w-3xl";
    }
  };

  const overlaySafeX = isTouchMobile ? "left-[max(1rem,env(safe-area-inset-left))]" : "left-4";
  const pauseSafeRight = isTouchMobile ? "right-[max(1rem,env(safe-area-inset-right))]" : "right-4";

  const mobileGameBoardStyle: React.CSSProperties | undefined = isTouchMobile
    ? {
        aspectRatio: "4 / 3",
        width: "min(calc(100vw - 16px), calc((100dvh - 120px) * 4 / 3))",
        maxHeight: "min(calc(100dvh - 120px), calc((100vw - 16px) * 3 / 4))",
      }
    : undefined;

  const menuOverlayShell = "absolute inset-0 z-20 flex min-h-0 flex-col overflow-hidden rounded-lg";
  const menuOverlayScroll =
    "min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y py-4 [-webkit-overflow-scrolling:touch] [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))] [padding-bottom:max(1rem,env(safe-area-inset-bottom))] [padding-top:max(0.5rem,env(safe-area-inset-top))]";
  const menuOverlayInner = "mx-auto flex w-full max-w-2xl flex-col items-center";

  return (
    <div
      ref={touchArenaRef}
      className={
        isTouchMobile
          ? "fixed inset-0 z-50 flex h-dvh max-h-dvh min-h-dvh w-full flex-col overflow-hidden bg-neutral-950 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] font-mono text-white"
          : "flex min-h-screen flex-col items-center justify-center bg-neutral-950 p-4 font-mono text-white"
      }
    >
      <div
        ref={containerRef}
        className={
          isTouchMobile
            ? `group relative flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden ${isFullscreen ? "bg-black" : "bg-neutral-950"}`
            : `group relative flex w-full flex-col items-center justify-center ${isFullscreen ? "h-screen bg-black" : ""}`
        }
      >
        <div
          className={
            isTouchMobile
              ? "relative flex min-h-0 w-full flex-1 flex-col items-center justify-center px-2"
              : `relative w-full ${getSizeClass()} transition-all duration-300`
          }
        >
          <div
            className={isTouchMobile ? "relative mx-auto w-full max-w-full" : "contents"}
            style={isTouchMobile ? mobileGameBoardStyle : undefined}
          >
            {/* Retro TV Frame */}
            <div className="absolute -inset-4 bg-neutral-800 rounded-3xl border-8 border-neutral-700 shadow-2xl pointer-events-none"></div>

            {/* Score Board */}
            <div className="absolute top-8 left-0 right-0 flex justify-around text-6xl font-bold z-10 opacity-50 select-none pointer-events-none">
              <span>{playerScore}</span>
              <span>{aiScore}</span>
            </div>

            {/* Game Canvas — mobilde touch burada yok (çift işlem önlenir); jest touchArenaRef kökünde */}
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              onMouseMove={handleMouseMove}
              onTouchMove={isTouchMobile ? undefined : handleMouseMove}
              className="relative z-0 aspect-4/3 w-full cursor-none rounded-lg bg-black shadow-[0_0_50px_rgba(255,255,255,0.1)]"
            />
          </div>
        </div>

        {/* UI Overlays */}
        <AnimatePresence>
          {gameState === "start" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`${menuOverlayShell} bg-black/80`}
            >
              <div className={menuOverlayScroll}>
                <div className={menuOverlayInner}>
                  <h1 className="text-6xl font-black mb-4 tracking-tighter italic">PONG</h1>

                  <div className="flex gap-2 mb-8">
                    {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={`px-4 py-1 rounded border text-xs uppercase tracking-widest transition-all ${
                          difficulty === d
                            ? "bg-white text-black border-white"
                            : "bg-transparent text-white border-white/20 hover:border-white/50"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-4 mb-8">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs uppercase tracking-widest transition-all ${
                        !isMuted ? "bg-white/10 border-white/20" : "bg-red-500/20 border-red-500/50 text-red-400"
                      }`}
                    >
                      {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                      SOUND: {isMuted ? "OFF" : "ON"}
                    </button>
                    <button
                      onClick={() => setShowEffects(!showEffects)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs uppercase tracking-widest transition-all ${
                        showEffects
                          ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                          : "bg-white/10 border-white/20"
                      }`}
                    >
                      EFFECTS: {showEffects ? "ON" : "OFF"}
                    </button>
                    <button
                      onClick={() => setIsGoalMode(!isGoalMode)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs uppercase tracking-widest transition-all ${
                        isGoalMode ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400" : "bg-white/10 border-white/20"
                      }`}
                    >
                      GOAL MODE: {isGoalMode ? "ON" : "OFF"}
                    </button>
                  </div>

                  {isGoalMode && (
                    <div className="flex flex-col items-center gap-3 mb-8">
                      <p className="text-[10px] text-neutral-500 uppercase tracking-[0.2em]">Goal Size</p>
                      <div className="flex gap-2">
                        {[0.2, 0.33, 0.5, 0.75].map((r) => (
                          <button
                            key={r}
                            onClick={() => setGoalSizeRatio(r)}
                            className={`px-3 py-1 rounded border text-[10px] transition-all ${
                              goalSizeRatio === r
                                ? "bg-cyan-500 text-white border-cyan-500"
                                : "bg-transparent text-white border-white/20 hover:border-white/50"
                            }`}
                          >
                            {Math.round(r * 100)}%
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col items-center gap-3 mb-8">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-[0.2em]">Winning Score</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {[5, 11, 15, 21].map((s) => (
                        <button
                          key={s}
                          onClick={() => setWinningScore(s)}
                          className={`px-3 py-1 rounded border text-[10px] transition-all ${
                            winningScore === s
                              ? "bg-white text-black border-white"
                              : "bg-transparent text-white border-white/20 hover:border-white/50"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                      <div className="flex items-center gap-1 ml-2">
                        <input
                          type="number"
                          value={customScoreInput}
                          onChange={(e) => {
                            setCustomScoreInput(e.target.value);
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val > 0) setWinningScore(val);
                          }}
                          className={`w-12 px-2 py-1 rounded border text-[10px] bg-transparent text-center outline-none transition-all ${
                            ![5, 11, 15, 21].includes(winningScore)
                              ? "border-white text-white"
                              : "border-white/20 text-white/50"
                          }`}
                          placeholder="?"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-3 mb-8">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-[0.2em]">Screen & Size</p>
                    <div className="flex gap-4">
                      <button
                        onClick={toggleFullScreen}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 bg-white/10 text-xs uppercase tracking-widest hover:bg-white/20 transition-all"
                      >
                        <Maximize size={16} />
                        FULLSCREEN
                      </button>
                      <div className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
                        {(["small", "medium", "large"] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => setCanvasSize(s)}
                            className={`px-3 py-1 rounded text-[10px] uppercase transition-all ${
                              canvasSize === s ? "bg-white text-black" : "text-white/50 hover:text-white"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={startGame}
                    className="flex items-center gap-2 bg-white text-black px-8 py-4 rounded-full font-bold hover:bg-neutral-200 transition-colors group"
                  >
                    <Play className="fill-current" />
                    START GAME
                  </button>
                  <p className="mt-8 text-neutral-500 text-sm uppercase tracking-widest">USE MOUSE OR TOUCH TO MOVE</p>
                  <p className="mt-4">
                    <SiteLink className="text-xs uppercase tracking-widest" />
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {gameState === "gameOver" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`${menuOverlayShell} bg-black/90`}
            >
              <div className={menuOverlayScroll}>
                <div className={menuOverlayInner}>
                  <Trophy
                    className={`mb-4 h-20 w-20 ${winner === "player" ? "text-yellow-400" : "text-neutral-600"}`}
                  />
                  <h2 className="mb-2 text-4xl font-bold">{winner === "player" ? "YOU WIN!" : "AI WINS!"}</h2>
                  <p className="mb-8 text-neutral-400">
                    Final Score: {playerScore} - {aiScore}
                  </p>
                  <button
                    onClick={startGame}
                    className="flex items-center gap-2 rounded-full bg-white px-8 py-4 font-bold text-black transition-colors hover:bg-neutral-200"
                  >
                    <RotateCcw />
                    PLAY AGAIN
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* data-paddle-touch-ignore: mobil paddle jestine dahil edilmez (butonlar çalışsın) */}
        <div data-paddle-touch-ignore className={`absolute top-4 ${overlaySafeX} z-10 flex gap-2`}>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            title="Toggle Sound"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <button
            onClick={toggleFullScreen}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            title="Toggle Fullscreen"
          >
            <Maximize size={20} />
          </button>
          {gameState === "playing" && (
            <button
              onClick={() => setShowEffects(!showEffects)}
              className={`p-2 rounded-full transition-colors ${
                showEffects ? "bg-purple-500/20 text-purple-400" : "bg-white/10 hover:bg-white/20"
              }`}
              title="Toggle Effects"
            >
              <motion.div animate={{ rotate: showEffects ? 0 : 45 }}>
                <RotateCcw size={20} />
              </motion.div>
            </button>
          )}
        </div>

        {/* Pause Button (Only visible when playing) */}
        {gameState === "playing" && (
          <button
            type="button"
            data-paddle-touch-ignore
            onClick={() => setGameState("paused")}
            className={`absolute top-4 ${pauseSafeRight} z-10 rounded-full bg-white/10 p-2 transition-colors hover:bg-white/20`}
          >
            <Pause size={20} />
          </button>
        )}

        {gameState === "paused" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${menuOverlayShell} bg-black/80`}>
            <div className={menuOverlayScroll}>
              <div className={menuOverlayInner}>
                <h2 className="mb-6 text-4xl font-bold italic sm:mb-8">PAUSED</h2>

                <div className="mb-8 flex flex-col items-center gap-6">
                  <div className="flex flex-wrap justify-center gap-4">
                    <button
                      onClick={toggleFullScreen}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 bg-white/10 text-[10px] uppercase tracking-widest transition-all"
                    >
                      <Maximize size={14} />
                      FULLSCREEN
                    </button>
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-[10px] uppercase tracking-widest transition-all ${
                        !isMuted ? "bg-white/10 border-white/20" : "bg-red-500/20 border-red-500/50 text-red-400"
                      }`}
                    >
                      {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                      SOUND: {isMuted ? "OFF" : "ON"}
                    </button>
                    <button
                      onClick={() => setShowEffects(!showEffects)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-[10px] uppercase tracking-widest transition-all ${
                        showEffects
                          ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                          : "bg-white/10 border-white/20"
                      }`}
                    >
                      EFFECTS: {showEffects ? "ON" : "OFF"}
                    </button>
                    <button
                      onClick={() => setIsGoalMode(!isGoalMode)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-[10px] uppercase tracking-widest transition-all ${
                        isGoalMode ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400" : "bg-white/10 border-white/20"
                      }`}
                    >
                      GOAL MODE: {isGoalMode ? "ON" : "OFF"}
                    </button>
                  </div>

                  <div className="flex flex-col items-center gap-2 mb-4">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-[0.2em]">Game Size</p>
                    <div className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
                      {(["small", "medium", "large"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setCanvasSize(s)}
                          className={`px-3 py-1 rounded text-[10px] uppercase transition-all ${
                            canvasSize === s ? "bg-white text-black" : "text-white/50 hover:text-white"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {isGoalMode && (
                    <div className="flex flex-col items-center gap-2 mb-4">
                      <p className="text-[10px] text-neutral-500 uppercase tracking-[0.2em]">Goal Size</p>
                      <div className="flex gap-2">
                        {[0.2, 0.33, 0.5, 0.75].map((r) => (
                          <button
                            key={r}
                            onClick={() => setGoalSizeRatio(r)}
                            className={`px-3 py-1 rounded border text-[10px] transition-all ${
                              goalSizeRatio === r
                                ? "bg-cyan-500 text-white border-cyan-500"
                                : "bg-transparent text-white border-white/20 hover:border-white/50"
                            }`}
                          >
                            {Math.round(r * 100)}%
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col items-center gap-2">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-[0.2em]">Winning Score</p>
                    <div className="flex gap-2">
                      {[5, 11, 15, 21].map((s) => (
                        <button
                          key={s}
                          onClick={() => setWinningScore(s)}
                          className={`px-3 py-1 rounded border text-[10px] transition-all ${
                            winningScore === s
                              ? "bg-white text-black border-white"
                              : "bg-transparent text-white border-white/20 hover:border-white/50"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="mb-6">
                  <SiteLink className="text-xs uppercase tracking-widest" />
                </p>

                <button
                  onClick={() => setGameState("playing")}
                  className="flex items-center gap-2 rounded-full bg-white px-8 py-4 font-bold text-black transition-colors hover:bg-neutral-200"
                >
                  <Play className="fill-current" />
                  RESUME
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {gameState === "playing" && (
        <div
          data-paddle-touch-ignore
          className={`flex justify-center ${isTouchMobile ? "mt-1 shrink-0 py-1" : "mt-6"}`}
        >
          <SiteLink className="text-[10px] uppercase tracking-widest text-neutral-500 hover:text-cyan-400/90" />
        </div>
      )}

      {/* Footer Info */}
      <div
        className={`flex flex-col items-center gap-2 text-xs text-neutral-600 ${isTouchMobile && gameState === "playing" ? "hidden" : ""} ${isTouchMobile ? "mt-2 shrink-0" : "mt-12"}`}
      >
        <p>FIRST TO {winningScore} POINTS WINS</p>
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-white"></div> PLAYER
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-white opacity-50"></div> AI
          </span>
        </div>
      </div>
    </div>
  );
}
