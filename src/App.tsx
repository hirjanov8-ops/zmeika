import { useState, useEffect, useCallback, useRef } from 'react';

// Types
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = { x: number; y: number };
type Difficulty = 'easy' | 'medium' | 'hard';
type GameState = 'idle' | 'playing' | 'paused' | 'gameover';

// Constants
const GRID_SIZE = 20;
const SPEEDS: Record<Difficulty, number> = {
  easy: 150,
  medium: 100,
  hard: 60,
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Легко',
  medium: 'Средне',
  hard: 'Сложно',
};

// Helper functions
function getRandomPosition(snake: Position[]): Position {
  let pos: Position;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  return pos;
}

function getInitialSnake(): Position[] {
  const mid = Math.floor(GRID_SIZE / 2);
  return [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
}

// Custom hook for game logic
function useSnakeGame() {
  const [snake, setSnake] = useState<Position[]>(getInitialSnake());
  const [food, setFood] = useState<Position>(() => getRandomPosition(getInitialSnake()));
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('snake-high-score');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [eatAnimation, setEatAnimation] = useState(false);

  const directionRef = useRef<Direction>(direction);
  const gameStateRef = useRef<GameState>(gameState);
  const snakeRef = useRef<Position[]>(snake);
  const foodRef = useRef<Position>(food);
  const scoreRef = useRef<number>(score);
  const gameLoopRef = useRef<number | null>(null);
  const lastDirectionRef = useRef<Direction>(direction);

  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { foodRef.current = food; }, [food]);
  useEffect(() => { scoreRef.current = score; }, [score]);

  const resetGame = useCallback(() => {
    const initialSnake = getInitialSnake();
    setSnake(initialSnake);
    setFood(getRandomPosition(initialSnake));
    setDirection('RIGHT');
    lastDirectionRef.current = 'RIGHT';
    setScore(0);
    setGameState('idle');
  }, []);

  const startGame = useCallback(() => {
    if (gameState === 'gameover') {
      resetGame();
    }
    setGameState('playing');
  }, [gameState, resetGame]);

  const togglePause = useCallback(() => {
    if (gameState === 'playing') {
      setGameState('paused');
    } else if (gameState === 'paused') {
      setGameState('playing');
    }
  }, [gameState]);

  const changeDirection = useCallback((newDir: Direction) => {
    const current = lastDirectionRef.current;
    const opposites: Record<Direction, Direction> = {
      UP: 'DOWN',
      DOWN: 'UP',
      LEFT: 'RIGHT',
      RIGHT: 'LEFT',
    };
    if (opposites[newDir] !== current) {
      setDirection(newDir);
      lastDirectionRef.current = newDir;
    }
  }, []);

  const moveSnake = useCallback(() => {
    const currentSnake = snakeRef.current;
    const currentFood = foodRef.current;
    const currentDirection = directionRef.current;
    const head = currentSnake[0];

    let newHead: Position;
    switch (currentDirection) {
      case 'UP':
        newHead = { x: head.x, y: head.y - 1 };
        break;
      case 'DOWN':
        newHead = { x: head.x, y: head.y + 1 };
        break;
      case 'LEFT':
        newHead = { x: head.x - 1, y: head.y };
        break;
      case 'RIGHT':
        newHead = { x: head.x + 1, y: head.y };
        break;
    }

    // Check wall collision
    if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
      setGameState('gameover');
      const currentScore = scoreRef.current;
      const savedHigh = parseInt(localStorage.getItem('snake-high-score') || '0', 10);
      if (currentScore > savedHigh) {
        localStorage.setItem('snake-high-score', currentScore.toString());
        setHighScore(currentScore);
      }
      return;
    }

    // Check self collision
    if (currentSnake.some(s => s.x === newHead.x && s.y === newHead.y)) {
      setGameState('gameover');
      const currentScore = scoreRef.current;
      const savedHigh = parseInt(localStorage.getItem('snake-high-score') || '0', 10);
      if (currentScore > savedHigh) {
        localStorage.setItem('snake-high-score', currentScore.toString());
        setHighScore(currentScore);
      }
      return;
    }

    const newSnake = [newHead, ...currentSnake];

    // Check food
    if (newHead.x === currentFood.x && newHead.y === currentFood.y) {
      const newScore = scoreRef.current + 10;
      setScore(newScore);
      setFood(getRandomPosition(newSnake));
      setEatAnimation(true);
      setTimeout(() => setEatAnimation(false), 300);
    } else {
      newSnake.pop();
    }

    setSnake(newSnake);
  }, []);

  // Game loop
  useEffect(() => {
    if (gameState === 'playing') {
      const speed = SPEEDS[difficulty];
      gameLoopRef.current = window.setInterval(moveSnake, speed);
    } else {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    }
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameState, difficulty, moveSnake]);

  // Update high score on game over
  useEffect(() => {
    if (gameState === 'gameover') {
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('snake-high-score', score.toString());
      }
    }
  }, [gameState, score, highScore]);

  return {
    snake,
    food,
    direction,
    gameState,
    score,
    highScore,
    difficulty,
    eatAnimation,
    setDifficulty,
    startGame,
    togglePause,
    resetGame,
    changeDirection,
  };
}

