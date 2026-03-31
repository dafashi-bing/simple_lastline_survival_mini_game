# Last Line Survivor

Temporary working title.

## 1. Overview

### 1.1 Game Summary

Last Line Survivor is a 2D endless survival shooter designed for TikTok mini games. The player controls a squad that automatically fires at enemies while moving between three forward lanes to choose between squad growth, power acquisition, and combat pressure.

The game runs as a single endless survival mode with increasing difficulty over time. The core session goal is to survive as long as possible and achieve a high score.

### 1.2 Platform

* TikTok mini game
* Mobile portrait orientation

### 1.3 Target Session Length

* Typical run: 1 to 4 minutes
* Strong run: 5+ minutes

### 1.4 Core Pillars

* Immediate readability
* One-finger control
* Fast combat resolution
* Visible power growth through squad size
* High replayability through short survival runs

## 1.5 Engine

* Phaser

## 1.6 Configuration System

All game parameters are centralized in `src/game/config.js` for easy tuning, with over 50 configurable parameters covering all game systems.

## 1.7 Manager-Based Architecture

The codebase is organized into a modular manager-based architecture for better maintainability and scalability:

### Managers (`src/game/managers/`)
- **SquadManager**: Handles squad creation, formation, and movement
- **EnemyManager**: Manages enemy spawning, AI, and combat
- **BossManager**: Controls boss spawning, HP bars, and rewards
- **WallManager**: Manages growth and power wall spawning and movement
- **ProjectileManager**: Handles projectile firing, collision detection, and effects
- **UIManager**: Controls all HUD elements, boss HP bar, and debug panel
- **Pseudo3DManager**: Applies perspective transform and draws lane lines

### Utilities (`src/game/utils/`)
- **DepthManager**: Tracks and manages rendering depth for game objects
- **PowerUpManager**: Handles power-up application and state management

## 2. Core Gameplay

### 2.1 Player Objective

Survive as long as possible against infinite enemy waves while increasing squad size and combat effectiveness.

### 2.2 Control Scheme

* Player drags the unit left and right freely on the bottom
* Attacks are fully automatic
* No manual aiming
* No manual firing

### 2.3 Run Start State

At the start of a run:

* Player begins with 2 units (configurable: `INITIAL_SQUAD_COUNT: 2`)
* Initial damage: 2 (configurable: `INITIAL_DAMAGE: 2`)
* Initial fire rate: 1200ms (configurable: `INITIAL_FIRE_RATE: 1200`)
* No active power-up unless granted by ad buff or meta progression

## 3. Playfield and Lane Structure

### 3.1 Playfield Layout

The game uses a portrait-oriented forward battlefield with three lanes, each takes 1/3 of the screen:

* left lane (+1 unit amplifiers)
* center lane (enemies swarming in)
* right lane (special buffs)

The player squad is positioned near the lower portion of the screen. Incoming content approaches from the upper portion of the screen toward the player.

### 3.2 Lane Roles

At the default decision beat, the three lanes should be assigned distinct roles:

* one lane contains a squad-growth wall
* one lane contains an enemy wave

  * at one same horizontal level, it may have multiple enemies. But enemy units should not overlap.
* one lane contains a power wall

### 3.3 Forward Progression

The game is not stage-based. The battlefield continuously scrolls infinitely until player lost. 

### 3.4 Visual Rendering

#### Pseudo-3D Perspective
- Implemented pseudo-3D perspective transform for all game objects
- Configurable parameters:
  - `PSEUDO3D_MIN_SCALE`: 0.5 (minimum scale at top of screen)
  - `PSEUDO3D_MAX_SCALE`: 1.0 (maximum scale at bottom of screen)
  - `PSEUDO3D_PERSPECTIVE_STRENGTH`: 0.5

#### Lane Lines
- Visual lane dividers rendered with pseudo-3D perspective

#### Debug Panel
- Toggleable debug panel showing:
  - Squad count, fire rate, damage
  - Wall counts and HP
  - Enemy count and front HP
  - Boss count and active HP
  - Boss power-up stats (pierce, aoe radius, pushback strength)
- Configurable with `SHOW_DEBUG_PANEL` flag

## 4. Core Game Loop

### 4.1 Primary Loop

1. Start with 1 units
2. Player can move controlled unit(s) freely left and right
3. Auto-fire to the front

   1. Each bullet / projectile will always hit something. When hit, it will always -N (projectile damage) to the front most unit of the lane. So if hit left lane, it will -N to the front most +1 wall; if hit middle, it will -N to the front most enemy; if hit right, it will -N to the front most power wall
   2. Piercing/explosive projectile will deal multiple damages to multiple enemies, depending on the effect
4. Survive long enough to face elites and bosses
5. Continue until squad count reaches 0
6. Enter death, revive, or result flow

### 4.2 Secondary Loop

