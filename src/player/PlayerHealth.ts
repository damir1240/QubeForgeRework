import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { INVULNERABILITY_DURATION } from '../constants/GameConstants';
import { logger } from '../utils/Logger';
import { eventManager } from '../core/EventManager';
import { GameEvents, type PlayerDamageEvent, type PlayerHealthEvent } from '../core/GameEvents';

export class PlayerHealth {
  private hp: number = 20;
  private readonly maxHp: number = 20;
  private isInvulnerable: boolean = false;

  // UI dependencies removed/optional? 
  // For now, removing them to enforce decoupling.

  private camera: THREE.PerspectiveCamera;
  private controls: PointerLockControls;
  private checkCollision: (position: THREE.Vector3) => boolean;
  private onRespawn?: () => void;

  constructor(
    camera: THREE.PerspectiveCamera,
    controls: PointerLockControls,
    checkCollision: (position: THREE.Vector3) => boolean,
    onRespawn?: () => void
  ) {
    this.camera = camera;
    this.controls = controls;
    this.checkCollision = checkCollision;
    this.onRespawn = onRespawn;
  }

  public getHp(): number {
    return this.hp;
  }

  public getMaxHp(): number {
    return this.maxHp;
  }

  public isInvulnerableNow(): boolean {
    return this.isInvulnerable;
  }

  public takeDamage(amount: number): void {
    if (this.isInvulnerable) return;

    this.hp -= amount;
    if (this.hp < 0) this.hp = 0;

    // Emit event instead of direct UI update
    eventManager.emit<PlayerHealthEvent>(GameEvents.PLAYER_HEALTH_CHANGED, {
      current: this.hp,
      max: this.maxHp
    });

    eventManager.emit<PlayerDamageEvent>(GameEvents.PLAYER_DAMAGE, {
      amount,
      current: this.hp,
      max: this.maxHp
    });

    this.isInvulnerable = true;

    // Camera Shake logic can remain here as it is "Player" logic (view), or move to CameraSystem?
    // Keeping it here for now as it affects the camera directly.

    // Camera Shake
    const originalPos = this.camera.position.clone();
    const shakeIntensity = 0.2;

    // Apply shake
    this.camera.position.x += (Math.random() - 0.5) * shakeIntensity;
    this.camera.position.y += (Math.random() - 0.5) * shakeIntensity;
    this.camera.position.z += (Math.random() - 0.5) * shakeIntensity;

    // Verify valid position
    if (this.checkCollision(this.camera.position)) {
      this.camera.position.copy(originalPos);
    }

    if (this.hp <= 0) {
      this.respawn();
    }

    setTimeout(() => {
      this.isInvulnerable = false;
    }, INVULNERABILITY_DURATION);
  }

  public respawn(): void {
    this.hp = this.maxHp;

    eventManager.emit(GameEvents.PLAYER_RESPAWN, {});
    eventManager.emit<PlayerHealthEvent>(GameEvents.PLAYER_HEALTH_CHANGED, {
      current: this.hp,
      max: this.maxHp
    });

    this.isInvulnerable = false;

    // Teleport to spawn
    this.controls.object.position.set(8, 40, 8);

    if (this.onRespawn) {
      this.onRespawn();
    }

    logger.info("Player respawned");
  }

  public setHp(hp: number): void {
    this.hp = Math.max(0, Math.min(hp, this.maxHp));

    eventManager.emit<PlayerHealthEvent>(GameEvents.PLAYER_HEALTH_CHANGED, {
      current: this.hp,
      max: this.maxHp
    });
  }
}

