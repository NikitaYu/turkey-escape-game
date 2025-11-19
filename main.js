// ============================================================
// TURKEY ESCAPE - Grid Movement + Breathing Animation
// ============================================================

console.log('🎮 main.js loading...');

// GRID SPECS
const GRID_SIZE = 64;
const PLAYER_SIZE = 60;
const MOVE_DURATION = 1000; // 1 cell per second
const STEPS_PER_CELL = 4;

// PULSATION SPECS
const PULSE_IDLE_DURATION = 1000; // 1 full breath per second
const PULSE_MOVE_DURATION = 250;  // 4 pulses per second (synced with steps)
const PULSE_SCALE_MIN = 0.80;     // Shrink to 80%
const PULSE_SCALE_MAX = 1.00;     // Normal size (never exceed 100%)

// INPUT QUEUE SPECS
const QUEUE_TIMEOUT_CELLS = 2; // Remember input for 2 cells

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#000000',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: true
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

console.log('🎮 Creating game instance...');
const game = new Phaser.Game(config);

// Game state
let scene;
let player;
let playerGraphics;
let cursors;
let keys;
let walls;
let hazards;
let lives = 3;
let livesIcons = [];
let timerText;
let levelText;
let debugText;
let timeRemaining = 90;
let updateCount = 0;

// Grid movement state
let currentGridX = 0;
let currentGridY = 0;
let currentDirection = 'up';
let queuedDirection = null;
let queueAge = 0; // How many cells since input was queued
let isMoving = false;
let movementTween = null;
let pulseTween = null;

// Level 1
const LEVEL_1 = [
    [1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,4,0,0,0,0,1],
    [1,0,1,1,1,1,0,1,1,1,0,1],
    [1,0,1,0,0,0,0,0,0,1,0,1],
    [1,0,0,0,1,1,2,1,1,0,0,1],
    [1,0,1,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,0,1,1,1,1,1],
    [1,0,0,0,0,0,3,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1]
];

function preload() {
    console.log('📦 PRELOAD started');
    log('preload-check', '✓ Preload running');
}

function create() {
    console.log('🎨 CREATE started');
    log('create-check', '✓ Create running');

    scene = this;

    try {
        const testText = this.add.text(400, 30, 'BREATHING ANIMATION + SMART INPUT', {
            fontSize: '18px',
            fill: '#FFFF00',
            fontFamily: 'monospace'
        });
        testText.setOrigin(0.5);
        testText.setScrollFactor(0);

        walls = this.physics.add.staticGroup();
        hazards = this.physics.add.group();

        // Create player
        player = this.add.container(0, 0);
        this.physics.world.enable(player);
        player.body.setSize(PLAYER_SIZE, PLAYER_SIZE);
        player.body.setOffset(-PLAYER_SIZE/2, -PLAYER_SIZE/2);

        // Player graphics
        playerGraphics = this.add.graphics();
        playerGraphics.fillStyle(0xFF4500, 1);
        playerGraphics.lineStyle(3, 0xCC3700, 1);
        playerGraphics.fillRect(-30, -30, 60, 60);
        playerGraphics.strokeRect(-30, -30, 60, 60);
        player.add(playerGraphics);

        // Start breathing animation
        startPulsation('idle');

        // Input
        cursors = this.input.keyboard.createCursorKeys();
        keys = this.input.keyboard.addKeys({
            W: Phaser.Input.Keyboard.KeyCodes.W,
            A: Phaser.Input.Keyboard.KeyCodes.A,
            S: Phaser.Input.Keyboard.KeyCodes.S,
            D: Phaser.Input.Keyboard.KeyCodes.D
        });

        buildLevel.call(this, LEVEL_1);
        createUI.call(this);

        this.physics.add.collider(player, walls);
        this.physics.add.overlap(player, hazards, hitHazard, null, this);

        this.cameras.main.startFollow(player, true, 0.08, 0.08);
        this.cameras.main.setZoom(1.2);

        currentDirection = 'up';

        console.log('✅ CREATE COMPLETE');
        log('create-check', '✓ Ready!');

    } catch (error) {
        console.error('❌ ERROR:', error);
        log('create-check', '✗ ERROR: ' + error.message, false);
    }
}

