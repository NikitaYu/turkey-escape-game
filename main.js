// ============================================================
// TURKEY ESCAPE - Grid-Based Movement System
// ============================================================

console.log('🎮 main.js loading...');

const GRID_SIZE = 32; // Grid cell size
const PLAYER_SIZE = 28; // Player fits in grid cell (with 4px padding)
const MOVE_SPEED = 150; // Pixels per second

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
console.log('🎮 Game instance created:', game);

// Game state
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
let timeRemaining = 90;

// Grid movement state
let targetX = null;
let targetY = null;
let isMoving = false;
let facingDirection = 'up'; // 'up', 'down', 'left', 'right'

let updateCount = 0;

// Level 1: Vertical corridor at bottom-center, player runs up
const LEVEL_1 = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,4,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,0,1,1,1,1,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,0,1,1,1,2,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,3,0,0,0,0,0,0,1], // 3 = start at bottom center
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

function preload() {
    console.log('📦 PRELOAD started');
    log('preload-check', '✓ Preload running');
}

function create() {
    console.log('🎨 CREATE started');
    log('create-check', '✓ Create running');

    try {
        // Add test elements
        console.log('Adding test green rectangle...');
        const testRect = this.add.rectangle(200, 100, 150, 150, 0x00FF00);
        console.log('Green rect created');

        console.log('Adding test text...');
        const testText = this.add.text(400, 50, 'GRID GAME!', {
            fontSize: '32px',
            fill: '#FFFF00',
            fontFamily: 'monospace'
        });
        testText.setOrigin(0.5);
        console.log('Test text created');

        // Create physics groups
        console.log('Creating physics groups...');
        walls = this.physics.add.staticGroup();
        hazards = this.physics.add.group();
        console.log('Physics groups created');

        // Create player (container for graphics)
        console.log('Creating player...');
        player = this.add.container(64, 320);
        this.physics.world.enable(player);
        player.body.setSize(PLAYER_SIZE, PLAYER_SIZE);
        player.body.setOffset(-PLAYER_SIZE/2, -PLAYER_SIZE/2);
        console.log('Player container created');

        // Draw player as orange square (simpler for grid)
        playerGraphics = this.add.graphics();
        playerGraphics.fillStyle(0xFF4500, 1);
        playerGraphics.lineStyle(2, 0xCC3700, 1);
        playerGraphics.fillRect(-PLAYER_SIZE/2, -PLAYER_SIZE/2, PLAYER_SIZE, PLAYER_SIZE);
        playerGraphics.strokeRect(-PLAYER_SIZE/2, -PLAYER_SIZE/2, PLAYER_SIZE, PLAYER_SIZE);
        player.add(playerGraphics);
        console.log('Player graphics attached');

        // Input
        console.log('Setting up input...');
        cursors = this.input.keyboard.createCursorKeys();
        keys = this.input.keyboard.addKeys({
            W: Phaser.Input.Keyboard.KeyCodes.W,
            A: Phaser.Input.Keyboard.KeyCodes.A,
            S: Phaser.Input.Keyboard.KeyCodes.S,
            D: Phaser.Input.Keyboard.KeyCodes.D,
            SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE
        });
        console.log('Input configured');

        // Build level
        console.log('Building level...');
        buildLevel.call(this, LEVEL_1);
        console.log('Level built');

        // UI
        console.log('Creating UI...');
        createUI.call(this);
        console.log('UI created');

        // Collisions
        console.log('Setting up collisions...');
        this.physics.add.collider(player, walls);
        this.physics.add.overlap(player, hazards, hitHazard, null, this);
        console.log('Collisions configured');

        // Camera
        console.log('Setting up camera...');
        this.cameras.main.startFollow(player, true, 0.1, 0.1);
        this.cameras.main.setZoom(1.5);
        console.log('Camera configured');

        // Start automatic upward movement
        facingDirection = 'up';
        console.log('Player will auto-move UP');

        console.log('✅ CREATE COMPLETE');
        log('create-check', '✓ Create COMPLETED - Grid Game Ready!');

    } catch (error) {
        console.error('❌ ERROR in create():', error);
        log('create-check', '✗ Create ERROR: ' + error.message, false);
    }
}

