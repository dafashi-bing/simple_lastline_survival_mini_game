import { CONFIG } from '../config.js';

export class EnemyManager {
    constructor(scene) {
        this.scene = scene;
    }

    spawnEnemy(laneIndex, xOffset = 0) {
        const scene = this.scene;
        const x = scene.laneWidth * laneIndex + scene.laneWidth / 2 + xOffset;
        const y = -50;

        const enemyDepth = scene.depthManager.getNextDepth();
        const enemy = scene.add.circle(x, y, CONFIG.ENEMY_SIZE / 2, 0xff4444);
        enemy.setStrokeStyle(2, 0x880000);
        enemy.setDepth(enemyDepth);
        enemy.originalX = x;
        enemy.originalY = y;
        enemy.hp = CONFIG.ENEMY_BASE_HP + Math.floor(scene.survivalTime / 15) * CONFIG.ENEMY_HP_SCALE_PER_15_SECONDS;
        enemy.lane = laneIndex;
        enemy.speed = CONFIG.ENEMY_BASE_SPEED + scene.survivalTime * CONFIG.ENEMY_SPEED_SCALE_PER_SECOND;
        enemy.hpLabel = null;
        enemy.lastAttackTime = 0;
        enemy.isAttacking = false;

        if (CONFIG.SHOW_DEBUG_PANEL) {
            enemy.hpLabel = scene.add.text(x, y + CONFIG.ENEMY_SIZE / 2 + 10, `${enemy.hp}`, {
                fontFamily: 'Arial Black', fontSize: 12, color: '#ffffff',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(100);
            enemy.hpLabel.originalX = x;
            enemy.hpLabel.originalY = y + CONFIG.ENEMY_SIZE / 2 + 10;
        }

        scene.enemies.push(enemy);
    }

    spawnEnemyRow(laneIndex) {
        const scene = this.scene;
        const enemySize = CONFIG.ENEMY_SIZE;
        const gap = 5;
        const availableWidth = scene.laneWidth - enemySize;
        const maxEnemies = Math.floor(availableWidth / (enemySize + gap)) + 1;
        const enemyCount = Math.min(maxEnemies, 6 + Math.floor(scene.survivalTime / 10));

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

    clearAllEnemies() {
        const scene = this.scene;
        scene.enemies.forEach(enemy => {
            if (enemy.hpLabel) enemy.hpLabel.destroy();
            enemy.destroy();
        });
        scene.enemies = [];
    }

    update(delta) {
        const scene = this.scene;
        const currentTime = scene.time.now;
        const touchDist = CONFIG.ENEMY_SIZE / 2 + CONFIG.UNIT_SIZE / 2;

        for (let i = scene.enemies.length - 1; i >= 0; i--) {
            const enemy = scene.enemies[i];

            if (!enemy.isAttacking) {
                let engageY = CONFIG.ENEMY_ENGAGE_Y;
                if (scene.squadUnits.length > 0) {
                    // Front-most squad unit has smallest originalY (closest to top)
                    const frontMostUnit = scene.squadUnits.reduce((front, unit) => 
                        unit.originalY < front.originalY ? unit : front, 
                        scene.squadUnits[0]
                    );
                    engageY = frontMostUnit.originalY - CONFIG.ENEMY_ENGAGE_Y;
                }
                
                if (enemy.originalY < engageY) {
                    // Phase 1: charge straight down
                    enemy.originalY += enemy.speed * delta / 1000;
                } else {
                    // Phase 2: steer towards nearest squad unit
                    let closestUnit = null;
                    let closestDist = Infinity;
                    for (const unit of scene.squadUnits) {
                        const dx = unit.originalX - enemy.originalX;
                        const dy = unit.originalY - enemy.originalY;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < closestDist) {
                            closestDist = dist;
                            closestUnit = unit;
                        }
                    }

                    if (closestUnit && closestDist <= touchDist) {
                        enemy.isAttacking = true;
                    } else if (closestUnit) {
                        const dx = closestUnit.originalX - enemy.originalX;
                        const dy = closestUnit.originalY - enemy.originalY;
                        const len = Math.sqrt(dx * dx + dy * dy);
                        const move = enemy.speed * delta / 1000;
                        enemy.originalX += (dx / len) * move;
                        enemy.originalY += (dy / len) * move;
                        enemy.lane = Math.floor(enemy.originalX / scene.laneWidth);
                    } else {
                        // No squad units, keep moving down
                        enemy.originalY += enemy.speed * delta / 1000;
                    }
                }
            }

            // Handle attacking logic
            if (enemy.isAttacking) {
                if (currentTime - enemy.lastAttackTime >= CONFIG.ENEMY_ATTACK_INTERVAL) {
                    enemy.lastAttackTime = currentTime;
                    if (scene.shield > 0) {
                        scene.shield--;
                        if (scene.uiManager) {
                            scene.uiManager.updateShieldHUD();
                        }
                    } else {
                        scene.squadCount--;
                        if (scene.uiManager) {
                            scene.uiManager.updateUnitCountHUD();
                        }
                        if (scene.squadCount <= 0) {
                            scene.gameOver();
                            return;
                        }
                        if (scene.squadManager) {
                            scene.squadManager.createSquad();
                        }
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
                scene.enemies.splice(i, 1);
            }
        }
    }

    removeEnemy(enemy) {
        const scene = this.scene;
        if (enemy.hpLabel) enemy.hpLabel.destroy();
        enemy.destroy();
        const idx = scene.enemies.indexOf(enemy);
        if (idx !== -1) {
            scene.enemies.splice(idx, 1);
        }
    }
}
