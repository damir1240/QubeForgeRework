import * as THREE from 'three';
import { EntityPhysics } from './EntityPhysics';
import { World } from '../world/World';

export interface AutoJumpOptions {
    enabled: boolean;
    jumpForce: number;
    maxStepHeight: number; // For now we only support 1 block, but good for config
}

/**
 * SRP: Responsibility - Managing AI movement behaviors like obstacle detection and auto-jumping.
 */
export class AIMovement {
    private physics: EntityPhysics;
    private world: World;
    private entity: THREE.Object3D;
    private options: AutoJumpOptions;

    constructor(physics: EntityPhysics, world: World, entity: THREE.Object3D, options: AutoJumpOptions) {
        this.physics = physics;
        this.world = world;
        this.entity = entity;
        this.options = options;
    }

    public update(): void {
        if (this.options.enabled) {
            this.handleAutoJump();
        }
    }

    private handleAutoJump(): void {
        if (!this.physics.isOnGround) return;

        // Check if moving
        const horizontalSpeed = new THREE.Vector3(this.physics.velocity.x, 0, this.physics.velocity.z).lengthSq();
        if (horizontalSpeed < 0.01) return;

        // Determine look direction based on velocity
        const dir = new THREE.Vector3(this.physics.velocity.x, 0, this.physics.velocity.z).normalize();

        // Raycast-like check: check blocks in front of the entity at feet level and eye level
        // We check a small distance ahead of the entity's boundary
        const checkDist = 0.6;
        const checkPos = this.entity.position.clone().addScaledVector(dir, checkDist);

        const bx = Math.floor(checkPos.x);
        const by = Math.floor(checkPos.y);
        const bz = Math.floor(checkPos.z);

        // Block at feet level + 0 (ground level the entity is trying to walk into)
        const blockAtFeet = this.world.getBlock(bx, by, bz);
        const blockAtEyes = this.world.getBlock(bx, by + 1, bz); // Next block up
        const blockTwoAbove = this.world.getBlock(bx, by + 2, bz); // Ceiling check

        // If there's a block in front (at feet or eyes level) and NO block 2 levels above
        // This means it's a 1-block step or a slab/small obstacle.
        if ((blockAtFeet !== 0 || blockAtEyes !== 0) && blockTwoAbove === 0) {
            this.physics.jump(this.options.jumpForce);
        }
    }

    public setOptions(options: Partial<AutoJumpOptions>): void {
        this.options = { ...this.options, ...options };
    }
}
