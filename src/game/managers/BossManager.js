import { CONFIG } from '../config.js';

export class BossManager {
    constructor(scene) {
        this.scene = scene;
    }

    create() {
        this.createBossRewardDialogue();
    }

    getFrontMostBoss() {
        const scene = this.scene;
        if (scene.bosses.length === 0) return null;
        // Front most has largest originalY (closest to bottom of screen)
        return scene.bosses.reduce((front, boss) => 
            boss.originalY > front.originalY ? boss : front, 
            scene.bosses[0]
        );
    }

    spawnBoss() {
        const scene = this.scene;
        const laneIndex = 1;
        const x = scene.laneWidth * laneIndex + scene.laneWidth / 2;
        const y = -100;

        const bossDepth = scene.depthManager.getNextDepth();
        const boss = scene.add.circle(x, y, CONFIG.BOSS_SIZE / 2, 0xaa00aa);
        boss.setStrokeStyle(4, 0xff00ff);
        boss.setFillStyle(0xaa00aa, 1);
        boss.setDepth(bossDepth);
        boss.originalX = x;
        boss.originalY = y;
        boss.maxHp = Math.floor(CONFIG.BOSS_BASE_HP * Math.pow(CONFIG.BOSS_HP_SCALE_FACTOR_PER_BOSS, scene.bossesSpawned));
        boss.hp = boss.maxHp;
        boss.lane = laneIndex;
        boss.speed = CONFIG.ENEMY_BASE_SPEED + scene.survivalTime * CONFIG.ENEMY_SPEED_SCALE_PER_SECOND;
        boss.hpLabel = null;
        boss.lastAttackTime = 0;
        boss.isAttacking = false;

        if (CONFIG.SHOW_DEBUG_PANEL) {
            boss.hpLabel = scene.add.text(x, y + CONFIG.BOSS_SIZE / 2 + 15, `${boss.hp}`, {
                fontFamily: 'Arial Black', fontSize: 16, color: '#ffffff',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(100);
            boss.hpLabel.originalX = x;
            boss.hpLabel.originalY = y + CONFIG.BOSS_SIZE / 2 + 15;
        }

        scene.bosses.push(boss);
        scene.activeBoss = this.getFrontMostBoss();
        scene.bossesSpawned++;
        if (scene.uiManager) {
            scene.uiManager.showBossHpBar();
        }
    }

    onBossDeath(boss, index) {
        const scene = this.scene;
        // Clean up boss
        if (boss.hpLabel) boss.hpLabel.destroy();
        boss.destroy();
        scene.bosses.splice(index, 1);

        // Clear active boss and hide HP bar
        if (scene.activeBoss === boss) {
            scene.activeBoss = this.getFrontMostBoss();
            if (scene.activeBoss) {
                if (scene.uiManager) {
                    scene.uiManager.showBossHpBar();
                }
            } else {
                if (scene.uiManager) {
                    scene.uiManager.hideBossHpBar();
                }
            }
        }

        // Show boss reward dialogue
        this.showBossRewardDialogue();
    }

    createBossRewardDialogue() {
        const scene = this.scene;
        scene.bossRewardDialogue = scene.add.container(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2).setDepth(3000);
        scene.bossRewardDialogue.setVisible(false);

        const overlay = scene.add.rectangle(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT, 0x000000, 0.8);
        overlay.setOrigin(0.5);
        scene.bossRewardDialogue.add(overlay);

        const dialogueBg = scene.add.rectangle(0, 0, 600, 700, 0x1a1a2e);
        dialogueBg.setStrokeStyle(4, 0xff00ff);
        scene.bossRewardDialogue.add(dialogueBg);

        const title = scene.add.text(0, -280, 'BOSS DEFEATED!', {
            fontFamily: 'Arial Black', fontSize: 36, color: '#ff00ff',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);
        scene.bossRewardDialogue.add(title);

        const subtitle = scene.add.text(0, -230, 'Choose Your Power-Up', {
            fontFamily: 'Arial Black', fontSize: 24, color: '#ffffff',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);
        scene.bossRewardDialogue.add(subtitle);

        scene.powerupButtons = [];
        const buttonYPositions = [-120, 60, 240];

        for (let i = 0; i < 3; i++) {
            const button = this.createPowerupButton(0, buttonYPositions[i], i);
            scene.powerupButtons.push(button);
            scene.bossRewardDialogue.add(button.container);
        }
    }

    createPowerupButton(x, y, index) {
        const scene = this.scene;
        const container = scene.add.container(x, y);
        
        const bg = scene.add.rectangle(0, 0, 500, 140, 0x2d2d44);
        bg.setStrokeStyle(3, 0x6666ff);
        bg.setInteractive();
        container.add(bg);

        const nameText = scene.add.text(0, -30, '', {
            fontFamily: 'Arial Black', fontSize: 24, color: '#00ffff',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);
        container.add(nameText);

        const descText = scene.add.text(0, 20, '', {
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
        const scene = this.scene;
        scene.isPaused = true;
        
        const allPowerups = [
            { type: 'piercingShot', name: 'Piercing Shot', desc: `Projectiles pierce through +${CONFIG.BOSS_POWERUP_PIERCE_INCREMENT} enemy` },
            { type: 'explosiveShot', name: 'Explosive Shot', desc: `Projectiles have AOE damage with +${CONFIG.BOSS_POWERUP_AOE_INCREMENT} radius` },
            { type: 'pushbackShot', name: 'Push Back Shot', desc: `Enemies hit are pushed back -${CONFIG.BOSS_POWERUP_PUSHBACK_INCREMENT} pixels` },
            { type: 'missileSupport', name: 'Missile Support', desc: 'Clear the screen with a flashing effect!' }
        ];

        const shuffled = Phaser.Utils.Array.Shuffle([...allPowerups]);
        const selectedPowerups = shuffled.slice(0, 3);

        scene.powerupButtons.forEach((button, index) => {
            const powerup = selectedPowerups[index];
            button.powerupType = powerup.type;
            button.nameText.setText(powerup.name);
            button.descText.setText(powerup.desc);
        });

        scene.bossRewardDialogue.setVisible(true);
    }

    hideBossRewardDialogue() {
        const scene = this.scene;
        scene.bossRewardDialogue.setVisible(false);
        scene.isPaused = false;
    }

    selectPowerup(index) {
        const scene = this.scene;
        const powerupType = scene.powerupButtons[index].powerupType;
        if (scene.powerUpManager) {
            scene.powerUpManager.applyBossPowerup(powerupType);
        }
        this.hideBossRewardDialogue();
    }

    update(delta) {
        const scene = this.scene;
        const currentTime = scene.time.now;
        const touchDist = CONFIG.BOSS_SIZE / 2 + CONFIG.UNIT_SIZE / 2;

        // Update active boss to front most boss every frame
        const newFrontBoss = this.getFrontMostBoss();
        if (newFrontBoss !== scene.activeBoss) {
            scene.activeBoss = newFrontBoss;
            if (scene.activeBoss) {
                if (scene.uiManager) {
                    scene.uiManager.showBossHpBar();
                }
            } else {
                if (scene.uiManager) {
                    scene.uiManager.hideBossHpBar();
                }
            }
        }

        for (let i = scene.bosses.length - 1; i >= 0; i--) {
            const boss = scene.bosses[i];

            if (!boss.isAttacking) {
                let engageY = CONFIG.ENEMY_ENGAGE_Y;
                if (scene.squadUnits.length > 0) {
                    // Front-most squad unit has smallest originalY (closest to top)
                    const frontMostUnit = scene.squadUnits.reduce((front, unit) => 
                        unit.originalY < front.originalY ? unit : front, 
                        scene.squadUnits[0]
                    );
                    engageY = frontMostUnit.originalY - CONFIG.ENEMY_ENGAGE_Y;
                }
                
                if (boss.originalY < engageY) {
                    // Phase 1: charge straight down
                    boss.originalY += boss.speed * delta / 1000;
                } else {
                    // Phase 2: steer towards nearest squad unit
                    let closestUnit = null;
                    let closestDist = Infinity;
                    for (const unit of scene.squadUnits) {
                        const dx = unit.originalX - boss.originalX;
                        const dy = unit.originalY - boss.originalY;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < closestDist) {
                            closestDist = dist;
                            closestUnit = unit;
                        }
                    }

                    if (closestUnit && closestDist <= touchDist) {
                        boss.isAttacking = true;
                    } else if (closestUnit) {
                        const dx = closestUnit.originalX - boss.originalX;
                        const dy = closestUnit.originalY - boss.originalY;
                        const len = Math.sqrt(dx * dx + dy * dy);
                        const move = boss.speed * delta / 1000;
                        boss.originalX += (dx / len) * move;
                        boss.originalY += (dy / len) * move;
                    } else {
                        boss.originalY += boss.speed * delta / 1000;
                    }
                }
            }

            // Handle attacking logic
            if (boss.isAttacking) {
                if (currentTime - boss.lastAttackTime >= CONFIG.BOSS_ATTACK_INTERVAL) {
                    boss.lastAttackTime = currentTime;
                    // Deal boss damage
                    let damageToDeal = CONFIG.BOSS_DAMAGE;
                    while (damageToDeal > 0 && (scene.shield > 0 || scene.squadCount > 0)) {
                        if (scene.shield > 0) {
                            scene.shield--;
                        } else {
                            scene.squadCount--;
                        }
                        damageToDeal--;
                    }
                    if (scene.uiManager) {
                        scene.uiManager.updateShieldHUD();
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

            if (boss.hpLabel) {
                boss.hpLabel.originalX = boss.originalX;
                boss.hpLabel.originalY = boss.originalY + CONFIG.BOSS_SIZE / 2 + 15;
                boss.hpLabel.setText(`${boss.hp}`);
            }

            // Clean up bosses that go way off screen (only if not attacking)
            if (!boss.isAttacking && boss.originalY > CONFIG.CANVAS_HEIGHT + 100) {
                if (boss.hpLabel) boss.hpLabel.destroy();
                boss.destroy();
                scene.bosses.splice(i, 1);

                // Clear active boss and hide HP bar
                if (scene.activeBoss === boss) {
                    scene.activeBoss = this.getFrontMostBoss();
                    if (scene.activeBoss) {
                        if (scene.uiManager) {
                            scene.uiManager.showBossHpBar();
                        }
                    } else {
                        if (scene.uiManager) {
                            scene.uiManager.hideBossHpBar();
                        }
                    }
                }
            }
        }
    }
}
