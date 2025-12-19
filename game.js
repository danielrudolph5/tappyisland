// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 800;
canvas.height = 600;

// Game state
let gameState = 'playing';
let gold = parseFloat(localStorage.getItem('gold') || '0');
let experience = parseFloat(localStorage.getItem('experience') || '0');
let level = parseInt(localStorage.getItem('level') || '1');
let goldPerSecond = 1;
let lastUpdate = Date.now();
let frameCount = 0;
let lastMonsterSpawn = Date.now();
let particles = [];
let combo = 0;
let comboMultiplier = 1;
let comboTime = 0;

// Player (initialized after canvas size is set)
const player = {
    x: 400,
    y: 300,
    health: 100,
    maxHealth: 100,
    shield: 0,
    maxShield: 0,
    shieldRegen: 0,
    size: 30
};

// Monsters
const monsters = [];

// Soldiers (auto-attackers)
const soldiers = [];

// Upgrades
const upgrades = {
    soldierDamage: {
        level: parseInt(localStorage.getItem('upgradeSoldierDamage') || '0'),
        baseCost: 50,
        multiplier: 1.8,
        name: 'Soldier Training',
        description: 'Increases soldier damage'
    },
    soldierSpeed: {
        level: parseInt(localStorage.getItem('upgradeSoldierSpeed') || '0'),
        baseCost: 75,
        multiplier: 2,
        name: 'Combat Speed',
        description: 'Soldiers attack faster'
    },
    soldierCount: {
        level: parseInt(localStorage.getItem('upgradeSoldierCount') || '0'),
        baseCost: 100,
        multiplier: 2.5,
        name: 'Recruitment',
        description: 'Hire more soldiers'
    },
    tapDamage: {
        level: parseInt(localStorage.getItem('upgradeTapDamage') || '0'),
        baseCost: 30,
        multiplier: 1.7,
        name: 'Power Strike',
        description: 'Increase tap damage'
    },
    goldReward: {
        level: parseInt(localStorage.getItem('upgradeGoldReward') || '0'),
        baseCost: 60,
        multiplier: 1.9,
        name: 'Treasure Hunter',
        description: 'More gold from monsters'
    },
    critChance: {
        level: parseInt(localStorage.getItem('upgradeCritChance') || '0'),
        baseCost: 120,
        multiplier: 2.2,
        name: 'Critical Hit',
        description: 'Chance for critical damage'
    },
    autoGold: {
        level: parseInt(localStorage.getItem('upgradeAutoGold') || '0'),
        baseCost: 40,
        multiplier: 1.6,
        name: 'Gold Mine',
        description: 'Passive gold generation'
    },
    experience: {
        level: parseInt(localStorage.getItem('upgradeExperience') || '0'),
        baseCost: 80,
        multiplier: 2,
        name: 'Wisdom',
        description: 'More experience gain'
    },
    shield: {
        level: parseInt(localStorage.getItem('upgradeShield') || '0'),
        baseCost: 150,
        multiplier: 2.5,
        name: 'Shield',
        description: 'Adds shield protection'
    },
    shieldRegen: {
        level: parseInt(localStorage.getItem('upgradeShieldRegen') || '0'),
        baseCost: 200,
        multiplier: 3,
        name: 'Shield Regen',
        description: 'Regenerates shield over time'
    }
};

// Monster types
const monsterTypes = [
    { name: 'Goblin', health: 20, goldValue: 5, xpValue: 2, color: '#8B4513', size: 40, speed: 0.5 },
    { name: 'Orc', health: 50, goldValue: 15, xpValue: 5, color: '#654321', size: 50, speed: 0.3 },
    { name: 'Troll', health: 100, goldValue: 35, xpValue: 10, color: '#2F4F2F', size: 60, speed: 0.2 },
    { name: 'Dragon', health: 200, goldValue: 80, xpValue: 25, color: '#8B0000', size: 70, speed: 0.15 },
    { name: 'Demon', health: 500, goldValue: 200, xpValue: 60, color: '#4B0082', size: 80, speed: 0.1 }
];

