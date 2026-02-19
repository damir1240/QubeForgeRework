import * as THREE from "three";
import { PerspectiveCamera } from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { ATTACK_COOLDOWN } from "../constants/GameConstants";

export class PlayerCombat {
  private lastAttackTime: number = 0;

  constructor(
    _camera: PerspectiveCamera,
    _scene: THREE.Scene,
    _controls: PointerLockControls,
    _getSelectedSlotItem: () => number,
    _onToolUse?: (amount: number) => void,
    _cursorMesh?: THREE.Mesh,
    _crackMesh?: THREE.Mesh,
  ) {
    // Boilerplate kept for constructor signature compatibility
  }

  public performAttack(): boolean {
    const now = Date.now();
    if (now - this.lastAttackTime < ATTACK_COOLDOWN) return false;
    this.lastAttackTime = now;

    // For now, attack does nothing as we are removing old mobs
    return false;
  }
}