function buildLevel(map) {
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
            const tile = map[y][x];
            const px = x * GRID_SIZE;
            const py = y * GRID_SIZE;

            if (tile === 0) {
                const floor = this.add.graphics();
                floor.fillStyle(0x222222, 1);
                floor.fillRect(px, py, GRID_SIZE, GRID_SIZE);
            } else if (tile === 1) {
                const wallGfx = this.add.graphics();
                wallGfx.fillStyle(0x666666, 1);
                wallGfx.lineStyle(2, 0x888888, 1);
                wallGfx.fillRect(px, py, GRID_SIZE, GRID_SIZE);
                wallGfx.strokeRect(px, py, GRID_SIZE, GRID_SIZE);

                const wall = walls.create(px + GRID_SIZE/2, py + GRID_SIZE/2, null);
                wall.setSize(GRID_SIZE, GRID_SIZE);
                wall.setVisible(false);
                wall.refreshBody();
            } else if (tile === 2) {
                const floor = this.add.graphics();
                floor.fillStyle(0x222222, 1);
                floor.fillRect(px, py, GRID_SIZE, GRID_SIZE);

                const hazard = this.add.container(px + GRID_SIZE/2, py + GRID_SIZE/2);
                this.physics.world.enable(hazard);
                hazard.body.setSize(PLAYER_SIZE, PLAYER_SIZE);

                const hgfx = this.add.graphics();
                hgfx.fillStyle(0xFF0000, 1);
                hgfx.fillCircle(0, 0, 25);
                hazard.add(hgfx);
                hazards.add(hazard);
            } else if (tile === 3) {
                const floor = this.add.graphics();
                floor.fillStyle(0x222222, 1);
                floor.fillRect(px, py, GRID_SIZE, GRID_SIZE);

                currentGridX = x;
                currentGridY = y;
                player.setPosition(px + GRID_SIZE/2, py + GRID_SIZE/2);
            } else if (tile === 4) {
                const floor = this.add.graphics();
                floor.fillStyle(0x222222, 1);
                floor.fillRect(px, py, GRID_SIZE, GRID_SIZE);

                const exit = this.add.graphics();
                exit.lineStyle(4, 0x00FF00, 1);
                exit.strokeRect(px + 6, py + 6, GRID_SIZE - 12, GRID_SIZE - 12);
            }
        }
    }
}

function createUI() {
    for (let i = 0; i < 3; i++) {
        const icon = this.add.graphics();
        icon.setScrollFactor(0);
        icon.setPosition(30 + i * 30, 30);
        drawLifeIcon(icon, true);
        livesIcons.push(icon);
    }

    timerText = this.add.text(760, 20, '90', {
        fontSize: '24px',
        fill: '#FFFFFF',
        fontFamily: 'monospace'
    });
    timerText.setOrigin(1, 0);
    timerText.setScrollFactor(0);

    levelText = this.add.text(400, 570, 'WASD: Move | Input queued for 2 cells', {
        fontSize: '14px',
        fill: '#FFFFFF',
        fontFamily: 'monospace'
    });
    levelText.setOrigin(0.5, 0);
    levelText.setScrollFactor(0);

    // Debug panel outside viewport
    debugText = this.add.text(850, 50, '', {
        fontSize: '13px',
        fill: '#00FF00',
        fontFamily: 'monospace',
        backgroundColor: '#000000',
        padding: { x: 10, y: 10 }
    });
    debugText.setScrollFactor(0);
}

function drawLifeIcon(icon, full) {
    icon.clear();
    if (full) {
        icon.fillStyle(0xFF4500, 1);
        icon.lineStyle(2, 0xCC3700, 1);
    } else {
        icon.fillStyle(0x000000, 0);
        icon.lineStyle(2, 0xFFFFFF, 1);
    }
    icon.fillRect(0, 0, 16, 16);
    icon.strokeRect(0, 0, 16, 16);
}

function update(time, delta) {
    updateCount++;

    if (updateCount === 1) {
        log('update-check', '✓ Update running');
    }

    if (!player) return;

    handleInput();

    // Try to move every frame when idle
    if (!isMoving) {
        startMovement();
    }

    // Update debug
    if (debugText) {
        debugText.setText(
            `=== DEBUG ===\n` +
            `Grid: (${currentGridX},${currentGridY})\n` +
            `Pixel: (${Math.round(player.x)},${Math.round(player.y)})\n` +
            `Direction: ${currentDirection}\n` +
            `Queued: ${queuedDirection || 'none'}\n` +
            `Queue Age: ${queueAge}/${QUEUE_TIMEOUT_CELLS} cells\n` +
            `Moving: ${isMoving}\n` +
            `Pulse: ${pulseTween ? (pulseTween.isPlaying() ? 'ACTIVE' : 'stopped') : 'null'}\n` +
            `Scale: ${playerGraphics ? playerGraphics.scaleX.toFixed(2) : 'N/A'}`
        );
    }

    // Timer
    if (timeRemaining > 0) {
        timeRemaining -= delta / 1000;
        timerText.setText(Math.ceil(timeRemaining).toString());
    }
}

