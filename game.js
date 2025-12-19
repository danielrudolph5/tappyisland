// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 400;
canvas.height = 600;

// Game state
let gameState = 'playing'; // Always playing in idle game
let gold = parseFloat(localStorage.getItem('gold') || '0');
let goldPerSecond = 1;
let lastUpdate = Date.now();
let frameCount = 0;
let lastGoldSpawn = Date.now();

// Player (Gryphon)
const player = {
    x: 200,
    y: canvas.height / 2,
    width: 40,
    height: 35,
    targetY: canvas.height / 2,
    speed: 0.05,
    angle: 0,
    radius: 90,
    centerY: canvas.height / 2,
    wingFlap: 0
};

// Gold floating around
const goldToCollect = [];

// Upgrades
const upgrades = {
    autoCollect: {
        level: parseInt(localStorage.getItem('upgradeAutoCollect') || '0'),
        baseCost: 10,
        multiplier: 1.5,
        name: 'Gold Mine',
        effect: () => goldPerSecond * 0.1
    },
    coinValue: {
        level: parseInt(localStorage.getItem('upgradeCoinValue') || '0'),
        baseCost: 25,
        multiplier: 1.8,
        name: 'Treasure Finder',
        effect: () => 1 + upgrades.coinValue.level
    },
    flightSpeed: {
        level: parseInt(localStorage.getItem('upgradeFlightSpeed') || '0'),
        baseCost: 50,
        multiplier: 2,
        name: 'Swift Flight',
        effect: () => 1 + upgrades.flightSpeed.level * 0.2
    }
};

// WoW Scenery - Mountains/Castles
const structures = [
    { x: 50, height: 140, width: 60, type: 'tower' },
    { x: 150, height: 120, width: 70, type: 'castle' },
    { x: 280, height: 110, width: 55, type: 'tower' },
    { x: 350, height: 130, width: 65, type: 'castle' }
];

// WoW Scenery - Trees (Elwynn Forest style)
const trees = [
    { x: 30, y: canvas.height - 200, size: 45 },
    { x: 120, y: canvas.height - 220, size: 55 },
    { x: 220, y: canvas.height - 190, size: 40 },
    { x: 320, y: canvas.height - 210, size: 50 }
];

// Calculate gold per second based on upgrades
goldPerSecond = 1 + upgrades.autoCollect.level * 0.5;

// Auto-start game
startIdleGame();

// Initialize UI after DOM is ready
setTimeout(() => {
    updateUI();
}, 100);

// Event listeners
canvas.addEventListener('click', handleClick);
document.getElementById('upgradeAutoCollect').addEventListener('click', () => buyUpgrade('autoCollect'));
document.getElementById('upgradeCoinValue').addEventListener('click', () => buyUpgrade('coinValue'));
document.getElementById('upgradeFlightSpeed').addEventListener('click', () => buyUpgrade('flightSpeed'));

function startIdleGame() {
    // Hide start screen if exists
    const startScreen = document.getElementById('startScreen');
    if (startScreen) startScreen.classList.add('hidden');
    
    // Show game UI
    document.getElementById('scoreDisplay').classList.remove('hidden');
    document.getElementById('idleUI').classList.remove('hidden');
    
    // Start game loop
    gameLoop();
}

function handleClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Spawn gold at click location
    spawnGold(x, y);
    
    // Collect gold near click
    collectGoldNear(x, y, 50);
}

function spawnGold(x, y) {
    goldToCollect.push({
        x: x || Math.random() * canvas.width,
        y: y || Math.random() * (canvas.height - 100) + 50,
        size: 16,
        collected: false,
        opacity: 1,
        floatOffset: Math.random() * Math.PI * 2,
        rotation: Math.random() * Math.PI * 2
    });
}

function collectGoldNear(x, y, radius) {
    let collected = 0;
    goldToCollect.forEach(gold => {
        if (!gold.collected) {
            const dx = gold.x - x;
            const dy = gold.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < radius) {
                gold.collected = true;
                collected += 1 * upgrades.coinValue.effect();
            }
        }
    });
    
    if (collected > 0) {
        gold += collected;
        saveGame();
        updateUI();
    }
}

