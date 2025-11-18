# Tech Specs

## Stack
- Phaser 3.80+ (Arcade Physics).
- HTML/JS, Canvas.
- Scenes: Boot, Preload, Game (level manager).

## File Structure
index.html | main.js | assets/ (sounds/sprites later) | docs/

## Key Vars
- TILE_SIZE: 32px
- PLAYER_SPEED: 200
- JUMP_VEL: -280 Y, GRAVITY: 380
- LIVES_START: 3 (max 6)
- Colors: BG #000000, Walls #666666, Turkey #FF4500

## Functions to Implement
loadLevel(levelNum)
updatePlayer()
handleJump()
damageLife(amount: 0.5 or 1)