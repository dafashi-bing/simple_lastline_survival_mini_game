import { CONFIG } from '../config.js';

export class UIManager {
    constructor(scene) {
        this.scene = scene;
    }

    create() {
        this.createHUD();
        this.createBossHpBar();
        if (CONFIG.SHOW_DEBUG_PANEL) {
            this.createDebugPanel();
        }
    }

    createHUD() {
        const scene = this.scene;
        
        scene.hudUnitCount = scene.add.text(20, 20, `Units: ${scene.squadCount}`, {
            fontFamily: 'Arial Black', fontSize: 24, color: '#00ffff',
            stroke: '#000000', strokeThickness: 4
        }).setDepth(2000);

        scene.hudTime = scene.add.text(CONFIG.CANVAS_WIDTH - 20, 20, 'Time: 0s', {
            fontFamily: 'Arial Black', fontSize: 24, color: '#ffffff',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(1, 0).setDepth(2000);

        scene.hudShield = scene.add.text(20, 60, `Shield: ${scene.shield}`, {
            fontFamily: 'Arial Black', fontSize: 20, color: '#ffff00',
            stroke: '#000000', strokeThickness: 4
        }).setDepth(2000);
    }

    createBossHpBar() {
        const scene = this.scene;
        scene.bossHpBarContainer = scene.add.container(CONFIG.CANVAS_WIDTH / 2, 100).setDepth(2001);
        scene.bossHpBarContainer.setVisible(false);

        const bossBarBg = scene.add.rectangle(0, 0, 400, 40, 0x330000);
        bossBarBg.setStrokeStyle(3, 0xff0000);
        scene.bossHpBarContainer.add(bossBarBg);

        scene.bossHpBarFill = scene.add.rectangle(-197, 0, 394, 34, 0xff0000);
        scene.bossHpBarFill.setOrigin(0, 0.5);
        scene.bossHpBarContainer.add(scene.bossHpBarFill);

        scene.bossHpBarText = scene.add.text(0, 0, 'BOSS', {
            fontFamily: 'Arial Black', fontSize: 16, color: '#ffffff',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5);
        scene.bossHpBarContainer.add(scene.bossHpBarText);
    }

    createDebugPanel() {
        const scene = this.scene;
        scene.debugPanel = scene.add.container(10, 100);
        scene.debugPanel.setDepth(2500);

        const bg = scene.add.rectangle(0, 0, 280, 440, 0x000000, 0.7);
        bg.setOrigin(0, 0);
        scene.debugPanel.add(bg);

        let yOffset = 10;

        const title = scene.add.text(10, yOffset, 'DEBUG INFO', {
            fontFamily: 'Arial Black', fontSize: 16, color: '#ffffff'
        });
        scene.debugPanel.add(title);
        yOffset += 25;

        scene.debugSquadInfo = scene.add.text(10, yOffset, '', {
            fontFamily: 'Arial', fontSize: 12, color: '#00ffff'
        });
        scene.debugPanel.add(scene.debugSquadInfo);
        yOffset += 60;

        scene.debugWallInfo = scene.add.text(10, yOffset, '', {
            fontFamily: 'Arial', fontSize: 12, color: '#00ff00'
        });
        scene.debugPanel.add(scene.debugWallInfo);
        yOffset += 80;

        scene.debugEnemyInfo = scene.add.text(10, yOffset, '', {
            fontFamily: 'Arial', fontSize: 12, color: '#ff4444'
        });
        scene.debugPanel.add(scene.debugEnemyInfo);
        yOffset += 40;

        scene.debugBossInfo = scene.add.text(10, yOffset, '', {
            fontFamily: 'Arial', fontSize: 12, color: '#ff00ff'
        });
        scene.debugPanel.add(scene.debugBossInfo);
        yOffset += 40;

        scene.debugPowerupInfo = scene.add.text(10, yOffset, '', {
            fontFamily: 'Arial', fontSize: 12, color: '#ffff00'
        });
        scene.debugPanel.add(scene.debugPowerupInfo);
    }

    updateUnitCountHUD() {
        this.scene.hudUnitCount.setText(`Units: ${this.scene.squadCount}`);
    }

    updateTimeHUD() {
        this.scene.hudTime.setText(`Time: ${this.scene.survivalTime}s`);
    }

    updateShieldHUD() {
        this.scene.hudShield.setText(`Shield: ${this.scene.shield}`);
    }

    showBossHpBar() {
        if (!this.scene.activeBoss) return;
        this.scene.bossHpBarContainer.setVisible(true);
        this.updateBossHpBar();
    }

    hideBossHpBar() {
        this.scene.bossHpBarContainer.setVisible(false);
    }

    updateBossHpBar() {
        const scene = this.scene;
        if (!scene.activeBoss) return;
        const hpPercent = Math.max(0, scene.activeBoss.hp / scene.activeBoss.maxHp);
        scene.bossHpBarFill.width = 394 * hpPercent;
        scene.bossHpBarText.setText(`BOSS - ${scene.activeBoss.hp}/${scene.activeBoss.maxHp}`);
    }

    updateDebugPanel() {
        const scene = this.scene;
        if (!CONFIG.SHOW_DEBUG_PANEL) return;

        scene.debugSquadInfo.setText(
            `Squad:\n` +
            `  Count: ${scene.squadCount}\n` +
            `  Fire Rate: ${scene.fireRate}ms\n` +
            `  Damage: ${scene.damage}\n` +
            `  Speed: ${scene.squadSpeed}`
        );

        if (scene.wallManager) {
            const growthWalls = scene.walls.filter(w => w.type === 'growth');
            const powerWalls = scene.walls.filter(w => w.type === 'power');
            scene.debugWallInfo.setText(
                `Walls:\n` +
                `  Growth: ${growthWalls.length}\n` +
                `  Front Growth HP: ${growthWalls.length ? growthWalls.sort((a,b)=>b.y-a.y)[0].hp : 'N/A'}\n` +
                `  Growth Destroyed: ${scene.destroyedWallsCount[0]}\n` +
                `  Power: ${powerWalls.length}\n` +
                `  Front Power HP: ${powerWalls.length ? powerWalls.sort((a,b)=>b.y-a.y)[0].hp : 'N/A'}\n` +
                `  Power Destroyed: ${scene.destroyedWallsCount[2]}`
            );
        }

        if (scene.enemyManager) {
            scene.debugEnemyInfo.setText(
                `Enemies:\n` +
                `  Count: ${scene.enemies.length}\n` +
                `  Front HP: ${scene.enemies.length ? Math.min(...scene.enemies.map(e => e.hp)) : 'N/A'}`
            );
        }

        if (scene.bossManager) {
            scene.debugBossInfo.setText(
                `Bosses:\n` +
                `  Count: ${scene.bosses.length}\n` +
                `  Active HP: ${scene.activeBoss ? `${scene.activeBoss.hp}/${scene.activeBoss.maxHp}` : 'N/A'}`
            );
        }

        scene.debugPowerupInfo.setText(
            `Boss Power-Ups:\n` +
            `  Pierce: ${scene.pierceCount}\n` +
            `  AOE Radius: ${scene.aoeRadius}\n` +
            `  Pushback: ${scene.pushbackStrength}`
        );
    }
}
