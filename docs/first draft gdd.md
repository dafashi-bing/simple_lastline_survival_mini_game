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

* Player begins with 1 units
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

Each squad wall will have X hp

Squad-growth wall doesn't move forward unless the front one being destroyed. So the front most wall should always stay in the same position.

### 6.2 Power Wall

The power lane contains one temporary or run-based combat modifier.

MVP power set:

* Fire Rate Up
* Piercing Shots (+1 pierce)
* Explosive Shots (+X aoe)
* Push Back Shot 
* Missile Support (clears the screen)
* Shield (absorbs enemy damage)
* Freeze Bomb (freezes enemies)

Power wall doesn't move forward unless the front most one being destroyed. So the front most wall should always stay in the same position. 

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

### 7.2 Enemy Types

#### Grunt

* simple forward movement
* baseline enemy
* if any grunt collide with player squad, -1 unit or -1 shield per second

## 8. Boss System

### 8.1 Boss Frequency

* Spawn one boss every 30 seconds

### 8.2 Boss Rules

* Bosses use a visible HP bar

* Bosses are much bigger than normal enemies, has priority in spacing and spawning, but still don't overlap

### 8.3 MVP Bosses

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
