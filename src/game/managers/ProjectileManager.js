import { CONFIG } from '../config.js';

export class ProjectileManager {
    constructor(scene) {
        this.scene = scene;
    }

    fireProjectiles(time) {
        const scene = this.scene;
        if (time - scene.lastFireTime < scene.fireRate) return;
        scene.lastFireTime = time;

        scene.squadUnits.forEach(unit => {
            const projectile = scene.add.circle(unit.originalX, unit.originalY - 20, CONFIG.PROJECTILE_SIZE, 0x00ffff);
            projectile.setDepth(scene.depthManager.getNextDepth());
            projectile.originalX = unit.originalX;
            projectile.originalY = unit.originalY - 20;
            projectile.speed = CONFIG.PROJECTILE_SPEED;
            projectile.damage = scene.damage;
            projectile.pierceCount = scene.pierceCount;
            projectile.aoeRadius = scene.aoeRadius;
            projectile.pushbackStrength = scene.pushbackStrength;
            projectile.hitTargets = new Set();
            projectile.totalHits = 0;
            scene.projectiles.push(projectile);
        });
    }

    update(delta) {
        const scene = this.scene;
        const destroyedWallsThisFrame = { 0: new Set(), 2: new Set() }; // Use Set to prevent duplicates

        for (let i = scene.projectiles.length - 1; i >= 0; i--) {
            const proj = scene.projectiles[i];
            proj.originalY -= proj.speed * delta / 1000;

            if (proj.originalY < -50) {
                proj.destroy();
                scene.projectiles.splice(i, 1);
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
                for (let j = scene.walls.length - 1; j >= 0; j--) {
                    const wall = scene.walls[j];
                    if (proj.hitTargets.has(wall)) continue;

                    const projBounds = new Phaser.Geom.Rectangle(
                        proj.originalX - CONFIG.PROJECTILE_SIZE,
                        proj.originalY - CONFIG.PROJECTILE_SIZE,
                        CONFIG.PROJECTILE_SIZE * 2,
                        CONFIG.PROJECTILE_SIZE * 2
                    );
                    const wallBounds = new Phaser.Geom.Rectangle(
                        wall.originalX - (scene.laneWidth * CONFIG.WALL_WIDTH_RATIO) / 2,
                        wall.originalY - CONFIG.WALL_HEIGHT / 2,
                        scene.laneWidth * CONFIG.WALL_WIDTH_RATIO,
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
                const projLane = Math.floor(proj.originalX / scene.laneWidth);
                const hitEnemies = [];

                // Collect all unhit enemies in the lane that are colliding
                for (let j = scene.enemies.length - 1; j >= 0; j--) {
                    const enemy = scene.enemies[j];
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
                        if (scene.enemyManager) {
                            scene.enemyManager.removeEnemy(enemy);
                        }
                    }

                    // Apply pushback to this enemy
                    if (proj.pushbackStrength > 0 && scene.enemies.includes(enemy)) {
                        enemy.originalY -= proj.pushbackStrength;
                    }

                    // Apply AOE
                    if (proj.aoeRadius > 0) {
                        const centerX = proj.originalX;
                        const centerY = proj.originalY;

                        for (let j = scene.enemies.length - 1; j >= 0; j--) {
                            const aoeEnemy = scene.enemies[j];
                            if (proj.hitTargets.has(aoeEnemy)) continue;

                            const dist = Phaser.Math.Distance.Between(centerX, centerY, aoeEnemy.originalX, aoeEnemy.originalY);
                            if (dist <= proj.aoeRadius) {
                                aoeEnemy.hp -= proj.damage;
                                if (aoeEnemy.hp <= 0) {
                                    if (scene.enemyManager) {
                                        scene.enemyManager.removeEnemy(aoeEnemy);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Check boss collision (always stops projectile)
            if (!hitThisFrame && proj.totalHits < maxHits) {
                for (let j = scene.bosses.length - 1; j >= 0; j--) {
                    const boss = scene.bosses[j];
                    if (proj.hitTargets.has(boss)) continue;

                    if (Phaser.Geom.Intersects.CircleToCircle(
                        { x: proj.originalX, y: proj.originalY, radius: CONFIG.PROJECTILE_SIZE },
                        { x: boss.originalX, y: boss.originalY, radius: CONFIG.BOSS_SIZE / 2 }
                    )) {
                        boss.hp -= proj.damage;
                        proj.hitTargets.add(boss);
                        proj.totalHits = maxHits; // Exhaust all hits
                        hitThisFrame = true;
                        if (scene.uiManager) {
                            scene.uiManager.updateBossHpBar();
                        }

                        if (boss.hp <= 0) {
                            if (scene.bossManager) {
                                scene.bossManager.onBossDeath(boss, j);
                            }
                        }

                        if (proj.pushbackStrength > 0 && scene.bosses.includes(boss)) {
                            boss.originalY -= proj.pushbackStrength;
                        }

                        break;
                    }
                }
            }

            // Destroy projectile if we've hit max hits
            if (proj.totalHits >= maxHits) {
                proj.destroy();
                scene.projectiles.splice(i, 1);
            }
        }

        // Now process all destroyed walls per lane
        [0, 2].forEach(laneIndex => {
            const walls = Array.from(destroyedWallsThisFrame[laneIndex]); // Convert Set to Array
            if (walls.length === 0) return;

            walls.forEach(wall => {
                // Apply wall effect
                if (wall.type === 'growth') {
                    scene.squadCount++;
                    if (scene.squadManager) {
                        scene.squadManager.createSquad();
                    }
                    if (scene.uiManager) {
                        scene.uiManager.updateUnitCountHUD();
                    }
                } else if (wall.type === 'power') {
                    if (scene.powerUpManager) {
                        scene.powerUpManager.applyPower(wall.powerType);
                    }
                }

                // Remove wall from arrays and destroy
                if (scene.wallManager) {
                    scene.wallManager.removeWall(wall);
                }

                scene.destroyedWallsCount[laneIndex]++;
            });
        });
    }
}
