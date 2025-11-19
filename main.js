// ============================================================
// TURKEY ESCAPE - Triangle Sprite + Working Pulsation
// ============================================================

console.log('🎮 main.js loading...');

// GRID SPECS
const GRID_SIZE = 64;
const PLAYER_SIZE = 60;
const MOVE_DURATION = 1000;

// PULSATION SPECS (redraw-based, not scale-based)
const PULSE_IDLE_RATE = 1; // 1 pulse per second
const PULSE_MOVE_RATE = 4; // 4 pulses per second
const SIZE_MIN = 0.80; // 80% of normal size
const SIZE_MAX = 1.00; // 100% (normal)

// TRIANGLE SPECS
const TRI_HEIGHT = 30; // Forward point to back
const TRI_BACK_WIDTH = 21; // Back side (70% of height)

// INPUT QUEUE
const QUEUE_TIMEOUT_CELLS = 2;

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#000000',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false  // DISABLED - was showing pink physics body
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

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

// Movement state
let currentGridX = 0;
let currentGridY = 0;
let currentDirection = 'up';
let queuedDirection = null;
let queueAge = 0;
let isMoving = false;
let movementTween = null;
let stoppedByPlayer = false; // For STOP input feature

// Pulsation state
let pulsePhase = 0; // 0 to 1 (breathing cycle)
let pulseDirection = 1; // 1 = growing, -1 = shrinking
let pulseRate = PULSE_IDLE_RATE;
let currentSize = SIZE_MAX;

// Level
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
    console.log('📦 PRELOAD');
    log('preload-check', '✓ Preload');
}

function create() {
    console.log('🎨 CREATE');
    scene = this;

    try {
        const testText = this.add.text(400, 30, 'TRIANGLE + BREATHING', {
            fontSize: '18px',
            fill: '#00FF00',
            fontFamily: 'monospace'
        });
        testText.setOrigin(0.5);
        testText.setScrollFactor(0);

        walls = this.physics.add.staticGroup();
        hazards = this.physics.add.group();

        // Create player container (for physics)
        player = this.add.container(0, 0);
        this.physics.world.enable(player);
        player.body.setSize(PLAYER_SIZE, PLAYER_SIZE);
        player.body.setOffset(-PLAYER_SIZE/2, -PLAYER_SIZE/2);

        // Create graphics for triangle (separate, not in container)
        playerGraphics = this.add.graphics();
        playerGraphics.setDepth(100); // Render on top

        // Draw initial triangle
        console.log('🔺 Drawing initial triangle...');
        drawPlayerTriangle();

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
        setPulseRate('idle');

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
                hazard.body.setSize(40, 40);

                const hgfx = this.add.graphics();
                hgfx.fillStyle(0xFF0000, 1);
                hgfx.fillCircle(0, 0, 20);
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

    levelText = this.add.text(400, 570, 'WASD: Move | Opposite = STOP (press twice to reverse)', {
        fontSize: '14px',
        fill: '#FFFFFF',
        fontFamily: 'monospace'
    });
    levelText.setOrigin(0.5, 0);
    levelText.setScrollFactor(0);

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
        log('update-check', '✓ Running');
    }

    if (!player) return;

    handleInput();

    // Try to move when idle (but not if player manually stopped)
    if (!isMoving && !stoppedByPlayer) {
        startMovement();
    }

    // Update pulsation (breathing animation)
    updatePulsation(delta);

    // Debug
    if (debugText) {
        debugText.setText(
            `=== DEBUG ===\n` +
            `Grid: (${currentGridX},${currentGridY})\n` +
            `Direction: ${currentDirection}\n` +
            `Queued: ${queuedDirection || 'none'}\n` +
            `Queue Age: ${queueAge}/${QUEUE_TIMEOUT_CELLS}\n` +
            `Moving: ${isMoving}\n` +
            `Stopped: ${stoppedByPlayer}\n` +
            `Pulse: ${pulseRate}/sec\n` +
            `Size: ${(currentSize * 100).toFixed(0)}%`
        );
    }

    // Timer
    if (timeRemaining > 0) {
        timeRemaining -= delta / 1000;
        timerText.setText(Math.ceil(timeRemaining).toString());
    }
}

