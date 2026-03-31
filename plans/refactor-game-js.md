# Plan: Refactor Game.js into Modular Components

## 1. Directory Structure
We'll create the following new files and directories:
```
src/game/
├── managers/          # New directory for game managers
│   ├── SquadManager.js
│   ├── WallManager.js
│   ├── EnemyManager.js
│   ├── BossManager.js
│   ├── ProjectileManager.js
│   ├── UIManager.js
│   └── Pseudo3DManager.js
├── utils/             # New directory for utilities
│   ├── DepthManager.js
│   └── PowerUpManager.js
└── scenes/
    └── Game.js        # Refactored to use managers
```

## 2. Module Breakdown

### Managers
- **SquadManager**: Handles `createSquad`, `updateSquadPosition`, `moveSquad`
- **WallManager**: Handles wall spawning, updating, and column management
- **EnemyManager**: Handles enemy spawning and updating
- **BossManager**: Handles boss spawning, updating, HP bar, and reward dialogue
- **ProjectileManager**: Handles projectile firing and collision detection
- **UIManager**: Handles HUD, debug panel, and UI elements
- **Pseudo3DManager**: Handles pseudo-3D transforms and lane lines

### Utils
- **DepthManager**: Handles depth tracking (`getNextDepth`)
- **PowerUpManager**: Handles power-up application

## 3. Refactoring Strategy
1. Create each manager file with a class that takes the scene as a parameter
2. Move relevant methods and state properties to each manager
3. Update Game.js to instantiate and use these managers
4. Keep game state coordinated between managers through the scene instance

## 4. Files to Modify
- **src/game/scenes/Game.js**: Will be refactored to use managers
- **New files**: All the manager and utility files listed above