function buyUpgrade(upgradeKey) {
    const upgrade = upgrades[upgradeKey];
    const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.multiplier, upgrade.level));
    
    if (gold >= cost) {
        gold -= cost;
        upgrade.level++;
        saveUpgrade(upgradeKey);
        
        // Update game mechanics based on upgrade
        if (upgradeKey === 'autoCollect') {
            goldPerSecond = 1 + upgrade.level * 0.5;
            saveGame();
        }
        
        saveGame();
        updateUI();
    }
}

function saveGame() {
    localStorage.setItem('gold', gold.toString());
}

function saveUpgrade(key) {
    localStorage.setItem('upgrade' + key.charAt(0).toUpperCase() + key.slice(1), upgrades[key].level.toString());
}

function updateUI() {
    // Update gold display
    document.getElementById('scoreDisplay').textContent = formatNumber(gold) + 'g';
    document.getElementById('goldPerSecond').textContent = formatNumber(goldPerSecond);
    
    // Update upgrade buttons
    updateUpgradeButton('autoCollect');
    updateUpgradeButton('coinValue');
    updateUpgradeButton('flightSpeed');
}

function updateUpgradeButton(key) {
    const upgrade = upgrades[key];
    const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.multiplier, upgrade.level));
    const button = document.getElementById('upgrade' + key.charAt(0).toUpperCase() + key.slice(1));
    const costElement = button.querySelector('.cost');
    
    if (costElement) {
        costElement.textContent = formatNumber(cost) + 'g';
        button.disabled = gold < cost;
        
        // Update level display
        const levelElement = button.querySelector('.level');
        if (levelElement) {
            levelElement.textContent = `Level ${upgrade.level}`;
        }
        
        // Update name
        const nameElement = button.querySelector('.upgrade-name');
        if (nameElement) {
            nameElement.textContent = upgrade.name;
        }
    }
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(2) + 'K';
    }
    return Math.floor(num).toString();
}

function update() {
    frameCount++;
    const now = Date.now();
    const deltaTime = (now - lastUpdate) / 1000;
    lastUpdate = now;
    
    // Auto-collect gold (idle income)
    if (deltaTime > 0) {
        gold += goldPerSecond * deltaTime;
        updateUI();
        saveGame();
    }
    
    // Update player (circular flight pattern)
    player.angle += 0.02 * upgrades.flightSpeed.effect();
    player.wingFlap += 0.3;
    player.x = canvas.width / 2 + Math.cos(player.angle) * player.radius;
    player.y = player.centerY + Math.sin(player.angle) * player.radius * 0.6;
    
    // Auto-spawn gold periodically
    if (now - lastGoldSpawn > 2000) {
        spawnGold();
        lastGoldSpawn = now;
    }
    
    // Update gold (float animation)
    goldToCollect.forEach(goldPiece => {
        if (!goldPiece.collected) {
            goldPiece.floatOffset += 0.05;
            goldPiece.rotation += 0.02;
            goldPiece.y += Math.sin(goldPiece.floatOffset) * 0.3;
            
            // Auto-collect gold near player
            const dx = goldPiece.x - player.x;
            const dy = goldPiece.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 45) {
                goldPiece.collected = true;
                gold += 1 * upgrades.coinValue.effect();
                saveGame();
                updateUI();
            }
        } else {
            goldPiece.opacity -= 0.05;
        }
    });
    
    // Remove collected gold
    for (let i = goldToCollect.length - 1; i >= 0; i--) {
        if (goldToCollect[i].opacity <= 0) {
            goldToCollect.splice(i, 1);
        }
    }
}

