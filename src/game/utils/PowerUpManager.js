import { CONFIG } from '../config.js';

export class PowerUpManager {
    constructor(scene) {
        this.scene = scene;
    }

    applyPower(type) {
        const scene = this.scene;
        switch(type) {
            case 'fireRate':
                scene.fireRate = Math.max(CONFIG.MIN_FIRE_RATE, scene.fireRate * (1 - CONFIG.FIRE_RATE_BUFF));
                break;
            case 'damage':
                scene.damage += CONFIG.DAMAGE_INCREMENT;
                break;
            case 'shield':
                scene.shield += CONFIG.SHIELD_INCREMENT;
                if (scene.uiManager) {
                    scene.uiManager.updateShieldHUD();
                }
                break;
            case 'squadSpeed':
                scene.squadSpeed += 50;
                break;
        }
    }

    applyBossPowerup(type) {
        const scene = this.scene;
        switch(type) {
            case 'piercingShot':
                scene.pierceCount += CONFIG.BOSS_POWERUP_PIERCE_INCREMENT;
                break;
            case 'explosiveShot':
                scene.aoeRadius += CONFIG.BOSS_POWERUP_AOE_INCREMENT;
                break;
            case 'pushbackShot':
                scene.pushbackStrength += CONFIG.BOSS_POWERUP_PUSHBACK_INCREMENT;
                break;
            case 'missileSupport':
                this.triggerMissileSupport();
                break;
        }
    }

    triggerMissileSupport() {
        const scene = this.scene;
        const circleRadius = scene.laneWidth * 0.4;
        const circles = [];

        for (let i = 0; i < 3; i++) {
            const rx = Phaser.Math.Between(scene.laneWidth * 0.5, scene.laneWidth * 2.5);
            const ry = Phaser.Math.Between(50, CONFIG.CANVAS_HEIGHT * 0.5);
            const circle = scene.add.circle(rx, ry, circleRadius, 0xffffff, 1);
            circle.setAlpha(0);
            circle.setDepth(1999);
            circles.push(circle);

            scene.tweens.add({
                targets: circle,
                alpha: { from: 0, to: 1 },
                scale: { from: 0.5, to: 1.5 },
                duration: 120,
                yoyo: true,
                delay: i * 150,
                onComplete: () => circle.destroy()
            });
        }

        const fullFlash = scene.add.rectangle(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT, 0xffffff, 1);
        fullFlash.setOrigin(0, 0);
        fullFlash.setAlpha(0);
        fullFlash.setDepth(1999);

        scene.tweens.add({
            targets: fullFlash,
            alpha: { from: 0, to: 1 },
            duration: 150,
            yoyo: true,
            delay: 3 * 150,
            onComplete: () => {
                fullFlash.destroy();
                if (scene.enemyManager) {
                    scene.enemyManager.clearAllEnemies();
                }
            }
        });
    }
}
