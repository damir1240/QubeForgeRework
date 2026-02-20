import * as THREE from "three";
import { World } from "../world/World";
import { GRAVITY, ITEM_ENTITY } from "../constants/GameConstants";

export class ItemPhysics {
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private isOnGround: boolean = false;
  private groundY: number = 0;
  private attractionTarget: THREE.Vector3 | null = null;

  private world: World;
  private mesh: THREE.Mesh;

  constructor(world: World, mesh: THREE.Mesh) {
    this.world = world;
    this.mesh = mesh;
  }

  public update(time: number, delta: number) {
    if (this.attractionTarget) {
      this.applyAttraction(delta);
    } else if (!this.isOnGround) {
      this.applyGravity(delta);
      this.applyVelocity(delta);
      this.checkGroundCollision();
    } else {
      this.applyFloatingAnimation(time);
      this.checkGroundRemoved();
    }
  }

  public setVelocity(v: THREE.Vector3) {
    this.velocity.copy(v);
    this.isOnGround = false;
  }

  public attractTo(target: THREE.Vector3) {
    this.attractionTarget = target;
    this.isOnGround = false;
  }

  private applyAttraction(delta: number) {
    // Offset target to player's feet instead of camera/face
    const targetWithOffset = this.attractionTarget!.clone();
    targetWithOffset.y -= 1.0;

    const dir = new THREE.Vector3().subVectors(targetWithOffset, this.mesh.position);

    // Smoothly accelerate towards target (Reduced speed for better visuals)
    const speed = 2.0;
    dir.normalize().multiplyScalar(speed * delta);

    // Add existing velocity damping
    this.velocity.multiplyScalar(0.9);
    this.velocity.add(dir);

    this.mesh.position.add(this.velocity);

    // Stop attraction if target is lost (caller resets it usually)
    this.attractionTarget = null;
  }

  private applyGravity(delta: number) {
    this.velocity.y -= GRAVITY * delta;
  }

  private applyVelocity(delta: number) {
    this.mesh.position.x += this.velocity.x * delta;
    this.mesh.position.y += this.velocity.y * delta;
    this.mesh.position.z += this.velocity.z * delta;

    // Horizontal friction
    this.velocity.x *= 0.95;
    this.velocity.z *= 0.95;
  }

  private checkGroundCollision() {
    const x = Math.floor(this.mesh.position.x);
    const z = Math.floor(this.mesh.position.z);

    // Check block exactly at item's feet
    // Use a slightly larger epsilon for collision
    const feetY = this.mesh.position.y - ITEM_ENTITY.COLLISION_OFFSET;
    const blockY = Math.floor(feetY + 0.05);

    const block = this.world.getBlock(x, blockY, z);
    if (block !== 0) {
      this.isOnGround = true;
      this.velocity.set(0, 0, 0);

      // Snap to top of block
      this.groundY = blockY + 1 + ITEM_ENTITY.COLLISION_OFFSET;
      this.mesh.position.y = this.groundY;
    }
  }

  private applyFloatingAnimation(time: number) {
    const offset = Math.sin(time * ITEM_ENTITY.FLOAT_SPEED) * ITEM_ENTITY.FLOAT_AMPLITUDE;
    this.mesh.position.y = this.groundY + offset;
  }

  private checkGroundRemoved() {
    const x = Math.floor(this.mesh.position.x);
    const z = Math.floor(this.mesh.position.z);
    const blockY = Math.floor(this.groundY - 1 - ITEM_ENTITY.COLLISION_OFFSET);

    if (this.world.getBlock(x, blockY, z) === 0) {
      this.isOnGround = false;
    }
  }

  public getIsOnGround(): boolean {
    return this.isOnGround;
  }
}
