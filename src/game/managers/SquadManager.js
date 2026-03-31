import { CONFIG } from '../config.js';

export class SquadManager {
    constructor(scene) {
        this.scene = scene;
    }

    create() {
        this.createSquad();
    }

    createSquad() {
        const scene = this.scene;
        scene.squadUnits.forEach(unit => unit.destroy());
        scene.squadUnits = [];

        const startY = CONFIG.CANVAS_HEIGHT - 100;
        const maxPerRow = CONFIG.MAX_UNITS_PER_LINE;
        let row = 0, col = 0;

        for (let i = 0; i < scene.squadCount; i++) {
            const unit = scene.add.circle(0, 0, CONFIG.UNIT_SIZE / 2, 0x00ffff);
            unit.setStrokeStyle(2, 0x0088aa);
            unit.setDepth(scene.depthManager.getNextDepth());
            unit.originalX = 0;
            unit.originalY = 0;
            scene.squadUnits.push(unit);

            col++;
            if (col >= maxPerRow) {
                col = 0;
                row++;
            }
        }

        this.updateSquadPosition(scene.squadX);
    }

    updateSquadPosition(x) {
        const scene = this.scene;
        const totalUnits = scene.squadUnits.length;
        let s = Math.ceil(Math.sqrt(totalUnits));
        const maxPerRow = Math.min(s, CONFIG.MAX_UNITS_PER_LINE);
        const startY = CONFIG.CANVAS_HEIGHT - 100;
        let row = 0, col = 0;

        scene.squadUnits.forEach((unit) => {
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
        const scene = this.scene;
        scene.squadTargetX = Phaser.Math.Clamp(x, scene.laneWidth / 2, CONFIG.CANVAS_WIDTH - scene.laneWidth / 2);
    }

    update(delta) {
        const scene = this.scene;
        // Move squad towards target position
        const distance = scene.squadTargetX - scene.squadX;
        const maxMove = scene.squadSpeed * delta / 1000;

        if (Math.abs(distance) <= maxMove) {
            scene.squadX = scene.squadTargetX;
        } else {
            scene.squadX += Math.sign(distance) * maxMove;
        }

        this.updateSquadPosition(scene.squadX);
    }
}