function handleInput() {
    // Helper to check if direction is opposite
    const isOpposite = (dir1, dir2) => {
        return (dir1 === 'up' && dir2 === 'down') ||
               (dir1 === 'down' && dir2 === 'up') ||
               (dir1 === 'left' && dir2 === 'right') ||
               (dir1 === 'right' && dir2 === 'left');
    };

    // Helper to snap player to grid center (fixes drift)
    const snapToGrid = () => {
        player.x = currentGridX * GRID_SIZE + GRID_SIZE / 2;
        player.y = currentGridY * GRID_SIZE + GRID_SIZE / 2;
        console.log(`[SNAP] Aligned to grid (${currentGridX}, ${currentGridY})`);
    };

    // Helper to try instant direction change or stop
    const tryInstantTurn = (newDirection) => {
        // STOP FEATURE: First opposite input while moving = STOP (don't turn)
        if (isMoving && isOpposite(currentDirection, newDirection) && !stoppedByPlayer) {
            console.log('[STOP] Player stopped (opposite input)');

            // Stop tween and snap to grid center
            if (movementTween) {
                movementTween.stop();
            }
            isMoving = false;
            stoppedByPlayer = true;

            snapToGrid(); // Fix grid drift
            setPulseRate('idle');

            // Don't rotate sprite - keep facing current direction
            return;
        }

        // Already going that direction
        if (newDirection === currentDirection && !stoppedByPlayer) {
            return;
        }

        // Check if new direction is valid (not blocked)
        let testGridX = currentGridX;
        let testGridY = currentGridY;

        switch(newDirection) {
            case 'up': testGridY--; break;
            case 'down': testGridY++; break;
            case 'left': testGridX--; break;
            case 'right': testGridX++; break;
        }

        const isBlocked = isWallAt(testGridX, testGridY);

        if (!isBlocked) {
            // INSTANT TURN - direction is valid!
            console.log(`[INSTANT TURN] ${currentDirection} → ${newDirection} (valid path)`);

            // Cancel current movement if any and snap to grid
            if (isMoving && movementTween) {
                movementTween.stop();
                isMoving = false;
                snapToGrid(); // Fix grid drift
            }

            // Change direction immediately
            currentDirection = newDirection;
            stoppedByPlayer = false; // Clear stopped state
            queuedDirection = null;
            queueAge = 0;
            drawPlayerTriangle(); // Rotate triangle instantly

            // Start moving in new direction immediately
            startMovement();
        } else {
            // Blocked - queue it
            console.log(`[QUEUE] ${newDirection} blocked, queuing for 2 cells`);
            queuedDirection = newDirection;
            queueAge = 0;
        }
    };

    // Check each direction input
    if (Phaser.Input.Keyboard.JustDown(keys.W) || Phaser.Input.Keyboard.JustDown(cursors.up)) {
        tryInstantTurn('up');
    }
    if (Phaser.Input.Keyboard.JustDown(keys.S) || Phaser.Input.Keyboard.JustDown(cursors.down)) {
        tryInstantTurn('down');
    }
    if (Phaser.Input.Keyboard.JustDown(keys.A) || Phaser.Input.Keyboard.JustDown(cursors.left)) {
        tryInstantTurn('left');
    }
    if (Phaser.Input.Keyboard.JustDown(keys.D) || Phaser.Input.Keyboard.JustDown(cursors.right)) {
        tryInstantTurn('right');
    }
}

function updatePulsation(delta) {
    // Update breathing cycle
    const deltaSeconds = delta / 1000;
    pulsePhase += deltaSeconds * pulseRate;

    // Oscillate between SIZE_MIN and SIZE_MAX using sine wave
    // sin goes from -1 to 1, we map to SIZE_MIN to SIZE_MAX
    currentSize = SIZE_MIN + (SIZE_MAX - SIZE_MIN) * (Math.sin(pulsePhase * Math.PI * 2) * 0.5 + 0.5);

    // Redraw triangle at new size
    drawPlayerTriangle();
}

