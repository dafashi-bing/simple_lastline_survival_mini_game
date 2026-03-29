export const CONFIG = {
    CANVAS_WIDTH: 720,
    CANVAS_HEIGHT: 1280,
    LANES: 3,
    INITIAL_SQUAD_COUNT: 1,
    INITIAL_FIRE_RATE: 1500,
    MIN_FIRE_RATE: 300,
    FIRE_RATE_REDUCTION: 200,
    INITIAL_DAMAGE: 1,
    DAMAGE_INCREMENT: 1,
    INITIAL_SHIELD: 0,
    SHIELD_INCREMENT: 5,
    UNIT_SIZE: 30,
    ENEMY_SIZE: 30,
    WALL_WIDTH_RATIO: 0.8,
    WALL_HEIGHT: 80,
    WALL_GAP: 10,
    FRONT_WALL_Y: 640, // Middle of screen (1280 / 2)
    GROWTH_WALL_BASE_HP: 1,
    GROWTH_WALL_HP_SCALE_PER_SECOND: 2,
    POWER_WALL_BASE_HP: 1,
    POWER_WALL_HP_SCALE_PER_SECOND: 2,
    WALL_MOVE_SPEED: 50, // Walls move down at 50 pixels per second
    ENEMY_BASE_HP: 3,
    ENEMY_HP_SCALE_PER_15_SECONDS: 1,
    ENEMY_BASE_SPEED: 30,
    ENEMY_SPEED_SCALE_PER_SECOND: 0.5,
    PROJECTILE_SPEED: 600,
    PROJECTILE_SIZE: 5,
    WAVE_INTERVAL: 2000,
    MAX_UNITS_PER_LINE: 4,
    SHOW_DEBUG_PANEL: true,
    
    // Boss Configuration
    BOSS_SPAWN_INTERVAL: 30000, // 30 seconds
    BOSS_SIZE: 80, // Larger than normal enemies
    BOSS_BASE_HP: 50,
    BOSS_HP_SCALE_PER_30_SECONDS: 25,
    BOSS_BASE_SPEED: 20, // Slower than normal enemies
    BOSS_SPEED_SCALE_PER_SECOND: 0.3,
    BOSS_DAMAGE: 3, // How many units to remove on collision
    BOSS_REWARD_UNITS: 3, // How many units to gain on boss kill
    BOSS_REWARD_SHIELD: 5, // How much shield to gain on boss kill
};
