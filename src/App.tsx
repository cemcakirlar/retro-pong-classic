/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import {
  BALL_SIZE,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  type Difficulty,
  MAX_PARTICLES,
  MAX_WINNING_SCORE,
  MIN_WINNING_SCORE,
  PADDLE_HEIGHT,
  PADDLE_OFFSET,
  PADDLE_WIDTH,
} from "./constants";
import { sounds } from "./audio";
import { updateAiPaddleY } from "./engine/ai";
import {
  applyTopBottomWallCollision,
  capBallVelocity,
  detectHorizontalOutOfBounds,
  getSubStepCount,
  reflectHorizontalFromBoundary,
  resetBall as resetBallState,
  resolvePaddleCollision,
} from "./engine/physics";
import { isWinningScore, resolveBoundaryOutcome } from "./engine/scoring";
import {
  captureTouchGestureOrigin,
  computePaddleYFromClientY,
  isPaddleTouchIgnoredTarget,
  updatePaddleFromTouch,
} from "./input/controllers";
import { enterGameFullscreen, getFullscreenElement, useFullscreenFlag } from "./utils/fullscreen";
import { ControlBar } from "./components/hud/ControlBar";
import { ScoreBoard } from "./components/hud/ScoreBoard";
import { GameCanvas } from "./components/game/GameCanvas";
import { GameOverOverlay } from "./components/overlays/GameOverOverlay";
import { MenuOverlay } from "./components/overlays/MenuOverlay";
import { PauseOverlay } from "./components/overlays/PauseOverlay";
import { GameFooter } from "./components/layout/GameFooter";
import { GameStatusAnnouncer } from "./components/layout/GameStatusAnnouncer";
import { usePrefersReducedMotion } from "./utils/accessibility";

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
  const [customScoreInput, setCustomScoreInput] = useState("5");
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
  const prefersReducedMotion = usePrefersReducedMotion();
  const animateEffects = showEffects && !prefersReducedMotion;

  useEffect(() => {
    if (isTouchMobile) setCanvasSize("large");
  }, [isTouchMobile]);

  useEffect(() => {
    if (!isTouchMobile || gameState !== "playing") return;
    const touchListenerRoot = touchArenaRef.current;
    if (!touchListenerRoot) return;

    const onTouchStart = (e: TouchEvent) => {
      if (isPaddleTouchIgnoredTarget(e.target)) return;
      const touch = e.touches[0];
      if (!touch) return;
      const didCapture = captureTouchGestureOrigin(
        touch.clientY,
        canvasRef.current,
        playerPaddleY.current,
        paddleTouchAnchorYRef,
        paddleTouchAnchorPaddleRef,
      );
      if (didCapture) e.preventDefault();
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isPaddleTouchIgnoredTarget(e.target)) return;
      const touch = e.touches[0];
      if (!touch) return;

      if (paddleTouchAnchorYRef.current === null) {
        captureTouchGestureOrigin(
          touch.clientY,
          canvasRef.current,
          playerPaddleY.current,
          paddleTouchAnchorYRef,
          paddleTouchAnchorPaddleRef,
        );
      }

      const nextPaddleY = updatePaddleFromTouch(
        touch.clientY,
        canvasRef.current,
        paddleTouchAnchorYRef,
        paddleTouchAnchorPaddleRef,
      );
      if (nextPaddleY !== null) playerPaddleY.current = nextPaddleY;
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
  const ballPos = useRef({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 });
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
    resetBallState(ballPos.current, ballVel.current, direction);
  };

  const createParticles = (x: number, y: number, direction: number) => {
    const nextParticles: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
    for (let i = 0; i < 8; i++) {
      nextParticles.push({
        x,
        y,
        vx: direction * (Math.random() * 5 + 2),
        vy: (Math.random() - 0.5) * 10,
        life: 1.0,
      });
    }

    particles.current = [...particles.current, ...nextParticles].slice(-MAX_PARTICLES);
  };

  const applyCustomWinningScore = (rawValue: string) => {
    setCustomScoreInput(rawValue);
    const parsed = Number.parseInt(rawValue, 10);
    if (Number.isNaN(parsed)) return;
    const nextScore = Math.max(MIN_WINNING_SCORE, Math.min(MAX_WINNING_SCORE, parsed));
    setWinningScore(nextScore);
    if (nextScore !== parsed) {
      setCustomScoreInput(String(nextScore));
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

    // AI Movement
    aiPaddleY.current = updateAiPaddleY(aiPaddleY.current, ballPos.current.y, difficulty);

    // Physics Sub-stepping (Dynamic based on velocity to prevent tunneling)
    capBallVelocity(ballVel.current);
    const subSteps = getSubStepCount(ballVel.current);

    const stepX = ballVel.current.x / subSteps;
    const stepY = ballVel.current.y / subSteps;

    for (let s = 0; s < subSteps; s++) {
      // Move ball
      ballPos.current.x += stepX;
      ballPos.current.y += stepY;

      // Wall collisions (top/bottom)
      if (applyTopBottomWallCollision(ballPos.current, ballVel.current)) {
        if (animateEffects) shakeTimer.current = 0.2;
        triggerSound("wall");
      }

      // Paddle collisions
      const currentOffset = isGoalMode ? PADDLE_OFFSET : 0;
      const paddleCollision = resolvePaddleCollision(
        ballPos.current,
        ballVel.current,
        playerPaddleY.current,
        aiPaddleY.current,
        isGoalMode,
      );

      if (paddleCollision) {
        const aiPaddleX = CANVAS_WIDTH - currentOffset - PADDLE_WIDTH;
        if (paddleCollision.paddle === "player") {
          playerHitTimer.current = 1.0;
          if (animateEffects) {
            shakeTimer.current = 0.5;
            const px = paddleCollision.hitSide === "front" ? currentOffset + PADDLE_WIDTH : currentOffset;
            const pd = paddleCollision.hitSide === "front" ? 1 : -1;
            createParticles(px, ballPos.current.y + BALL_SIZE / 2, pd);
          }
        } else {
          aiHitTimer.current = 1.0;
          if (animateEffects) {
            shakeTimer.current = 0.5;
            const px = paddleCollision.hitSide === "front" ? aiPaddleX : aiPaddleX + PADDLE_WIDTH;
            const pd = paddleCollision.hitSide === "front" ? -1 : 1;
            createParticles(px, ballPos.current.y + BALL_SIZE / 2, pd);
          }
        }
        triggerSound("hit");
        break;
      }

      // Scoring / Back wall collisions
      const boundarySide = detectHorizontalOutOfBounds(ballPos.current);
      if (boundarySide) {
        const boundaryOutcome = resolveBoundaryOutcome(boundarySide, ballPos.current.y, isGoalMode, goalSizeRatio);

        if (boundaryOutcome.type === "wall") {
          reflectHorizontalFromBoundary(ballPos.current, ballVel.current, boundarySide);
          triggerSound("wall");
          continue;
        }

        if (animateEffects) shakeTimer.current = 1.5;

        if (boundaryOutcome.scorer === "ai") {
          setAiScore((score) => {
            const newScore = score + 1;
            if (isWinningScore(newScore, winningScore)) {
              setGameState("gameOver");
              setWinner("ai");
              triggerSound("gameOver");
            } else {
              resetBall(1);
              triggerSound("score");
            }
            return newScore;
          });
        } else {
          setPlayerScore((score) => {
            const newScore = score + 1;
            if (isWinningScore(newScore, winningScore)) {
              setGameState("gameOver");
              setWinner("player");
              triggerSound("gameOver");
            } else {
              resetBall(-1);
              triggerSound("score");
            }
            return newScore;
          });
        }

        return;
      }
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.save();

    // Apply screen shake
    if (animateEffects && shakeTimer.current > 0) {
      const intensity = shakeTimer.current * 5;
      ctx.translate((Math.random() - 0.5) * intensity, (Math.random() - 0.5) * intensity);
    }

    // Clear
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw center line
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Goals if in Goal Mode
    const goalSize = CANVAS_HEIGHT * goalSizeRatio;
    const currentOffset = isGoalMode ? PADDLE_OFFSET : 0;

    if (isGoalMode) {
      const goalTop = (CANVAS_HEIGHT - goalSize) / 2;
      ctx.fillStyle = "#fff";

      // Left Walls
      ctx.fillRect(0, 0, 4, goalTop);
      ctx.fillRect(0, goalTop + goalSize, 4, CANVAS_HEIGHT - (goalTop + goalSize));

      // Right Walls
      ctx.fillRect(796, 0, 4, goalTop);
      ctx.fillRect(CANVAS_WIDTH - 4, goalTop + goalSize, 4, CANVAS_HEIGHT - (goalTop + goalSize));

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
    ctx.fillRect(CANVAS_WIDTH - PADDLE_WIDTH - currentOffset, aiPaddleY.current, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Draw ball
    ctx.fillStyle = "#fff";
    ctx.fillRect(ballPos.current.x, ballPos.current.y, BALL_SIZE, BALL_SIZE);

    // Draw particles
    if (animateEffects) {
      particles.current.forEach((p) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`;
        ctx.fillRect(p.x, p.y, 3, 3);
      });
    }

    ctx.restore();

    // CRT Scanlines effect (drawn outside shake)
    if (animateEffects) {
      ctx.fillStyle = "rgba(18, 16, 16, 0.1)";
      for (let i = 0; i < CANVAS_HEIGHT; i += 4) {
        ctx.fillRect(0, i, CANVAS_WIDTH, 1);
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

      if (gameState === "playing") {
        if (e.key === "ArrowUp") {
          playerPaddleY.current = Math.max(0, playerPaddleY.current - 24);
        } else if (e.key === "ArrowDown") {
          playerPaddleY.current = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, playerPaddleY.current + 24);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
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

    playerPaddleY.current = computePaddleYFromClientY(clientY, rect.top, rect.height);
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

  const goHome = () => {
    setPlayerScore(0);
    setAiScore(0);
    setWinner(null);
    resetBall(1);
    setGameState("start");
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

  const mobileGameBoardStyle: React.CSSProperties | undefined = isTouchMobile
    ? {
        aspectRatio: "4 / 3",
        width: "min(calc(100vw - 16px), calc((100dvh - 120px) * 4 / 3))",
        maxHeight: "min(calc(100dvh - 120px), calc((100vw - 16px) * 3 / 4))",
      }
    : undefined;

  return (
    <div
      ref={touchArenaRef}
      className={
        isTouchMobile
          ? "fixed inset-0 z-50 flex h-dvh max-h-dvh min-h-dvh w-full flex-col overflow-hidden bg-neutral-950 pt-[env(safe-area-inset-top)] pb-[max(2rem,env(safe-area-inset-bottom))] font-mono text-white"
          : "flex h-screen w-full flex-col items-center overflow-hidden bg-neutral-950 p-4 font-mono text-white"
      }
    >
      <GameStatusAnnouncer gameState={gameState} playerScore={playerScore} aiScore={aiScore} winner={winner} />
      <div
        ref={containerRef}
        className={
          isTouchMobile
            ? `group relative flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden ${isFullscreen ? "bg-black" : "bg-neutral-950"}`
            : `group relative flex min-h-0 w-full flex-1 flex-col items-center justify-center ${isFullscreen ? "h-full bg-black" : ""}`
        }
      >
        <div
          className={
            isTouchMobile
              ? "relative flex min-h-0 w-full flex-1 flex-col items-center justify-center px-2 pb-2"
              : `relative w-full ${getSizeClass()} transition-all duration-300`
          }
        >
          <div
            className={isTouchMobile ? "relative mx-auto w-full max-w-full" : "contents"}
            style={isTouchMobile ? mobileGameBoardStyle : undefined}
          >
            {/* Retro TV Frame */}
            <div className="pointer-events-none absolute -inset-4 rounded-3xl border-8 border-neutral-700 bg-neutral-800 shadow-2xl"></div>

            <ScoreBoard playerScore={playerScore} aiScore={aiScore} />

            <GameCanvas
              canvasRef={canvasRef}
              onMouseMove={handleMouseMove}
              onTouchMove={isTouchMobile ? undefined : handleMouseMove}
            />
          </div>
        </div>

        <ControlBar
          isMuted={isMuted}
          onToggleMuted={() => setIsMuted(!isMuted)}
          showEffects={showEffects}
          onToggleEffects={() => setShowEffects(!showEffects)}
          isPlaying={gameState === "playing"}
          onToggleFullscreen={toggleFullScreen}
          onPause={() => setGameState("paused")}
          isTouchMobile={isTouchMobile}
          reduceMotion={prefersReducedMotion}
        />

        {/* UI Overlays */}
        <AnimatePresence>
          {gameState === "start" && (
            <MenuOverlay
              difficulty={difficulty}
              onDifficultyChange={setDifficulty}
              isMuted={isMuted}
              onToggleMuted={() => setIsMuted(!isMuted)}
              showEffects={showEffects}
              onToggleEffects={() => setShowEffects(!showEffects)}
              isGoalMode={isGoalMode}
              onToggleGoalMode={() => setIsGoalMode(!isGoalMode)}
              goalSizeRatio={goalSizeRatio}
              onGoalSizeRatioChange={setGoalSizeRatio}
              winningScore={winningScore}
              onWinningScoreChange={setWinningScore}
              customScoreInput={customScoreInput}
              onCustomScoreInputChange={applyCustomWinningScore}
              canvasSize={canvasSize}
              onCanvasSizeChange={setCanvasSize}
              onToggleFullscreen={toggleFullScreen}
              onStartGame={startGame}
              reduceMotion={prefersReducedMotion}
            />
          )}

          {gameState === "gameOver" && (
            <GameOverOverlay
              winner={winner}
              playerScore={playerScore}
              aiScore={aiScore}
              onRestart={startGame}
              reduceMotion={prefersReducedMotion}
            />
          )}
          {gameState === "paused" && (
            <PauseOverlay
              isMuted={isMuted}
              onToggleMuted={() => setIsMuted(!isMuted)}
              showEffects={showEffects}
              onToggleEffects={() => setShowEffects(!showEffects)}
              isGoalMode={isGoalMode}
              onToggleGoalMode={() => setIsGoalMode(!isGoalMode)}
              goalSizeRatio={goalSizeRatio}
              onGoalSizeRatioChange={setGoalSizeRatio}
              winningScore={winningScore}
              onWinningScoreChange={setWinningScore}
              canvasSize={canvasSize}
              onCanvasSizeChange={setCanvasSize}
              onToggleFullscreen={toggleFullScreen}
              onRestart={startGame}
              onHome={goHome}
              onResume={() => setGameState("playing")}
              reduceMotion={prefersReducedMotion}
            />
          )}
        </AnimatePresence>
      </div>

      <GameFooter winningScore={winningScore} isTouchMobile={isTouchMobile} />
    </div>
  );
}
