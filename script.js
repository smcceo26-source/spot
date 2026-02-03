// Game Constants
const CANVAS_SIZE = 400;
const GRID_SIZE = 20;
const TILE_COUNT = CANVAS_SIZE / GRID_SIZE;
const GAME_SPEED = 500; // ms
const MIN_SWIPE_DISTANCE = 40; // Minimum swipe distance in pixels

// Colors
const COLOR_SNAKE_HEAD = '#10b981';
const COLOR_SNAKE_BODY = '#059669';
const COLOR_FOOD = '#f43f5e';

// DOM Elements
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const pauseScreen = document.getElementById('pause-screen');
const finalScoreEl = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const resumeBtn = document.getElementById('resume-btn');
const swipeIndicator = document.getElementById('swipe-indicator');

// Game State
let score = 0;
let highScore = localStorage.getItem('snake-high-score') || 0;
let gameLoop = null;
let velocity = { x: 0, y: 0 };
let snake = [];
let food = { x: 0, y: 0 };
let nextVelocity = { x: 0, y: 0 }; // Buffer for input
let isPaused = false;

// Initialize High Score UI
highScoreEl.innerText = highScore;

// Canvas scaling for high-DPI displays
let scale = 1;

function setupCanvas() {
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Get device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;

    // Calculate the actual display size
    const displaySize = Math.min(containerWidth, containerHeight, CANVAS_SIZE);

    // Set canvas display size (CSS)
    canvas.style.width = displaySize + 'px';
    canvas.style.height = displaySize + 'px';

    // Set canvas actual size (scaled for DPI)
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;

    // Scale the context to match DPI
    scale = dpr;
    ctx.scale(scale, scale);

    // Ensure crisp pixel rendering
    ctx.imageSmoothingEnabled = false;
}

// Initialize canvas
setupCanvas();

// Handle window resize and orientation change
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        setupCanvas();
        draw(); // Redraw after resize
    }, 100);
});

window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        setupCanvas();
        draw();
    }, 200);
});

// Event Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
resumeBtn.addEventListener('click', resumeGame);
document.addEventListener('keydown', handleKeyInput);

// Canvas tap for pause (only during gameplay)
canvas.addEventListener('click', () => {
    if (gameLoop && !startScreen.classList.contains('active') && !gameOverScreen.classList.contains('active')) {
        togglePause();
    }
});

function initGame() {
    // Reset state
    score = 0;
    scoreEl.innerText = score;
    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    velocity = { x: 1, y: 0 }; // Start moving right
    nextVelocity = { x: 1, y: 0 };
    spawnFood();
}

function startGame() {
    initGame();
    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    pauseScreen.classList.remove('active');
    isPaused = false;

    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(update, GAME_SPEED);
}

function togglePause() {
    if (isPaused) {
        resumeGame();
    } else {
        pauseGame();
    }
}

function pauseGame() {
    isPaused = true;
    pauseScreen.classList.add('active');
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }
}

function resumeGame() {
    isPaused = false;
    pauseScreen.classList.remove('active');
    if (!gameLoop) {
        gameLoop = setInterval(update, GAME_SPEED);
    }
}

function update() {
    moveSnake();
    if (checkDeath()) {
        gameOver();
        return;
    }
    checkFood();
    draw();
}

function moveSnake() {
    velocity = { ...nextVelocity };

    const head = {
        x: snake[0].x + velocity.x,
        y: snake[0].y + velocity.y
    };

    snake.unshift(head);
    snake.pop();
}

function checkDeath() {
    const head = snake[0];

    // Wall Collision
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        return true;
    }

    // Self Collision
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }

    return false;
}

function checkFood() {
    const head = snake[0];
    // Since we popped in moveSnake, if we ate food, we need to grow (push a new tail not strictly necessary, just don't pop? 
    // Wait, typical snake logic: move head. If food, don't pop tail. If no food, pop tail.
    // My moveSnake currently pushes head and pops tail. 
    // So if food is at head position currently:

    if (head.x === food.x && head.y === food.y) {
        // Grow: Add a segment (by duplicating the tail - or simpler, just don't pop in moveSnake next time? 
        // Adjustment: Let's refactor moveSnake to NOT pop, and separate pop logic or push logic here.
        // Re-implementing simplified growth:
        snake.push({ ...snake[snake.length - 1] }); // Add dummy tail to expand
        score += 10;
        updateScore();
        spawnFood();

        // Effects? (vibrate)
        if (navigator.vibrate) navigator.vibrate(50);
    }
}

function updateScore() {
    scoreEl.innerText = score;
    // Trigger animation by removing and re-adding class
    scoreEl.classList.remove('score-pulse');
    void scoreEl.offsetWidth; // Force reflow
    scoreEl.classList.add('score-pulse');
}

