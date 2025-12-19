// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 600;
canvas.height = 800;

// Game state
let gameState = 'playing';
let gold = parseFloat(localStorage.getItem('gold') || '0');
let experience = parseFloat(localStorage.getItem('experience') || '0');
let level = parseInt(localStorage.getItem('level') || '1');
let goldPerSecond = 1;
let lastUpdate = Date.now();
let frameCount = 0;
let lastGoldSpawn = Date.now();
let lastEnemySpawn = Date.now();
let combo = 0;
let comboMultiplier = 1;
let comboTime = 0;
let particles = [];
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;

// Player (Gryphon) - Mouse controlled
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    targetX: canvas.width / 2,
    targetY: canvas.height / 2,
    width: 50,
    height: 45,
    speed: 3,
    angle: 0,
    wingFlap: 0,
    health: 100,
    maxHealth: 100,
    attackPower: 10,
    critChance: 0.05,
    critMultiplier: 2
};

// Gold to collect
const goldToCollect = [];

// Enemies/Quests
const enemies = [];
const quests = [];

// Upgrades
const upgrades = {
    autoCollect: {
        level: parseInt(localStorage.getItem('upgradeAutoCollect') || '0'),
        baseCost: 25,
        multiplier: 1.6,
        name: 'Gold Mine',
        description: 'Increases passive gold generation'
    },
    treasureFinder: {
        level: parseInt(localStorage.getItem('upgradeTreasureFinder') || '0'),
        baseCost: 50,
        multiplier: 1.8,
        name: 'Treasure Finder',
        description: 'Increases gold value from collection'
    },
    flightSpeed: {
        level: parseInt(localStorage.getItem('upgradeFlightSpeed') || '0'),
        baseCost: 75,
        multiplier: 2,
        name: 'Swift Flight',
        description: 'Increases movement speed'
    },
    attackPower: {
        level: parseInt(localStorage.getItem('upgradeAttackPower') || '0'),
        baseCost: 100,
        multiplier: 2.2,
        name: 'Fury of the Wild',
        description: 'Increases attack damage'
    },
    critChance: {
        level: parseInt(localStorage.getItem('upgradeCritChance') || '0'),
        baseCost: 150,
        multiplier: 2.5,
        name: 'Precision Strike',
        description: 'Increases critical hit chance'
    },
    autoAttack: {
        level: parseInt(localStorage.getItem('upgradeAutoAttack') || '0'),
        baseCost: 200,
        multiplier: 2.8,
        name: 'Eagle Eye',
        description: 'Increases auto-attack range'
    },
    goldMultiplier: {
        level: parseInt(localStorage.getItem('upgradeGoldMultiplier') || '0'),
        baseCost: 300,
        multiplier: 3,
        name: 'Prosperity',
        description: 'Global gold multiplier'
    },
    experience: {
        level: parseInt(localStorage.getItem('upgradeExperience') || '0'),
        baseCost: 250,
        multiplier: 2.5,
        name: 'Wisdom',
        description: 'Increases experience gain'
    }
};

// Bonuses
let activeBonuses = {
    goldBoost: { active: false, multiplier: 2, timeLeft: 0 },
    xpBoost: { active: false, multiplier: 2, timeLeft: 0 },
    speedBoost: { active: false, multiplier: 1.5, timeLeft: 0 }
};

// WoW Scenery
const structures = [
    { x: 50, height: 180, width: 80, type: 'tower' },
    { x: 200, height: 160, width: 100, type: 'castle' },
    { x: 400, height: 150, width: 70, type: 'tower' },
    { x: 520, height: 170, width: 80, type: 'castle' }
];

const trees = [
    { x: 80, y: canvas.height - 280, size: 60 },
    { x: 180, y: canvas.height - 320, size: 70 },
    { x: 350, y: canvas.height - 290, size: 55 },
    { x: 480, y: canvas.height - 310, size: 65 },
    { x: 250, y: canvas.height - 300, size: 50 }
];