function drawPlayerTriangle() {
    if (!playerGraphics || !player) return;

    playerGraphics.clear();

    // Position graphics at player location
    const px = player.x;
    const py = player.y;

    // Calculate scaled dimensions
    const height = TRI_HEIGHT * currentSize;
    const backWidth = TRI_BACK_WIDTH * currentSize;

    // Set colors - ORANGE!
    playerGraphics.fillStyle(0xFF4500, 1); // Orange fill
    playerGraphics.lineStyle(3, 0xCC3700, 1); // Darker orange stroke

    // Draw triangle pointing in current direction
    playerGraphics.beginPath();

    switch(currentDirection) {
        case 'up':
            // Point up
            playerGraphics.moveTo(px, py - height/2);           // Top point
            playerGraphics.lineTo(px - backWidth/2, py + height/2); // Bottom left
            playerGraphics.lineTo(px + backWidth/2, py + height/2);  // Bottom right
            break;
        case 'down':
            // Point down
            playerGraphics.moveTo(px, py + height/2);            // Bottom point
            playerGraphics.lineTo(px - backWidth/2, py - height/2);// Top left
            playerGraphics.lineTo(px + backWidth/2, py - height/2); // Top right
            break;
        case 'left':
            // Point left
            playerGraphics.moveTo(px - height/2, py);           // Left point
            playerGraphics.lineTo(px + height/2, py - backWidth/2); // Top right
            playerGraphics.lineTo(px + height/2, py + backWidth/2);  // Bottom right
            break;
        case 'right':
            // Point right
            playerGraphics.moveTo(px + height/2, py);            // Right point
            playerGraphics.lineTo(px - height/2, py - backWidth/2);// Top left
            playerGraphics.lineTo(px - height/2, py + backWidth/2); // Bottom left
            break;
    }

    playerGraphics.closePath();
    playerGraphics.fillPath();
    playerGraphics.strokePath();
}

function setPulseRate(mode) {
    pulseRate = mode === 'idle' ? PULSE_IDLE_RATE : PULSE_MOVE_RATE;
    console.log(`[PULSE] ${mode} mode: ${pulseRate} pulses/sec`);
}

function startMovement() {
    if (isMoving) return;

    // Age out queue
    if (queueAge >= QUEUE_TIMEOUT_CELLS && queuedDirection) {
        console.log(`[TIMEOUT] Dismissed ${queuedDirection}`);
        queuedDirection = null;
        queueAge = 0;
    }

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
        if (queuedDirection && queuedDirection !== currentDirection) {
            queueAge++;
            console.log(`[BLOCKED] Queued ${queuedDirection}, age ${queueAge}/${QUEUE_TIMEOUT_CELLS}`);
            return;
        }
        setPulseRate('idle');
        return;
    }

    // Apply queued direction
    if (queuedDirection) {
        currentDirection = queuedDirection;
        queuedDirection = null;
        queueAge = 0;
        drawPlayerTriangle(); // Rotate triangle
        console.log(`[TURN] Now moving: ${currentDirection}`);
    }

    isMoving = true;
    currentGridX = targetGridX;
    currentGridY = targetGridY;

    const targetPixelX = targetGridX * GRID_SIZE + GRID_SIZE/2;
    const targetPixelY = targetGridY * GRID_SIZE + GRID_SIZE/2;

    setPulseRate('moving');

    movementTween = scene.tweens.add({
        targets: player,
        x: targetPixelX,
        y: targetPixelY,
        duration: MOVE_DURATION,
        ease: 'Linear',
        onComplete: () => {
            isMoving = false;
            if (queuedDirection) queueAge++;
        }
    });
}

function isWallAt(gridX, gridY) {
    if (gridY < 0 || gridY >= LEVEL_1.length) return true;
    if (gridX < 0 || gridX >= LEVEL_1[0].length) return true;
    return LEVEL_1[gridY][gridX] === 1;
}

function hitHazard(player, hazard) {
    console.log('[HAZARD]');
    hazard.destroy();
    lives--;

    if (lives >= 0 && lives < livesIcons.length) {
        drawLifeIcon(livesIcons[lives], false);
    }

    scene.cameras.main.shake(300, 0.01);
}

console.log('🎮 main.js loaded');
