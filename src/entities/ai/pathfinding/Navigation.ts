import * as THREE from 'three';
import { EntityPhysics } from "../../EntityPhysics";
import { World } from "../../../world/World";
import { Pathfinder } from "./Pathfinder";

export class Navigation {
    private physics: EntityPhysics;
    private entity: THREE.Object3D;
    private pathfinder: Pathfinder;

    private currentPath: THREE.Vector3[] | null = null;
    private currentPathIndex: number = 0;

    private speed: number = 1.0;
    private reachDistanceSq: number = 0.25; // 0.5^2

    private lastPosition: THREE.Vector3 = new THREE.Vector3();
    private stuckTimer: number = 0;

    constructor(physics: EntityPhysics, world: World, entity: THREE.Object3D) {
        this.physics = physics;
        this.entity = entity;
        this.pathfinder = new Pathfinder(world);
    }

    /**
     * Tries to generate and start navigating to a target.
     */
    public moveTo(targetPos: THREE.Vector3, speed: number): boolean {
        const newPath = this.pathfinder.findPath(this.entity.position, targetPos);
        if (newPath && newPath.length > 0) {
            this.currentPath = newPath;
            this.currentPathIndex = 0;
            this.speed = speed;
            this.lastPosition.copy(this.entity.position);
            this.stuckTimer = 0;
            return true;
        }
        return false;
    }

    public stop(): void {
        this.currentPath = null;
        this.stuckTimer = 0;
        this.physics.velocity.x = 0;
        this.physics.velocity.z = 0;
    }

    public hasPath(): boolean {
        return this.currentPath !== null && this.currentPathIndex < this.currentPath.length;
    }

    public update(_delta: number): void {
        if (!this.hasPath()) {
            // Slowly decelerate or just stop
            this.physics.velocity.x = 0;
            this.physics.velocity.z = 0;
            return;
        }

        const pos = this.entity.position;

        // Stuck detection
        const moveDistSq = pos.distanceToSquared(this.lastPosition);
        if (moveDistSq < 0.0001) {
            this.stuckTimer++;
            if (this.stuckTimer > 30) { // Stuck for ~0.5s at 60fps
                this.stop(); // Cancels the path
                return;
            }
        } else {
            this.stuckTimer = 0;
        }
        this.lastPosition.copy(pos);

        const targetNode = this.currentPath![this.currentPathIndex];

        // Vector to target on XZ plane
        const dx = targetNode.x - pos.x;
        const dz = targetNode.z - pos.z;
        const distSq = dx * dx + dz * dz;

        // If reached the target node horizontally
        if (distSq < this.reachDistanceSq) {
            this.currentPathIndex++;
            if (!this.hasPath()) {
                this.stop();
                return;
            }
        }

        // Check if we need to jump (the next node is higher than our current Y and we are close to it)
        const dy = targetNode.y - Math.floor(pos.y);
        if (dy > 0 && this.physics.isOnGround) {
            // Jump if we are moving against a wall or the target is higher
            this.physics.jump(6.5); // Use standard jump force
        }

        // Apply velocity towards target node
        const moveDir = new THREE.Vector3(dx, 0, dz).normalize();
        this.physics.velocity.x = moveDir.x * this.speed;
        this.physics.velocity.z = moveDir.z * this.speed;
    }
}