// Calculate stats
function calculateStats() {
    goldPerSecond = (1 + upgrades.autoCollect.level * 0.8) * (1 + level * 0.1);
    if (activeBonuses.goldBoost.active) goldPerSecond *= activeBonuses.goldBoost.multiplier;
    
    player.speed = 3 + upgrades.flightSpeed.level * 0.5;
    if (activeBonuses.speedBoost.active) player.speed *= activeBonuses.speedBoost.multiplier;
    
    player.attackPower = 10 + upgrades.attackPower.level * 5 + level * 2;
    player.critChance = 0.05 + upgrades.critChance.level * 0.03;
    player.critMultiplier = 2 + upgrades.critChance.level * 0.1;
}

calculateStats();

// Auto-start game
startIdleGame();

setTimeout(() => {
    updateUI();
}, 100);

// Event listeners
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener('click', handleClick);
document.getElementById('upgradeAutoCollect').addEventListener('click', () => buyUpgrade('autoCollect'));
document.getElementById('upgradeTreasureFinder').addEventListener('click', () => buyUpgrade('treasureFinder'));
document.getElementById('upgradeFlightSpeed').addEventListener('click', () => buyUpgrade('flightSpeed'));
document.getElementById('upgradeAttackPower').addEventListener('click', () => buyUpgrade('attackPower'));
document.getElementById('upgradeCritChance').addEventListener('click', () => buyUpgrade('critChance'));
document.getElementById('upgradeAutoAttack').addEventListener('click', () => buyUpgrade('autoAttack'));
document.getElementById('upgradeGoldMultiplier').addEventListener('click', () => buyUpgrade('goldMultiplier'));
document.getElementById('upgradeExperience').addEventListener('click', () => buyUpgrade('experience'));

function startIdleGame() {
    const startScreen = document.getElementById('startScreen');
    if (startScreen) startScreen.classList.add('hidden');
    
    document.getElementById('scoreDisplay').classList.remove('hidden');
    document.getElementById('idleUI').classList.remove('hidden');
    
    gameLoop();
}

function handleClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Attack/collect
    attackAt(x, y);
    
    // Spawn gold at click
    if (Math.random() > 0.7) {
        spawnGold(x, y);
    }
}

function attackAt(x, y) {
    // Check enemies
    enemies.forEach(enemy => {
        const dx = enemy.x - x;
        const dy = enemy.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 60) {
            const isCrit = Math.random() < player.critChance;
            const damage = player.attackPower * (isCrit ? player.critMultiplier : 1);
            
            enemy.health -= damage;
            
            createParticles(enemy.x, enemy.y, isCrit ? '#FF0000' : '#FFD700', 8);
            
            if (isCrit) {
                createTextParticle(enemy.x, enemy.y - 20, 'CRIT!', '#FF0000');
            }
            
            if (enemy.health <= 0) {
                const goldReward = enemy.goldValue * (1 + upgrades.treasureFinder.level * 0.5) * (1 + upgrades.goldMultiplier.level * 0.3);
                gold += goldReward * comboMultiplier;
                
                const xpReward = enemy.xpValue * (1 + upgrades.experience.level * 0.4);
                if (activeBonuses.xpBoost.active) xpReward *= activeBonuses.xpBoost.multiplier;
                experience += xpReward;
                
                createParticles(enemy.x, enemy.y, '#FFD700', 15);
                createTextParticle(enemy.x, enemy.y - 30, '+' + formatNumber(goldReward) + 'g', '#FFD700');
                
                combo++;
                comboTime = 300; // 5 seconds at 60fps
                comboMultiplier = 1 + combo * 0.1;
                
                checkLevelUp();
                
                const index = enemies.indexOf(enemy);
                enemies.splice(index, 1);
            }
        }
    });
    
    // Collect gold
    goldToCollect.forEach(goldPiece => {
        const dx = goldPiece.x - x;
        const dy = goldPiece.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 50) {
            collectGold(goldPiece);
        }
    });
}

function spawnGold(x, y) {
    goldToCollect.push({
        x: x || Math.random() * canvas.width,
        y: y || Math.random() * (canvas.height - 150) + 75,
        size: 20,
        collected: false,
        opacity: 1,
        floatOffset: Math.random() * Math.PI * 2,
        rotation: Math.random() * Math.PI * 2,
        value: 1 * (1 + upgrades.treasureFinder.level * 0.5) * (1 + upgrades.goldMultiplier.level * 0.3)
    });
}

