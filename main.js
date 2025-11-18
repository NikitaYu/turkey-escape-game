const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#000000',  // Black BG
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 380 },
            debug: true  // For proto testing
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

function preload() {
    // Load assets later
}

function create() {
    // Setup scene here
}

function update() {
    // Game loop here
}