function handleInput() {
    // Immediately detect and queue input (latest input replaces old)
    if (Phaser.Input.Keyboard.JustDown(keys.W) || Phaser.Input.Keyboard.JustDown(cursors.up)) {
        queuedDirection = 'up';
        queueAge = 0; // Reset age counter
        console.log('[INPUT] Queued: UP');
    }
    if (Phaser.Input.Keyboard.JustDown(keys.S) || Phaser.Input.Keyboard.JustDown(cursors.down)) {
        queuedDirection = 'down';
        queueAge = 0;
        console.log('[INPUT] Queued: DOWN');
    }
    if (Phaser.Input.Keyboard.JustDown(keys.A) || Phaser.Input.Keyboard.JustDown(cursors.left)) {
        queuedDirection = 'left';
        queueAge = 0;
        console.log('[INPUT] Queued: LEFT');
    }
    if (Phaser.Input.Keyboard.JustDown(keys.D) || Phaser.Input.Keyboard.JustDown(cursors.right)) {
        queuedDirection = 'right';
        queueAge = 0;
        console.log('[INPUT] Queued: RIGHT');
    }
}

function startMovement() {
    if (isMoving) return;

    // Age out old queued input after 2 cells
    if (queueAge >= QUEUE_TIMEOUT_CELLS && queuedDirection) {
        console.log(`[QUEUE TIMEOUT] Dismissed ${queuedDirection} after ${queueAge} cells`);
        queuedDirection = null;
        queueAge = 0;
    }

    // Try queued direction first, then current direction
    const directionToTry = queuedDirection || currentDirection;

    let targetGridX = currentGridX;
    let targetGridY = currentGridY;

    switch(directionToTry) {
        case 'up': targetGridY--; break;
        case 'down': targetGridY++; break;
        case 'left': targetGridX--; break;
        case 'right': targetGridX++; break;
    }

    const isWall = isWallAt(targetGridX, targetGridY);

    if (isWall) {
        // Queued direction blocked - increment age and keep trying
        if (queuedDirection && queuedDirection !== currentDirection) {
            queueAge++;
            console.log(`[BLOCKED] Queued ${queuedDirection} blocked, age now ${queueAge}/${QUEUE_TIMEOUT_CELLS}`);
            return; // Try again next frame
        }
        // Current direction blocked - stay idle
        console.log(`[BLOCKED] ${currentDirection} blocked at (${currentGridX},${currentGridY})`);
        startPulsation('idle');
        return;
    }

    // Valid move - apply queued direction if any
    if (queuedDirection) {
        currentDirection = queuedDirection;
        queuedDirection = null;
        queueAge = 0;
        console.log(`[DIRECTION CHANGE] Now moving: ${currentDirection}`);
    }

    // Start movement
    isMoving = true;
    currentGridX = targetGridX;
    currentGridY = targetGridY;

    const targetPixelX = targetGridX * GRID_SIZE + GRID_SIZE/2;
    const targetPixelY = targetGridY * GRID_SIZE + GRID_SIZE/2;

    console.log(`[MOVE] ${currentDirection} to grid(${targetGridX},${targetGridY})`);

    // Switch to moving pulsation (faster)
    startPulsation('moving');

    movementTween = scene.tweens.add({
        targets: player,
        x: targetPixelX,
        y: targetPixelY,
        duration: MOVE_DURATION,
        ease: 'Linear',
        onComplete: () => {
            isMoving = false;
            // Increment queue age after each completed move
            if (queuedDirection) {
                queueAge++;
            }
        }
    });
}

function startPulsation(mode) {
    // Stop existing pulsation
    if (pulseTween) {
        pulseTween.stop();
    }

    const duration = mode === 'idle' ? PULSE_IDLE_DURATION : PULSE_MOVE_DURATION;

    // Pulsation: shrink from 100% to 80% and back (breathing effect)
    pulseTween = scene.tweens.add({
        targets: playerGraphics,
        scaleX: PULSE_SCALE_MIN,  // Shrink to 80%
        scaleY: PULSE_SCALE_MIN,
        duration: duration / 2,    // Half cycle for shrink
        yoyo: true,                // Then grow back to 100%
        repeat: -1,
        ease: 'Sine.easeInOut',    // Smooth breathing
        onStart: () => {
            // Ensure we start at 100%
            playerGraphics.setScale(PULSE_SCALE_MAX);
        }
    });

    const pulsesPerSec = mode === 'idle' ? 1 : 4;
    console.log(`[PULSE] ${mode} - ${pulsesPerSec} pulse/sec (100% ↔ 80%)`);
}

function isWallAt(gridX, gridY) {
    if (gridY < 0 || gridY >= LEVEL_1.length) return true;
    if (gridX < 0 || gridX >= LEVEL_1[0].length) return true;
    return LEVEL_1[gridY][gridX] === 1;
}

function hitHazard(player, hazard) {
    console.log('[HAZARD] Hit!');
    hazard.destroy();
    lives--;

    if (lives >= 0 && lives < livesIcons.length) {
        drawLifeIcon(livesIcons[lives], false);
    }

    scene.cameras.main.shake(300, 0.01);
}

console.log('🎮 main.js loaded');
