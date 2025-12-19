// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 400;
canvas.height = 600;

// Game state
let gameState = 'start'; // 'start', 'playing', 'gameOver'
let score = 0;
let bestScore = localStorage.getItem('bestScore') || 0;
let frameCount = 0;
let gameStartTime = 0;

// Player (bird)
const player = {
    x: 100,
    y: canvas.height / 2,
    width: 30,
    height: 30,
    velocity: 0,
    gravity: 0.2, // Reduced from 0.5 for slower falling
    jumpPower: -7,
    color: '#FFD700'
};

// Island scenery - Mountains
const mountains = [
    { x: 50, height: 120, width: 80 },
    { x: 150, height: 150, width: 100 },
    { x: 280, height: 100, width: 70 },
    { x: 360, height: 140, width: 90 }
];

// Island scenery - Trees
const trees = [
    { x: 30, y: canvas.height - 180, size: 40 },
    { x: 100, y: canvas.height - 200, size: 50 },
    { x: 200, y: canvas.height - 170, size: 35 },
    { x: 300, y: canvas.height - 190, size: 45 },
    { x: 350, y: canvas.height - 175, size: 38 }
];

// Initialize
document.getElementById('bestScore').textContent = bestScore;

// Event listeners
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);

// Controls
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'playing') {
            jump();
        } else if (gameState === 'start') {
            startGame();
        }
    }
});

canvas.addEventListener('click', () => {
    if (gameState === 'playing') {
        jump();
    } else if (gameState === 'start') {
        startGame();
    }
});

function startGame() {
    gameState = 'playing';
    score = 0;
    frameCount = 0;
    gameStartTime = Date.now();
    
    // Reset player
    player.y = canvas.height / 2;
    player.velocity = 0;
    
    // Hide screens
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('scoreDisplay').classList.remove('hidden');
    
    // Start game loop
    gameLoop();
}

function jump() {
    player.velocity = player.jumpPower;
}

function update() {
    if (gameState !== 'playing') return;
    
    frameCount++;
    
    // Apply gravity
    player.velocity += player.gravity;
    player.y += player.velocity;
    
    // Update score based on time survived (in seconds)
    score = Math.floor((Date.now() - gameStartTime) / 1000);
    document.getElementById('scoreDisplay').textContent = score;
    
    // Check collisions with top/bottom boundaries
    if (player.y < 0 || player.y + player.height > canvas.height - 50) {
        gameOver();
        return;
    }
}

function draw() {
    // Sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, '#87CEEB'); // Light blue
    skyGradient.addColorStop(0.7, '#E0F6FF'); // Very light blue
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw mountains (behind trees)
    ctx.fillStyle = '#8B7D6B'; // Brown-gray
    for (let mountain of mountains) {
        ctx.beginPath();
        ctx.moveTo(mountain.x, canvas.height - 50);
        ctx.lineTo(mountain.x + mountain.width / 2, canvas.height - 50 - mountain.height);
        ctx.lineTo(mountain.x + mountain.width, canvas.height - 50);
        ctx.closePath();
        ctx.fill();
        
        // Mountain snow cap
        ctx.fillStyle = '#F5F5DC';
        ctx.beginPath();
        ctx.moveTo(mountain.x + mountain.width / 2 - 10, canvas.height - 50 - mountain.height + 20);
        ctx.lineTo(mountain.x + mountain.width / 2, canvas.height - 50 - mountain.height);
        ctx.lineTo(mountain.x + mountain.width / 2 + 10, canvas.height - 50 - mountain.height + 20);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#8B7D6B';
    }
    
    // Draw island/ground
    const islandY = canvas.height - 50;
    ctx.fillStyle = '#D2B48C'; // Tan/sand color
    ctx.beginPath();
    ctx.arc(canvas.width / 2, islandY, canvas.width / 2 + 20, 0, Math.PI);
    ctx.fill();
    
    // Draw grass on island
    ctx.fillStyle = '#90EE90';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, islandY, canvas.width / 2 + 20, 0, Math.PI);
    ctx.fill();
    
    // Draw trees
    for (let tree of trees) {
        // Tree trunk
        ctx.fillStyle = '#8B4513'; // Brown
        ctx.fillRect(tree.x - 5, tree.y, 10, 30);
        
        // Tree leaves (circles)
        ctx.fillStyle = '#228B22'; // Forest green
        ctx.beginPath();
        ctx.arc(tree.x, tree.y, tree.size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Second layer of leaves for depth
        ctx.fillStyle = '#32CD32'; // Lime green
        ctx.beginPath();
        ctx.arc(tree.x - 5, tree.y - 5, tree.size / 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw water around island
    ctx.fillStyle = '#4682B4'; // Steel blue
    ctx.fillRect(0, islandY, canvas.width, canvas.height - islandY);
    
    // Water waves
    ctx.strokeStyle = '#5F9EA0';
    ctx.lineWidth = 2;
    for (let i = 0; i < canvas.width; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, islandY + 10);
        ctx.quadraticCurveTo(i + 10, islandY + 15, i + 20, islandY + 10);
        ctx.stroke();
    }
    
    // Draw player (bird)
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x + player.width/2, player.y + player.height/2, player.width/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(player.x + player.width/2 + 5, player.y + player.height/2 - 5, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw beak
    ctx.fillStyle = '#FF6347';
    ctx.beginPath();
    ctx.moveTo(player.x + player.width, player.y + player.height/2);
    ctx.lineTo(player.x + player.width + 8, player.y + player.height/2 - 3);
    ctx.lineTo(player.x + player.width + 8, player.y + player.height/2 + 3);
    ctx.closePath();
    ctx.fill();
}

function gameOver() {
    gameState = 'gameOver';
    
    // Update best score
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('bestScore', bestScore);
        document.getElementById('bestScore').textContent = bestScore;
    }
    
    // Show game over screen
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOverScreen').classList.remove('hidden');
    document.getElementById('scoreDisplay').classList.add('hidden');
}

function gameLoop() {
    if (gameState === 'playing') {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
}

// Initial draw
draw();