function collectGold(goldPiece) {
    if (!goldPiece.collected) {
        goldPiece.collected = true;
        gold += goldPiece.value * comboMultiplier;
        
        createParticles(goldPiece.x, goldPiece.y, '#FFD700', 10);
        createTextParticle(goldPiece.x, goldPiece.y - 20, '+' + formatNumber(goldPiece.value) + 'g', '#FFD700');
        
        combo++;
        comboTime = 300;
        comboMultiplier = 1 + combo * 0.1;
        
        saveGame();
        updateUI();
    }
}

function spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    switch(side) {
        case 0: x = -30; y = Math.random() * canvas.height; break;
        case 1: x = canvas.width + 30; y = Math.random() * canvas.height; break;
        case 2: x = Math.random() * canvas.width; y = -30; break;
        case 3: x = Math.random() * canvas.width; y = canvas.height + 30; break;
    }
    
    const enemyTypes = [
        { health: 30, speed: 1, goldValue: 5, xpValue: 2, color: '#8B4513', size: 25, name: 'Goblin' },
        { health: 60, speed: 0.8, goldValue: 12, xpValue: 5, color: '#654321', size: 30, name: 'Orc' },
        { health: 100, speed: 0.6, goldValue: 25, xpValue: 10, color: '#2F4F2F', size: 35, name: 'Troll' }
    ];
    
    const type = enemyTypes[Math.min(Math.floor(level / 5), enemyTypes.length - 1)];
    
    enemies.push({
        x: x,
        y: y,
        targetX: canvas.width / 2,
        targetY: canvas.height / 2,
        health: type.health,
        maxHealth: type.health,
        speed: type.speed,
        goldValue: type.goldValue,
        xpValue: type.xpValue,
        color: type.color,
        size: type.size,
        name: type.name,
        angle: Math.atan2(canvas.height / 2 - y, canvas.width / 2 - x)
    });
}

function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 30,
            maxLife: 30,
            size: Math.random() * 4 + 2,
            color: color
        });
    }
}

function createTextParticle(x, y, text, color) {
    particles.push({
        x: x,
        y: y,
        vx: 0,
        vy: -1,
        life: 60,
        maxLife: 60,
        size: 0,
        color: color,
        text: text
    });
}

function checkLevelUp() {
    const xpNeeded = level * 100;
    if (experience >= xpNeeded) {
        experience -= xpNeeded;
        level++;
        player.maxHealth += 20;
        player.health = player.maxHealth;
        
        createParticles(player.x, player.y, '#00FF00', 20);
        createTextParticle(player.x, player.y - 40, 'LEVEL UP!', '#00FF00');
        
        // Chance for bonus
        if (Math.random() < 0.3) {
            activateRandomBonus();
        }
        
        saveGame();
        updateUI();
    }
}

function activateRandomBonus() {
    const bonusTypes = ['goldBoost', 'xpBoost', 'speedBoost'];
    const type = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
    
    activeBonuses[type].active = true;
    activeBonuses[type].timeLeft = 600; // 10 seconds
    
    createTextParticle(player.x, player.y - 60, type.replace('Boost', ' BOOST!'), '#00FFFF');
}

function buyUpgrade(upgradeKey) {
    const upgrade = upgrades[upgradeKey];
    const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.multiplier, upgrade.level));
    
    if (gold >= cost) {
        gold -= cost;
        upgrade.level++;
        saveUpgrade(upgradeKey);
        calculateStats();
        saveGame();
        updateUI();
    }
}

function saveGame() {
    localStorage.setItem('gold', gold.toString());
    localStorage.setItem('experience', experience.toString());
    localStorage.setItem('level', level.toString());
}

function saveUpgrade(key) {
    localStorage.setItem('upgrade' + key.charAt(0).toUpperCase() + key.slice(1), upgrades[key].level.toString());
}

function updateUI() {
    document.getElementById('scoreDisplay').textContent = formatNumber(gold) + 'g';
    document.getElementById('goldPerSecond').textContent = formatNumber(goldPerSecond.toFixed(1));
    document.getElementById('levelDisplay').textContent = 'Level ' + level;
    document.getElementById('xpDisplay').textContent = 'XP: ' + Math.floor(experience) + ' / ' + (level * 100);
    document.getElementById('comboDisplay').textContent = combo > 0 ? 'Combo: ' + combo + 'x (' + comboMultiplier.toFixed(1) + 'x)' : '';
    
    // Update upgrade buttons
    Object.keys(upgrades).forEach(key => {
        updateUpgradeButton(key);
    });
}

