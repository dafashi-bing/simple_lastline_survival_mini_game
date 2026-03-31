import { CONFIG } from '../config.js';

export class WallManager {
    constructor(scene) {
        this.scene = scene;
    }

    spawnWall(laneIndex, type, powerType = null, y = null) {
        const scene = this.scene;
        const x = scene.laneWidth * laneIndex + scene.laneWidth / 2;
        const wallY = y !== null ? y : -100;
        const width = scene.laneWidth * CONFIG.WALL_WIDTH_RATIO;
        const height = CONFIG.WALL_HEIGHT;

        const baseHp = type === 'growth' ? CONFIG.GROWTH_WALL_BASE_HP : CONFIG.POWER_WALL_BASE_HP;
        const scalePerSecond = type === 'growth' ? CONFIG.GROWTH_WALL_HP_SCALE_PER_SECOND : CONFIG.POWER_WALL_HP_SCALE_PER_SECOND;
        const destroyedCount = scene.destroyedWallsCount[laneIndex];
        const generatedCount = scene.generatedWallsCount[laneIndex];
        const hp = baseHp + scalePerSecond * Math.pow(scene.survivalTime, 1.5) + CONFIG.WALL_DESTROYED_COUNT_FACTOR * destroyedCount + CONFIG.WALL_GENERATED_COUNT_FACTOR * generatedCount;

        const wallDepth = scene.depthManager.getNextDepth();
        const wall = scene.add.rectangle(x, wallY, width, height, type === 'growth' ? 0x00ff00 : 0xffff00);
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
                case 'squadSpeed':
                    labelText = 'SPEED';
                    break;
            }
        }

        wall.label = scene.add.text(x, wallY, labelText, {
            fontFamily: 'Arial Black', fontSize: 18, color: '#000000'
        }).setOrigin(0.5);
        wall.label.setDepth(wallDepth + 1);
        wall.label.originalX = x;
        wall.label.originalY = wallY;

        if (CONFIG.SHOW_DEBUG_PANEL) {
            wall.hpLabel = scene.add.text(x, wallY + height / 2 + 15, `${wall.hp}`, {
                fontFamily: 'Arial Black', fontSize: 14, color: '#ffffff',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(100);
            wall.hpLabel.originalX = x;
            wall.hpLabel.originalY = wallY + height / 2 + 15;
        }

        scene.walls.push(wall);
        scene.generatedWallsCount[laneIndex]++;
        return wall;
    }

    spawnWallColumn(laneIndex, type) {
        const laneTop = 0;
        let currentY = CONFIG.FRONT_WALL_Y;
        const maxY = CONFIG.CANVAS_HEIGHT / 2;

        while (currentY > laneTop) {
            const powerType = type === 'power' ? Phaser.Utils.Array.GetRandom(['fireRate', 'damage', 'shield', 'squadSpeed']) : null;
            this.spawnWall(laneIndex, type, powerType, currentY);
            currentY -= (CONFIG.WALL_HEIGHT + CONFIG.WALL_GAP);
        }
    }

    pushWallColumnForward(laneIndex, type, count = 1) {
        const scene = this.scene;
        const laneWalls = scene.walls.filter(w => w.lane === laneIndex);
        laneWalls.sort((a, b) => b.originalY - a.originalY);

        const distance = (CONFIG.WALL_HEIGHT + CONFIG.WALL_GAP) * count;

        const tweenTargets = laneWalls.map(wall => ({ 
            wall, 
            label: wall.label, 
            hpLabel: wall.hpLabel 
        }));

        scene.tweens.addCounter({
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
        const scene = this.scene;
        let currentTopWall = scene.walls
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

    spawnNewWalls() {
        const scene = this.scene;
        // Spawn new walls if needed
        const topGrowthWall = scene.walls
            .filter(w => w.lane === 0 && w.type === 'growth')
            .sort((a, b) => a.y - b.y)[0];
        if (!topGrowthWall || topGrowthWall.y > -100) {
            this.spawnWall(0, 'growth');
        }

        const topPowerWall = scene.walls
            .filter(w => w.lane === 2 && w.type === 'power')
            .sort((a, b) => a.y - b.y)[0];
        if (!topPowerWall || topPowerWall.y > -100) {
            const powerType = Phaser.Utils.Array.GetRandom(['fireRate', 'damage', 'shield', 'squadSpeed']);
            this.spawnWall(2, 'power', powerType);
        }
    }

    update(delta) {
        const scene = this.scene;
        // Process walls per lane, sorted from bottom to top
        [0, 2].forEach(laneIndex => {
            const laneWalls = scene.walls.filter(w => w.lane === laneIndex);
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

    removeWall(wall) {
        const scene = this.scene;
        const idx = scene.walls.indexOf(wall);
        if (idx !== -1) {
            scene.walls.splice(idx, 1);
        }
        if (wall.label) wall.label.destroy();
        if (wall.hpLabel) wall.hpLabel.destroy();
        wall.destroy();
    }
}