Outside a run:

* collect coins from results
* purchase permanent upgrades
* optionally watch ads for temporary run advantages
* start next run

## 5. Player Squad System

### 5.1 Squad Model

The player controls a squad made of one or multiple identical units.

Each unit shoots the same projectile by themselves to the front. The squad is represented both visually and mechanically through unit count. The squad's width should not exceed lane width (1/3 of the screen) and units should not overlap. If we have more units than the width, then we just "wrap" to 2nd line.

#### Implementation Details:
- `MAX_UNITS_PER_LINE: 6`
- `SQUAD_UNIT_SPACING: 20` (horizontal)
- `SQUAD_UNIT_ROW_SPACING: 17.5` (vertical)
- Dynamic formation based on sqrt(unit count)

### 5.2 Movement
- Player drags the unit left and right freely on the bottom
- Movement clamped to stay within lane boundaries
- **Smooth movement**: Squad moves towards target position at configurable speed (`SQUAD_SPEED: 400` pixels per second) instead of instantaneous jumps

### 5.2 Core Squad Stats

* Unit Count
* Damage Per Shot
* Fire Rate
* Move Speed
* Shield Capacity

### 5.3 Unit Count Rules

* Unit count is the primary scaling stat during a run
* More units means more shots fired
* If unit count reaches 0, the run ends
* Unit count should be clearly visible in gameplay and UI

### 5.4 Attack Behavior

* All units auto-fire forward

  * Each bullet / projectile will always hit something. When hit, it will always -N (projectile damage) to the front most unit of the lane. So if hit left lane, it will -N to the front most +1 wall; if hit middle, it will -N to the front most enemy; if hit right, it will -N to the front most power wall
  * Piercing/explosive projectile will deal multiple damages to multiple enemies, depending on the effect
* Doesn't affect friendly units
* Attack cadence is synchronized or near-synchronized for readability
* Weapon modifiers can change projectile behavior and damage

## 6. Player Power-Up System

### 6.1 Squad-Growth Wall

The squad-growth lane contains walls that increase unit count on contact.

MVP content:

* +1 squad wall

Future expansion:

* +2 squad wall
* +3 squad wall
* percentage-based growth wall

#### Wall HP Formula
Complex HP calculation formula with quadratic time scaling (slow start, faster later):
```
HP = baseHP + 
     scalePerSecond * (survivalTime^1.5) + 
     WALL_DESTROYED_COUNT_FACTOR * destroyedWallsCount + 
     WALL_GENERATED_COUNT_FACTOR * generatedWallsCount
```
- Configurable factors:
  - `WALL_DESTROYED_COUNT_FACTOR`: 4
  - `WALL_GENERATED_COUNT_FACTOR`: 1

#### Wall Movement
Walls continuously move downward at a constant speed (`WALL_MOVE_SPEED: 50` pixels per second). Back walls follow front walls while maintaining proper gap.

#### Wall Spawning
- Initial wall columns spawned from middle to top at game start
- New walls automatically added to top every 2 seconds
- Walls pushed forward with smooth tween animation when front wall is destroyed

### 6.2 Power Wall

The power lane contains one temporary or run-based combat modifier.

#### Implemented Power Wall Set (POC):

* `fireRate`: Multiplies fire rate by (1 - FIRE_RATE_BUFF) (15% buff, configurable)
* `damage`: Increases damage by 1 (configurable)
* `shield`: Increases shield by 5 (configurable)

#### Boss Power-Up System (New!):
After each boss defeat, game pauses and shows a dialogue with 3 random stronger power-ups to choose from:
* **Piercing Shot**: Projectiles pierce through +N enemies/walls (configurable)
* **Explosive Shot**: Projectiles have AOE damage with +N radius (configurable)
* **Push Back Shot**: Enemies and bosses hit are pushed back +N pixels (configurable)
* **Missile Support**: Clear the screen with a flashing effect!
All boss power-ups stack!

#### Power-Up Configuration:
- Fire rate: `MIN_FIRE_RATE: 300ms`, `FIRE_RATE_BUFF: 0.15` (15%)
- Damage: `DAMAGE_INCREMENT: 1`
- Shield: `SHIELD_INCREMENT: 5`
- Boss Power-Ups:
  - `BOSS_POWERUP_PIERCE_INCREMENT: 1`
  - `BOSS_POWERUP_AOE_INCREMENT: 50`
  - `BOSS_POWERUP_PUSHBACK_INCREMENT: 200`

#### Wall Movement
Walls continuously move downward at a constant speed (`WALL_MOVE_SPEED: 50` pixels per second). Back walls follow front walls while maintaining proper gap.

#### Wall Spawning
- Initial wall columns spawned from middle to top at game start
- New walls automatically added to top every 2 seconds
- Walls pushed forward with smooth tween animation when front wall is destroyed

