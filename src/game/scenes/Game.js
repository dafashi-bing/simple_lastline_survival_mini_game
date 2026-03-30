import { Scene } from 'phaser';
import { CONFIG } from '../config.js';

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
        this.timers = [];
        this.destroyedWallsCount = { 0: 0, 2: 0 }; // Track per lane
        this.generatedWallsCount = { 0: 0, 2: 0 }; // Track per lane
        this.activeBoss = null;
        this.waveSpawnTimer = null;
        this.currentDepth = 1000; // Starting depth, decreases for each new object
        this.bossesSpawned = 0; // Track how many bosses have been spawned

        // Boss power-up state
        this.pierceCount = 0;
        this.aoeRadius = 0;
        this.pushbackStrength = 0;
        this.isPaused = false;
    }

    getNextDepth() {
        return this.currentDepth--;
    }

    applyPseudo3DTransform(obj) {
        const y = obj.originalY;
        const normalizedY = Phaser.Math.Clamp(y / CONFIG.CANVAS_HEIGHT, 0, 1);
        const scale = Phaser.Math.Linear(CONFIG.PSEUDO3D_MIN_SCALE, CONFIG.PSEUDO3D_MAX_SCALE, normalizedY);
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const offsetX = (obj.originalX - centerX) * (1 - (1 - scale) * CONFIG.PSEUDO3D_PERSPECTIVE_STRENGTH);
        
        obj.x = centerX + offsetX;
        obj.y = y;
        obj.setScale(scale);
    }

    create ()
    {
        this.resetGameState();
        this.cameras.main.setBackgroundColor(0x000033);
        this.laneWidth = CONFIG.CANVAS_WIDTH / CONFIG.LANES;
        this.laneLines = this.add.graphics();
        this.laneLines.setDepth(0);

        this.hudUnitCount = this.add.text(20, 20, `Units: ${this.squadCount}`, {
            fontFamily: 'Arial Black', fontSize: 24, color: '#00ffff',
            stroke: '#000000', strokeThickness: 4
        }).setDepth(2000);

        this.hudTime = this.add.text(CONFIG.CANVAS_WIDTH - 20, 20, 'Time: 0s', {
            fontFamily: 'Arial Black', fontSize: 24, color: '#ffffff',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(1, 0).setDepth(2000);

        this.hudShield = this.add.text(20, 60, `Shield: ${this.shield}`, {
            fontFamily: 'Arial Black', fontSize: 20, color: '#ffff00',
            stroke: '#000000', strokeThickness: 4
        }).setDepth(2000);

        // Boss HP Bar UI
        this.bossHpBarContainer = this.add.container(CONFIG.CANVAS_WIDTH / 2, 100).setDepth(2001);
        this.bossHpBarContainer.setVisible(false);

        const bossBarBg = this.add.rectangle(0, 0, 400, 40, 0x330000);
        bossBarBg.setStrokeStyle(3, 0xff0000);
        this.bossHpBarContainer.add(bossBarBg);

        this.bossHpBarFill = this.add.rectangle(-197, 0, 394, 34, 0xff0000);
        this.bossHpBarFill.setOrigin(0, 0.5);
        this.bossHpBarContainer.add(this.bossHpBarFill);

        this.bossHpBarText = this.add.text(0, 0, 'BOSS', {
            fontFamily: 'Arial Black', fontSize: 16, color: '#ffffff',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);
        this.bossHpBarContainer.add(this.bossHpBarText);

        // Boss Reward Dialogue UI
        this.createBossRewardDialogue();

        if (CONFIG.SHOW_DEBUG_PANEL) {
            this.createDebugPanel();
        }

        this.createSquad();

        this.input.on('pointermove', (pointer) => {
            this.moveSquad(pointer.x);
        });

        this.input.on('pointerdown', (pointer) => {
            this.moveSquad(pointer.x);
        });

        this.spawnInitialContent();

        this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.survivalTime++;
                this.hudTime.setText(`Time: ${this.survivalTime}s`);
            },
            loop: true
        });

        this.scheduleNextWave();

        this.time.addEvent({
            delay: 2000,
            callback: () => this.spawnNewWalls(),
            loop: true
        });

        // Boss spawning timer - first at FIRST_BOSS_SPAWN_TIME, then every BOSS_SPAWN_INTERVAL
        this.time.addEvent({
            delay: CONFIG.FIRST_BOSS_SPAWN_TIME,
            callback: () => {
                this.spawnBoss();
                // Start the repeating interval after first spawn
                this.time.addEvent({
                    delay: CONFIG.BOSS_SPAWN_INTERVAL,
                    callback: () => this.spawnBoss(),
                    loop: true
                });
            },
            loop: false
        });
    }

    createDebugPanel() {
        this.debugPanel = this.add.container(10, 100);
        this.debugPanel.setDepth(2500);

        const bg = this.add.rectangle(0, 0, 280, 440, 0x000000, 0.7);
        bg.setOrigin(0, 0);
        this.debugPanel.add(bg);

        let yOffset = 10;

        const title = this.add.text(10, yOffset, 'DEBUG INFO', {
            fontFamily: 'Arial Black', fontSize: 16, color: '#ffffff'
        });
        this.debugPanel.add(title);
        yOffset += 25;

        this.debugSquadInfo = this.add.text(10, yOffset, '', {
            fontFamily: 'Arial', fontSize: 12, color: '#00ffff'
        });
        this.debugPanel.add(this.debugSquadInfo);
        yOffset += 60;

        this.debugWallInfo = this.add.text(10, yOffset, '', {
            fontFamily: 'Arial', fontSize: 12, color: '#00ff00'
        });
        this.debugPanel.add(this.debugWallInfo);
        yOffset += 80;

        this.debugEnemyInfo = this.add.text(10, yOffset, '', {
            fontFamily: 'Arial', fontSize: 12, color: '#ff4444'
        });
        this.debugPanel.add(this.debugEnemyInfo);
        yOffset += 40;

        this.debugBossInfo = this.add.text(10, yOffset, '', {
            fontFamily: 'Arial', fontSize: 12, color: '#ff00ff'
        });
        this.debugPanel.add(this.debugBossInfo);
        yOffset += 40;

        this.debugPowerupInfo = this.add.text(10, yOffset, '', {
            fontFamily: 'Arial', fontSize: 12, color: '#ffff00'
        });
        this.debugPanel.add(this.debugPowerupInfo);
    }

    updateDebugPanel() {
        if (!CONFIG.SHOW_DEBUG_PANEL) return;

        this.debugSquadInfo.setText(
            `Squad:\n` +
            `  Count: ${this.squadCount}\n` +
            `  Fire Rate: ${this.fireRate}ms\n` +
            `  Damage: ${this.damage}`
        );

        const growthWalls = this.walls.filter(w => w.type === 'growth');
        const powerWalls = this.walls.filter(w => w.type === 'power');
        this.debugWallInfo.setText(
            `Walls:\n` +
            `  Growth: ${growthWalls.length}\n` +
            `  Front Growth HP: ${growthWalls.length ? growthWalls.sort((a,b)=>b.y-a.y)[0].hp : 'N/A'}\n` +
            `  Growth Destroyed: ${this.destroyedWallsCount[0]}\n` +
            `  Power: ${powerWalls.length}\n` +
            `  Front Power HP: ${powerWalls.length ? powerWalls.sort((a,b)=>b.y-a.y)[0].hp : 'N/A'}\n` +
            `  Power Destroyed: ${this.destroyedWallsCount[2]}`
        );

        this.debugEnemyInfo.setText(
            `Enemies:\n` +
            `  Count: ${this.enemies.length}\n` +
            `  Front HP: ${this.enemies.length ? Math.min(...this.enemies.map(e => e.hp)) : 'N/A'}`
        );

        this.debugBossInfo.setText(
            `Bosses:\n` +
            `  Count: ${this.bosses.length}\n` +
            `  Active HP: ${this.activeBoss ? `${this.activeBoss.hp}/${this.activeBoss.maxHp}` : 'N/A'}`
        );

        this.debugPowerupInfo.setText(
            `Boss Power-Ups:\n` +
            `  Pierce: ${this.pierceCount}\n` +
            `  AOE Radius: ${this.aoeRadius}\n` +
            `  Pushback: ${this.pushbackStrength}`
        );
    }

    createSquad() {
        this.squadUnits.forEach(unit => unit.destroy());
        this.squadUnits = [];

        const startY = CONFIG.CANVAS_HEIGHT - 100;
        const maxPerRow = CONFIG.MAX_UNITS_PER_LINE;
        let row = 0, col = 0;

        for (let i = 0; i < this.squadCount; i++) {
            const unit = this.add.circle(0, 0, CONFIG.UNIT_SIZE / 2, 0x00ffff);
            unit.setStrokeStyle(2, 0x0088aa);
            unit.setDepth(this.getNextDepth());
            unit.originalX = 0;
            unit.originalY = 0;
            this.squadUnits.push(unit);

            col++;
            if (col >= maxPerRow) {
                col = 0;
                row++;
            }
        }

        this.updateSquadPosition(this.squadX);
    }

    updateSquadPosition(x) {
        const totalUnits = this.squadUnits.length;
        let s = Math.ceil(Math.sqrt(totalUnits));
        const maxPerRow = Math.min(s, CONFIG.MAX_UNITS_PER_LINE);
        const startY = CONFIG.CANVAS_HEIGHT - 100;
        let row = 0, col = 0;

        this.squadUnits.forEach((unit) => {
            const offsetX = (col - (maxPerRow - 1) / 2) * CONFIG.SQUAD_UNIT_SPACING;
            const offsetY = -row * CONFIG.SQUAD_UNIT_ROW_SPACING;
            unit.originalX = x + offsetX;
            unit.originalY = startY + offsetY;

            col++;
            if (col >= maxPerRow) {
                col = 0;
                row++;
            }
        });
    }

    moveSquad(x) {
        this.squadX = Phaser.Math.Clamp(x, this.laneWidth / 2, CONFIG.CANVAS_WIDTH - this.laneWidth / 2);
        this.updateSquadPosition(this.squadX);
    }

    spawnInitialContent() {
        this.spawnWallColumn(0, 'growth');
        this.spawnEnemyRow(1);
        this.spawnWallColumn(2, 'power');
    }

    spawnWall(laneIndex, type, powerType = null, y = null) {
        const x = this.laneWidth * laneIndex + this.laneWidth / 2;
        const wallY = y !== null ? y : -100;
        const width = this.laneWidth * CONFIG.WALL_WIDTH_RATIO;
        const height = CONFIG.WALL_HEIGHT;

        const baseHp = type === 'growth' ? CONFIG.GROWTH_WALL_BASE_HP : CONFIG.POWER_WALL_BASE_HP;
        const scalePerSecond = type === 'growth' ? CONFIG.GROWTH_WALL_HP_SCALE_PER_SECOND : CONFIG.POWER_WALL_HP_SCALE_PER_SECOND;
        const destroyedCount = this.destroyedWallsCount[laneIndex];
        const generatedCount = this.generatedWallsCount[laneIndex];
        const hp = baseHp + scalePerSecond * Math.pow(this.survivalTime, 1.5) + CONFIG.WALL_DESTROYED_COUNT_FACTOR * destroyedCount + CONFIG.WALL_GENERATED_COUNT_FACTOR * generatedCount;

        const wallDepth = this.getNextDepth();
        const wall = this.add.rectangle(x, wallY, width, height, type === 'growth' ? 0x00ff00 : 0xffff00);
        wall.setStrokeStyle(3, type === 'growth' ? 0x008800 : 0x888800);
        wall.setDepth(wallDepth);
        wall.originalX = x;
        wall.originalY = wallY;
        wall.hp = hp;
        wall.type = type;
        wall.lane = laneIndex;
        wall.powerType = powerType;
        wall.label = null;
        wall.hpLabel = null;

        let labelText = '+1';
        if (type === 'power') {
            switch(powerType) {
                case 'fireRate':
                    labelText = 'FIRERATE';
                    break;
                case 'damage':
                    labelText = 'DAMAGE';
                    break;
                case 'shield':
                    labelText = 'SHIELD';
                    break;
            }
        }

        wall.label = this.add.text(x, wallY, labelText, {
            fontFamily: 'Arial Black', fontSize: 18, color: '#000000'
        }).setOrigin(0.5);
        wall.label.setDepth(wallDepth + 1);
        wall.label.originalX = x;
        wall.label.originalY = wallY;

        if (CONFIG.SHOW_DEBUG_PANEL) {
            wall.hpLabel = this.add.text(x, wallY + height / 2 + 15, `${wall.hp}`, {
                fontFamily: 'Arial Black', fontSize: 14, color: '#ffffff',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(100);
            wall.hpLabel.originalX = x;
            wall.hpLabel.originalY = wallY + height / 2 + 15;
        }

        this.walls.push(wall);
        this.generatedWallsCount[laneIndex]++;
        return wall;
    }

    spawnWallColumn(laneIndex, type) {
        const laneTop = 0;
        let currentY = CONFIG.FRONT_WALL_Y;
        const maxY = CONFIG.CANVAS_HEIGHT / 2;

        while (currentY > laneTop) {
            const powerType = type === 'power' ? Phaser.Utils.Array.GetRandom(['fireRate', 'damage', 'shield']) : null;
            this.spawnWall(laneIndex, type, powerType, currentY);
            currentY -= (CONFIG.WALL_HEIGHT + CONFIG.WALL_GAP);
        }
    }

    spawnEnemy(laneIndex, xOffset = 0) {
        const x = this.laneWidth * laneIndex + this.laneWidth / 2 + xOffset;
        const y = -50;

        const enemyDepth = this.getNextDepth();
        const enemy = this.add.circle(x, y, CONFIG.ENEMY_SIZE / 2, 0xff4444);
        enemy.setStrokeStyle(2, 0x880000);
        enemy.setDepth(enemyDepth);
        enemy.originalX = x;
        enemy.originalY = y;
        enemy.hp = CONFIG.ENEMY_BASE_HP + Math.floor(this.survivalTime / 15) * CONFIG.ENEMY_HP_SCALE_PER_15_SECONDS;
        enemy.lane = laneIndex;
        enemy.speed = CONFIG.ENEMY_BASE_SPEED + this.survivalTime * CONFIG.ENEMY_SPEED_SCALE_PER_SECOND;
        enemy.hpLabel = null;
        enemy.lastAttackTime = 0;
        enemy.isAttacking = false;

        if (CONFIG.SHOW_DEBUG_PANEL) {
            enemy.hpLabel = this.add.text(x, y + CONFIG.ENEMY_SIZE / 2 + 10, `${enemy.hp}`, {
                fontFamily: 'Arial Black', fontSize: 12, color: '#ffffff',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(100);
            enemy.hpLabel.originalX = x;
            enemy.hpLabel.originalY = y + CONFIG.ENEMY_SIZE / 2 + 10;
        }

        this.enemies.push(enemy);
    }

    spawnEnemyRow(laneIndex) {
        const enemySize = CONFIG.ENEMY_SIZE;
        const gap = 5;
        const availableWidth = this.laneWidth - enemySize;
        const maxEnemies = Math.floor(availableWidth / (enemySize + gap)) + 1;
        const enemyCount = Math.min(maxEnemies, 6 + Math.floor(this.survivalTime / 10));

        const totalRowWidth = enemyCount * enemySize + (enemyCount - 1) * gap;
        const startX = -totalRowWidth / 2 + enemySize / 2;

        for (let i = 0; i < enemyCount; i++) {
            const xOffset = startX + i * (enemySize + gap);
            this.spawnEnemy(laneIndex, xOffset);
        }
    }

    spawnWave() {
        this.spawnEnemyRow(1);
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

    spawnBoss() {
        const laneIndex = 1;
        const x = this.laneWidth * laneIndex + this.laneWidth / 2;
        const y = -100;

        const bossDepth = this.getNextDepth();
        const boss = this.add.circle(x, y, CONFIG.BOSS_SIZE / 2, 0xaa00aa);
        boss.setStrokeStyle(4, 0xff00ff);
        boss.setFillStyle(0xaa00aa, 1);
        boss.setDepth(bossDepth);
        boss.originalX = x;
        boss.originalY = y;
        boss.maxHp = Math.floor(CONFIG.BOSS_BASE_HP * Math.pow(CONFIG.BOSS_HP_SCALE_FACTOR_PER_BOSS, this.bossesSpawned));
        boss.hp = boss.maxHp;
        boss.lane = laneIndex;
        boss.speed = CONFIG.ENEMY_BASE_SPEED + this.survivalTime * CONFIG.ENEMY_SPEED_SCALE_PER_SECOND;
        boss.hpLabel = null;
        boss.lastAttackTime = 0;
        boss.isAttacking = false;

        if (CONFIG.SHOW_DEBUG_PANEL) {
            boss.hpLabel = this.add.text(x, y + CONFIG.BOSS_SIZE / 2 + 15, `${boss.hp}`, {
                fontFamily: 'Arial Black', fontSize: 16, color: '#ffffff',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(100);
            boss.hpLabel.originalX = x;
            boss.hpLabel.originalY = y + CONFIG.BOSS_SIZE / 2 + 15;
        }

        this.bosses.push(boss);
        this.activeBoss = boss;
        this.bossesSpawned++;
        this.showBossHpBar();
    }

    showBossHpBar() {
        if (!this.activeBoss) return;
        this.bossHpBarContainer.setVisible(true);
        this.updateBossHpBar();
    }

    hideBossHpBar() {
        this.bossHpBarContainer.setVisible(false);
    }

    updateBossHpBar() {
        if (!this.activeBoss) return;
        const hpPercent = Math.max(0, this.activeBoss.hp / this.activeBoss.maxHp);
        this.bossHpBarFill.width = 394 * hpPercent;
        this.bossHpBarText.setText(`BOSS - ${this.activeBoss.hp}/${this.activeBoss.maxHp}`);
    }

    fireProjectiles(time) {
        if (time - this.lastFireTime < this.fireRate) return;
        this.lastFireTime = time;

        this.squadUnits.forEach(unit => {
            const projectile = this.add.circle(unit.originalX, unit.originalY - 20, CONFIG.PROJECTILE_SIZE, 0x00ffff);
            projectile.setDepth(this.getNextDepth());
            projectile.originalX = unit.originalX;
            projectile.originalY = unit.originalY - 20;
            projectile.speed = CONFIG.PROJECTILE_SPEED;
            projectile.damage = this.damage;
            projectile.pierceCount = this.pierceCount;
            projectile.aoeRadius = this.aoeRadius;
            projectile.pushbackStrength = this.pushbackStrength;
            projectile.hitTargets = new Set();
            projectile.totalHits = 0;
            this.projectiles.push(projectile);
        });
    }

    updateProjectiles(delta) {
        const destroyedWallsThisFrame = { 0: new Set(), 2: new Set() }; // Use Set to prevent duplicates

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.originalY -= proj.speed * delta / 1000;

            if (proj.originalY < -50) {
                proj.destroy();
                this.projectiles.splice(i, 1);
                continue;
            }

            // Initialize totalHits on projectile if not already present
            if (proj.totalHits === undefined) {
                proj.totalHits = 0;
            }
            const maxHits = proj.pierceCount + 1;
            let hitThisFrame = false;
            let firstHitTarget = null;
            let firstHitType = null;

            // Check wall collisions first (only hit one per frame)
            if (!hitThisFrame && proj.totalHits < maxHits) {
                for (let j = this.walls.length - 1; j >= 0; j--) {
                    const wall = this.walls[j];
                    if (proj.hitTargets.has(wall)) continue;

                    const projBounds = new Phaser.Geom.Rectangle(
                        proj.originalX - CONFIG.PROJECTILE_SIZE,
                        proj.originalY - CONFIG.PROJECTILE_SIZE,
                        CONFIG.PROJECTILE_SIZE * 2,
                        CONFIG.PROJECTILE_SIZE * 2
                    );
                    const wallBounds = new Phaser.Geom.Rectangle(
                        wall.originalX - (this.laneWidth * CONFIG.WALL_WIDTH_RATIO) / 2,
                        wall.originalY - CONFIG.WALL_HEIGHT / 2,
                        this.laneWidth * CONFIG.WALL_WIDTH_RATIO,
                        CONFIG.WALL_HEIGHT
                    );

                    if (Phaser.Geom.Intersects.RectangleToRectangle(projBounds, wallBounds)) {
                        wall.hp -= proj.damage;
                        proj.hitTargets.add(wall);
                        proj.totalHits++;
                        hitThisFrame = true;
                        firstHitTarget = wall;
                        firstHitType = 'wall';

                        if (wall.hp <= 0) {
                            destroyedWallsThisFrame[wall.lane].add(wall);
                        }
                        break; // Only hit one wall per frame
                    }
                }
            }

            // Check enemy collisions if not hit yet
            if (!hitThisFrame && proj.totalHits < maxHits) {
                const projLane = Math.floor(proj.originalX / this.laneWidth);
                const hitEnemies = [];

                // Collect all unhit enemies in the lane that are colliding
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                    const enemy = this.enemies[j];
                    if (proj.hitTargets.has(enemy)) continue;
                    if (enemy.lane !== projLane) continue;

                    if (Phaser.Geom.Intersects.CircleToCircle(
                        { x: proj.originalX, y: proj.originalY, radius: CONFIG.PROJECTILE_SIZE },
                        { x: enemy.originalX, y: enemy.originalY, radius: CONFIG.ENEMY_SIZE / 2 }
                    )) {
                        hitEnemies.push(enemy);
                    }
                }

                // Sort hit enemies top to bottom (since projectile moves up)
                hitEnemies.sort((a, b) => a.originalY - b.originalY);

                if (hitEnemies.length > 0) {
                    const enemy = hitEnemies[0]; // Only hit first enemy per frame
                    enemy.hp -= proj.damage;
                    proj.hitTargets.add(enemy);
                    proj.totalHits++;
                    hitThisFrame = true;
                    firstHitTarget = enemy;
                    firstHitType = 'enemy';

                    if (enemy.hp <= 0) {
                        if (enemy.hpLabel) enemy.hpLabel.destroy();
                        enemy.destroy();
                        const idx = this.enemies.indexOf(enemy);
                        if (idx !== -1) {
                            this.enemies.splice(idx, 1);
                        }
                    }

                    // Apply pushback to this enemy
                    if (proj.pushbackStrength > 0 && this.enemies.includes(enemy)) {
                        enemy.originalY -= proj.pushbackStrength;
                    }

                    // Apply AOE
                    if (proj.aoeRadius > 0) {
                        const centerX = proj.originalX;
                        const centerY = proj.originalY;

                        for (let j = this.enemies.length - 1; j >= 0; j--) {
                            const aoeEnemy = this.enemies[j];
                            if (proj.hitTargets.has(aoeEnemy)) continue;

                            const dist = Phaser.Math.Distance.Between(centerX, centerY, aoeEnemy.originalX, aoeEnemy.originalY);
                            if (dist <= proj.aoeRadius) {
                                aoeEnemy.hp -= proj.damage;
                                if (aoeEnemy.hp <= 0) {
                                    if (aoeEnemy.hpLabel) aoeEnemy.hpLabel.destroy();
                                    aoeEnemy.destroy();
                                    this.enemies.splice(j, 1);
                                }
                            }
                        }
                    }
                }
            }

            // Check boss collision (always stops projectile)
            if (!hitThisFrame && proj.totalHits < maxHits) {
                for (let j = this.bosses.length - 1; j >= 0; j--) {
                    const boss = this.bosses[j];
                    if (proj.hitTargets.has(boss)) continue;

                    if (Phaser.Geom.Intersects.CircleToCircle(
                        { x: proj.originalX, y: proj.originalY, radius: CONFIG.PROJECTILE_SIZE },
                        { x: boss.originalX, y: boss.originalY, radius: CONFIG.BOSS_SIZE / 2 }
                    )) {
                        boss.hp -= proj.damage;
                        proj.hitTargets.add(boss);
                        proj.totalHits = maxHits; // Exhaust all hits
                        hitThisFrame = true;
                        this.updateBossHpBar();

                        if (boss.hp <= 0) {
                            this.onBossDeath(boss, j);
                        }
                        break;
                    }
                }
            }

            // Destroy projectile if we've hit max hits
            if (proj.totalHits >= maxHits) {
                proj.destroy();
                this.projectiles.splice(i, 1);
            }
        }

        // Now process all destroyed walls per lane
        [0, 2].forEach(laneIndex => {
            const walls = Array.from(destroyedWallsThisFrame[laneIndex]); // Convert Set to Array
            if (walls.length === 0) return;

            walls.forEach(wall => {
                // Apply wall effect
                if (wall.type === 'growth') {
                    this.squadCount++;
                    this.createSquad();
                    this.hudUnitCount.setText(`Units: ${this.squadCount}`);
                } else if (wall.type === 'power') {
                    this.applyPower(wall.powerType);
                }

                // Remove wall from arrays and destroy
                const idx = this.walls.indexOf(wall);
                if (idx !== -1) {
                    this.walls.splice(idx, 1);
                }
                if (wall.label) wall.label.destroy();
                if (wall.hpLabel) wall.hpLabel.destroy();
                wall.destroy();

                this.destroyedWallsCount[laneIndex]++;
            });
        });
    }

    pushWallColumnForward(laneIndex, type, count = 1) {
        const laneWalls = this.walls.filter(w => w.lane === laneIndex);
        laneWalls.sort((a, b) => b.originalY - a.originalY);

        const distance = (CONFIG.WALL_HEIGHT + CONFIG.WALL_GAP) * count;

        const tweenTargets = laneWalls.map(wall => ({ 
            wall, 
            label: wall.label, 
            hpLabel: wall.hpLabel 
        }));

        this.tweens.addCounter({
            from: 0,
            to: distance,
            duration: 200,
            ease: 'Power2',
            onUpdate: (tween) => {
                const value = tween.getValue();
                tweenTargets.forEach(({ wall, label, hpLabel }) => {
                    wall.originalY = wall.originalY + (value - (wall._tweenPrevValue || 0));
                    if (label) label.originalY = label.originalY + (value - (wall._tweenPrevValue || 0));
                    if (hpLabel) hpLabel.originalY = hpLabel.originalY + (value - (wall._tweenPrevValue || 0));
                    wall._tweenPrevValue = value;
                });
            },
            onComplete: () => {
                tweenTargets.forEach(({ wall }) => {
                    delete wall._tweenPrevValue;
                });
                this.addWallsToTop(laneIndex, type, count);
            }
        });
    }

    addWallsToTop(laneIndex, type, count) {
        let currentTopWall = this.walls
            .filter(w => w.lane === laneIndex)
            .sort((a, b) => a.y - b.y)[0];

        let newY = currentTopWall 
            ? currentTopWall.y - (CONFIG.WALL_HEIGHT + CONFIG.WALL_GAP) 
            : CONFIG.FRONT_WALL_Y - (CONFIG.WALL_HEIGHT + CONFIG.WALL_GAP);

        for (let i = 0; i < count; i++) {
            const powerType = type === 'power' ? Phaser.Utils.Array.GetRandom(['fireRate', 'damage', 'shield']) : null;
            this.spawnWall(laneIndex, type, powerType, newY);
            newY -= (CONFIG.WALL_HEIGHT + CONFIG.WALL_GAP);
        }
    }

    applyPower(type) {
        switch(type) {
            case 'fireRate':
                this.fireRate = Math.max(CONFIG.MIN_FIRE_RATE, this.fireRate * (1 - CONFIG.FIRE_RATE_BUFF));
                break;
            case 'damage':
                this.damage += CONFIG.DAMAGE_INCREMENT;
                break;
            case 'shield':
                this.shield += CONFIG.SHIELD_INCREMENT;
                this.hudShield.setText(`Shield: ${this.shield}`);
                break;
        }
    }

    updateEnemies(delta) {
        const currentTime = this.time.now;
        const squadY = CONFIG.CANVAS_HEIGHT - 100;

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            // Check if enemy is attacking or should move
            if (!enemy.isAttacking) {
                enemy.originalY += enemy.speed * delta / 1000;
            }

            // Check if enemy reached squad and should start attacking
            if (!enemy.isAttacking && enemy.originalY > squadY - 50) {
                enemy.isAttacking = true;
                enemy.originalY = squadY - 50; // Clamp position
            }

            // Handle attacking logic
            if (enemy.isAttacking) {
                if (currentTime - enemy.lastAttackTime >= CONFIG.ENEMY_ATTACK_INTERVAL) {
                    enemy.lastAttackTime = currentTime;
                    // Deal damage
                    if (this.shield > 0) {
                        this.shield--;
                        this.hudShield.setText(`Shield: ${this.shield}`);
                    } else {
                        this.squadCount--;
                        this.hudUnitCount.setText(`Units: ${this.squadCount}`);
                        if (this.squadCount <= 0) {
                            this.gameOver();
                            return;
                        }
                        this.createSquad();
                    }
                }
            }

            if (enemy.hpLabel) {
                enemy.hpLabel.originalX = enemy.originalX;
                enemy.hpLabel.originalY = enemy.originalY + CONFIG.ENEMY_SIZE / 2 + 10;
                enemy.hpLabel.setText(`${enemy.hp}`);
            }

            // Clean up enemies that go way off screen (only if not attacking)
            if (!enemy.isAttacking && enemy.originalY > CONFIG.CANVAS_HEIGHT + 50) {
                if (enemy.hpLabel) enemy.hpLabel.destroy();
                enemy.destroy();
                this.enemies.splice(i, 1);
            }
        }
    }

    onBossDeath(boss, index) {
        // Clean up boss
        if (boss.hpLabel) boss.hpLabel.destroy();
        boss.destroy();
        this.bosses.splice(index, 1);

        // Clear active boss and hide HP bar
        if (this.activeBoss === boss) {
            this.activeBoss = this.bosses.length > 0 ? this.bosses[0] : null;
            if (this.activeBoss) {
                this.showBossHpBar();
            } else {
                this.hideBossHpBar();
            }
        }

        // Show boss reward dialogue
        this.showBossRewardDialogue();
    }

    updateBosses(delta) {
        const currentTime = this.time.now;
        const squadY = CONFIG.CANVAS_HEIGHT - 100;

        for (let i = this.bosses.length - 1; i >= 0; i--) {
            const boss = this.bosses[i];

            // Check if boss is attacking or should move
            if (!boss.isAttacking) {
                boss.originalY += boss.speed * delta / 1000;
            }

            // Check if boss reached squad and should start attacking
            if (!boss.isAttacking && boss.originalY > squadY - 50) {
                boss.isAttacking = true;
                boss.originalY = squadY - 50; // Clamp position
            }

            // Handle attacking logic
            if (boss.isAttacking) {
                if (currentTime - boss.lastAttackTime >= CONFIG.BOSS_ATTACK_INTERVAL) {
                    boss.lastAttackTime = currentTime;
                    // Deal boss damage
                    let damageToDeal = CONFIG.BOSS_DAMAGE;
                    while (damageToDeal > 0 && (this.shield > 0 || this.squadCount > 0)) {
                        if (this.shield > 0) {
                            this.shield--;
                        } else {
                            this.squadCount--;
                        }
                        damageToDeal--;
                    }
                    this.hudShield.setText(`Shield: ${this.shield}`);
                    this.hudUnitCount.setText(`Units: ${this.squadCount}`);
                    
                    if (this.squadCount <= 0) {
                        this.gameOver();
                        return;
                    }
                    this.createSquad();
                }
            }

            if (boss.hpLabel) {
                boss.hpLabel.originalX = boss.originalX;
                boss.hpLabel.originalY = boss.originalY + CONFIG.BOSS_SIZE / 2 + 15;
                boss.hpLabel.setText(`${boss.hp}`);
            }

            // Clean up bosses that go way off screen (only if not attacking)
            if (!boss.isAttacking && boss.originalY > CONFIG.CANVAS_HEIGHT + 100) {
                if (boss.hpLabel) boss.hpLabel.destroy();
                boss.destroy();
                this.bosses.splice(i, 1);

                // Clear active boss and hide HP bar
                if (this.activeBoss === boss) {
                    this.activeBoss = this.bosses.length > 0 ? this.bosses[0] : null;
                    if (this.activeBoss) {
                        this.showBossHpBar();
                    } else {
                        this.hideBossHpBar();
                    }
                }
            }
        }
    }

    gameOver() {
        this.scene.start('GameOver');
    }

    createBossRewardDialogue() {
        this.bossRewardDialogue = this.add.container(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2).setDepth(3000);
        this.bossRewardDialogue.setVisible(false);

        const overlay = this.add.rectangle(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT, 0x000000, 0.8);
        overlay.setOrigin(0.5);
        this.bossRewardDialogue.add(overlay);

        const dialogueBg = this.add.rectangle(0, 0, 600, 700, 0x1a1a2e);
        dialogueBg.setStrokeStyle(4, 0xff00ff);
        this.bossRewardDialogue.add(dialogueBg);

        const title = this.add.text(0, -280, 'BOSS DEFEATED!', {
            fontFamily: 'Arial Black', fontSize: 36, color: '#ff00ff',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);
        this.bossRewardDialogue.add(title);

        const subtitle = this.add.text(0, -230, 'Choose Your Power-Up', {
            fontFamily: 'Arial Black', fontSize: 24, color: '#ffffff',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);
        this.bossRewardDialogue.add(subtitle);

        this.powerupButtons = [];
        const buttonYPositions = [-120, 60, 240];

        for (let i = 0; i < 3; i++) {
            const button = this.createPowerupButton(0, buttonYPositions[i], i);
            this.powerupButtons.push(button);
            this.bossRewardDialogue.add(button.container);
        }
    }

    createPowerupButton(x, y, index) {
        const container = this.add.container(x, y);
        
        const bg = this.add.rectangle(0, 0, 500, 140, 0x2d2d44);
        bg.setStrokeStyle(3, 0x6666ff);
        bg.setInteractive();
        container.add(bg);

        const nameText = this.add.text(0, -30, '', {
            fontFamily: 'Arial Black', fontSize: 24, color: '#00ffff',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);
        container.add(nameText);

        const descText = this.add.text(0, 20, '', {
            fontFamily: 'Arial', fontSize: 16, color: '#cccccc',
            stroke: '#000000', strokeThickness: 1,
            wordWrap: { width: 460 }
        }).setOrigin(0.5);
        container.add(descText);

        bg.on('pointerover', () => {
            bg.setFillStyle(0x3d3d54);
            bg.setStrokeStyle(3, 0x00ffff);
        });

        bg.on('pointerout', () => {
            bg.setFillStyle(0x2d2d44);
            bg.setStrokeStyle(3, 0x6666ff);
        });

        bg.on('pointerdown', () => {
            this.selectPowerup(index);
        });

        return { container, bg, nameText, descText, powerupType: null };
    }

    showBossRewardDialogue() {
        this.isPaused = true;
        
        const allPowerups = [
            { type: 'piercingShot', name: 'Piercing Shot', desc: `Projectiles pierce through +${CONFIG.BOSS_POWERUP_PIERCE_INCREMENT} enemy` },
            { type: 'explosiveShot', name: 'Explosive Shot', desc: `Projectiles have AOE damage with +${CONFIG.BOSS_POWERUP_AOE_INCREMENT} radius` },
            { type: 'pushbackShot', name: 'Push Back Shot', desc: `Enemies hit are pushed back -${CONFIG.BOSS_POWERUP_PUSHBACK_INCREMENT} pixels` },
            { type: 'missileSupport', name: 'Missile Support', desc: 'Clear the screen with a flashing effect!' }
        ];

        const shuffled = Phaser.Utils.Array.Shuffle([...allPowerups]);
        const selectedPowerups = shuffled.slice(0, 3);

        this.powerupButtons.forEach((button, index) => {
            const powerup = selectedPowerups[index];
            button.powerupType = powerup.type;
            button.nameText.setText(powerup.name);
            button.descText.setText(powerup.desc);
        });

        this.bossRewardDialogue.setVisible(true);
    }

    hideBossRewardDialogue() {
        this.bossRewardDialogue.setVisible(false);
        this.isPaused = false;
    }

    selectPowerup(index) {
        const powerupType = this.powerupButtons[index].powerupType;
        this.applyBossPowerup(powerupType);
        this.hideBossRewardDialogue();
    }

    applyBossPowerup(type) {
        switch(type) {
            case 'piercingShot':
                this.pierceCount += CONFIG.BOSS_POWERUP_PIERCE_INCREMENT;
                break;
            case 'explosiveShot':
                this.aoeRadius += CONFIG.BOSS_POWERUP_AOE_INCREMENT;
                break;
            case 'pushbackShot':
                this.pushbackStrength += CONFIG.BOSS_POWERUP_PUSHBACK_INCREMENT;
                break;
            case 'missileSupport':
                this.triggerMissileSupport();
                break;
        }
    }

    triggerMissileSupport() {
        const circleRadius = this.laneWidth * 0.4;
        const circles = [];

        for (let i = 0; i < 3; i++) {
            const rx = Phaser.Math.Between(this.laneWidth * 0.5, this.laneWidth * 2.5);
            const ry = Phaser.Math.Between(50, CONFIG.CANVAS_HEIGHT * 0.5);
            const circle = this.add.circle(rx, ry, circleRadius, 0xffffff, 1);
            circle.setAlpha(0);
            circle.setDepth(1999);
            circles.push(circle);

            this.tweens.add({
                targets: circle,
                alpha: { from: 0, to: 1 },
                scale: { from: 0.5, to: 1.5 },
                duration: 120,
                yoyo: true,
                delay: i * 150,
                onComplete: () => circle.destroy()
            });
        }

        const fullFlash = this.add.rectangle(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT, 0xffffff, 1);
        fullFlash.setOrigin(0, 0);
        fullFlash.setAlpha(0);
        fullFlash.setDepth(1999);

        this.tweens.add({
            targets: fullFlash,
            alpha: { from: 0, to: 1 },
            duration: 150,
            yoyo: true,
            delay: 3 * 150,
            onComplete: () => {
                fullFlash.destroy();
                this.enemies.forEach(enemy => {
                    if (enemy.hpLabel) enemy.hpLabel.destroy();
                    enemy.destroy();
                });
                this.enemies = [];
            }
        });
    }

    updateWalls(delta) {
        // Process walls per lane, sorted from bottom to top
        [0, 2].forEach(laneIndex => {
            const laneWalls = this.walls.filter(w => w.lane === laneIndex);
            laneWalls.sort((a, b) => b.originalY - a.originalY); // Sort bottom to top

            for (let i = 0; i < laneWalls.length; i++) {
                const wall = laneWalls[i];
                let targetY;

                if (i === 0) {
                    // Front wall - just move down
                    targetY = wall.originalY + CONFIG.WALL_MOVE_SPEED * delta / 1000;
                } else {
                    // Back wall - follow the wall in front, keeping a gap
                    const frontWall = laneWalls[i - 1];
                    const desiredY = frontWall.originalY - (CONFIG.WALL_HEIGHT + CONFIG.WALL_GAP);
                    // Move towards desiredY, but not faster than wall move speed
                    const maxMove = CONFIG.WALL_MOVE_SPEED * delta / 1000;
                    if (wall.originalY < desiredY - maxMove) {
                        targetY = wall.originalY + maxMove;
                    } else if (wall.originalY > desiredY + maxMove) {
                        targetY = wall.originalY - maxMove;
                    } else {
                        targetY = desiredY;
                    }
                }

                wall.originalY = targetY;
                if (wall.label) {
                    wall.label.originalY = wall.originalY;
                }
                if (wall.hpLabel) {
                    wall.hpLabel.originalX = wall.originalX;
                    wall.hpLabel.originalY = wall.originalY + CONFIG.WALL_HEIGHT / 2 + 15;
                    wall.hpLabel.setText(`${wall.hp}`);
                }
            }
        });
    }

    spawnNewWalls() {
        // Spawn new walls if needed
        const topGrowthWall = this.walls
            .filter(w => w.lane === 0 && w.type === 'growth')
            .sort((a, b) => a.y - b.y)[0];
        if (!topGrowthWall || topGrowthWall.y > -100) {
            this.spawnWall(0, 'growth');
        }

        const topPowerWall = this.walls
            .filter(w => w.lane === 2 && w.type === 'power')
            .sort((a, b) => a.y - b.y)[0];
        if (!topPowerWall || topPowerWall.y > -100) {
            const powerType = Phaser.Utils.Array.GetRandom(['fireRate', 'damage', 'shield']);
            this.spawnWall(2, 'power', powerType);
        }
    }

    drawPseudo3DLaneLines() {
        this.laneLines.clear();
        this.laneLines.lineStyle(2, 0xffffff, 0.3);

        const getPseudo3DX = (originalX, y) => {
            const normalizedY = Phaser.Math.Clamp(y / CONFIG.CANVAS_HEIGHT, 0, 1);
            const scale = Phaser.Math.Linear(CONFIG.PSEUDO3D_MIN_SCALE, CONFIG.PSEUDO3D_MAX_SCALE, normalizedY);
            const centerX = CONFIG.CANVAS_WIDTH / 2;
            const offsetX = (originalX - centerX) * (1 - (1 - scale) * CONFIG.PSEUDO3D_PERSPECTIVE_STRENGTH);
            return centerX + offsetX;
        };

        // Draw lane lines (including outer boundaries)
        for (let i = 0; i <= CONFIG.LANES; i++) {
            const originalX = this.laneWidth * i;
            const topY = 0;
            const bottomY = CONFIG.CANVAS_HEIGHT;
            const topX = getPseudo3DX(originalX, topY);
            const bottomX = getPseudo3DX(originalX, bottomY);
            this.laneLines.lineBetween(topX, topY, bottomX, bottomY);
        }
    }

    updatePseudo3D() {
        this.squadUnits.forEach(unit => this.applyPseudo3DTransform(unit));
        this.enemies.forEach(enemy => {
            this.applyPseudo3DTransform(enemy);
            if (enemy.hpLabel) this.applyPseudo3DTransform(enemy.hpLabel);
        });
        this.walls.forEach(wall => {
            this.applyPseudo3DTransform(wall);
            if (wall.label) this.applyPseudo3DTransform(wall.label);
            if (wall.hpLabel) this.applyPseudo3DTransform(wall.hpLabel);
        });
        this.projectiles.forEach(proj => this.applyPseudo3DTransform(proj));
        this.bosses.forEach(boss => {
            this.applyPseudo3DTransform(boss);
            if (boss.hpLabel) this.applyPseudo3DTransform(boss.hpLabel);
        });
        this.drawPseudo3DLaneLines();
    }

    update(time, delta)
    {
        if (this.isPaused) {
            return;
        }

        this.fireProjectiles(time);
        this.updateProjectiles(delta);
        this.updateEnemies(delta);
        this.updateBosses(delta);
        this.updateWalls(delta);
        this.updatePseudo3D();
        this.updateDebugPanel();
    }
}
