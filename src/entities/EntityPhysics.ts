import * as THREE from 'three';
import { World } from '../world/World';
import { GRAVITY } from '../constants/GameConstants';

/**
 * SRP: Responsibility - Managing kinematic physics for entities (gravity, simple AABB-to-world collision).
 */
export class EntityPhysics {
    public velocity: THREE.Vector3 = new THREE.Vector3();
    public isOnGround: boolean = false;

    private world: World;
    private entity: THREE.Object3D;
    private width: number;
    private height: number;

    constructor(world: World, entity: THREE.Object3D, width: number = 0.6, height: number = 1.8) {
        this.world = world;
        this.entity = entity;
        this.width = width;
        this.height = height;
    }

    public update(delta: number): void {
        // Apply Gravity
        if (!this.isOnGround) {
            this.velocity.y -= GRAVITY * delta;
        } else if (this.velocity.y < 0) {
            this.velocity.y = 0;
        }

        // Apply Velocity
        const move = this.velocity.clone().multiplyScalar(delta);

        // Horizontal Collision (Simple)
        this.entity.position.x += move.x;
        if (this.checkCollision()) {
            this.entity.position.x -= move.x;
            this.velocity.x = 0;
        }

        this.entity.position.z += move.z;
        if (this.checkCollision()) {
            this.entity.position.z -= move.z;
            this.velocity.z = 0;
        }

        // Vertical Collision
        this.entity.position.y += move.y;
        this.isOnGround = false;

        if (this.checkCollision()) {
            if (this.velocity.y < 0) {
                this.isOnGround = true;
                this.entity.position.y = Math.ceil(this.entity.position.y);
            } else {
                this.entity.position.y -= move.y;
            }
            this.velocity.y = 0;
        }

        // Check if ground removed
        if (this.isOnGround) {
            this.entity.position.y -= 0.01;
            if (!this.checkCollision()) {
                this.isOnGround = false;
            }
            this.entity.position.y += 0.01;
        }
    }

    private checkCollision(): boolean {
        const halfWidth = this.width / 2;
        const minX = Math.floor(this.entity.position.x - halfWidth);
        const maxX = Math.floor(this.entity.position.x + halfWidth);
        const minY = Math.floor(this.entity.position.y);
        const maxY = Math.floor(this.entity.position.y + this.height);
        const minZ = Math.floor(this.entity.position.z - halfWidth);
        const maxZ = Math.floor(this.entity.position.z + halfWidth);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                    if (this.world.getBlock(x, y, z) !== 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}