### 6.3 Power-Up Rules

* Power-ups are granted when the squad destroys the power-up wall

* Power-ups apply immediately

* Power-ups last for the current run unless explicitly designed as one-time effects like missile, shield and freeze

* Each power 

### 6.4 Power-Up Stacking

* Allow most offensive power-ups to stack by category-specific rules
* Shield refreshes or adds capacity up to a cap
* Freeze Bomb does not stack as a passive effect

## 7. Enemy System

### 7.1 Enemy Spawn Logic

Enemies enter from the top area of the battlefield and move toward the player.

Enemy pressure scales over time using:

* spawn rate
* movement speed
* hp

#### Implementation Details:
- Enemy rows spawn in middle lane
- Enemy count per row scales with time: `6 + floor(survivalTime / 10)`
- Wave interval decreases over time:
  - Base: `WAVE_INTERVAL_BASE: 500ms`
  - Min: `WAVE_INTERVAL_MIN: 100ms`
  - Reduction: `WAVE_INTERVAL_REDUCTION_PER_SECOND: 5ms`

### 7.2 Enemy Types

#### Grunt

* **Two-phase movement**:
  1. **Charge phase**: Simple forward movement straight down the battlefield
  2. **Engage phase**: When enemy reaches (front-most squad unit's Y position + `ENEMY_ENGAGE_Y`), it steers directly toward the nearest squad unit
* baseline enemy
* when grunt collides with player squad, it stops moving and attacks once per second (ENEMY_ATTACK_INTERVAL: 1000ms)
* each attack deals -1 unit or -1 shield (configurable)

### 7.3 Enemy Stats (Implementation)
- HP scales every 15 seconds: `ENEMY_HP_SCALE_PER_15_SECONDS: 3`
- Speed scales every second: `ENEMY_SPEED_SCALE_PER_SECOND: 0.5`

## 8. Boss System

### 8.1 Boss Frequency

* First boss spawn: `FIRST_BOSS_SPAWN_TIME: 20000` (20 seconds, configurable)
* Subsequent bosses: Every `BOSS_SPAWN_INTERVAL: 20000` (20 seconds, configurable)

### 8.2 Boss Rules

* Bosses use a visible HP bar (containerized UI element with background, fill bar, and current/max HP text)
* Bosses are much bigger than normal enemies, has priority in spacing and spawning, but still don't overlap
* Bosses can be pushed back by projectiles with push back power-up
* When boss collides with player squad, it stops moving and attacks twice per second (`BOSS_ATTACK_INTERVAL: 500ms`)
* Boss attacks deal 5 damage each (configurable)

### 8.3 Boss Implementation Details

#### Boss Rewards
- Boss kill replaces old rewards (+units/+shield) with a **Boss Reward Dialogue** (game pauses):
  - Player chooses 1 of 3 random stronger power-ups from 4 options
  - Power-ups include: Piercing Shot, Explosive Shot, Push Back Shot, Missile Support
  - All power-ups stack!

#### Boss HP Scaling
- Exponential HP growth per boss spawned: `BOSS_HP_SCALE_FACTOR_PER_BOSS: 1.5`
- Formula: `maxHp = BOSS_BASE_HP * (scaleFactor ^ bossesSpawned)`

#### Boss Damage
- `BOSS_DAMAGE: 5` - damage per boss attack

### 8.4 MVP Bosses

#### Giant Brute

* moves slowly toward player
* releases slam shockwaves
* each slam does N amount of damage to shield or removes N amount of squad units 

## 9. Combat Rules and Damage Model

### 9.1 Player Damage Output

* Each unit contributes one attack instance according to current fire rate and weapon modifiers
* Power-ups can modify damage, projectile behavior, or crowd control

### 9.2 Incoming Damage Rules

* Collision with a normal enemy removes 1 unit or 1 shield hp

* Boss attacks may remove multiple units at once

* Shield absorbs incoming damage before unit count is reduced

### 9.3 Shield Rules

* Shield is a temporary buffer that absorbs a fixed amount of incoming hits or damage
* Shield can be granted by power wall, revive effect, or ad buff
* Shield value should have a visible UI indicator

### 9.4 Failure Condition

The run ends when unit count reaches 0.

## 10. Difficulty and Survival Scaling

### 10.1 Scaling Variables

Difficulty should increase over survival time through a combination of:

* faster enemy spawn cadence
* increased enemy movement speed
* boss HP growth and attack

### 10.2 Recommended Time Bands

#### 0 to 15 seconds

* onboarding difficulty
* low enemy density
* minimal projectile pressure

#### 15 to 60 seconds

* core loop fully active
* mixed enemy types begin appearing
* first boss cycles establish pacing

#### 60 to 180 seconds

* frequent danger states
* heavier lane pressure
* more elite and projectile density

#### 180+ seconds

* high-density survival state
* intended for top runs and score chasing

## 11. Run Milestones and Scoring

### 11.1 Milestones

Milestones should be recorded at:

* 30 seconds
* 60 seconds
* 120 seconds
* 180 seconds
* continuing by time interval thereafter

### 11.2 Score Model

MVP score can be based on:

* survival time
* boss kills
* optional enemy kill contribution

Recommended primary score display:

* survival time as headline score
* optional secondary stat: enemies defeated

## 12. UI and UX Requirements

### 12.1 In-Run HUD

Required HUD elements:

* current unit count
* shield status
* current score or survival time
* boss HP bar when boss is active

### 12.2 Start Screen

Required elements:

* Start button
* permanent upgrade entry point
* ad buff buttons
* best score display

### 12.3 Death / Result Screen

Required elements:

* run score
* best score comparison
* coins earned
* revive option if revive is still available
* post-run reward multiplier ad option
* restart button

### 12.4 UX Requirements

* controls must respond instantly
* lane destination must be visually obvious
* collision outcomes must be readable immediately
* all critical combat information must be visible without extra menus

## 13. Monetization and Rewarded Ads

### 13.1 Permanent Ad Buff Buttons

Place three permanent optional ad buttons in the start screen UI:

* Start with +5 units
* Start with rare weapon
* Start with shield

Rules:

* player may activate before starting a run
* each activated effect applies only to the next run
* button state resets after run ends

### 13.2 Mid-Run Emergency Ad Offer

Allow one optional mid-run emergency support offer.

Possible effects:

* Airstrike
* Mega Turret support
* Freeze all enemies
* Heal and gain shield

Trigger conditions:

* squad count below threshold
* enemy density above threshold
* boss active while squad is weak

MVP recommendation:

* only trigger at most once per run

### 13.3 Revive Ad

On death, offer one revive ad per run.

Revive effect:

* restore a meaningful portion of squad count
* grant 3 seconds of invulnerability
* optionally grant a small shield

### 13.4 Post-Run Reward Ad

After final death, allow optional reward multiplication.

MVP options:

* double coins
* bonus chest
* extra roll for next-run bonus

### 13.5 Ads to Avoid

Do not place ads:

* after every small pickup
* every fixed short interval
* in nested multi-step popups during core combat

## 14. Meta Progression

### 14.1 Currencies

MVP currency:

* Coins

Optional future currency:

* Gems

### 14.2 Permanent Upgrades

MVP permanent upgrades:

* Start Unit Count +1
* Base Damage %
* Move Speed %
* Starting Shield Chance
* Better Power Wall Spawn Chance

### 14.3 Unlockables

Optional post-MVP unlockables:

* additional weapon types
* skins
* support units
* passive perks

## 15. Art and Presentation Requirements

### 15.1 Visual Style

* 2D
* bright and saturated
* clean silhouettes
* exaggerated hit effects
* readable character grouping

### 15.2 Color Language

* Player: blue/cyan
* Enemies: red/orange
* Elite/Boss emphasis: purple or dark red accents
* Buffs: green/yellow
* Ad-triggered special effects: gold

### 15.3 Camera and Composition

* portrait framing
* player squad positioned near lower-middle of screen
* incoming threats from upper screen area
* lane content must remain readable in advance

## 16. Audio Requirements

### 16.1 Audio Priorities

MVP audio should include:

* continuous firing loop or burst rhythm
* enemy hit and death sounds
* squad gain sound
* power-up pickup sound
* boss warning cue
* death cue
* UI click sounds

### 16.2 Audio Goals

* reinforce combat speed
* clearly signal gain vs danger states
* keep sounds short and readable on mobile speakers

## 17. MVP Scope

### 17.1 MVP Feature List

* one endless survival mode
* one map/background
* one player squad type
* three-lane movement system
* four enemy types
* two bosses
* seven power/growth lane contents
* revive ad
* post-run reward ad
* permanent ad buff buttons
* basic permanent upgrade system

### 17.2 MVP Exclusions

Do not include in MVP unless needed later:

* multiple playable characters
* multiple maps
* deep loadout system
* manual aiming
* stage-based campaign
* complex narrative framing

## 18. Open Implementation Notes

### 18.1 Balancing Priorities

Balance should focus on:

* strong early readability
* frequent unit growth moments
* short but dangerous boss encounters
* revive value being meaningful but not mandatory
* run duration suitable for repeat sessions

### 18.2 Engineering Priorities

Engineering should prioritize:

* stable lane generation
* reliable unit-count-based combat resolution
* clear collision results
* scalable enemy spawn timing
* ad integration points being modular

## 19. One-Sentence Product Definition

A 2D portrait endless survival shooter where the player moves a growing auto-firing squad between three lanes to collect unit growth, gain combat powers, and survive escalating enemy waves.