function draw() {
    // WoW-style sky gradient (Azeroth sky)
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, '#4A90E2'); // WoW blue
    skyGradient.addColorStop(0.6, '#7BC8F6');
    skyGradient.addColorStop(0.9, '#B8E0F0');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw WoW structures (castles/towers)
    const groundY = canvas.height - 50;
    for (let structure of structures) {
        if (structure.type === 'tower') {
            // Draw tower
            ctx.fillStyle = '#696969'; // Stone gray
            ctx.fillRect(structure.x, groundY - structure.height, structure.width, structure.height);
            
            // Tower top
            ctx.fillStyle = '#555555';
            ctx.beginPath();
            ctx.moveTo(structure.x - 5, groundY - structure.height);
            ctx.lineTo(structure.x + structure.width / 2, groundY - structure.height - 15);
            ctx.lineTo(structure.x + structure.width + 5, groundY - structure.height);
            ctx.closePath();
            ctx.fill();
            
            // Tower window
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(structure.x + structure.width / 2 - 5, groundY - structure.height + 20, 10, 15);
        } else if (structure.type === 'castle') {
            // Draw castle
            ctx.fillStyle = '#696969';
            ctx.fillRect(structure.x, groundY - structure.height, structure.width, structure.height);
            
            // Castle battlements
            ctx.fillStyle = '#555555';
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(structure.x + i * (structure.width / 3), groundY - structure.height, structure.width / 4, 10);
            }
            
            // Castle flag
            ctx.fillStyle = '#8B0000';
            ctx.fillRect(structure.x + structure.width - 8, groundY - structure.height - 20, 6, 15);
        }
    }
    
    // Draw ground (Azeroth terrain)
    ctx.fillStyle = '#8B7355'; // WoW brown ground
    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
    
    // Draw grass patches
    ctx.fillStyle = '#6B8E23';
    for (let i = 0; i < canvas.width; i += 30) {
        ctx.fillRect(i, groundY, 15, 8);
    }
    
    // Draw trees (Elwynn Forest style)
    for (let tree of trees) {
        // Tree trunk
        ctx.fillStyle = '#654321';
        ctx.fillRect(tree.x - 6, tree.y, 12, 35);
        
        // Tree crown (lush green)
        ctx.fillStyle = '#2F4F2F';
        ctx.beginPath();
        ctx.arc(tree.x, tree.y, tree.size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Highlights
        ctx.fillStyle = '#3D6B3D';
        ctx.beginPath();
        ctx.arc(tree.x - 8, tree.y - 8, tree.size / 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#228B22';
        ctx.beginPath();
        ctx.arc(tree.x + 8, tree.y - 5, tree.size / 4, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw floating gold coins (WoW gold)
    goldToCollect.forEach(goldPiece => {
        if (!goldPiece.collected) {
            ctx.save();
            ctx.globalAlpha = goldPiece.opacity;
            ctx.translate(goldPiece.x, goldPiece.y);
            ctx.rotate(goldPiece.rotation);
            
            // Gold coin shape
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.ellipse(0, 0, goldPiece.size / 2, goldPiece.size / 2.5, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Gold shine
            ctx.fillStyle = '#FFA500';
            ctx.beginPath();
            ctx.ellipse(-2, -2, goldPiece.size / 4, goldPiece.size / 5, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Alliance lion symbol (simplified)
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('⚔', 0, 3);
            
            ctx.restore();
        }
    });
    
    // Draw player (Gryphon)
    ctx.save();
    ctx.translate(player.x + player.width/2, player.y + player.height/2);
    ctx.rotate(Math.atan2(Math.sin(player.angle), Math.cos(player.angle)));
    
    // Gryphon body
    ctx.fillStyle = '#8B6914'; // Brown fur
    ctx.beginPath();
    ctx.ellipse(0, 0, player.width/2, player.height/2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Gryphon head/beak
    ctx.fillStyle = '#FFD700'; // Golden beak
    ctx.beginPath();
    ctx.moveTo(player.width/2 - 5, 0);
    ctx.lineTo(player.width/2 + 8, -5);
    ctx.lineTo(player.width/2 + 8, 5);
    ctx.closePath();
    ctx.fill();
    
    // Wings (animated)
    ctx.fillStyle = '#654321';
    const wingOffset = Math.sin(player.wingFlap) * 15;
    ctx.beginPath();
    ctx.ellipse(-8, -wingOffset, 6, 15, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-8, wingOffset, 6, 15, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Tail
    ctx.fillStyle = '#8B6914';
    ctx.beginPath();
    ctx.moveTo(-player.width/2, 0);
    ctx.lineTo(-player.width/2 - 10, -5);
    ctx.lineTo(-player.width/2 - 8, 5);
    ctx.closePath();
    ctx.fill();
    
    // Eye
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(5, -3, 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Initial draw
draw();