// Calculate stats
function calculateStats() {
    goldPerSecond = 1 + upgrades.autoGold.level * 0.5;
    
    // Shield stats
    player.maxShield = upgrades.shield.level * 50;
    player.shieldRegen = upgrades.shieldRegen.level * 0.5; // per second
    
    // Clamp shield to max
    if (player.shield > player.maxShield) {
        player.shield = player.maxShield;
    }
    
    // Update soldier count
    const targetSoldierCount = 1 + upgrades.soldierCount.level;
    while (soldiers.length < targetSoldierCount) {
        spawnSoldier();
    }
    while (soldiers.length > targetSoldierCount) {
        soldiers.pop();
    }
    
    // Update all existing soldiers with new stats
    soldiers.forEach(soldier => {
        soldier.damage = 5 + upgrades.soldierDamage.level * 3;
        soldier.maxCooldown = Math.max(10, 60 - upgrades.soldierSpeed.level * 5);
        soldier.attackRange = 150 + upgrades.soldierCount.level * 10;
    });
}

// Initialize player from storage
player.x = canvas.width / 2;
player.y = canvas.height / 2;
player.health = Math.min(parseFloat(localStorage.getItem('playerHealth') || '100'), 100);
player.shield = parseFloat(localStorage.getItem('playerShield') || '0');

calculateStats();

// Ensure shield doesn't exceed max
if (player.shield > player.maxShield) {
    player.shield = player.maxShield;
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        startGame();
        setTimeout(() => {
            updateUI();
        }, 100);
    });
} else {
    startGame();
    setTimeout(() => {
        updateUI();
    }, 100);
}

// Event listeners
canvas.addEventListener('click', handleClick);
document.getElementById('upgradeSoldierDamage').addEventListener('click', () => buyUpgrade('soldierDamage'));
document.getElementById('upgradeSoldierSpeed').addEventListener('click', () => buyUpgrade('soldierSpeed'));
document.getElementById('upgradeSoldierCount').addEventListener('click', () => buyUpgrade('soldierCount'));
document.getElementById('upgradeTapDamage').addEventListener('click', () => buyUpgrade('tapDamage'));
document.getElementById('upgradeGoldReward').addEventListener('click', () => buyUpgrade('goldReward'));
document.getElementById('upgradeCritChance').addEventListener('click', () => buyUpgrade('critChance'));
document.getElementById('upgradeAutoGold').addEventListener('click', () => buyUpgrade('autoGold'));
document.getElementById('upgradeExperience').addEventListener('click', () => buyUpgrade('experience'));
document.getElementById('upgradeShield').addEventListener('click', () => buyUpgrade('shield'));
document.getElementById('upgradeShieldRegen').addEventListener('click', () => buyUpgrade('shieldRegen'));

// Toggle upgrades panel
document.getElementById('upgradesToggle').addEventListener('click', () => {
    const panel = document.querySelector('.upgrade-grid');
    const toggle = document.getElementById('upgradesToggle');
    if (panel.style.display === 'none') {
        panel.style.display = 'grid';
        toggle.textContent = '▼ Talent Upgrades';
        document.getElementById('idleUI').style.maxHeight = '140px';
    } else {
        panel.style.display = 'none';
        toggle.textContent = '▶ Talent Upgrades';
        document.getElementById('idleUI').style.maxHeight = '35px';
    }
});

function startGame() {
    const startScreen = document.getElementById('startScreen');
    if (startScreen) startScreen.classList.add('hidden');
    
    document.getElementById('scoreDisplay').classList.remove('hidden');
    document.getElementById('idleUI').classList.remove('hidden');
    
    gameLoop();
}

function spawnMonster() {
    const monsterLevel = Math.min(Math.floor(level / 3), monsterTypes.length - 1);
    const type = monsterTypes[monsterLevel];
    
    // Spawn around edges
    const side = Math.floor(Math.random() * 4);
    let x, y;
    switch(side) {
        case 0: x = -type.size; y = Math.random() * canvas.height; break;
        case 1: x = canvas.width + type.size; y = Math.random() * canvas.height; break;
        case 2: x = Math.random() * canvas.width; y = -type.size; break;
        case 3: x = Math.random() * canvas.width; y = canvas.height + type.size; break;
    }
    
    monsters.push({
        x: x,
        y: y,
        targetX: canvas.width / 2,
        targetY: canvas.height / 2,
        health: type.health,
        maxHealth: type.health,
        goldValue: type.goldValue,
        xpValue: type.xpValue,
        color: type.color,
        size: type.size,
        name: type.name,
        speed: type.speed,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        angle: Math.atan2(canvas.height / 2 - y, canvas.width / 2 - x)
    });
}

function spawnSoldier() {
    soldiers.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        damage: 5 + upgrades.soldierDamage.level * 3,
        attackCooldown: 0,
        maxCooldown: Math.max(10, 60 - upgrades.soldierSpeed.level * 5),
        size: 20,
        color: '#4169E1',
        angle: 0,
        targetAngle: 0,
        attackRange: 150 + upgrades.soldierCount.level * 10
    });
}

function handleClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Tap damage
    const tapDamage = 10 + upgrades.tapDamage.level * 5;
    const critChance = 0.05 + upgrades.critChance.level * 0.03;
    
    monsters.forEach(monster => {
        const dx = monster.x - x;
        const dy = monster.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < monster.size) {
            const isCrit = Math.random() < critChance;
            const damage = tapDamage * (isCrit ? 3 : 1);
            
            monster.health -= damage;
            
            createParticles(monster.x, monster.y, isCrit ? '#FF0000' : '#FFD700', 8);
            
            if (isCrit) {
                createTextParticle(monster.x, monster.y - 30, 'CRIT!', '#FF0000');
            } else {
                createTextParticle(monster.x, monster.y - 20, '-' + Math.floor(damage), '#FFFFFF');
            }
            
            if (monster.health <= 0) {
                killMonster(monster);
            }
        }
    });
}

function killMonster(monster) {
    const goldReward = monster.goldValue * (1 + upgrades.goldReward.level * 0.3);
    gold += goldReward * comboMultiplier;
    
    const xpReward = monster.xpValue * (1 + upgrades.experience.level * 0.4);
    experience += xpReward;
    
    createParticles(monster.x, monster.y, monster.color, 20);
    createTextParticle(monster.x, monster.y - 40, '+' + formatNumber(goldReward) + 'g', '#FFD700');
    
    combo++;
    comboTime = 180;
    comboMultiplier = 1 + combo * 0.15;
    
    checkLevelUp();
    
    const index = monsters.indexOf(monster);
    monsters.splice(index, 1);
}

function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
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
        vy: -1.5,
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
        
        createParticles(canvas.width / 2, canvas.height / 2, '#00FF00', 30);
        createTextParticle(canvas.width / 2, canvas.height / 2 - 60, 'LEVEL UP!', '#00FF00');
        
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
        calculateStats();
        
        // Update shield
        if (upgradeKey === 'shield') {
            player.maxShield = upgrades.shield.level * 50;
            if (player.shield < player.maxShield) {
                player.shield = player.maxShield; // Fill shield when purchased
            }
        }
        
        if (upgradeKey === 'shieldRegen') {
            player.shieldRegen = upgrades.shieldRegen.level * 0.5;
        }
        
        // Update all soldiers stats
        soldiers.forEach(soldier => {
            soldier.damage = 5 + upgrades.soldierDamage.level * 3;
            soldier.maxCooldown = Math.max(10, 60 - upgrades.soldierSpeed.level * 5);
            soldier.attackRange = 150 + upgrades.soldierCount.level * 10;
        });
        
        saveGame();
        updateUI();
    }
}

function gameOver() {
    gameState = 'gameOver';
    createParticles(player.x, player.y, '#FF0000', 50);
    createTextParticle(player.x, player.y - 60, 'GAME OVER', '#FF0000');
    
    // Reset after a delay
    setTimeout(() => {
        player.health = player.maxHealth;
        player.shield = player.maxShield;
        monsters.length = 0;
        particles = [];
        gameState = 'playing';
        lastUpdate = Date.now();
    }, 3000);
}

function saveGame() {
    localStorage.setItem('gold', gold.toString());
    localStorage.setItem('experience', experience.toString());
    localStorage.setItem('level', level.toString());
    localStorage.setItem('playerHealth', player.health.toString());
    localStorage.setItem('playerShield', player.shield.toString());
}

function saveUpgrade(key) {
    const keyName = key.charAt(0).toUpperCase() + key.slice(1);
    // Handle camelCase keys properly
    if (key.includes('Regen')) {
        localStorage.setItem('upgradeShieldRegen', upgrades[key].level.toString());
    } else {
        localStorage.setItem('upgrade' + keyName, upgrades[key].level.toString());
    }
}

