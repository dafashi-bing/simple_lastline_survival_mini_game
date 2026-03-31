import { Scene } from 'phaser';
import { CONFIG } from '../config.js';
import { DepthManager } from '../utils/DepthManager.js';
import { PowerUpManager } from '../utils/PowerUpManager.js';
import { UIManager } from '../managers/UIManager.js';
import { Pseudo3DManager } from '../managers/Pseudo3DManager.js';
import { SquadManager } from '../managers/SquadManager.js';
import { WallManager } from '../managers/WallManager.js';
import { EnemyManager } from '../managers/EnemyManager.js';
import { BossManager } from '../managers/BossManager.js';
import { ProjectileManager } from '../managers/ProjectileManager.js';

export class Game extends Scene
{
    constructor ()
    {
        super('Game');
        this.resetGameState();
    }

    resetGameState() {
        this.squadUnits = [];
        this.squadCount = CONFIG.INITIAL_SQUAD_COUNT;
        this.enemies = [];
        this.walls = [];
        this.projectiles = [];
        this.bosses = [];
        this.lastFireTime = 0;
        this.fireRate = CONFIG.INITIAL_FIRE_RATE;
        this.damage = CONFIG.INITIAL_DAMAGE;
        this.survivalTime = 0;
        this.shield = CONFIG.INITIAL_SHIELD;
        this.laneWidth = 0;
        this.squadX = CONFIG.CANVAS_WIDTH / 2;
        this.squadTargetX = CONFIG.CANVAS_WIDTH / 2;
        this.squadSpeed = CONFIG.SQUAD_SPEED;
        this.timers = [];
        this.destroyedWallsCount = { 0: 0, 2: 0 }; // Track per lane
        this.generatedWallsCount = { 0: 0, 2: 0 }; // Track per lane
        this.activeBoss = null;
        this.waveSpawnTimer = null;
        this.bossesSpawned = 0; // Track how many bosses have been spawned

        // Boss power-up state
        this.pierceCount = 0;
        this.aoeRadius = 0;
        this.pushbackStrength = 0;
        this.isPaused = false;
    }

    create ()
    {
        this.resetGameState();
        this.cameras.main.setBackgroundColor(0x000033);
        this.laneWidth = CONFIG.CANVAS_WIDTH / CONFIG.LANES;

        // Initialize managers
        this.depthManager = new DepthManager();
        this.powerUpManager = new PowerUpManager(this);
        this.uiManager = new UIManager(this);
        this.pseudo3DManager = new Pseudo3DManager(this);
        this.squadManager = new SquadManager(this);
        this.wallManager = new WallManager(this);
        this.enemyManager = new EnemyManager(this);
        this.bossManager = new BossManager(this);
        this.projectileManager = new ProjectileManager(this);

        // Create manager content
        this.uiManager.create();
        this.pseudo3DManager.create();
        this.squadManager.create();
        this.bossManager.create();

        // Input handling
        this.input.on('pointermove', (pointer) => {
            this.squadManager.moveSquad(pointer.x);
        });

        this.input.on('pointerdown', (pointer) => {
            this.squadManager.moveSquad(pointer.x);
        });

        this.spawnInitialContent();

        this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.survivalTime++;
                this.uiManager.updateTimeHUD();
            },
            loop: true
        });

        this.scheduleNextWave();

        this.time.addEvent({
            delay: 2000,
            callback: () => this.wallManager.spawnNewWalls(),
            loop: true
        });

        // Boss spawning timer - first at FIRST_BOSS_SPAWN_TIME, then every BOSS_SPAWN_INTERVAL
        this.time.addEvent({
            delay: CONFIG.FIRST_BOSS_SPAWN_TIME,
            callback: () => {
                this.bossManager.spawnBoss();
                // Start the repeating interval after first spawn
                this.time.addEvent({
                    delay: CONFIG.BOSS_SPAWN_INTERVAL,
                    callback: () => this.bossManager.spawnBoss(),
                    loop: true
                });
            },
            loop: false
        });
    }

    spawnInitialContent() {
        this.wallManager.spawnWallColumn(0, 'growth');
        this.enemyManager.spawnEnemyRow(1);
        this.wallManager.spawnWallColumn(2, 'power');
    }

    spawnWave() {
        this.enemyManager.spawnWave();
        this.scheduleNextWave();
    }

    scheduleNextWave() {
        const currentInterval = Math.max(
            CONFIG.WAVE_INTERVAL_MIN,
            CONFIG.WAVE_INTERVAL_BASE - this.survivalTime * CONFIG.WAVE_INTERVAL_REDUCTION_PER_SECOND
        );
        this.time.addEvent({
            delay: currentInterval,
            callback: () => this.spawnWave()
        });
    }

    gameOver() {
        this.scene.start('GameOver');
    }

    update(time, delta)
    {
        if (this.isPaused) {
            return;
        }

        this.squadManager.update(delta);
        this.projectileManager.fireProjectiles(time);
        this.projectileManager.update(delta);
        this.enemyManager.update(delta);
        this.bossManager.update(delta);
        this.wallManager.update(delta);
        this.pseudo3DManager.update();
        this.uiManager.updateDebugPanel();
    }
}
