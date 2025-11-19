# CLAUDE.md - AI Assistant Guide for Turkey Escape Game

## Project Overview

**Turkey Escape Game** is a casual top-down browser game built with Phaser 3. A live turkey escapes from a hipster tech lab through vents and mazes, dodging hazards and grabbing powerups. The game combines 90s Diablo-style grit with Half-Life anomalies and humor.

**Current Status**: Early prototype phase - basic Phaser setup complete, core implementation pending.

## Codebase Structure

```
turkey-escape-game/
├── index.html              # Main HTML entry point (Phaser 3.80+ CDN)
├── main.js                 # Game configuration and core logic
├── assets/                 # Game assets (sounds/sprites - to be added)
│   └── .keep
├── docs/                   # Design documentation
│   ├── gdd.md             # Game Design Document (v1.0)
│   ├── tech-specs.md      # Technical specifications
│   └── map-specs.json     # Map/level data structure
└── README.md              # Quick setup instructions
```

### File Purposes

- **index.html**: Minimal HTML file that loads Phaser 3.80+ from CDN and main.js
- **main.js**: Contains Phaser game config, scene lifecycle (preload, create, update)
- **docs/gdd.md**: Complete game design vision, mechanics, visuals, audio
- **docs/tech-specs.md**: Technical constants, function signatures, implementation guidance
- **docs/map-specs.json**: Level structure template (to be expanded)

## Key Technical Specifications

### Framework & Stack
- **Engine**: Phaser 3.80+ (Arcade Physics)
- **Rendering**: HTML5 Canvas
- **Deployment**: Static HTML/JS (open index.html in browser)
- **Physics**: Arcade physics with gravity

### Core Constants (from tech-specs.md)

```javascript
TILE_SIZE: 32          // Grid unit for maps
PLAYER_SPEED: 200      // Base forward movement (px/s)
JUMP_VEL: -280         // Y-axis jump velocity
GRAVITY: 380           // Physics gravity
LIVES_START: 3         // Starting health (max: 6)
```

### Color Palette (Monochrome B&W Comic Style)

```javascript
BG: #000000           // Black background
WALLS: #666666        // Gray walls
TURKEY: #FF4500       // Orange-red turkey (only color)
GRAYS: #222-#CCC      // Various gray tones
WHITE: #FFF           // White accents
```

### Scene Architecture

Currently single-scene prototype. Planned structure:
- **Boot Scene**: Initial setup
- **Preload Scene**: Asset loading
- **Game Scene**: Main gameplay with level manager

## Game Mechanics Implementation Guide

### Movement System
- **Always running forward**: Base speed 200px/s
- **Steering**: WASD/arrow keys for direction control
- **Jump**: Space bar/tap - hop over low walls/gaps
- **Visual jump effect**: Test both sprite enlarging AND/OR map shrinking

### Health System
- **Display**: 3 turkey-triangle icons at start
- **Damage states**:
  - Half damage: Icon fades to gray
  - Full damage: Icon becomes outline only
- **Max health**: Expandable to 5-6 via upgrades

### Hazards
- **Knives/Ovens**: Instant or full damage
- **Anomalies**: Half or full damage
- **Collision**: Immediate response required

### Powerups
- **Speed boost**: Fast mode (10s duration)
- **Slow-mo**: Slow motion effect (10s duration)
- **Random spawning**: Balanced distribution

### Map System
- **MVP**: 5 fixed maps
- **Tutorial**: First 3 maps linear/tutorial
- **Later maps**: Non-linear with anomaly revisits
- **Size**: Variable (e.g., 15x12 tiles for map 1)

## Development Workflows

### Setup & Testing
1. Open `index.html` in a modern browser
2. Test basic controls: WASD/arrows for movement, Space for jump
3. Check browser console for debug output (debug mode enabled in config)

### Adding New Features

1. **Consult documentation first**: Check `docs/gdd.md` and `docs/tech-specs.md`
2. **Follow the spec**: Implement functions listed in tech-specs.md:
   - `loadLevel(levelNum)`
   - `updatePlayer()`
   - `handleJump()`
   - `damageLife(amount)` // 0.5 or 1
3. **Maintain style**: Monochrome B&W comic aesthetic
4. **Test incrementally**: Verify each feature in browser

### Adding Assets

Assets go in `assets/` directory:
- `assets/sprites/` - Visual sprites
- `assets/sounds/` - Audio files (jump whoosh, damage gobble, collect jingle)
- `assets/music/` - BGM (hard techno-rock)

Update Phaser preload function to load new assets.

### Map Creation

Follow `docs/map-specs.json` structure:
```json
{
  "id": 1,
  "size": [width, height],
  "hazards": count,
  "powerups": count,
  "exits": [exit_ids],
  "layout": [[2D array of tile data]]
}
```

## Code Conventions