function updateUI() {
    document.getElementById('scoreDisplay').textContent = formatNumber(gold) + 'g';
    document.getElementById('goldPerSecond').textContent = formatNumber(goldPerSecond.toFixed(1));
    document.getElementById('levelDisplay').textContent = 'Lv' + level;
    document.getElementById('xpDisplay').textContent = Math.floor(experience) + '/' + (level * 100);
    document.getElementById('comboDisplay').textContent = combo > 0 ? combo + 'x' : '';
    document.getElementById('soldierCount').textContent = '⚔' + soldiers.length;
    document.getElementById('playerHealth').textContent = Math.floor(player.health) + '/' + player.maxHealth;
    
    const shieldElement = document.getElementById('playerShield');
    if (player.maxShield > 0) {
        shieldElement.textContent = Math.floor(player.shield) + '/' + player.maxShield;
        shieldElement.style.display = '';
    } else {
        shieldElement.style.display = 'none';
    }
    
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
    if (gameState !== 'playing') return;
    
    frameCount++;
    const now = Date.now();
    const deltaTime = (now - lastUpdate) / 1000;
    lastUpdate = now;
    
    // Auto gold
    if (deltaTime > 0) {
        gold += goldPerSecond * deltaTime;
        saveGame();
    }
    
    // Update combo
    if (comboTime > 0) {
        comboTime--;
    } else if (combo > 0) {
        combo = 0;
        comboMultiplier = 1;
    }
    
    // Regenerate shield
    if (player.shield < player.maxShield && player.shieldRegen > 0) {
        player.shield = Math.min(player.maxShield, player.shield + player.shieldRegen * deltaTime);
    }
    
    // Check if monsters reach center (damage player)
    monsters.forEach(monster => {
        const dx = monster.x - player.x;
        const dy = monster.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < player.size + monster.size / 2) {
            const damage = monster.maxHealth * 0.1; // 10% of monster health as damage
            
            // Shield absorbs damage first
            if (player.shield > 0) {
                const shieldDamage = Math.min(damage, player.shield);
                player.shield -= shieldDamage;
                createParticles(monster.x, monster.y, '#00BFFF', 10);
                createTextParticle(monster.x, monster.y - 30, 'SHIELD -' + Math.floor(shieldDamage), '#00BFFF');
                
                if (damage > shieldDamage) {
                    player.health -= (damage - shieldDamage);
                    createParticles(player.x, player.y, '#FF0000', 10);
                    createTextParticle(player.x, player.y - 40, '-' + Math.floor(damage - shieldDamage), '#FF0000');
                }
            } else {
                player.health -= damage;
                createParticles(player.x, player.y, '#FF0000', 15);
                createTextParticle(player.x, player.y - 40, '-' + Math.floor(damage), '#FF0000');
            }
            
            // Remove monster after dealing damage
            const index = monsters.indexOf(monster);
            monsters.splice(index, 1);
            
            // Check game over
            if (player.health <= 0) {
                player.health = 0;
                gameOver();
                return; // Stop updating when game over
            }
            
            saveGame();
            updateUI();
        }
    });
    
    // Spawn monsters
    const spawnRate = Math.max(1500 - level * 30, 300);
    if (now - lastMonsterSpawn > spawnRate && monsters.length < 8 + Math.floor(level / 2)) {
        spawnMonster();
        lastMonsterSpawn = now;
    }
    
    // Update monsters
    monsters.forEach(monster => {
        const dx = monster.targetX - monster.x;
        const dy = monster.targetY - monster.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 2) {
            monster.angle = Math.atan2(dy, dx);
            monster.x += Math.cos(monster.angle) * monster.speed * 2;
            monster.y += Math.sin(monster.angle) * monster.speed * 2;
        }
        
        monster.rotation += monster.rotationSpeed;
    });
    
    // Update soldiers - auto attack
    soldiers.forEach(soldier => {
        // Update soldier stats from upgrades
        soldier.damage = 5 + upgrades.soldierDamage.level * 3;
        soldier.maxCooldown = Math.max(10, 60 - upgrades.soldierSpeed.level * 5);
        soldier.attackRange = 150 + upgrades.soldierCount.level * 10;
        
        soldier.attackCooldown--;
        
        if (monsters.length > 0) {
            // Find nearest monster
            let nearest = null;
            let nearestDist = Infinity;
            
            monsters.forEach(monster => {
                const dx = monster.x - soldier.x;
                const dy = monster.y - soldier.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < nearestDist && distance < soldier.attackRange) {
                    nearestDist = distance;
                    nearest = monster;
                }
            });
            
            if (nearest) {
                // Face the target
                const dx = nearest.x - soldier.x;
                const dy = nearest.y - soldier.y;
                soldier.targetAngle = Math.atan2(dy, dx);
                
                // Smoothly rotate toward target
                let angleDiff = soldier.targetAngle - soldier.angle;
                // Normalize angle difference
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                soldier.angle += angleDiff * 0.2; // Smooth rotation
                
                // Attack if cooldown is ready
                if (soldier.attackCooldown <= 0) {
                    nearest.health -= soldier.damage;
                    soldier.attackCooldown = soldier.maxCooldown;
                    
                    createParticles(nearest.x, nearest.y, '#4169E1', 5);
                    createTextParticle(nearest.x, nearest.y - 25, '-' + Math.floor(soldier.damage), '#4169E1');
                    
                    if (nearest.health <= 0) {
                        killMonster(nearest);
                    }
                }
            } else {
                // No target, slowly rotate
                soldier.angle += 0.01;
            }
        }
    });
    
    // Update particles
    particles.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;
        particle.vx *= 0.95;
        particle.vy *= 0.95;
        if (particle.text) {
            particle.vy -= 0.05;
        }
    });
    
    particles = particles.filter(p => p.life > 0);
    
    if (frameCount % 10 === 0) {
        updateUI();
    }
}

