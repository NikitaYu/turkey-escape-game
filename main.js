// ============================================================
// TURKEY ESCAPE - Phaser 3.80 Prototype
// Complete standalone implementation per GDD & tech-specs
// ============================================================

// CONSTANTS (from tech-specs.md)
const TILE_SIZE = 32;
const PLAYER_SPEED = 200;
const JUMP_VEL = -280;
const GRAVITY = 380;
const LIVES_START = 3;
const TIMER_DURATION = 90; // seconds

// COLORS (from GDD - grayscale + orange turkey)
const COLORS = {
    BG: 0x000000,
    FLOOR: 0x222222,
    WALL: 0x666666,
    HAZARD: 0x444444,
    POWERUP: 0xFFFFFF,
    TURKEY: 0xFF4500,
    TURKEY_STROKE: 0xCC3700,
    UI_TEXT: 0xFFFFFF,
    DAMAGE_GRAY: 0x808080
};

// GAME CONFIG
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#000000',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: GRAVITY },
            debug: true  // Toggle off for production
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

// GAME INSTANCE
const game = new Phaser.Game(config);

// GLOBAL GAME STATE
let player;
let playerGraphics;
let cursors;
let keys;
let currentLevel = 1;
let levelsData;
let mapGroup;
let wallsGroup;
let hazardsGroup;
let powerupsGroup;
let exitZone;

// PLAYER STATE
let lives = LIVES_START;
let isJumping = false;
let speedMultiplier = 1.0;
let powerupTimer = 0;
let powerupType = null;

// UI ELEMENTS
let livesIcons = [];
let timerText;
let levelText;
let timeRemaining = TIMER_DURATION;

// AUDIO
let jumpSound;
let damageSound;

// ============================================================
// PRELOAD - Load level data
// ============================================================
function preload() {
    // Load levels JSON
    this.load.json('levels', 'levels.json');
}

// ============================================================
// CREATE - Initialize game
// ============================================================
function create() {
    // Load levels data
    levelsData = this.cache.json.get('levels');

    // Setup input
    cursors = this.input.keyboard.createCursorKeys();
    keys = this.input.keyboard.addKeys({
        W: Phaser.Input.Keyboard.KeyCodes.W,
        A: Phaser.Input.Keyboard.KeyCodes.A,
        S: Phaser.Input.Keyboard.KeyCodes.S,
        D: Phaser.Input.Keyboard.KeyCodes.D,
        SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE
    });

    // Create audio placeholders (sine wave whoosh)
    jumpSound = this.sound.add('jump', { volume: 0.3 });
    // Generate simple beep for jump (placeholder)
    if (!this.cache.audio.exists('jump')) {
        // Use web audio to create sine wave later, for now silent
    }

    // Setup groups
    mapGroup = this.add.group();
    wallsGroup = this.physics.add.staticGroup();
    hazardsGroup = this.physics.add.group();
    powerupsGroup = this.physics.add.group();

    // Create player
    createPlayer.call(this);

    // Setup UI
    createUI.call(this);

    // Load first level
    loadLevel.call(this, currentLevel);

    // Setup collisions
    this.physics.add.collider(player, wallsGroup);
    this.physics.add.overlap(player, hazardsGroup, hitHazard, null, this);
    this.physics.add.overlap(player, powerupsGroup, collectPowerup, null, this);

    // Camera follow player
    this.cameras.main.startFollow(player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.2);
}

// ============================================================
// UPDATE - Game loop
// ============================================================
function update(time, delta) {
    if (!player || !player.body) return;

    updatePlayer.call(this, delta);
    updateHazards.call(this);
    updateTimer.call(this, delta);
    updatePowerupTimer.call(this, delta);

    // Check exit collision
    if (exitZone && Phaser.Geom.Intersects.RectangleToRectangle(player.getBounds(), exitZone)) {
        levelComplete.call(this);
    }
}

// ============================================================
// PLAYER CREATION
// ============================================================
function createPlayer() {
    // Create physics sprite (invisible body)
    player = this.physics.add.sprite(100, 100, null);
    player.setSize(16, 28);
    player.setCollideWorldBounds(true);
    player.body.setMaxVelocity(400, 800);

    // Create visual turkey triangle (Graphics)
    playerGraphics = this.add.graphics();
    drawTurkeyTriangle(playerGraphics);

    // Parent graphics to player sprite
    player.add(playerGraphics);
}