// Main App Component
export default function App() {
  const {
    snake,
    food,
    gameState,
    score,
    highScore,
    difficulty,
    eatAnimation,
    setDifficulty,
    startGame,
    togglePause,
    resetGame,
    changeDirection,
  } = useSnakeGame();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState(400);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Resize canvas
  useEffect(() => {
    const updateSize = () => {
      const container = containerRef.current;
      if (container) {
        const maxSize = Math.min(container.clientWidth, container.clientHeight, 500);
        setCanvasSize(Math.floor(maxSize / GRID_SIZE) * GRID_SIZE);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = canvasSize / GRID_SIZE;

    // Clear
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Draw grid
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvasSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvasSize, i * cellSize);
      ctx.stroke();
    }

    // Draw food with glow
    const foodX = food.x * cellSize + cellSize / 2;
    const foodY = food.y * cellSize + cellSize / 2;
    const foodRadius = cellSize * 0.4;

    // Glow effect
    const glowGradient = ctx.createRadialGradient(foodX, foodY, 0, foodX, foodY, cellSize);
    glowGradient.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
    glowGradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(food.x * cellSize - cellSize / 2, food.y * cellSize - cellSize / 2, cellSize * 2, cellSize * 2);

    // Food body
    ctx.beginPath();
    ctx.arc(foodX, foodY, foodRadius, 0, Math.PI * 2);
    const foodGradient = ctx.createRadialGradient(foodX - 2, foodY - 2, 0, foodX, foodY, foodRadius);
    foodGradient.addColorStop(0, '#fca5a5');
    foodGradient.addColorStop(1, '#ef4444');
    ctx.fillStyle = foodGradient;
    ctx.fill();

    // Draw snake
    snake.forEach((segment, index) => {
      const x = segment.x * cellSize;
      const y = segment.y * cellSize;
      const padding = 1;

      if (index === 0) {
        // Head with gradient
        const headGradient = ctx.createLinearGradient(x, y, x + cellSize, y + cellSize);
        headGradient.addColorStop(0, '#4ade80');
        headGradient.addColorStop(1, '#22c55e');
        ctx.fillStyle = headGradient;
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 8;
        roundRect(ctx, x + padding, y + padding, cellSize - padding * 2, cellSize - padding * 2, 4);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Eyes
        const eyeSize = cellSize * 0.12;
        ctx.fillStyle = '#fff';
        const eyeOffsetX = cellSize * 0.25;
        const eyeOffsetY = cellSize * 0.25;
        ctx.beginPath();
        ctx.arc(x + eyeOffsetX, y + eyeOffsetY, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + cellSize - eyeOffsetX, y + eyeOffsetY, eyeSize, 0, Math.PI * 2);
        ctx.fill();

        // Pupils
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(x + eyeOffsetX, y + eyeOffsetY, eyeSize * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + cellSize - eyeOffsetX, y + eyeOffsetY, eyeSize * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Body segments with gradient
        const progress = index / snake.length;
        const green = Math.floor(180 - progress * 60);
        ctx.fillStyle = `rgb(34, ${green}, 80)`;
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 2;
        roundRect(ctx, x + padding + 1, y + padding + 1, cellSize - (padding + 1) * 2, cellSize - (padding + 1) * 2, 3);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // Eat animation
    if (eatAnimation) {
      ctx.fillStyle = 'rgba(74, 222, 128, 0.2)';
      ctx.fillRect(0, 0, canvasSize, canvasSize);
    }

    // Overlay for non-playing states
    if (gameState === 'paused') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.fillRect(0, 0, canvasSize, canvasSize);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = `bold ${canvasSize * 0.08}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('ПАУЗА', canvasSize / 2, canvasSize / 2);
      ctx.font = `${canvasSize * 0.04}px sans-serif`;
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Нажмите для продолжения', canvasSize / 2, canvasSize / 2 + canvasSize * 0.08);
    }

    if (gameState === 'gameover') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(0, 0, canvasSize, canvasSize);
      ctx.fillStyle = '#ef4444';
      ctx.font = `bold ${canvasSize * 0.08}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('ИГРА ОКОНЧЕНА', canvasSize / 2, canvasSize / 2 - canvasSize * 0.05);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = `${canvasSize * 0.05}px sans-serif`;
      ctx.fillText(`Счёт: ${score}`, canvasSize / 2, canvasSize / 2 + canvasSize * 0.05);
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${canvasSize * 0.035}px sans-serif`;
      ctx.fillText('Нажмите "Новая игра"', canvasSize / 2, canvasSize / 2 + canvasSize * 0.12);
    }

    if (gameState === 'idle') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.fillRect(0, 0, canvasSize, canvasSize);
      ctx.fillStyle = '#4ade80';
      ctx.font = `bold ${canvasSize * 0.07}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('🐍 ЗМЕЙКА', canvasSize / 2, canvasSize / 2 - canvasSize * 0.05);
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${canvasSize * 0.035}px sans-serif`;
      ctx.fillText('Нажмите "Старт" чтобы начать', canvasSize / 2, canvasSize / 2 + canvasSize * 0.05);
    }
  }, [snake, food, canvasSize, gameState, eatAnimation, score]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          changeDirection('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          changeDirection('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          changeDirection('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          changeDirection('RIGHT');
          break;
        case ' ':
          e.preventDefault();
          if (gameState === 'idle' || gameState === 'gameover') {
            startGame();
          } else {
            togglePause();
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (gameState === 'playing' || gameState === 'paused') {
            togglePause();
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeDirection, gameState, startGame, togglePause]);

  // Touch controls (swipe)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const minSwipe = 30;

    if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) {
      // It's a tap, not a swipe
      if (gameState === 'idle' || gameState === 'gameover') {
        startGame();
      } else {
        togglePause();
      }
      return;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      changeDirection(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      changeDirection(dy > 0 ? 'DOWN' : 'UP');
    }
    touchStartRef.current = null;
  }, [changeDirection, gameState, startGame, togglePause]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-2 sm:p-4 select-none overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-lg mb-2 sm:mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-green-400 mb-2 tracking-wide">
          🐍 Змейка
        </h1>

        {/* Score panel */}
        <div className="flex justify-between items-center bg-slate-800 rounded-xl px-3 sm:px-5 py-2 sm:py-3 border border-slate-700">
          <div className="text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wider">Счёт</div>
            <div className="text-xl sm:text-2xl font-bold text-white">{score}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wider">Рекорд</div>
            <div className="text-xl sm:text-2xl font-bold text-yellow-400">
              <i className="fas fa-trophy text-yellow-500 mr-1 text-sm"></i>
              {highScore}
            </div>
          </div>
        </div>
      </div>

      {/* Game canvas */}
      <div
        ref={containerRef}
        className="relative w-full max-w-lg flex items-center justify-center"
        style={{ aspectRatio: '1 / 1', maxHeight: '60vh' }}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          className="rounded-xl border-2 border-slate-600 shadow-2xl shadow-green-900/20"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        />
      </div>

      {/* Controls */}
      <div className="w-full max-w-lg mt-2 sm:mt-4 space-y-2 sm:space-y-3">
        {/* Action buttons */}
        <div className="flex gap-2 sm:gap-3 justify-center">
          {gameState === 'idle' || gameState === 'gameover' ? (
            <button
              onClick={startGame}
              className="flex-1 max-w-[200px] bg-green-600 hover:bg-green-500 active:bg-green-700 text-white font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg shadow-green-900/30 text-sm sm:text-base"
            >
              <i className="fas fa-play mr-2"></i>
              {gameState === 'gameover' ? 'Новая игра' : 'Старт'}
            </button>
          ) : (
            <button
              onClick={togglePause}
              className="flex-1 max-w-[200px] bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg shadow-amber-900/30 text-sm sm:text-base"
            >
              <i className={`fas ${gameState === 'paused' ? 'fa-play' : 'fa-pause'} mr-2`}></i>
              {gameState === 'paused' ? 'Продолжить' : 'Пауза'}
            </button>
          )}
          <button
            onClick={resetGame}
            className="bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white font-bold py-2.5 sm:py-3 px-4 sm:px-5 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg text-sm sm:text-base"
          >
            <i className="fas fa-redo mr-1 sm:mr-2"></i>
            <span className="hidden sm:inline">Сброс</span>
          </button>
        </div>

        {/* Difficulty selector */}
        <div className="flex justify-center gap-1 sm:gap-2">
          {(Object.keys(SPEEDS) as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              disabled={gameState === 'playing' || gameState === 'paused'}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 ${
                difficulty === d
                  ? 'bg-green-600 text-white shadow-lg shadow-green-900/30'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              } ${gameState === 'playing' || gameState === 'paused' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {DIFFICULTY_LABELS[d]}
            </button>
          ))}
        </div>

        {/* Mobile D-pad */}
        <div className="flex justify-center sm:hidden mt-2">
          <div className="grid grid-cols-3 gap-1 w-36">
            <div></div>
            <button
              onTouchStart={(e) => { e.preventDefault(); changeDirection('UP'); }}
              className="bg-slate-700 active:bg-slate-600 text-white rounded-lg p-3 flex items-center justify-center text-lg"
            >
              <i className="fas fa-chevron-up"></i>
            </button>
            <div></div>
            <button
              onTouchStart={(e) => { e.preventDefault(); changeDirection('LEFT'); }}
              className="bg-slate-700 active:bg-slate-600 text-white rounded-lg p-3 flex items-center justify-center text-lg"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <button
              onTouchStart={(e) => { e.preventDefault(); changeDirection('DOWN'); }}
              className="bg-slate-700 active:bg-slate-600 text-white rounded-lg p-3 flex items-center justify-center text-lg"
            >
              <i className="fas fa-chevron-down"></i>
            </button>
            <button
              onTouchStart={(e) => { e.preventDefault(); changeDirection('RIGHT'); }}
              className="bg-slate-700 active:bg-slate-600 text-white rounded-lg p-3 flex items-center justify-center text-lg"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-center text-xs text-slate-500 mt-2">
          <span className="hidden sm:inline">
            <i className="fas fa-keyboard mr-1"></i> Стрелки / WASD — управление • Пробел — пауза
          </span>
          <span className="sm:hidden">
            <i className="fas fa-hand-pointer mr-1"></i> Свайп или кнопки для управления
          </span>
        </div>
      </div>
    </div>
  );
}

// Helper: draw rounded rectangle
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
