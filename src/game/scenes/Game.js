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
        this.activeBoss = null;
    }

    create ()
    {
        this.resetGameState();
        this.cameras.main.setBackgroundColor(0x000033);
        this.laneWidth = CONFIG.CANVAS_WIDTH / CONFIG.LANES;

        for (let i = 1; i < CONFIG.LANES; i++) {
            this.add.line(0, 0, this.laneWidth * i, 0, this.laneWidth * i, CONFIG.CANVAS_HEIGHT, 0xffffff, 0.3).setOrigin(0, 0);
        }

        this.hudUnitCount = this.add.text(20, 20, `Units: ${this.squadCount}`, {
            fontFamily: 'Arial Black', fontSize: 24, color: '#00ffff',
            stroke: '#000000', strokeThickness: 4
        }).setDepth(100);

        this.hudTime = this.add.text(CONFIG.CANVAS_WIDTH - 20, 20, 'Time: 0s', {
            fontFamily: 'Arial Black', fontSize: 24, color: '#ffffff',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(1, 0).setDepth(100);

        this.hudShield = this.add.text(20, 60, `Shield: ${this.shield}`, {
            fontFamily: 'Arial Black', fontSize: 20, color: '#ffff00',
            stroke: '#000000', strokeThickness: 4
        }).setDepth(100);

        // Boss HP Bar UI
        this.bossHpBarContainer = this.add.container(CONFIG.CANVAS_WIDTH / 2, 100).setDepth(100);
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

        this.time.addEvent({
            delay: CONFIG.WAVE_INTERVAL,
            callback: () => this.spawnWave(),
            loop: true
        });

        this.time.addEvent({
            delay: 2000,
            callback: () => this.spawnNewWalls(),
            loop: true
        });

        // Boss spawning timer
        this.time.addEvent({
            delay: CONFIG.BOSS_SPAWN_INTERVAL,
            callback: () => this.spawnBoss(),
            loop: true
        });
    }

    createDebugPanel() {
        this.debugPanel = this.add.container(10, 100);
        this.debugPanel.setDepth(101);

        const bg = this.add.rectangle(0, 0, 280, 360, 0x000000, 0.7);
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
        const maxPerRow = CONFIG.MAX_UNITS_PER_LINE;
        const startY = CONFIG.CANVAS_HEIGHT - 100;
        let row = 0, col = 0;

        this.squadUnits.forEach((unit) => {
            const offsetX = (col - (Math.min(maxPerRow, this.squadUnits.length) - 1) / 2) * (CONFIG.UNIT_SIZE + 10);
            const offsetY = -row * (CONFIG.UNIT_SIZE + 5);
            unit.x = x + offsetX;
            unit.y = startY + offsetY;

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
        const hp = baseHp + scalePerSecond * this.survivalTime + destroyedCount;

        const wall = this.add.rectangle(x, wallY, width, height, type === 'growth' ? 0x00ff00 : 0xffff00);
        wall.setStrokeStyle(3, type === 'growth' ? 0x008800 : 0x888800);
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

        if (CONFIG.SHOW_DEBUG_PANEL) {
            wall.hpLabel = this.add.text(x, wallY + height / 2 + 15, `${wall.hp}`, {
                fontFamily: 'Arial Black', fontSize: 14, color: '#ffffff',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(100);
        }

        this.walls.push(wall);
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

        const enemy = this.add.circle(x, y, CONFIG.ENEMY_SIZE / 2, 0xff4444);
        enemy.setStrokeStyle(2, 0x880000);
        enemy.hp = CONFIG.ENEMY_BASE_HP + Math.floor(this.survivalTime / 15) * CONFIG.ENEMY_HP_SCALE_PER_15_SECONDS;
        enemy.lane = laneIndex;
        enemy.speed = CONFIG.ENEMY_BASE_SPEED + this.survivalTime * CONFIG.ENEMY_SPEED_SCALE_PER_SECOND;
        enemy.hpLabel = null;

        if (CONFIG.SHOW_DEBUG_PANEL) {
            enemy.hpLabel = this.add.text(x, y + CONFIG.ENEMY_SIZE / 2 + 10, `${enemy.hp}`, {
                fontFamily: 'Arial Black', fontSize: 12, color: '#ffffff',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(100);
        }

        this.enemies.push(enemy);
    }

    spawnEnemyRow(laneIndex) {
        const enemySize = CONFIG.ENEMY_SIZE;
        const gap = 10;
        const availableWidth = this.laneWidth - enemySize;
        const maxEnemies = Math.floor(availableWidth / (enemySize + gap)) + 1;
        const enemyCount = Math.min(maxEnemies, 3 + Math.floor(this.survivalTime / 20));

        const totalRowWidth = enemyCount * enemySize + (enemyCount - 1) * gap;
        const startX = -totalRowWidth / 2 + enemySize / 2;

        for (let i = 0; i < enemyCount; i++) {
            const xOffset = startX + i * (enemySize + gap);
            this.spawnEnemy(laneIndex, xOffset);
        }
    }

    spawnWave() {
        this.spawnEnemyRow(1);
    }

    spawnBoss() {
        const laneIndex = 1;
        const x = this.laneWidth * laneIndex + this.laneWidth / 2;
        const y = -100;

        const boss = this.add.circle(x, y, CONFIG.BOSS_SIZE / 2, 0x880088);
        boss.setStrokeStyle(4, 0xff00ff);
        boss.maxHp = CONFIG.BOSS_BASE_HP + Math.floor(this.survivalTime / 30) * CONFIG.BOSS_HP_SCALE_PER_30_SECONDS;
        boss.hp = boss.maxHp;
        boss.lane = laneIndex;
        boss.speed = CONFIG.BOSS_BASE_SPEED + this.survivalTime * CONFIG.BOSS_SPEED_SCALE_PER_SECOND;
        boss.hpLabel = null;

        if (CONFIG.SHOW_DEBUG_PANEL) {
            boss.hpLabel = this.add.text(x, y + CONFIG.BOSS_SIZE / 2 + 15, `${boss.hp}`, {
                fontFamily: 'Arial Black', fontSize: 16, color: '#ffffff',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(100);
        }

        this.bosses.push(boss);
        this.activeBoss = boss;
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
            const projectile = this.add.circle(unit.x, unit.y - 20, CONFIG.PROJECTILE_SIZE, 0x00ffff);
            projectile.speed = CONFIG.PROJECTILE_SPEED;
            projectile.damage = this.damage;
            this.projectiles.push(projectile);
        });
    }

    updateProjectiles(delta) {
        const destroyedWallsThisFrame = { 0: new Set(), 2: new Set() }; // Use Set to prevent duplicates

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.y -= proj.speed * delta / 1000;

            if (proj.y < -50) {
                proj.destroy();
                this.projectiles.splice(i, 1);
                continue;
            }

            let hit = false;

            for (let j = this.walls.length - 1; j >= 0; j--) {
                const wall = this.walls[j];
                if (Phaser.Geom.Intersects.RectangleToRectangle(
                    proj.getBounds(),
                    wall.getBounds()
                )) {
                    wall.hp -= proj.damage;
                    hit = true;

                    if (wall.hp <= 0) {
                        destroyedWallsThisFrame[wall.lane].add(wall); // Use add() for Set
                    }
                    break;
                }
            }

            if (!hit) {
                const projLane = Math.floor(proj.x / this.laneWidth);
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                    const enemy = this.enemies[j];
                    if (enemy.lane === projLane && Phaser.Geom.Intersects.CircleToCircle(
                        { x: proj.x, y: proj.y, radius: CONFIG.PROJECTILE_SIZE },
                        { x: enemy.x, y: enemy.y, radius: CONFIG.ENEMY_SIZE / 2 }
                    )) {
                        enemy.hp -= proj.damage;
                        hit = true;

                        if (enemy.hp <= 0) {
                            if (enemy.hpLabel) enemy.hpLabel.destroy();
                            enemy.destroy();
                            this.enemies.splice(j, 1);
                        }
                        break;
                    }
                }
            }

            if (!hit) {
                for (let j = this.bosses.length - 1; j >= 0; j--) {
                    const boss = this.bosses[j];
                    if (Phaser.Geom.Intersects.CircleToCircle(
                        { x: proj.x, y: proj.y, radius: CONFIG.PROJECTILE_SIZE },
                        { x: boss.x, y: boss.y, radius: CONFIG.BOSS_SIZE / 2 }
                    )) {
                        boss.hp -= proj.damage;
                        hit = true;
                        this.updateBossHpBar();

                        if (boss.hp <= 0) {
                            this.onBossDeath(boss, j);
                        }
                        break;
                    }
                }
            }

            if (hit) {
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
        laneWalls.sort((a, b) => b.y - a.y);

        const distance = (CONFIG.WALL_HEIGHT + CONFIG.WALL_GAP) * count;

        this.tweens.add({
            targets: laneWalls,
            y: `+=${distance}`,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                this.addWallsToTop(laneIndex, type, count);
            }
        });

        laneWalls.forEach(wall => {
            if (wall.label) {
                this.tweens.add({
                    targets: wall.label,
                    y: `+=${distance}`,
                    duration: 200,
                    ease: 'Power2'
                });
            }
            if (wall.hpLabel) {
                this.tweens.add({
                    targets: wall.hpLabel,
                    y: `+=${distance}`,
                    duration: 200,
                    ease: 'Power2'
                });
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
                this.fireRate = Math.max(CONFIG.MIN_FIRE_RATE, this.fireRate - CONFIG.FIRE_RATE_REDUCTION);
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
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.y += enemy.speed * delta / 1000;

            if (enemy.hpLabel) {
                enemy.hpLabel.x = enemy.x;
                enemy.hpLabel.y = enemy.y + CONFIG.ENEMY_SIZE / 2 + 10;
                enemy.hpLabel.setText(`${enemy.hp}`);
            }

            const squadY = CONFIG.CANVAS_HEIGHT - 100;
            if (enemy.y > squadY - 50) {
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
                if (enemy.hpLabel) enemy.hpLabel.destroy();
                enemy.destroy();
                this.enemies.splice(i, 1);
            }

            if (enemy.y > CONFIG.CANVAS_HEIGHT + 50) {
                if (enemy.hpLabel) enemy.hpLabel.destroy();
                enemy.destroy();
                this.enemies.splice(i, 1);
            }
        }
    }

    onBossDeath(boss, index) {
        // Give rewards
        this.squadCount += CONFIG.BOSS_REWARD_UNITS;
        this.shield += CONFIG.BOSS_REWARD_SHIELD;
        this.hudUnitCount.setText(`Units: ${this.squadCount}`);
        this.hudShield.setText(`Shield: ${this.shield}`);
        this.createSquad();

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
    }

    updateBosses(delta) {
        for (let i = this.bosses.length - 1; i >= 0; i--) {
            const boss = this.bosses[i];
            boss.y += boss.speed * delta / 1000;

            if (boss.hpLabel) {
                boss.hpLabel.x = boss.x;
                boss.hpLabel.y = boss.y + CONFIG.BOSS_SIZE / 2 + 15;
                boss.hpLabel.setText(`${boss.hp}`);
            }

            // Check collision with squad
            const squadY = CONFIG.CANVAS_HEIGHT - 100;
            if (boss.y > squadY - 50) {
                // Boss deals multiple damage
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

                // Clean up boss
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
                continue;
            }

            // Clean up if goes off screen
            if (boss.y > CONFIG.CANVAS_HEIGHT + 100) {
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

    updateWalls(delta) {
        // Process walls per lane, sorted from bottom to top
        [0, 2].forEach(laneIndex => {
            const laneWalls = this.walls.filter(w => w.lane === laneIndex);
            laneWalls.sort((a, b) => b.y - a.y); // Sort bottom to top

            for (let i = 0; i < laneWalls.length; i++) {
                const wall = laneWalls[i];
                let targetY;

                if (i === 0) {
                    // Front wall - just move down
                    targetY = wall.y + CONFIG.WALL_MOVE_SPEED * delta / 1000;
                } else {
                    // Back wall - follow the wall in front, keeping a gap
                    const frontWall = laneWalls[i - 1];
                    const desiredY = frontWall.y - (CONFIG.WALL_HEIGHT + CONFIG.WALL_GAP);
                    // Move towards desiredY, but not faster than wall move speed
                    const maxMove = CONFIG.WALL_MOVE_SPEED * delta / 1000;
                    if (wall.y < desiredY - maxMove) {
                        targetY = wall.y + maxMove;
                    } else if (wall.y > desiredY + maxMove) {
                        targetY = wall.y - maxMove;
                    } else {
                        targetY = desiredY;
                    }
                }

                wall.y = targetY;
                if (wall.label) {
                    wall.label.y = wall.y;
                }
                if (wall.hpLabel) {
                    wall.hpLabel.x = wall.x;
                    wall.hpLabel.y = wall.y + CONFIG.WALL_HEIGHT / 2 + 15;
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

    update(time, delta)
    {
        this.fireProjectiles(time);
        this.updateProjectiles(delta);
        this.updateEnemies(delta);
        this.updateBosses(delta);
        this.updateWalls(delta);
        this.updateDebugPanel();
    }
}
