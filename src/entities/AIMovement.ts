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
        // We check just at the edge of the entity's boundary so it doesn't jump too early.
        // If entity width is 0.9, half width is 0.45. Let's check 0.5 ahead.
        const checkDist = 0.5;
        const checkPos = this.entity.position.clone().addScaledVector(dir, checkDist);

        const bx = Math.floor(checkPos.x);
        const by = Math.floor(checkPos.y);
        const bz = Math.floor(checkPos.z);

        // Block at feet level + 0 (ground level the entity is trying to walk into)
        const blockAtFeet = this.world.getBlock(bx, by, bz);
        const blockAtEyes = this.world.getBlock(bx, by + 1, bz); // Next block up
        const blockTwoAbove = this.world.getBlock(bx, by + 2, bz); // Ceiling check

        const obstacleAhead = (blockAtFeet !== 0 || blockAtEyes !== 0);
        const hasHeadroom = (blockTwoAbove === 0);

        // И дополнительно проверим, есть ли блок, на который можно запрыгнуть
        // В оригинале, если животное идет в стену и сверху пусто - оно всегда прыгает.
        if (obstacleAhead && hasHeadroom) {
            this.physics.jump(this.options.jumpForce);
        } else if (obstacleAhead && !hasHeadroom) {
            // Если над стеной тоже блок (т.е. стена высотой в 2+ блока),
            // мы не прыгаем, чтобы не биться головой, а просто останавливаемся.
            this.physics.velocity.x = 0;
            this.physics.velocity.z = 0;
        }
    }

    public setOptions(options: Partial<AutoJumpOptions>): void {
        this.options = { ...this.options, ...options };
    }
}
