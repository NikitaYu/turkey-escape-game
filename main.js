// ============================================================
// TURKEY ESCAPE - Classic Grid Movement (Pac-Man Style)
// ============================================================

console.log('🎮 main.js loading...');

// GRID SPECS
const GRID_SIZE = 64; // Grid cell size
const PLAYER_SIZE = 60; // Visible sprite (64px total with 4px padding)
const MOVE_DURATION = 1000; // 1 cell per second
const STEPS_PER_CELL = 4; // 4 animation steps per cell
const STEP_DURATION = MOVE_DURATION / STEPS_PER_CELL; // 250ms per step

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
let scene; // Store scene reference
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
let currentDirection = 'up'; // Current moving direction
let queuedDirection = null; // Queued direction (last input)
let isMoving = false;
let movementTween = null;

// Level 1: Start at bottom-center, vertical corridor up
const LEVEL_1 = [
    [1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,4,0,0,0,0,1],
    [1,0,1,1,1,1,0,1,1,1,0,1],
    [1,0,1,0,0,0,0,0,0,1,0,1],
    [1,0,0,0,1,1,2,1,1,0,0,1],
    [1,0,1,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,0,1,1,1,1,1],
    [1,0,0,0,0,0,3,0,0,0,0,1], // Start at bottom center
    [1,1,1,1,1,1,1,1,1,1,1,1]
];

function preload() {
    console.log('📦 PRELOAD started');
    log('preload-check', '✓ Preload running');
}