// Draw prolonged orange triangle (16px base, 28px tall)
function drawTurkeyTriangle(graphics) {
    graphics.clear();
    graphics.lineStyle(2, COLORS.TURKEY_STROKE, 1);
    graphics.fillStyle(COLORS.TURKEY, 1);

    // Triangle pointing right (forward direction)
    graphics.beginPath();
    graphics.moveTo(14, 0);  // Tip (forward)
    graphics.lineTo(-14, -8); // Bottom left
    graphics.lineTo(-14, 8);  // Top left
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
}

// ============================================================
// PLAYER MOVEMENT (constant forward + steering)
// ============================================================
function updatePlayer(delta) {
    const speed = PLAYER_SPEED * speedMultiplier;

    // Always move forward in current facing direction
    const angle = player.rotation;
    const velocityX = Math.cos(angle) * speed;
    const velocityY = Math.sin(angle) * speed;

    player.setVelocityX(velocityX);
    player.setVelocityY(velocityY);

    // Steering (WASD / Arrows) - rotate direction
    const turnSpeed = 3.0; // degrees per frame

    if (cursors.left.isDown || keys.A.isDown) {
        player.rotation -= Phaser.Math.DegToRad(turnSpeed);
    }
    if (cursors.right.isDown || keys.D.isDown) {
        player.rotation += Phaser.Math.DegToRad(turnSpeed);
    }
    if (cursors.up.isDown || keys.W.isDown) {
        // Optional: slight speed boost when pressing forward
        player.setVelocityX(velocityX * 1.1);
        player.setVelocityY(velocityY * 1.1);
    }
    if (cursors.down.isDown || keys.S.isDown) {
        // Optional: slight slowdown (but no reverse)
        player.setVelocityX(velocityX * 0.7);
        player.setVelocityY(velocityY * 0.7);
    }

    // Jump handling (Space key)
    if (Phaser.Input.Keyboard.JustDown(keys.SPACE) && player.body.blocked.down) {
        handleJump.call(this);
    }
}

// ============================================================
// JUMP MECHANIC
// ============================================================
function handleJump() {
    if (isJumping) return;

    isJumping = true;

    // Apply jump velocity
    player.setVelocityY(JUMP_VEL);

    // Visual effect 1: Enlarge player (tween scale 1.0 -> 1.3)
    this.tweens.add({
        targets: player,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 600,
        yoyo: true,
        ease: 'Sine.easeInOut'
    });

    // Visual effect 2: Shrink map away (tween scale 1.0 -> 0.92)
    this.tweens.add({
        targets: mapGroup.getChildren(),
        scaleX: 0.92,
        scaleY: 0.92,
        duration: 600,
        yoyo: true,
        ease: 'Sine.easeInOut'
    });

    // Subtle whoosh sound (placeholder - generate sine wave beep)
    playJumpSound.call(this);

    // Reset jumping flag when landing
    this.time.delayedCall(600, () => {
        if (player.body.blocked.down) {
            isJumping = false;
        }
    });
}

// Placeholder jump sound (simple beep using Web Audio)
function playJumpSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 440; // A4 note
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
        console.log('Audio not available');
    }
}

// ============================================================
// LEVEL LOADING
// ============================================================
function loadLevel(levelNum) {
    // Clear existing level
    if (mapGroup) {
        mapGroup.clear(true, true);
        wallsGroup.clear(true, true);
        hazardsGroup.clear(true, true);
        powerupsGroup.clear(true, true);
    }

    const levelData = levelsData.levels[levelNum - 1];
    if (!levelData) {
        console.error('Level not found:', levelNum);
        return;
    }

    const map = levelData.data;
    const [width, height] = levelData.size;

    // Draw level using Graphics
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const tile = map[y][x];
            const posX = x * TILE_SIZE;
            const posY = y * TILE_SIZE;

            switch(tile) {
                case 0: // Floor
                    drawFloor.call(this, posX, posY);
                    break;
                case 1: // Wall
                    drawWall.call(this, posX, posY);
                    break;
                case 2: // Hazard spawn
                    drawFloor.call(this, posX, posY);
                    spawnHazard.call(this, posX + TILE_SIZE/2, posY + TILE_SIZE/2);
                    break;
                case 3: // Start position
                    drawFloor.call(this, posX, posY);
                    player.setPosition(posX + TILE_SIZE/2, posY + TILE_SIZE/2);
                    player.setVelocity(0, 0);
                    player.rotation = 0;
                    break;
                case 4: // Exit
                    drawFloor.call(this, posX, posY);
                    drawExit.call(this, posX, posY);
                    exitZone = new Phaser.Geom.Rectangle(posX, posY, TILE_SIZE, TILE_SIZE);
                    break;
            }
        }
    }

    // Spawn powerups (1-2 random per map)
    spawnPowerups.call(this, levelData.powerups, width, height, map);

    // Reset timer
    timeRemaining = TIMER_DURATION;

    // Update level UI
    if (levelText) {
        levelText.setText(`Level ${currentLevel}`);
    }
}