function draw() {
    // Cartoon sky gradient background (bright and playful)
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, '#87CEEB'); // Sky blue
    bgGradient.addColorStop(0.6, '#E0F6FF'); // Light blue
    bgGradient.addColorStop(1, '#98D8C8'); // Soft green-blue
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Cartoon clouds (simple, cute)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    for (let i = 0; i < 5; i++) {
        const cloudX = (i * 180 + frameCount * 0.1) % (canvas.width + 100) - 50;
        const cloudY = 50 + (i % 3) * 80;
        ctx.beginPath();
        ctx.arc(cloudX, cloudY, 25, 0, Math.PI * 2);
        ctx.arc(cloudX + 30, cloudY, 30, 0, Math.PI * 2);
        ctx.arc(cloudX + 60, cloudY, 25, 0, Math.PI * 2);
        ctx.arc(cloudX + 30, cloudY - 20, 20, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Cartoon ground/grass
    ctx.fillStyle = '#90EE90'; // Light green
    ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
    
    // Grass details
    ctx.strokeStyle = '#7CCD7C';
    ctx.lineWidth = 2;
    for (let i = 0; i < canvas.width; i += 15) {
        ctx.beginPath();
        ctx.moveTo(i, canvas.height - 30);
        ctx.lineTo(i + 5, canvas.height - 40);
        ctx.lineTo(i + 10, canvas.height - 30);
        ctx.stroke();
    }
    
    // Draw center protection zone (cartoon style - bright and cheerful)
    const pulse = Math.sin(frameCount * 0.1) * 0.1 + 0.9;
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.3 * pulse})`;
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, 60, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Inner circle (solid)
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.5 * pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 40, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw soldiers
    soldiers.forEach(soldier => {
        drawSoldier(soldier);
    });
    
    // Draw monsters
    monsters.forEach(monster => {
        drawMonster(monster);
    });
    
    // Draw player at center
    drawPlayer();
    
    // Draw particles
    particles.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = particle.life / particle.maxLife;
        
        if (particle.text) {
            ctx.fillStyle = particle.color;
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.font = 'bold ' + (16 + (60 - particle.life) * 0.3) + 'px Arial';
            ctx.textAlign = 'center';
            ctx.strokeText(particle.text, particle.x, particle.y);
            ctx.fillText(particle.text, particle.x, particle.y);
        } else {
            // Glowing particles
            const particleGradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.size * 2);
            particleGradient.addColorStop(0, particle.color);
            particleGradient.addColorStop(1, particle.color + '00');
            ctx.fillStyle = particleGradient;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    });
}

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    
    // Shield effect (if active) - cartoon bubbles
    if (player.shield > 0) {
        const shieldPulse = Math.sin(frameCount * 0.15) * 0.15 + 0.85;
        const shieldGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, player.size * 2.8);
        shieldGradient.addColorStop(0, `rgba(100, 200, 255, ${0.5 * shieldPulse})`);
        shieldGradient.addColorStop(0.6, `rgba(100, 200, 255, ${0.3 * shieldPulse})`);
        shieldGradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
        ctx.fillStyle = shieldGradient;
        ctx.beginPath();
        ctx.arc(0, 0, player.size * 2.8, 0, Math.PI * 2);
        ctx.fill();
        
        // Floating bubbles
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i + frameCount * 0.05;
            const radius = player.size * 2.2 + Math.sin(frameCount * 0.1 + i) * 3;
            const bubbleX = Math.cos(angle) * radius;
            const bubbleY = Math.sin(angle) * radius;
            ctx.fillStyle = `rgba(150, 220, 255, ${0.6 * shieldPulse})`;
            ctx.beginPath();
            ctx.arc(bubbleX, bubbleY, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Cartoon player - cute character with rounded body
    // Body (main rounded blob)
    const bodyGradient = ctx.createRadialGradient(-player.size * 0.3, -player.size * 0.3, 0, 0, 0, player.size);
    bodyGradient.addColorStop(0, '#FF8C8C');
    bodyGradient.addColorStop(1, '#FF5A5A');
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    // Rounded blob shape using bezier curves
    ctx.moveTo(0, -player.size * 0.9);
    ctx.bezierCurveTo(player.size * 0.6, -player.size * 0.9, player.size * 0.9, -player.size * 0.5, player.size * 0.9, 0);
    ctx.bezierCurveTo(player.size * 0.9, player.size * 0.5, player.size * 0.6, player.size * 0.9, 0, player.size * 0.9);
    ctx.bezierCurveTo(-player.size * 0.6, player.size * 0.9, -player.size * 0.9, player.size * 0.5, -player.size * 0.9, 0);
    ctx.bezierCurveTo(-player.size * 0.9, -player.size * 0.5, -player.size * 0.6, -player.size * 0.9, 0, -player.size * 0.9);
    ctx.closePath();
    ctx.fill();
    
    // Outline
    ctx.strokeStyle = '#CC4444';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Cute eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-player.size * 0.25, -player.size * 0.2, player.size * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(player.size * 0.25, -player.size * 0.2, player.size * 0.25, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye pupils
    const blink = Math.sin(frameCount * 0.05) > 0.95 ? 0.1 : 1;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(-player.size * 0.25, -player.size * 0.2, player.size * 0.15 * blink, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(player.size * 0.25, -player.size * 0.2, player.size * 0.15 * blink, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye shine
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-player.size * 0.3, -player.size * 0.25, player.size * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(player.size * 0.2, -player.size * 0.25, player.size * 0.08, 0, Math.PI * 2);
    ctx.fill();
    
    // Cute smile
    ctx.strokeStyle = '#CC4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, player.size * 0.1, player.size * 0.3, 0.2, Math.PI - 0.2);
    ctx.stroke();
    
    // Cheeks (rosy)
    ctx.fillStyle = '#FFAAAA';
    ctx.beginPath();
    ctx.arc(-player.size * 0.6, player.size * 0.1, player.size * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(player.size * 0.6, player.size * 0.1, player.size * 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Highlight shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.ellipse(-player.size * 0.3, -player.size * 0.4, player.size * 0.4, player.size * 0.3, -0.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    // Health bar
    const barWidth = 100;
    const barHeight = 8;
    const barY = player.y - player.size - 35;
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(player.x - barWidth / 2 - 2, barY - 2, barWidth + 4, barHeight + 4);
    
    // Health
    const healthPercent = player.health / player.maxHealth;
    const healthGradient = ctx.createLinearGradient(player.x - barWidth / 2, barY, player.x + barWidth / 2, barY);
    healthGradient.addColorStop(0, healthPercent > 0.5 ? '#FF0000' : '#FF4444');
    healthGradient.addColorStop(1, healthPercent > 0.5 ? '#FF6666' : '#FF0000');
    ctx.fillStyle = healthGradient;
    ctx.fillRect(player.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);
    
    // Border
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x - barWidth / 2, barY, barWidth, barHeight);
    
    // Shield bar (if active)
    if (player.maxShield > 0) {
        const shieldBarY = barY - 12;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(player.x - barWidth / 2 - 2, shieldBarY - 2, barWidth + 4, barHeight + 4);
        
        const shieldPercent = player.shield / player.maxShield;
        const shieldGradient = ctx.createLinearGradient(player.x - barWidth / 2, shieldBarY, player.x + barWidth / 2, shieldBarY);
        shieldGradient.addColorStop(0, '#00BFFF');
        shieldGradient.addColorStop(1, '#0080FF');
        ctx.fillStyle = shieldGradient;
        ctx.fillRect(player.x - barWidth / 2, shieldBarY, barWidth * shieldPercent, barHeight);
        
        ctx.strokeStyle = '#00BFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(player.x - barWidth / 2, shieldBarY, barWidth, barHeight);
    }
}

function drawSoldier(soldier) {
    ctx.save();
    ctx.translate(soldier.x, soldier.y);
    ctx.rotate(soldier.angle); // Rotate to face target
    
    // Subtle glow
    const glowPulse = Math.sin(frameCount * 0.08) * 0.1 + 0.9;
    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, soldier.size * 2);
    glowGradient.addColorStop(0, `rgba(100, 150, 255, ${0.4 * glowPulse})`);
    glowGradient.addColorStop(1, 'rgba(100, 150, 255, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, soldier.size * 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Cartoon knight body (rounded shield shape)
    const bodyGradient = ctx.createRadialGradient(-soldier.size * 0.3, -soldier.size * 0.3, 0, 0, 0, soldier.size);
    bodyGradient.addColorStop(0, '#6B8FD4');
    bodyGradient.addColorStop(1, '#4A6FA5');
    ctx.fillStyle = bodyGradient;
    
    // Rounded shield shape
    ctx.beginPath();
    ctx.moveTo(0, -soldier.size * 0.9);
    ctx.bezierCurveTo(soldier.size * 0.6, -soldier.size * 0.9, soldier.size * 0.9, -soldier.size * 0.5, soldier.size * 0.9, 0);
    ctx.bezierCurveTo(soldier.size * 0.9, soldier.size * 0.5, soldier.size * 0.6, soldier.size * 0.9, 0, soldier.size * 0.9);
    ctx.bezierCurveTo(-soldier.size * 0.6, soldier.size * 0.9, -soldier.size * 0.9, soldier.size * 0.5, -soldier.size * 0.9, 0);
    ctx.bezierCurveTo(-soldier.size * 0.9, -soldier.size * 0.5, -soldier.size * 0.6, -soldier.size * 0.9, 0, -soldier.size * 0.9);
    ctx.closePath();
    ctx.fill();
    
    // Outline
    ctx.strokeStyle = '#3A5F8A';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Armor detail lines
    ctx.strokeStyle = '#5A7FA5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -soldier.size * 0.7);
    ctx.lineTo(0, soldier.size * 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, soldier.size * 0.6, -Math.PI * 0.3, Math.PI * 0.3);
    ctx.stroke();
    
    // Cartoon helmet visor
    ctx.fillStyle = '#2A4F7A';
    ctx.beginPath();
    ctx.ellipse(0, -soldier.size * 0.3, soldier.size * 0.6, soldier.size * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Visor shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.ellipse(-soldier.size * 0.2, -soldier.size * 0.35, soldier.size * 0.2, soldier.size * 0.15, -0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Cute eye peeking from visor
    ctx.fillStyle = '#00FF88';
    ctx.beginPath();
    ctx.arc(soldier.size * 0.25, -soldier.size * 0.25, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Cartoon sword (simple, bold)
    ctx.fillStyle = '#E0E0E0';
    ctx.beginPath();
    // Blade
    ctx.moveTo(-soldier.size * 0.15, -soldier.size * 0.6);
    ctx.lineTo(-soldier.size * 0.2, -soldier.size * 1.6);
    ctx.lineTo(soldier.size * 0.2, -soldier.size * 1.6);
    ctx.lineTo(soldier.size * 0.15, -soldier.size * 0.6);
    ctx.closePath();
    ctx.fill();
    
    // Sword outline
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Sword shine
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(-soldier.size * 0.1, -soldier.size * 0.7);
    ctx.lineTo(-soldier.size * 0.1, -soldier.size * 1.4);
    ctx.lineTo(0, -soldier.size * 1.3);
    ctx.lineTo(0, -soldier.size * 0.6);
    ctx.closePath();
    ctx.fill();
    
    // Hilt
    ctx.fillStyle = '#8B6F3A';
    ctx.fillRect(-soldier.size * 0.3, -soldier.size * 0.4, soldier.size * 0.6, soldier.size * 0.12);
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    ctx.strokeRect(-soldier.size * 0.3, -soldier.size * 0.4, soldier.size * 0.6, soldier.size * 0.12);
    
    // Guard
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-soldier.size * 0.35, -soldier.size * 0.35);
    ctx.lineTo(soldier.size * 0.35, -soldier.size * 0.35);
    ctx.stroke();
    
    // Pommel
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, -soldier.size * 0.3, soldier.size * 0.1, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    // Attack range indicator (subtle)
    if (soldier.attackCooldown <= 0) {
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(soldier.x, soldier.y, soldier.attackRange, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

function drawMonster(monster) {
    ctx.save();
    ctx.translate(monster.x, monster.y);
    ctx.rotate(monster.rotation * 0.3); // Slower rotation for cartoon effect
    
    // Cartoon shadow (oval, soft)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, monster.size + 6, monster.size * 1.1, monster.size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Subtle glow
    const pulse = Math.sin(frameCount * 0.12 + monster.x * 0.01) * 0.08 + 0.92;
    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, monster.size * 1.8);
    glowGradient.addColorStop(0, monster.color + Math.floor(80 * pulse).toString(16).padStart(2, '0'));
    glowGradient.addColorStop(0.7, monster.color + '40');
    glowGradient.addColorStop(1, monster.color + '00');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, monster.size * 1.8, 0, Math.PI * 2);
    ctx.fill();
    
    // Cartoon blob body - wobbly, organic shape
    const wobble = Math.sin(frameCount * 0.1 + monster.x * 0.02) * 0.1;
    const darkerColor = darkenColor(monster.color, 15);
    const bodyGradient = ctx.createRadialGradient(-monster.size * 0.4, -monster.size * 0.3, 0, 0, 0, monster.size);
    bodyGradient.addColorStop(0, lightenColor(monster.color, 25));
    bodyGradient.addColorStop(0.7, monster.color);
    bodyGradient.addColorStop(1, darkerColor);
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    // Create wobbly blob using bezier curves
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i;
        const wobbleFactor = 1 + Math.sin(angle * 2 + frameCount * 0.1) * 0.15;
        const x = Math.cos(angle) * monster.size * wobbleFactor;
        const y = Math.sin(angle) * monster.size * wobbleFactor;
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();
    ctx.fill();
    
    // Cartoon outline (thick, bold)
    ctx.strokeStyle = darkerColor;
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Big cartoon eyes (always cute!)
    const eyeSize = monster.size * 0.35;
    const eyeY = -monster.size * 0.15;
    
    // Eye whites
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-monster.size * 0.35, eyeY, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(monster.size * 0.35, eyeY, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Eye pupils (looking slightly different direction for character)
    const pupilOffset = Math.sin(frameCount * 0.08) * 2;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(-monster.size * 0.35 + pupilOffset, eyeY, eyeSize * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(monster.size * 0.35 + pupilOffset, eyeY, eyeSize * 0.6, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye shine (makes them cute!)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-monster.size * 0.4, eyeY - eyeSize * 0.2, eyeSize * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(monster.size * 0.3, eyeY - eyeSize * 0.2, eyeSize * 0.25, 0, Math.PI * 2);
    ctx.fill();
    
    // Cute mouth (varies by size)
    if (monster.size < 40) {
        // Small monsters - cute smile
        ctx.strokeStyle = darkerColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, monster.size * 0.2, monster.size * 0.25, 0.3, Math.PI - 0.3);
        ctx.stroke();
    } else {
        // Larger monsters - open mouth with teeth
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(0, monster.size * 0.25, monster.size * 0.3, monster.size * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Teeth
        for (let i = 0; i < 4; i++) {
            const toothX = (i - 1.5) * monster.size * 0.15;
            ctx.beginPath();
            ctx.moveTo(toothX, monster.size * 0.15);
            ctx.lineTo(toothX - monster.size * 0.08, monster.size * 0.35);
            ctx.lineTo(toothX + monster.size * 0.08, monster.size * 0.35);
            ctx.closePath();
            ctx.fill();
        }
        
        ctx.strokeStyle = darkerColor;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    // Highlight shine (cartoon style)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.ellipse(-monster.size * 0.4, -monster.size * 0.4, monster.size * 0.35, monster.size * 0.3, -0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Cheeks (if small monster)
    if (monster.size < 45) {
        ctx.fillStyle = lightenColor(monster.color, 20);
        ctx.beginPath();
        ctx.arc(-monster.size * 0.7, monster.size * 0.15, monster.size * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(monster.size * 0.7, monster.size * 0.15, monster.size * 0.15, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
    
    // Health bar
    const barWidth = monster.size * 2;
    const barHeight = 6;
    const barY = monster.y - monster.size - 15;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(monster.x - barWidth / 2, barY, barWidth, barHeight);
    
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(monster.x - barWidth / 2, barY, barWidth * (monster.health / monster.maxHealth), barHeight);
    
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.strokeRect(monster.x - barWidth / 2, barY, barWidth, barHeight);
    
    // Name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(monster.name, monster.x, barY - 5);
}

// Helper functions for colors
function darkenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const r = Math.max(0, ((num >> 16) & 0xFF) - percent);
    const g = Math.max(0, ((num >> 8) & 0xFF) - percent);
    const b = Math.max(0, (num & 0xFF) - percent);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function lightenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const r = Math.min(255, ((num >> 16) & 0xFF) + percent);
    const g = Math.min(255, ((num >> 8) & 0xFF) + percent);
    const b = Math.min(255, (num & 0xFF) + percent);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function gameLoop() {
    if (gameState === 'playing') {
        update();
    }
    draw();
    requestAnimationFrame(gameLoop);
}

draw();
