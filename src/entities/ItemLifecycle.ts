import * as THREE from "three";
import { ITEM_ENTITY } from "../constants/GameConstants";

export class ItemLifecycle {
  private creationTime: number;
  private mesh: THREE.Mesh;
  public isDead: boolean = false;

  constructor(mesh: THREE.Mesh) {
    this.mesh = mesh;
    this.creationTime = performance.now();
  }

  public update(): boolean {
    const age = performance.now() - this.creationTime;

    if (age > ITEM_ENTITY.DESPAWN_TIME) {
      this.isDead = true;
      return false;
    }

    this.updateVisibility(age);
    return true;
  }

  private updateVisibility(age: number) {
    if (age > ITEM_ENTITY.MAX_AGE - ITEM_ENTITY.BLINK_START) {
      // Blink effect before despawn
      this.mesh.visible = Math.floor(age / ITEM_ENTITY.BLINK_INTERVAL) % 2 === 0;
    } else {
      this.mesh.visible = true;
    }
  }

  public getAge(): number {
    return performance.now() - this.creationTime;
  }
}