// Draw floor tile (dark gray fill)
function drawFloor(x, y) {
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.FLOOR, 1);
    graphics.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    mapGroup.add(graphics);
}

// Draw wall tile (gray thick lines)
function drawWall(x, y) {
    const graphics = this.add.graphics();
    graphics.lineStyle(4, COLORS.WALL, 1);
    graphics.fillStyle(COLORS.WALL, 0.5);
    graphics.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    graphics.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
    mapGroup.add(graphics);

    // Create physics body for collision
    const wall = wallsGroup.create(x + TILE_SIZE/2, y + TILE_SIZE/2, null);
    wall.setSize(TILE_SIZE, TILE_SIZE);
    wall.setVisible(false); // Invisible physics body
    wall.refreshBody();
}

// Draw exit tile (white outline)
function drawExit(x, y) {
    const graphics = this.add.graphics();
    graphics.lineStyle(3, COLORS.UI_TEXT, 1);
    graphics.strokeRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    graphics.fillStyle(COLORS.UI_TEXT, 0.3);
    graphics.fillRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    mapGroup.add(graphics);
}

// ============================================================
// HAZARDS (gray spinning circles with patrol AI)
// ============================================================
function spawnHazard(x, y) {
    // Create hazard sprite (invisible)
    const hazard = hazardsGroup.create(x, y, null);
    hazard.setSize(24, 24);

    // Create visual (gray spinning circle)
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.HAZARD, 1);
    graphics.fillCircle(0, 0, 12);
    graphics.lineStyle(2, 0x666666, 1);
    graphics.strokeCircle(0, 0, 12);
    hazard.add(graphics);

    // Set patrol behavior
    hazard.setData('patrolAngle', Math.random() * Math.PI * 2);
    hazard.setData('patrolSpeed', 50 + Math.random() * 50);
    hazard.setData('graphics', graphics);
}

function updateHazards() {
    hazardsGroup.getChildren().forEach(hazard => {
        if (!hazard.active) return;

        // Spin visual
        const graphics = hazard.getData('graphics');
        if (graphics) {
            graphics.rotation += 0.05;
        }

        // Simple chase AI - move toward player
        const angle = Phaser.Math.Angle.Between(
            hazard.x, hazard.y,
            player.x, player.y
        );

        const speed = hazard.getData('patrolSpeed');
        hazard.setVelocity(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed
        );
    });
}

function hitHazard(player, hazard) {
    if (!hazard.active) return;

    // Deduct 1 life
    deductLife.call(this, 1);

    // Destroy hazard
    hazard.destroy();

    // Camera shake
    this.cameras.main.shake(500, 0.005);

    // Red flash (or gray if strict grayscale)
    this.cameras.main.flash(200, 255, 50, 50);
}