function spawnFood() {
    // Random position not on snake
    let valid = false;
    while (!valid) {
        food.x = Math.floor(Math.random() * TILE_COUNT);
        food.y = Math.floor(Math.random() * TILE_COUNT);

        valid = true;
        for (let part of snake) {
            if (part.x === food.x && part.y === food.y) {
                valid = false;
                break;
            }
        }
    }
}

function gameOver() {
    clearInterval(gameLoop);

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snake-high-score', highScore);
        highScoreEl.innerText = highScore;
    }

    finalScoreEl.innerText = score;
    gameOverScreen.classList.add('active');
}

function draw() {
    // Clear
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; // Slight trail effect? Or clear rect
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Regular clean clear or transparent

    // Draw Snake
    snake.forEach((part, index) => {
        ctx.fillStyle = index === 0 ? COLOR_SNAKE_HEAD : COLOR_SNAKE_BODY;

        // Modern rounded rects
        const x = part.x * GRID_SIZE;
        const y = part.y * GRID_SIZE;
        const size = GRID_SIZE - 2; // gap

        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, size, size, 4);
        ctx.fill();

        // Eyes for head
        if (index === 0) {
            ctx.fillStyle = 'white';
            // Simple eyes based on velocity? For now just static
            ctx.beginPath();
            ctx.arc(x + 6, y + 6, 2, 0, Math.PI * 2);
            ctx.arc(x + 14, y + 6, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // Draw Food
    ctx.fillStyle = COLOR_FOOD;
    const fx = food.x * GRID_SIZE;
    const fy = food.y * GRID_SIZE;
    const fsize = GRID_SIZE - 2;

    ctx.shadowColor = COLOR_FOOD;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(fx + GRID_SIZE / 2, fy + GRID_SIZE / 2, fsize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

function handleKeyInput(e) {
    // Prevent default for arrow keys to avoid page scrolling
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
    }

    switch (e.key) {
        case 'ArrowUp':
            if (velocity.y === 0) {
                nextVelocity = { x: 0, y: -1 };
                showSwipeIndicator('up');
            }
            break;
        case 'ArrowDown':
            if (velocity.y === 0) {
                nextVelocity = { x: 0, y: 1 };
                showSwipeIndicator('down');
            }
            break;
        case 'ArrowLeft':
            if (velocity.x === 0) {
                nextVelocity = { x: -1, y: 0 };
                showSwipeIndicator('left');
            }
            break;
        case 'ArrowRight':
            if (velocity.x === 0) {
                nextVelocity = { x: 1, y: 0 };
                showSwipeIndicator('right');
            }
            break;
        case ' ':
        case 'Escape':
            if (gameLoop) togglePause();
            break;
    }
}

function handleMobileInput(dir) {
    switch (dir) {
        case 'ArrowUp':
            if (velocity.y === 0) {
                nextVelocity = { x: 0, y: -1 };
                showSwipeIndicator('up');
            }
            break;
        case 'ArrowDown':
            if (velocity.y === 0) {
                nextVelocity = { x: 0, y: 1 };
                showSwipeIndicator('down');
            }
            break;
        case 'ArrowLeft':
            if (velocity.x === 0) {
                nextVelocity = { x: -1, y: 0 };
                showSwipeIndicator('left');
            }
            break;
        case 'ArrowRight':
            if (velocity.x === 0) {
                nextVelocity = { x: 1, y: 0 };
                showSwipeIndicator('right');
            }
            break;
    }
}

// Show swipe direction indicator
function showSwipeIndicator(direction) {
    // Remove all direction classes
    swipeIndicator.classList.remove('up', 'down', 'left', 'right', 'show');

    // Add new direction and show
    swipeIndicator.classList.add(direction, 'show');

    // Remove after animation
    setTimeout(() => {
        swipeIndicator.classList.remove('show');
    }, 600);
}

// Swipe Support
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

document.addEventListener('touchend', e => {
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
}, { passive: true });

// Prevent default touch behaviors on canvas
canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
canvas.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
canvas.addEventListener('touchend', e => e.preventDefault(), { passive: false });

function handleSwipe(sx, sy, ex, ey) {
    const dx = ex - sx;
    const dy = ey - sy;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Check if swipe distance meets minimum threshold
    if (absDx < MIN_SWIPE_DISTANCE && absDy < MIN_SWIPE_DISTANCE) {
        return; // Ignore small movements
    }

    if (absDx > absDy) {
        // Horizontal swipe
        if (dx > 0) {
            handleMobileInput('ArrowRight');
        } else {
            handleMobileInput('ArrowLeft');
        }
    } else {
        // Vertical swipe
        if (dy > 0) {
            handleMobileInput('ArrowDown');
        } else {
            handleMobileInput('ArrowUp');
        }
    }
}

