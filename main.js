// ============================================================
// TURKEY ESCAPE - Clean Grid-Based Movement
// ============================================================

console.log('🎮 main.js loading...');

// GRID SPECS
const GRID_SIZE = 64;
const PLAYER_SIZE = 60;
const MOVE_DURATION = 1000; // 1 cell per second

// PULSATION SPECS
const PULSE_IDLE_RATE = 1;  // 1 pulse per second
const PULSE_MOVE_RATE = 4;  // 4 pulses per second
const SIZE_MIN = 0.80;      // 80% of normal
const SIZE_MAX = 1.00;      // 100% normal

// TRIANGLE SPECS
const TRI_HEIGHT = 30;
const TRI_BACK_WIDTH = 21; // 70% of height

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
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

// Global state
let scene;
let player;
let playerGraphics;
let keys;
let walls;
let hazards;

// Movement state
let gridX = 0;
let gridY = 0;
let facing = 'up';
let queuedInput = null;
let queueAge = 0;
let isMoving = false;

// Pulsation state
let pulsePhase = 0;
let currentSize = SIZE_MAX;

// UI
let debugText;

// Level map
const LEVEL = [
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
}

function create() {
    console.log('🎨 CREATE');
    scene = this;

    // Title
    const title = this.add.text(400, 30, 'TURKEY ESCAPE - Grid Movement', {
        fontSize: '18px',
        fill: '#00FF00',
        fontFamily: 'monospace'
    });
    title.setOrigin(0.5);
    title.setScrollFactor(0);

    // Create groups
    walls = this.physics.add.staticGroup();
    hazards = this.physics.add.group();

    // Create player container (for physics)
    player = this.add.container(0, 0);
    this.physics.world.enable(player);
    player.body.setSize(PLAYER_SIZE, PLAYER_SIZE);
    player.body.setOffset(-PLAYER_SIZE/2, -PLAYER_SIZE/2);

    // Create graphics for triangle
    playerGraphics = this.add.graphics();
    playerGraphics.setDepth(100);

    // Input
    keys = this.input.keyboard.addKeys({
        W: Phaser.Input.Keyboard.KeyCodes.W,
        A: Phaser.Input.Keyboard.KeyCodes.A,
        S: Phaser.Input.Keyboard.KeyCodes.S,
        D: Phaser.Input.Keyboard.KeyCodes.D,
        UP: Phaser.Input.Keyboard.KeyCodes.UP,
        LEFT: Phaser.Input.Keyboard.KeyCodes.LEFT,
        DOWN: Phaser.Input.Keyboard.KeyCodes.DOWN,
        RIGHT: Phaser.Input.Keyboard.KeyCodes.RIGHT
    });

    // Build level
    buildLevel.call(this);

    // Create UI
    const instructions = this.add.text(400, 570, 'WASD/Arrows: Change direction | Stops only at walls', {
        fontSize: '13px',
        fill: '#FFFFFF',
        fontFamily: 'monospace'
    });
    instructions.setOrigin(0.5, 0);
    instructions.setScrollFactor(0);

    debugText = this.add.text(10, 50, '', {
        fontSize: '12px',
        fill: '#00FF00',
        fontFamily: 'monospace',
        backgroundColor: '#000000',
        padding: { x: 8, y: 8 }
    });
    debugText.setScrollFactor(0);
    debugText.setDepth(200);

    // Camera
    this.cameras.main.startFollow(player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1.2);

    // Collisions
    this.physics.add.collider(player, walls);

    // Draw initial triangle
    drawTriangle();

    console.log('✅ CREATE COMPLETE - Player at grid (' + gridX + ',' + gridY + ')');
}

function buildLevel() {
    for (let y = 0; y < LEVEL.length; y++) {
        for (let x = 0; x < LEVEL[y].length; x++) {
            const tile = LEVEL[y][x];
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

                const hazard = this.add.graphics();
                hazard.fillStyle(0xFF0000, 1);
                hazard.fillCircle(px + GRID_SIZE/2, py + GRID_SIZE/2, 20);
            } else if (tile === 3) {
                // Start position
                const floor = this.add.graphics();
                floor.fillStyle(0x222222, 1);
                floor.fillRect(px, py, GRID_SIZE, GRID_SIZE);

                gridX = x;
                gridY = y;
                player.setPosition(px + GRID_SIZE/2, py + GRID_SIZE/2);
            } else if (tile === 4) {
                // Exit
                const floor = this.add.graphics();
                floor.fillStyle(0x222222, 1);
                floor.fillRect(px, py, GRID_SIZE, GRID_SIZE);

                const exit = this.add.graphics();
                exit.lineStyle(4, 0x00FF00, 1);
                exit.strokeRect(px + 8, py + 8, GRID_SIZE - 16, GRID_SIZE - 16);
            }
        }
    }
}

function update(time, delta) {
    if (!player) return;

    // Handle input - just queue it
    handleInput();

    // Try to start movement when at grid center (always running!)
    if (!isMoving) {
        tryStartMovement();
    }

    // Update pulsation animation
    updatePulsation(delta);

    // Update debug display
    updateDebug();
}

