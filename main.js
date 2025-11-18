// ============================================================
// TURKEY ESCAPE - Phaser 3.80 Prototype - DEBUG VERSION
// ============================================================

console.log('🎮 main.js loading...');

const TILE_SIZE = 32;
const PLAYER_SPEED = 200;

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
let cursors;
let keys;
let walls;
let hazards;
let powerups;
let lives = 3;
let livesIcons = [];
let timerText;
let levelText;
let timeRemaining = 90;
let speedMultiplier = 1.0;
let updateCount = 0;

// Embedded level data
const LEVEL_1 = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,0,0,0,1,1,1,1,0,1],
    [1,0,1,0,0,0,0,2,0,0,0,0,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,0,0,1,0,1],
    [1,3,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,0,0,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,0,0,0,0,2,0,0,0,0,1,0,1],
    [1,0,1,1,1,1,0,0,0,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,4,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

function preload() {
    console.log('📦 PRELOAD started');
    log('preload-check', '✓ Preload running');

    // Draw a test rectangle to prove Phaser is rendering
    this.add.rectangle(400, 300, 100, 100, 0xFF0000);
    console.log('📦 Test red rectangle added at 400,300');
}

function create() {
    console.log('🎨 CREATE started');
    log('create-check', '✓ Create running');

    try {
        // DEBUG: Add visible test elements FIRST
        console.log('Adding test green rectangle...');
        const testRect = this.add.rectangle(200, 100, 150, 150, 0x00FF00);
        console.log('Green rect created:', testRect);

        console.log('Adding test text...');
        const testText = this.add.text(400, 50, 'GAME LOADED!', {
            fontSize: '32px',
            fill: '#FFFF00',
            fontFamily: 'monospace'
        });
        testText.setOrigin(0.5);
        console.log('Test text created:', testText);

        // Create physics groups
        console.log('Creating physics groups...');
        walls = this.physics.add.staticGroup();
        hazards = this.physics.add.group();
        powerups = this.physics.add.group();
        console.log('Physics groups created');

        // Create player
        console.log('Creating player...');
        player = this.physics.add.sprite(64, 160, null);
        player.setSize(20, 20);
        player.displayWidth = 20;
        player.displayHeight = 20;
        console.log('Player sprite created at 64,160');

        // Draw player as orange triangle
        console.log('Drawing player triangle...');
        const playerGfx = this.add.graphics();
        playerGfx.fillStyle(0xFF4500, 1);
        playerGfx.lineStyle(2, 0xCC3700, 1);
        playerGfx.beginPath();
        playerGfx.moveTo(10, 0);
        playerGfx.lineTo(-10, -7);
        playerGfx.lineTo(-10, 7);
        playerGfx.closePath();
        playerGfx.fillPath();
        playerGfx.strokePath();
        player.add(playerGfx);
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
        this.physics.add.overlap(player, powerups, collectPowerup, null, this);
        console.log('Collisions configured');

        // Camera
        console.log('Setting up camera...');
        this.cameras.main.startFollow(player, true, 0.1, 0.1);
        this.cameras.main.setZoom(1.5);
        console.log('Camera configured');

        console.log('✅ CREATE COMPLETE - Game should be visible now!');
        log('create-check', '✓ Create COMPLETED - Game ready!');

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
            const px = x * TILE_SIZE;
            const py = y * TILE_SIZE;
            tileCount++;

            if (tile === 0) {
                // Floor
                const floor = this.add.graphics();
                floor.fillStyle(0x222222, 1);
                floor.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            } else if (tile === 1) {
                // Wall
                const wallGfx = this.add.graphics();
                wallGfx.fillStyle(0x666666, 1);
                wallGfx.lineStyle(2, 0x888888, 1);
                wallGfx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                wallGfx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);

                const wall = walls.create(px + 16, py + 16, null);
                wall.setSize(TILE_SIZE, TILE_SIZE);
                wall.setVisible(false);
                wall.refreshBody();
            } else if (tile === 2) {
                // Floor + Hazard
                const floor = this.add.graphics();
                floor.fillStyle(0x222222, 1);
                floor.fillRect(px, py, TILE_SIZE, TILE_SIZE);

                const hazard = hazards.create(px + 16, py + 16, null);
                hazard.setSize(20, 20);
                const hgfx = this.add.graphics();
                hgfx.fillStyle(0x444444, 1);
                hgfx.fillCircle(0, 0, 10);
                hazard.add(hgfx);
                hazard.setData('speed', 60);
            } else if (tile === 3) {
                // Start
                const floor = this.add.graphics();
                floor.fillStyle(0x222222, 1);
                floor.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                player.setPosition(px + 16, py + 16);
                console.log('Player positioned at start:', px + 16, py + 16);
            } else if (tile === 4) {
                // Exit
                const floor = this.add.graphics();
                floor.fillStyle(0x222222, 1);
                floor.fillRect(px, py, TILE_SIZE, TILE_SIZE);

                const exit = this.add.graphics();
                exit.lineStyle(3, 0xFFFFFF, 1);
                exit.strokeRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
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
    console.log('Lives icons created');

    // Timer
    timerText = this.add.text(760, 20, '90', {
        fontSize: '24px',
        fill: '#FFFFFF',
        fontFamily: 'monospace'
    });
    timerText.setOrigin(1, 0);
    timerText.setScrollFactor(0);
    console.log('Timer text created');

    // Level
    levelText = this.add.text(20, 560, 'Level 1', {
        fontSize: '18px',
        fill: '#FFFFFF',
        fontFamily: 'monospace'
    });
    levelText.setScrollFactor(0);
    console.log('Level text created');
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
    icon.beginPath();
    icon.moveTo(8, 0);
    icon.lineTo(-4, -5);
    icon.lineTo(-4, 5);
    icon.closePath();
    icon.fillPath();
    icon.strokePath();
}

function update(time, delta) {
    updateCount++;

    // Log first update
    if (updateCount === 1) {
        console.log('🔄 UPDATE running!');
        log('update-check', '✓ Update running (frame: 1)');
    }

    // Log every 60 frames (about 1 second)
    if (updateCount % 60 === 0) {
        log('update-check', `✓ Update running (frame: ${updateCount})`);
    }

    if (!player) return;

    // Movement
    const speed = PLAYER_SPEED * speedMultiplier;
    const angle = player.rotation;

    player.setVelocity(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed
    );

    // Steering
    if (cursors.left.isDown || keys.A.isDown) {
        player.rotation -= 0.05;
    }
    if (cursors.right.isDown || keys.D.isDown) {
        player.rotation += 0.05;
    }

    // Jump
    if (Phaser.Input.Keyboard.JustDown(keys.SPACE)) {
        console.log('Jump!');
        this.tweens.add({
            targets: player,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 300,
            yoyo: true
        });
        playSound();
    }

    // Update hazards
    hazards.getChildren().forEach(h => {
        const angle = Phaser.Math.Angle.Between(h.x, h.y, player.x, player.y);
        h.setVelocity(
            Math.cos(angle) * h.getData('speed'),
            Math.sin(angle) * h.getData('speed')
        );
    });

    // Timer
    if (timeRemaining > 0) {
        timeRemaining -= delta / 1000;
        timerText.setText(Math.ceil(timeRemaining).toString());
    }
}

function hitHazard(player, hazard) {
    console.log('Hit hazard!');
    hazard.destroy();
    lives--;

    if (lives >= 0 && lives < livesIcons.length) {
        drawLifeIcon(livesIcons[lives], false);
    }

    this.cameras.main.shake(300, 0.005);
}

function collectPowerup(player, powerup) {
    console.log('Collected powerup!');
    powerup.destroy();
    speedMultiplier = 1.5;
    this.time.delayedCall(5000, () => speedMultiplier = 1.0);
}

function playSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 440;
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
    } catch(e) {
        console.log('Audio not available');
    }
}

console.log('🎮 main.js loaded completely');