// ============================================================
// POWERUPS (white circles - fast/slow)
// ============================================================
function spawnPowerups(count, width, height, map) {
    for (let i = 0; i < count; i++) {
        // Find random floor tile
        let x, y, attempts = 0;
        do {
            x = Phaser.Math.Between(1, width - 2);
            y = Phaser.Math.Between(1, height - 2);
            attempts++;
        } while (map[y][x] !== 0 && attempts < 100);

        if (attempts >= 100) continue;

        const posX = x * TILE_SIZE + TILE_SIZE/2;
        const posY = y * TILE_SIZE + TILE_SIZE/2;

        // Create powerup
        const powerup = powerupsGroup.create(posX, posY, null);
        powerup.setSize(16, 16);

        // Visual (white circle)
        const graphics = this.add.graphics();
        graphics.fillStyle(COLORS.POWERUP, 1);
        graphics.fillCircle(0, 0, 8);
        graphics.lineStyle(2, COLORS.POWERUP, 0.5);
        graphics.strokeCircle(0, 0, 10);
        powerup.add(graphics);

        // Random type: fast or slow
        const type = Math.random() > 0.5 ? 'fast' : 'slow';
        powerup.setData('type', type);
        powerup.setData('graphics', graphics);

        // Gentle pulse animation
        this.tweens.add({
            targets: graphics,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
}

function collectPowerup(player, powerup) {
    if (!powerup.active) return;

    const type = powerup.getData('type');

    // Apply effect
    if (type === 'fast') {
        speedMultiplier = 1.5;
        powerupType = 'FAST';
    } else {
        speedMultiplier = 0.5;
        powerupType = 'SLOW';
    }

    powerupTimer = 10; // 10 seconds

    // Collect animation (tween scale to 0)
    this.tweens.add({
        targets: powerup,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: 300,
        ease: 'Back.easeIn',
        onComplete: () => powerup.destroy()
    });
}

function updatePowerupTimer(delta) {
    if (powerupTimer > 0) {
        powerupTimer -= delta / 1000;

        if (powerupTimer <= 0) {
            powerupTimer = 0;
            speedMultiplier = 1.0;
            powerupType = null;
        }
    }
}

// ============================================================
// HEALTH SYSTEM
// ============================================================
function deductLife(amount) {
    lives -= amount;

    if (lives < 0) lives = 0;

    updateLivesUI.call(this);

    // Game over check
    if (lives <= 0) {
        gameOver.call(this);
    }
}

// ============================================================
// UI CREATION
// ============================================================
function createUI() {
    // Lives icons (top-left) - 3 turkey triangles
    for (let i = 0; i < LIVES_START; i++) {
        const icon = this.add.graphics();
        icon.setScrollFactor(0);
        icon.setPosition(30 + i * 30, 30);
        livesIcons.push(icon);
    }
    updateLivesUI.call(this);

    // Timer (top-right)
    timerText = this.add.text(750, 20, '90', {
        fontSize: '24px',
        fill: '#FFFFFF',
        fontFamily: 'monospace'
    });
    timerText.setOrigin(1, 0);
    timerText.setScrollFactor(0);

    // Level number (bottom-left)
    levelText = this.add.text(20, 560, `Level ${currentLevel}`, {
        fontSize: '18px',
        fill: '#FFFFFF',
        fontFamily: 'monospace'
    });
    levelText.setScrollFactor(0);
}

function updateLivesUI() {
    livesIcons.forEach((icon, index) => {
        icon.clear();

        const livesLeft = lives;

        if (index < Math.floor(livesLeft)) {
            // Full life - orange triangle
            icon.lineStyle(2, COLORS.TURKEY_STROKE, 1);
            icon.fillStyle(COLORS.TURKEY, 1);
        } else if (index < Math.ceil(livesLeft) && livesLeft % 1 !== 0) {
            // Half life - gray faded
            icon.lineStyle(2, COLORS.DAMAGE_GRAY, 1);
            icon.fillStyle(COLORS.DAMAGE_GRAY, 0.5);
        } else {
            // Lost life - white outline only
            icon.lineStyle(2, COLORS.UI_TEXT, 1);
            icon.fillStyle(0x000000, 0);
        }

        // Draw small turkey triangle
        icon.beginPath();
        icon.moveTo(10, 0);
        icon.lineTo(-5, -6);
        icon.lineTo(-5, 6);
        icon.closePath();
        icon.fillPath();
        icon.strokePath();
    });
}

function updateTimer(delta) {
    if (timeRemaining > 0) {
        timeRemaining -= delta / 1000;

        if (timeRemaining < 0) timeRemaining = 0;

        timerText.setText(Math.ceil(timeRemaining).toString());

        // Time up - game over
        if (timeRemaining <= 0) {
            gameOver.call(this);
        }
    }
}

// ============================================================
// WIN/LOSE CONDITIONS
// ============================================================
function levelComplete() {
    // Advance to next level
    currentLevel++;

    if (currentLevel > levelsData.levels.length) {
        // Won all levels - cycle back to level 1
        currentLevel = 1;
    }

    // Reset player state
    player.setVelocity(0, 0);

    // Load next level
    loadLevel.call(this, currentLevel);
}

function gameOver() {
    // Restart current level
    lives = LIVES_START;
    player.setVelocity(0, 0);

    updateLivesUI.call(this);
    loadLevel.call(this, currentLevel);
}
