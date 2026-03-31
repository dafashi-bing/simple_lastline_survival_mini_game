# AGENTS.md - Last Line Survivor
## CRITICAL: WORKFLOW GUIDES FIRST - MUST FOLLOW THESE BEFORE ANYTHING ELSE

### 1. Plan and Implement Workflow
- **Before executing build/implement steps**: If a plan is created, SAVE THE PLAN into the `plans/` directory first.
- **When a feature is finished**:
  1. Run `npm run build` to ensure the code still compiles
  2. Update `docs/gdd.md` if there are any mechanism changes
  3. Update `docs/feature status.md`, marking the feature as "waiting for test"

### 2. Bug Fixing Workflow
When asked to fix a bug, ALWAYS follow this EXACT order:
1. **Analyze** - Read the relevant code and understand the full context of the issue
2. **Explain** - Describe what is causing the bug (root cause, not just symptoms)
3. **Fix** - Apply the minimal, targeted change that resolves the root cause
4. **Test** - Run `npm run build` to make sure the code can still build and compile

---

## Project Overview
This document provides guidelines for agentic coding assistants working in the Last Line Survivor repository.

## Build, Lint, and Test Commands

### Build Commands
- **Development Server**: `npm run dev` - Starts Vite dev server on port 8080
- **Production Build**: `npm run build` - Builds production bundle with terser minification

### Lint Commands
- No linting configured in this project

### Test Commands
- No testing framework configured in this project

## Code Style Guidelines

### Language & Module System
- **Language**: JavaScript (ES modules)
- **Module Type**: `"type": "module"` in package.json
- **Imports/Exports**: Use ES module syntax (`import`/`export`)

### Indentation & Formatting
- **Indentation**: 4 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Always use semicolons
- **Line Length**: No explicit limit, but keep readable

### Naming Conventions
- **Variables/Functions**: camelCase (e.g., `squadUnits`, `updateSquadPosition()`)
- **Classes**: PascalCase (e.g., `Game`, `Preloader`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `CONFIG.CANVAS_WIDTH`, `BOSS_SIZE`)
- **Private methods/properties**: No explicit convention, use camelCase
- **Scene files**: PascalCase (e.g., `Game.js`, `MainMenu.js`)

### Imports
- Import Phaser components directly: `import { Scene } from 'phaser';`
- Import config: `import { CONFIG } from '../config.js';`
- Keep imports at top of file
- Group related imports together

### Project Structure
```
src/
├── main.js                    # Entry point
└── game/
    ├── config.js              # Game constants (CONFIG object)
    ├── main.js                # Game setup
    └── scenes/
        ├── Boot.js
        ├── Preloader.js
        ├── MainMenu.js
        ├── Game.js            # Main game logic
        └── GameOver.js
```

### Configuration Constants
- All game constants go in `src/game/config.js`
- Export as a single `CONFIG` object with UPPER_SNAKE_CASE keys
- Group related constants together with comments

### Phaser Scene Patterns
- Extend Phaser `Scene` class
- Constructor calls `super('SceneName')`
- Use `create()` for setup, `update(time, delta)` for game loop
- Store game state as instance properties (`this.squadUnits`, `this.enemies`, etc.)

### Error Handling
- No explicit error handling convention established
- Use standard JavaScript error handling when needed

### Comments
- No strict comment policy
- Add comments for complex logic or non-obvious decisions
- Config constants can have inline comments explaining their purpose

### Game Object Patterns
- Track game objects in arrays: `this.squadUnits = []`, `this.enemies = []`
- Store original coordinates for pseudo-3D transform: `obj.originalX`, `obj.originalY`
- Use Phaser's built-in methods for game object management
- Clean up destroyed objects with `.destroy()` and remove from arrays

### Depth Management
- Use depth sorting for rendering order
- Track current depth with `this.currentDepth` (decrements for each new object)
- Helper method: `getNextDepth()` returns `this.currentDepth--`

### Pseudo-3D Transform
- All game objects have `originalX` and `originalY` properties
- Apply transform with `applyPseudo3DTransform(obj)` in `update()`
- Transform uses `CONFIG.PSEUDO3D_*` constants

### Key Files to Know
- `src/game/config.js` - All game balance constants
- `src/game/scenes/Game.js` - Main game logic (1158 lines)
- `package.json` - Project dependencies and scripts
- `vite/config.dev.mjs` / `vite/config.prod.mjs` - Build configuration

### Dependencies
- `phaser@^3.90.0` - Game framework
- `vite@^8.0.2` - Build tool
- `terser@^5.46.1` - Minification (dev dependency)

### Workflow Tips
- Run `npm run dev` during development
- Game runs at 720x1280 resolution (portrait orientation)
- Use `CONFIG.SHOW_DEBUG_PANEL` to toggle debug UI
- Access game state via scene instance properties