function updateUpgradeButton(key) {
    const upgrade = upgrades[key];
    const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.multiplier, upgrade.level));
    const button = document.getElementById('upgrade' + key.charAt(0).toUpperCase() + key.slice(1));
    
    if (button) {
        const costElement = button.querySelector('.cost');
        if (costElement) {
            costElement.textContent = formatNumber(cost) + 'g';
            button.disabled = gold < cost;
        }
        
        const levelElement = button.querySelector('.level');
        if (levelElement) {
            levelElement.textContent = `Level ${upgrade.level}`;
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
    
    // Auto-collect gold
    if (deltaTime > 0) {
        gold += goldPerSecond * deltaTime;
        updateUI();
        saveGame();
    }
    
    // Update combo timer
    if (comboTime > 0) {
        comboTime--;
    } else if (combo > 0) {
        combo = 0;
        comboMultiplier = 1;
    }
    
    // Update bonuses
    Object.keys(activeBonuses).forEach(key => {
        if (activeBonuses[key].active) {
            activeBonuses[key].timeLeft--;
            if (activeBonuses[key].timeLeft <= 0) {
                activeBonuses[key].active = false;
            }
        }
    });
    
    // Update player (follow mouse)
    player.targetX = mouseX;
    player.targetY = mouseY;
    
    const dx = player.targetX - player.x;
    const dy = player.targetY - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 2) {
        player.angle = Math.atan2(dy, dx);
        player.x += Math.cos(player.angle) * player.speed;
        player.y += Math.sin(player.angle) * player.speed;
    }
    
    player.wingFlap += 0.4;
    
    // Spawn enemies
    const spawnRate = Math.max(2000 - level * 50, 500);
    if (now - lastEnemySpawn > spawnRate && enemies.length < 5 + Math.floor(level / 3)) {
        spawnEnemy();
        lastEnemySpawn = now;
    }
    
    // Update enemies
    enemies.forEach(enemy => {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        enemy.angle = Math.atan2(dy, dx);
        enemy.x += Math.cos(enemy.angle) * enemy.speed;
        enemy.y += Math.sin(enemy.angle) * enemy.speed;
        
        // Auto-attack range
        const autoAttackRange = 80 + upgrades.autoAttack.level * 10;
        if (distance < autoAttackRange && frameCount % 30 === 0) {
            const isCrit = Math.random() < player.critChance;
            const damage = player.attackPower * 0.3 * (isCrit ? player.critMultiplier : 1);
            enemy.health -= damage;
            
            if (enemy.health <= 0) {
                const goldReward = enemy.goldValue * (1 + upgrades.treasureFinder.level * 0.5) * (1 + upgrades.goldMultiplier.level * 0.3);
                gold += goldReward;
                experience += enemy.xpValue * (1 + upgrades.experience.level * 0.4);
                createParticles(enemy.x, enemy.y, '#FFD700', 12);
                checkLevelUp();
                const index = enemies.indexOf(enemy);
                enemies.splice(index, 1);
            }
        }
    });
    
    // Spawn gold
    if (now - lastGoldSpawn > 1500) {
        spawnGold();
        lastGoldSpawn = now;
    }
    
    // Update gold
    goldToCollect.forEach(goldPiece => {
        if (!goldPiece.collected) {
            goldPiece.floatOffset += 0.04;
            goldPiece.rotation += 0.03;
            goldPiece.y += Math.sin(goldPiece.floatOffset) * 0.4;
            
            // Auto-collect near player
            const dx = goldPiece.x - player.x;
            const dy = goldPiece.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const collectRange = 50 + upgrades.autoAttack.level * 5;
            if (distance < collectRange) {
                collectGold(goldPiece);
            }
        } else {
            goldPiece.opacity -= 0.08;
        }
    });
    
    // Remove collected gold
    for (let i = goldToCollect.length - 1; i >= 0; i--) {
        if (goldToCollect[i].opacity <= 0) {
            goldToCollect.splice(i, 1);
        }
    }
    
    // Update particles
    particles.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;
        if (particle.text) {
            particle.vy -= 0.1;
        }
    });
    
    particles = particles.filter(p => p.life > 0);
}