function buildLevel(map) {
    console.log('Building level map...');
    let tileCount = 0;

    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
            const tile = map[y][x];
            const px = x * GRID_SIZE;
            const py = y * GRID_SIZE;
            tileCount++;

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
                // Floor + Hazard
                const floor = this.add.graphics();
                floor.fillStyle(0x222222, 1);
                floor.fillRect(px, py, GRID_SIZE, GRID_SIZE);

                const hazard = this.add.container(px + GRID_SIZE/2, py + GRID_SIZE/2);
                this.physics.world.enable(hazard);
                hazard.body.setSize(PLAYER_SIZE, PLAYER_SIZE);

                const hgfx = this.add.graphics();
                hgfx.fillStyle(0xFF0000, 1);
                hgfx.fillCircle(0, 0, PLAYER_SIZE/2);
                hazard.add(hgfx);
                hazard.setData('speed', 0);

                hazards.add(hazard);
            } else if (tile === 3) {
                // Start position
                const floor = this.add.graphics();
                floor.fillStyle(0x222222, 1);
                floor.fillRect(px, py, GRID_SIZE, GRID_SIZE);

                player.setPosition(px + GRID_SIZE/2, py + GRID_SIZE/2);
                console.log('Player positioned at start:', px + GRID_SIZE/2, py + GRID_SIZE/2);
            } else if (tile === 4) {
                // Exit
                const floor = this.add.graphics();
                floor.fillStyle(0x222222, 1);
                floor.fillRect(px, py, GRID_SIZE, GRID_SIZE);

                const exit = this.add.graphics();
                exit.lineStyle(3, 0x00FF00, 1);
                exit.strokeRect(px + 4, py + 4, GRID_SIZE - 8, GRID_SIZE - 8);
                exit.setData('isExit', true);
            }
        }
    }
    console.log(`Level built: ${tileCount} tiles processed`);
}

function createUI() {
    console.log('Creating UI elements...');

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

    // Level
    levelText = this.add.text(20, 560, 'Level 1 - WASD to move', {
        fontSize: '18px',
        fill: '#FFFFFF',
        fontFamily: 'monospace'
    });
    levelText.setScrollFactor(0);
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
        console.log('🔄 UPDATE running!');
        log('update-check', '✓ Update running (frame: 1)');
    }

    if (updateCount % 60 === 0) {
        log('update-check', `✓ Update running (frame: ${updateCount})`);
    }

    if (!player) return;

    handleGridMovement.call(this, delta);

    // Timer
    if (timeRemaining > 0) {
        timeRemaining -= delta / 1000;
        timerText.setText(Math.ceil(timeRemaining).toString());
    }
}

function handleGridMovement(delta) {
    const currentGridX = Math.round(player.x / GRID_SIZE);
    const currentGridY = Math.round(player.y / GRID_SIZE);

    // Check for input to change direction
    if (Phaser.Input.Keyboard.JustDown(keys.W) || Phaser.Input.Keyboard.JustDown(cursors.up)) {
        facingDirection = 'up';
        console.log('Direction: UP');
    }
    if (Phaser.Input.Keyboard.JustDown(keys.S) || Phaser.Input.Keyboard.JustDown(cursors.down)) {
        facingDirection = 'down';
        console.log('Direction: DOWN');
    }
    if (Phaser.Input.Keyboard.JustDown(keys.A) || Phaser.Input.Keyboard.JustDown(cursors.left)) {
        facingDirection = 'left';
        console.log('Direction: LEFT');
    }
    if (Phaser.Input.Keyboard.JustDown(keys.D) || Phaser.Input.Keyboard.JustDown(cursors.right)) {
        facingDirection = 'right';
        console.log('Direction: RIGHT');
    }

    // Constant movement in facing direction
    let velocityX = 0;
    let velocityY = 0;

    switch(facingDirection) {
        case 'up':
            velocityY = -MOVE_SPEED;
            break;
        case 'down':
            velocityY = MOVE_SPEED;
            break;
        case 'left':
            velocityX = -MOVE_SPEED;
            break;
        case 'right':
            velocityX = MOVE_SPEED;
            break;
    }

    // Check next grid position for collision
    const nextGridX = currentGridX + (velocityX > 0 ? 1 : (velocityX < 0 ? -1 : 0));
    const nextGridY = currentGridY + (velocityY > 0 ? 1 : (velocityY < 0 ? -1 : 0));

    // Check if next position is a wall
    if (isWallAt(nextGridX, nextGridY)) {
        // Stop at current grid position
        player.body.setVelocity(0, 0);
        snapToGrid();
        console.log('Hit wall! Stopped.');
    } else {
        // Continue moving
        player.body.setVelocity(velocityX, velocityY);
    }
}

function snapToGrid() {
    const gridX = Math.round(player.x / GRID_SIZE);
    const gridY = Math.round(player.y / GRID_SIZE);
    player.setPosition(gridX * GRID_SIZE, gridY * GRID_SIZE);
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

    this.cameras.main.shake(300, 0.01);
}

console.log('🎮 main.js loaded completely');