### JavaScript Style
- **ES6+**: Use modern JavaScript features
- **Phaser API**: Follow Phaser 3 best practices
- **Modularity**: Keep functions focused and reusable
- **Comments**: Document complex game logic

### Naming Conventions
- **Constants**: UPPER_SNAKE_CASE (e.g., `TILE_SIZE`, `PLAYER_SPEED`)
- **Functions**: camelCase (e.g., `loadLevel`, `updatePlayer`)
- **Variables**: camelCase (e.g., `playerSprite`, `currentLevel`)

### Physics & Collision
- Use Arcade Physics for all game objects
- Enable debug mode during development (already set in config)
- Clean collision detection for hazards/powerups

### Visual Effects
- **Screen shake**: Mild on damage
- **Flashes**: Subtle effect on events
- **Jump animation**: Test both sprite scaling and map shrinking approaches

## AI Assistant Guidelines

### When Implementing Features

1. **Reference docs first**: Always check `docs/gdd.md` and `docs/tech-specs.md`
2. **Follow the vision**: Maintain 90s Diablo grit + Half-Life anomalies aesthetic
3. **Preserve constants**: Use defined values from tech-specs.md
4. **Modular code**: Generate clean, modular JS for main.js
5. **Test-friendly**: Ensure features can be tested by opening index.html

### Code Generation Principles

- **Start simple**: Implement MVP features before advanced ones
- **Progressive enhancement**: Build on existing code incrementally
- **Comment key logic**: Explain non-obvious game mechanics
- **Phaser patterns**: Use Phaser scene lifecycle properly (preload → create → update)

### What to Preserve

- **Color scheme**: Strictly B&W with orange turkey (#FF4500)
- **Physics values**: Don't change GRAVITY, JUMP_VEL without good reason
- **Game feel**: Constant forward momentum is core to gameplay
- **Humor**: Turkey quips and taunts should be maintained

### What to Avoid

- **Over-engineering**: This is a browser game, keep it simple
- **Breaking physics**: Test jump mechanics thoroughly
- **Scope creep**: Focus on MVP (5 maps, core mechanics)
- **Asset bloat**: Optimize assets for web delivery

### Common Tasks

**Adding a new level:**
1. Create map data in `docs/map-specs.json`
2. Implement in `loadLevel(levelNum)` function
3. Test navigation and hazard placement

**Adding new hazard type:**
1. Define in GDD if not present
2. Add sprite/color definition
3. Implement collision detection
4. Add damage handling

**Adding powerup:**
1. Define visual representation
2. Implement collection logic
3. Add timed effect system
4. Test duration and interaction

**Adding audio:**
1. Place files in `assets/sounds/` or `assets/music/`
2. Load in preload() function
3. Trigger at appropriate game events
4. Balance volume levels

## Testing & Validation

### Manual Testing
1. **Movement**: WASD should steer continuously running turkey
2. **Jump**: Space should provide consistent hop (test over gaps/walls)
3. **Collision**: Hazards should damage, powerups should collect
4. **Health**: UI should update correctly (3 icons, gray/outline states)
5. **Performance**: Smooth 60fps in modern browsers

### Debug Mode
- Physics debug is enabled in main.js config
- Check console for Phaser warnings/errors
- Verify hitboxes align with sprites

### Browser Compatibility
- Primary: Chrome/Edge (Chromium)
- Secondary: Firefox, Safari
- Mobile: Consider touch controls (tap for jump)

## Project Roadmap (from GDD)

### MVP Phase (Current)
- [ ] Implement basic movement (constant forward + steering)
- [ ] Add jump mechanics
- [ ] Create 5 fixed maps (first 3 tutorial)
- [ ] Implement hazards (knives, ovens)
- [ ] Add powerups (speed boost, slow-mo)
- [ ] Build health system UI
- [ ] Add basic audio (jump, damage, collect)

### Post-MVP
- [ ] Multiverse portals system
- [ ] Non-linear map navigation
- [ ] Map revisit with anomalies
- [ ] Upgrade system (expand health to 5-6)
- [ ] Story/humor dialogue system
- [ ] Hard techno-rock BGM
- [ ] Visual polish (shakes, flashes)

## Quick Reference

### Running the Game
```bash
# Simple HTTP server (if needed)
python -m http.server 8000
# Or just open index.html in browser
```

### Key Files for AI to Read
1. `docs/gdd.md` - Game vision and mechanics
2. `docs/tech-specs.md` - Technical implementation guide
3. `main.js` - Current implementation
4. `docs/map-specs.json` - Level data structure

### Contact & Updates
- Last updated: November 19, 2025
- GDD version: 1.0 (November 18, 2025)
- Phaser version: 3.80+

---

**Note for AI Assistants**: This is a creative, fun project. Maintain the humor and personality while implementing solid game mechanics. When in doubt, reference the GDD and tech specs, and keep the implementation modular and testable.