function create() {
    console.log('🎨 CREATE started');
    log('create-check', '✓ Create running');

    // Store scene reference for later use
    scene = this;

    try {
        // Test elements
        const testText = this.add.text(400, 30, 'GRID MOVEMENT', {
            fontSize: '24px',
            fill: '#FFFF00',
            fontFamily: 'monospace'
        });
        testText.setOrigin(0.5);
        testText.setScrollFactor(0);

        // Create physics groups
        walls = this.physics.add.staticGroup();
        hazards = this.physics.add.group();

        // Create player container
        player = this.add.container(0, 0);
        this.physics.world.enable(player);
        player.body.setSize(PLAYER_SIZE, PLAYER_SIZE);
        player.body.setOffset(-PLAYER_SIZE/2, -PLAYER_SIZE/2);

        // Draw player sprite (60px visible, 4px padding = 64px total)
        playerGraphics = this.add.graphics();
        playerGraphics.fillStyle(0xFF4500, 1);
        playerGraphics.lineStyle(3, 0xCC3700, 1);
        // 60px sprite centered with 2px margin on each side
        playerGraphics.fillRect(-30, -30, 60, 60);
        playerGraphics.strokeRect(-30, -30, 60, 60);
        player.add(playerGraphics);
        console.log('Player created (60px sprite, 64px cell)');

        // Input
        cursors = this.input.keyboard.createCursorKeys();
        keys = this.input.keyboard.addKeys({
            W: Phaser.Input.Keyboard.KeyCodes.W,
            A: Phaser.Input.Keyboard.KeyCodes.A,
            S: Phaser.Input.Keyboard.KeyCodes.S,
            D: Phaser.Input.Keyboard.KeyCodes.D
        });

        // Build level
        buildLevel.call(this, LEVEL_1);

        // UI
        createUI.call(this);

        // Collisions
        this.physics.add.collider(player, walls);
        this.physics.add.overlap(player, hazards, hitHazard, null, this);

        // Camera
        this.cameras.main.startFollow(player, true, 0.08, 0.08);
        this.cameras.main.setZoom(1.2);

        // Start moving up
        currentDirection = 'up';
        startMovement();

        console.log('✅ CREATE COMPLETE');
        log('create-check', '✓ Grid movement ready!');

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
                // Floor
                const floor = this.add.graphics();
                floor.fillStyle(0x222222, 1);
                floor.fillRect(px, py, GRID_SIZE, GRID_SIZE);
            } else if (tile === 1) {
                // Wall
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
                // Hazard
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
                // Start
                const floor = this.add.graphics();
                floor.fillStyle(0x222222, 1);
                floor.fillRect(px, py, GRID_SIZE, GRID_SIZE);

                // Position player at cell center
                currentGridX = x;
                currentGridY = y;
                player.setPosition(px + GRID_SIZE/2, py + GRID_SIZE/2);
                console.log(`Player start: grid(${x},${y}) pixel(${player.x},${player.y})`);
            } else if (tile === 4) {
                // Exit
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
    // Lives
    for (let i = 0; i < 3; i++) {
        const icon = this.add.graphics();
        icon.setScrollFactor(0);
        icon.setPosition(30 + i * 30, 30);
        drawLifeIcon(icon, true);
        livesIcons.push(icon);
    }

    // Timer
    timerText = this.add.text(760, 20, '90', {
        fontSize: '24px',
        fill: '#FFFFFF',
        fontFamily: 'monospace'
    });
    timerText.setOrigin(1, 0);
    timerText.setScrollFactor(0);

    // Level info
    levelText = this.add.text(400, 570, 'WASD: Change Direction | 1 cell/sec', {
        fontSize: '14px',
        fill: '#FFFFFF',
        fontFamily: 'monospace'
    });
    levelText.setOrigin(0.5, 0);
    levelText.setScrollFactor(0);

    // Debug info display
    debugText = this.add.text(10, 80, '', {
        fontSize: '12px',
        fill: '#00FF00',
        fontFamily: 'monospace',
        backgroundColor: '#000000',
        padding: { x: 5, y: 5 }
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

    // Update debug display
    if (debugText) {
        debugText.setText(
            `Grid: (${currentGridX},${currentGridY})\n` +
            `Pixel: (${Math.round(player.x)},${Math.round(player.y)})\n` +
            `Direction: ${currentDirection}\n` +
            `Queued: ${queuedDirection || 'none'}\n` +
            `Moving: ${isMoving}\n` +
            `Tween: ${movementTween ? (movementTween.isPlaying() ? 'playing' : 'stopped') : 'null'}`
        );
    }

    // Timer
    if (timeRemaining > 0) {
        timeRemaining -= delta / 1000;
        timerText.setText(Math.ceil(timeRemaining).toString());
    }
}

function handleInput() {
    // Queue last direction input (only at intersections)
    if (Phaser.Input.Keyboard.JustDown(keys.W) || Phaser.Input.Keyboard.JustDown(cursors.up)) {
        queuedDirection = 'up';
        console.log('Queued: UP');
    }
    if (Phaser.Input.Keyboard.JustDown(keys.S) || Phaser.Input.Keyboard.JustDown(cursors.down)) {
        queuedDirection = 'down';
        console.log('Queued: DOWN');
    }
    if (Phaser.Input.Keyboard.JustDown(keys.A) || Phaser.Input.Keyboard.JustDown(cursors.left)) {
        queuedDirection = 'left';
        console.log('Queued: LEFT');
    }
    if (Phaser.Input.Keyboard.JustDown(keys.D) || Phaser.Input.Keyboard.JustDown(cursors.right)) {
        queuedDirection = 'right';
        console.log('Queued: RIGHT');
    }
}

function startMovement() {
    console.log(`[START] isMoving: ${isMoving}, currentDir: ${currentDirection}, queuedDir: ${queuedDirection}, grid: (${currentGridX},${currentGridY})`);

    if (isMoving) {
        console.log('[START] Already moving, returning');
        return;
    }

    // Try queued direction first, then continue current direction
    const directionToTry = queuedDirection || currentDirection;
    console.log(`[START] Trying direction: ${directionToTry}`);

    // Calculate target grid position
    let targetGridX = currentGridX;
    let targetGridY = currentGridY;

    switch(directionToTry) {
        case 'up': targetGridY--; break;
        case 'down': targetGridY++; break;
        case 'left': targetGridX--; break;
        case 'right': targetGridX++; break;
    }

    console.log(`[START] Target grid: (${targetGridX},${targetGridY})`);

    // Check if target is valid (not a wall)
    const isWall = isWallAt(targetGridX, targetGridY);
    console.log(`[START] Is wall at target? ${isWall}`);

    if (isWall) {
        // Can't move in queued direction, try current direction
        if (queuedDirection && queuedDirection !== currentDirection) {
            console.log('[START] Queued direction blocked, trying current direction');
            queuedDirection = null;
            startMovement();
            return;
        }
        // Blocked - stop moving
        isMoving = false;
        queuedDirection = null;
        console.log(`[BLOCKED] Stopped at grid(${currentGridX},${currentGridY})`);
        return;
    }

    // Valid move - apply queued direction if any
    if (queuedDirection) {
        currentDirection = queuedDirection;
        queuedDirection = null;
        console.log(`[DIRECTION CHANGED] Now facing: ${currentDirection}`);
    }

    // Start movement tween
    isMoving = true;
    currentGridX = targetGridX;
    currentGridY = targetGridY;

    const targetPixelX = targetGridX * GRID_SIZE + GRID_SIZE/2;
    const targetPixelY = targetGridY * GRID_SIZE + GRID_SIZE/2;

    console.log(`[TWEEN START] Moving from pixel(${player.x},${player.y}) to pixel(${targetPixelX},${targetPixelY})`);

    // Smooth tween - use stored scene reference
    movementTween = scene.tweens.add({
        targets: player,
        x: targetPixelX,
        y: targetPixelY,
        duration: MOVE_DURATION,
        ease: 'Linear',
        onStart: () => {
            console.log('[TWEEN] Animation started');
        },
        onUpdate: (tween) => {
            // Log every 25% progress
            const progress = Math.floor(tween.progress * 100);
            if (progress % 25 === 0 && progress > 0) {
                console.log(`[TWEEN] Progress: ${progress}%`);
            }
        },
        onComplete: () => {
            console.log('[TWEEN COMPLETE] Animation finished');
            console.log(`[TWEEN COMPLETE] Player at pixel(${player.x},${player.y}), grid(${currentGridX},${currentGridY})`);
            isMoving = false;
            console.log('[TWEEN COMPLETE] Calling startMovement() again...');
            startMovement(); // Continue moving
        }
    });

    console.log('[TWEEN] Tween created:', movementTween);
}

function isWallAt(gridX, gridY) {
    if (gridY < 0 || gridY >= LEVEL_1.length) return true;
    if (gridX < 0 || gridX >= LEVEL_1[0].length) return true;
    return LEVEL_1[gridY][gridX] === 1;
}

function hitHazard(player, hazard) {
    console.log('Hit hazard!');
    hazard.destroy();
    lives--;

    if (lives >= 0 && lives < livesIcons.length) {
        drawLifeIcon(livesIcons[lives], false);
    }

    scene.cameras.main.shake(300, 0.01);
}

console.log('🎮 main.js loaded');