function handleInput() {
    // Just queue the input - don't execute anything
    if (Phaser.Input.Keyboard.JustDown(keys.W) || Phaser.Input.Keyboard.JustDown(keys.UP)) {
        queuedInput = 'up';
        queueAge = 0;
        console.log('[INPUT] Queued: UP');
    }
    if (Phaser.Input.Keyboard.JustDown(keys.S) || Phaser.Input.Keyboard.JustDown(keys.DOWN)) {
        queuedInput = 'down';
        queueAge = 0;
        console.log('[INPUT] Queued: DOWN');
    }
    if (Phaser.Input.Keyboard.JustDown(keys.A) || Phaser.Input.Keyboard.JustDown(keys.LEFT)) {
        queuedInput = 'left';
        queueAge = 0;
        console.log('[INPUT] Queued: LEFT');
    }
    if (Phaser.Input.Keyboard.JustDown(keys.D) || Phaser.Input.Keyboard.JustDown(keys.RIGHT)) {
        queuedInput = 'right';
        queueAge = 0;
        console.log('[INPUT] Queued: RIGHT');
    }
}

function tryStartMovement() {
    // Age out old queued inputs
    if (queueAge >= QUEUE_TIMEOUT_CELLS && queuedInput) {
        console.log('[TIMEOUT] Dismissed queued input: ' + queuedInput);
        queuedInput = null;
        queueAge = 0;
    }

    // Determine which direction to try
    let dirToTry = queuedInput || facing;

    // Calculate target cell
    let targetX = gridX;
    let targetY = gridY;

    switch(dirToTry) {
        case 'up': targetY--; break;
        case 'down': targetY++; break;
        case 'left': targetX--; break;
        case 'right': targetX++; break;
    }

    // Check if target is blocked
    if (isWall(targetX, targetY)) {
        // Can't move there - blocked by wall
        if (queuedInput && queuedInput !== facing) {
            queueAge++;
            console.log('[BLOCKED] Queued input blocked, age: ' + queueAge);
        }
        // Just stay at current position (idle)
        return;
    }

    // Valid move! Apply queued input if any
    if (queuedInput) {
        facing = queuedInput;
        queuedInput = null;
        queueAge = 0;
        drawTriangle(); // Rotate sprite
        console.log('[TURN] Now facing: ' + facing);
    }

    // Start movement to target cell
    isMoving = true;
    gridX = targetX;
    gridY = targetY;

    const targetPx = targetX * GRID_SIZE + GRID_SIZE / 2;
    const targetPy = targetY * GRID_SIZE + GRID_SIZE / 2;

    console.log('[MOVE] Grid (' + gridX + ',' + gridY + ') → Pixel (' + targetPx + ',' + targetPy + ')');

    scene.tweens.add({
        targets: player,
        x: targetPx,
        y: targetPy,
        duration: MOVE_DURATION,
        ease: 'Linear',
        onComplete: () => {
            isMoving = false;
            console.log('[ARRIVE] Reached grid center (' + gridX + ',' + gridY + ')');
            if (queuedInput) queueAge++;
        }
    });
}

function isWall(x, y) {
    if (y < 0 || y >= LEVEL.length) return true;
    if (x < 0 || x >= LEVEL[0].length) return true;
    return LEVEL[y][x] === 1;
}

function updatePulsation(delta) {
    const deltaSeconds = delta / 1000;
    const rate = isMoving ? PULSE_MOVE_RATE : PULSE_IDLE_RATE;
    pulsePhase += deltaSeconds * rate;

    // Map sine wave to 80-100% size
    currentSize = SIZE_MIN + (SIZE_MAX - SIZE_MIN) * (Math.sin(pulsePhase * Math.PI * 2) * 0.5 + 0.5);

    // Redraw triangle at new size
    drawTriangle();
}

function drawTriangle() {
    if (!playerGraphics || !player) return;

    playerGraphics.clear();

    const px = player.x;
    const py = player.y;
    const h = TRI_HEIGHT * currentSize;
    const w = TRI_BACK_WIDTH * currentSize;

    // Orange colors
    playerGraphics.fillStyle(0xFF4500, 1);
    playerGraphics.lineStyle(3, 0xCC3700, 1);

    playerGraphics.beginPath();

    switch(facing) {
        case 'up':
            playerGraphics.moveTo(px, py - h/2);
            playerGraphics.lineTo(px - w/2, py + h/2);
            playerGraphics.lineTo(px + w/2, py + h/2);
            break;
        case 'down':
            playerGraphics.moveTo(px, py + h/2);
            playerGraphics.lineTo(px - w/2, py - h/2);
            playerGraphics.lineTo(px + w/2, py - h/2);
            break;
        case 'left':
            playerGraphics.moveTo(px - h/2, py);
            playerGraphics.lineTo(px + h/2, py - w/2);
            playerGraphics.lineTo(px + h/2, py + w/2);
            break;
        case 'right':
            playerGraphics.moveTo(px + h/2, py);
            playerGraphics.lineTo(px - h/2, py - w/2);
            playerGraphics.lineTo(px - h/2, py + w/2);
            break;
    }

    playerGraphics.closePath();
    playerGraphics.fillPath();
    playerGraphics.strokePath();
}

function updateDebug() {
    if (!debugText) return;

    debugText.setText(
        `Grid: (${gridX}, ${gridY})\n` +
        `Facing: ${facing}\n` +
        `Queued: ${queuedInput || 'none'}\n` +
        `Queue Age: ${queueAge}/${QUEUE_TIMEOUT_CELLS}\n` +
        `Moving: ${isMoving}\n` +
        `Size: ${(currentSize * 100).toFixed(0)}%`
    );
}

console.log('🎮 main.js loaded');
