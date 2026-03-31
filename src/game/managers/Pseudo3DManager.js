import { CONFIG } from '../config.js';

export class Pseudo3DManager {
    constructor(scene) {
        this.scene = scene;
    }

    create() {
        this.scene.laneLines = this.scene.add.graphics();
        this.scene.laneLines.setDepth(0);
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

    drawPseudo3DLaneLines() {
        const scene = this.scene;
        scene.laneLines.clear();
        scene.laneLines.lineStyle(2, 0xffffff, 0.3);

        const getPseudo3DX = (originalX, y) => {
            const normalizedY = Phaser.Math.Clamp(y / CONFIG.CANVAS_HEIGHT, 0, 1);
            const scale = Phaser.Math.Linear(CONFIG.PSEUDO3D_MIN_SCALE, CONFIG.PSEUDO3D_MAX_SCALE, normalizedY);
            const centerX = CONFIG.CANVAS_WIDTH / 2;
            const offsetX = (originalX - centerX) * (1 - (1 - scale) * CONFIG.PSEUDO3D_PERSPECTIVE_STRENGTH);
            return centerX + offsetX;
        };

        // Draw lane lines (including outer boundaries)
        for (let i = 0; i <= CONFIG.LANES; i++) {
            const originalX = scene.laneWidth * i;
            const topY = 0;
            const bottomY = CONFIG.CANVAS_HEIGHT;
            const topX = getPseudo3DX(originalX, topY);
            const bottomX = getPseudo3DX(originalX, bottomY);
            scene.laneLines.lineBetween(topX, topY, bottomX, bottomY);
        }
    }

    update() {
        const scene = this.scene;
        if (scene.squadManager) {
            scene.squadUnits.forEach(unit => this.applyPseudo3DTransform(unit));
        }
        if (scene.enemyManager) {
            scene.enemies.forEach(enemy => {
                this.applyPseudo3DTransform(enemy);
                if (enemy.hpLabel) this.applyPseudo3DTransform(enemy.hpLabel);
            });
        }
        if (scene.wallManager) {
            scene.walls.forEach(wall => {
                this.applyPseudo3DTransform(wall);
                if (wall.label) this.applyPseudo3DTransform(wall.label);
                if (wall.hpLabel) this.applyPseudo3DTransform(wall.hpLabel);
            });
        }
        if (scene.projectileManager) {
            scene.projectiles.forEach(proj => this.applyPseudo3DTransform(proj));
        }
        if (scene.bossManager) {
            scene.bosses.forEach(boss => {
                this.applyPseudo3DTransform(boss);
                if (boss.hpLabel) this.applyPseudo3DTransform(boss.hpLabel);
            });
        }
        this.drawPseudo3DLaneLines();
    }
}
