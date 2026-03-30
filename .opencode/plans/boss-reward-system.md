# Boss Defeat Reward System Implementation Plan

## Overview
Replace existing boss rewards (units + shield) with a new power-up choice system where players select 1 of 3 random stronger power-ups after each boss defeat.

## Configuration Updates (`config.js`)
Add new constants for the boss power-ups:
- `BOSS_POWERUP_PIERCE_INCREMENT: 1`
- `BOSS_POWERUP_AOE_INCREMENT: 1`
- `BOSS_POWERUP_PUSHBACK_INCREMENT: 1`

## Game State Additions (`Game.js`)
Add new state variables to track:
- `pierceCount: 0` - how many enemies a projectile can pierce through
- `aoeRadius: 0` - area of effect explosion radius
- `pushbackStrength: 0` - how far to push enemies back
- `isPaused: false` - game pause state

## Boss Reward Dialogue UI
Create a new UI container in `create()` method:
- Dark semi-transparent overlay background
- Title text "BOSS DEFEATED! Choose Your Power-Up"
- 3 clickable buttons for random power-up choices
- Each button shows power-up name and description

## Pause Functionality
- Add `isPaused` flag check in `update()` method
- When paused, skip all game logic updates
- Only update dialogue UI when paused

## Boss Death Logic Modification
- Replace old reward logic in `onBossDeath()`
- Pause the game
- Select 3 random unique power-ups from the 4 options
- Show the reward dialogue

## Power-Up Application Logic
Create `applyBossPowerup(type)` method:
- `piercingShot`: Increase `pierceCount`
- `explosiveShot`: Increase `aoeRadius`
- `pushbackShot`: Increase `pushbackStrength`
- `missileSupport`: Trigger screen flash + clear all enemies

## Projectile System Updates
Modify `updateProjectiles()` to:
- Track pierce count per projectile
- Apply AOE damage when enemy hit
- Apply pushback to hit enemies

## Missile Support Effect
- Create full-screen white rectangle that fades in/out
- Destroy all enemies when flash completes

## Debug Panel Updates
Add new stats to debug panel display:
- Pierce Count
- AOE Radius
- Pushback Strength

## Power-Up Types
1. **Piercing Shot**: Projectiles pierce through +N enemies
2. **Explosive Shot**: Projectiles have AOE damage with +N radius
3. **Push Back Shot**: Enemies hit are pushed back +N pixels
4. **Missile Support**: Clear screen with flash effect