function draw() {
    // Sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, '#5B9BD5');
    skyGradient.addColorStop(0.5, '#87CEEB');
    skyGradient.addColorStop(0.9, '#B0E0E6');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Clouds
    drawClouds();
    
    const groundY = canvas.height - 80;
    
    // Draw structures with shadows
    for (let structure of structures) {
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(structure.x + 5, groundY + 3, structure.width, 10);
        
        if (structure.type === 'tower') {
            drawTower(structure.x, groundY - structure.height, structure.width, structure.height);
        } else {
            drawCastle(structure.x, groundY - structure.height, structure.width, structure.height);
        }
    }
    
    // Ground with texture
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
    
    // Ground details
    ctx.fillStyle = '#6B5B4F';
    for (let i = 0; i < canvas.width; i += 20) {
        ctx.fillRect(i, groundY, 10, 3);
    }
    
    // Grass
    ctx.fillStyle = '#7CB342';
    for (let i = 0; i < canvas.width; i += 25) {
        ctx.beginPath();
        ctx.moveTo(i, groundY);
        ctx.lineTo(i + 5, groundY - 8);
        ctx.lineTo(i + 10, groundY);
        ctx.closePath();
        ctx.fill();
    }
    
    // Trees with shadows
    for (let tree of trees) {
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(tree.x + 3, tree.y + 35, tree.size / 2, tree.size / 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        drawTree(tree.x, tree.y, tree.size);
    }
    
    // Draw gold
    goldToCollect.forEach(goldPiece => {
        if (!goldPiece.collected) {
            ctx.save();
            ctx.globalAlpha = goldPiece.opacity;
            ctx.translate(goldPiece.x, goldPiece.y);
            ctx.rotate(goldPiece.rotation);
            
            // Glow
            const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, goldPiece.size);
            glowGradient.addColorStop(0, 'rgba(255, 215, 0, 0.6)');
            glowGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(0, 0, goldPiece.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Gold coin
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(0, 0, goldPiece.size / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Highlight
            ctx.fillStyle = '#FFA500';
            ctx.beginPath();
            ctx.arc(-3, -3, goldPiece.size / 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Symbol
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('⚔', 0, 4);
            
            ctx.restore();
        }
    });
    
    // Draw enemies
    enemies.forEach(enemy => {
        drawEnemy(enemy);
    });
    
    // Draw particles
    particles.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = particle.life / particle.maxLife;
        
        if (particle.text) {
            ctx.fillStyle = particle.color;
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(particle.text, particle.x, particle.y);
        } else {
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    });
    
    // Draw player gryphon with shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(player.x + 3, player.y + player.height/2 + 3, player.width/2, player.height/3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    drawGryphon(player.x, player.y, player.angle, player.wingFlap);
    
    // Health bar
    if (player.health < player.maxHealth) {
        const barWidth = 40;
        const barHeight = 4;
        ctx.fillStyle = '#000000';
        ctx.fillRect(player.x - barWidth/2, player.y - 30, barWidth, barHeight);
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(player.x - barWidth/2, player.y - 30, barWidth * (player.health / player.maxHealth), barHeight);
    }
    
    ctx.restore();
}

function drawClouds() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    for (let i = 0; i < 3; i++) {
        const x = (frameCount * 0.1 + i * 200) % (canvas.width + 100) - 50;
        const y = 50 + i * 80;
        
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.arc(x + 25, y, 25, 0, Math.PI * 2);
        ctx.arc(x + 50, y, 20, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawTower(x, y, width, height) {
    // Main tower
    const towerGradient = ctx.createLinearGradient(x, y, x + width, y);
    towerGradient.addColorStop(0, '#8B8680');
    towerGradient.addColorStop(0.5, '#A0A0A0');
    towerGradient.addColorStop(1, '#8B8680');
    ctx.fillStyle = towerGradient;
    ctx.fillRect(x, y, width, height);
    
    // Tower top (cone)
    ctx.fillStyle = '#696969';
    ctx.beginPath();
    ctx.moveTo(x - 8, y);
    ctx.lineTo(x + width / 2, y - 25);
    ctx.lineTo(x + width + 8, y);
    ctx.closePath();
    ctx.fill();
    
    // Window glow
    ctx.fillStyle = '#FFD700';
    ctx.globalAlpha = 0.7;
    ctx.fillRect(x + width / 2 - 8, y + 30, 16, 20);
    ctx.globalAlpha = 1;
    
    // Window
    ctx.fillStyle = '#FFA500';
    ctx.fillRect(x + width / 2 - 6, y + 32, 12, 16);
}

function drawCastle(x, y, width, height) {
    // Main structure
    const castleGradient = ctx.createLinearGradient(x, y, x + width, y);
    castleGradient.addColorStop(0, '#8B8680');
    castleGradient.addColorStop(0.5, '#A0A0A0');
    castleGradient.addColorStop(1, '#8B8680');
    ctx.fillStyle = castleGradient;
    ctx.fillRect(x, y, width, height);
    
    // Battlements
    ctx.fillStyle = '#696969';
    for (let i = 0; i < 4; i++) {
        ctx.fillRect(x + i * (width / 4), y, width / 5, 12);
    }
    
    // Flag
    ctx.fillStyle = '#8B0000';
    ctx.fillRect(x + width - 10, y - 25, 8, 20);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 10px Arial';
    ctx.fillText('⚔', x + width - 7, y - 10);
}

function drawTree(x, y, size) {
    // Trunk
    const trunkGradient = ctx.createLinearGradient(x - 8, y, x + 8, y);
    trunkGradient.addColorStop(0, '#4A3728');
    trunkGradient.addColorStop(0.5, '#654321');
    trunkGradient.addColorStop(1, '#4A3728');
    ctx.fillStyle = trunkGradient;
    ctx.fillRect(x - 8, y, 16, 40);
    
    // Leaves layers
    const leavesGradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    leavesGradient.addColorStop(0, '#3D8B3D');
    leavesGradient.addColorStop(0.7, '#2F4F2F');
    leavesGradient.addColorStop(1, '#1F3F1F');
    ctx.fillStyle = leavesGradient;
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Highlights
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(x - 10, y - 10, size / 3, 0, Math.PI * 2);
    ctx.fill();
}

function drawGryphon(x, y, angle, wingFlap) {
    ctx.save();
    ctx.translate(x + 25, y + 22);
    ctx.rotate(angle);
    
    // Body (lion part)
    const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
    bodyGradient.addColorStop(0, '#D4AF37');
    bodyGradient.addColorStop(1, '#B8860B');
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Wings (animated)
    const wingAngle = Math.sin(wingFlap) * 0.6;
    ctx.save();
    ctx.rotate(-wingAngle);
    ctx.fillStyle = '#8B6914';
    ctx.beginPath();
    ctx.ellipse(-15, -8, 8, 20, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    ctx.save();
    ctx.rotate(wingAngle);
    ctx.fillStyle = '#8B6914';
    ctx.beginPath();
    ctx.ellipse(-15, 8, 8, 20, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Head
    ctx.fillStyle = '#D4AF37';
    ctx.beginPath();
    ctx.arc(18, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Beak
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.moveTo(28, -3);
    ctx.lineTo(35, 0);
    ctx.lineTo(28, 3);
    ctx.closePath();
    ctx.fill();
    
    // Eye
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(22, -2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(23, -2, 1, 0, Math.PI * 2);
    ctx.fill();
    
    // Tail
    ctx.fillStyle = '#B8860B';
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.lineTo(-30, -8);
    ctx.lineTo(-28, 8);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
}

function drawEnemy(enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.angle);
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(3, enemy.size + 3, enemy.size/2, enemy.size/3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Body
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.size / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Health bar
    const barWidth = enemy.size;
    const barHeight = 4;
    ctx.fillStyle = '#000000';
    ctx.fillRect(-barWidth/2, -enemy.size - 8, barWidth, barHeight);
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(-barWidth/2, -enemy.size - 8, barWidth * (enemy.health / enemy.maxHealth), barHeight);
    
    ctx.restore();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

draw();
