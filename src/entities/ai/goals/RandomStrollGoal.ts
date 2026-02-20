import * as THREE from 'three';
import { Goal } from "./Goal";
import { Navigation } from "../pathfinding/Navigation";
import { World } from "../../../world/World";
import { BLOCK } from '../../../constants/Blocks';

export class RandomStrollGoal extends Goal {
    private entityPosition: THREE.Vector3;
    private navigation: Navigation;
    private world: World;
    private speed: number;

    private targetPos: THREE.Vector3 | null = null;
    private noPathTimer: number = 0;
    private cooldownTimer: number = 0;

    constructor(entityPosition: THREE.Vector3, navigation: Navigation, world: World, speed: number) {
        super();
        this.entityPosition = entityPosition;
        this.navigation = navigation;
        this.world = world;
        this.speed = speed;
    }

    public canStart(): boolean {
        // Don't start if already moving or recently failed to find path a lot
        if (this.noPathTimer > 0) {
            this.noPathTimer--;
            return false;
        }

        // Don't start if we are resting
        if (this.cooldownTimer > 0) {
            this.cooldownTimer--;
            return false;
        }

        // Randomly decide to wander (1/20 chance every update)
        if (Math.random() < 0.05) {
            const newPos = this.getRandomPosition();
            if (newPos) {
                this.targetPos = newPos;
                return true;
            }
        }
        return false;
    }

    public canContinue(): boolean {
        // Continue if we haven't reached the end of the path
        return this.navigation.hasPath();
    }

    public start(): void {
        if (this.targetPos) {
            const pathFound = this.navigation.moveTo(this.targetPos, this.speed);
            if (!pathFound) {
                this.noPathTimer = 60; // Wait a bit before trying to stroll again if stuck
            }
        }
    }

    public stop(): void {
        this.navigation.stop();
        this.targetPos = null;
        // Wait 2 to 5 seconds before next stroll
        this.cooldownTimer = 120 + Math.random() * 180;
    }

    public tick(): void {
        // Navigation system updates the movement physics separately, but we could do intermediate checks here
    }

    /** Find a random valid block to walk to within a 10-block radius max */
    private getRandomPosition(): THREE.Vector3 | null {
        // Quick 10 attempts to find a valid spot
        for (let i = 0; i < 10; i++) {
            const rx = (Math.random() * 2 - 1) * 10;
            const rz = (Math.random() * 2 - 1) * 10;

            const tx = Math.floor(this.entityPosition.x + rx);
            const tz = Math.floor(this.entityPosition.z + rz);
            let ty = Math.floor(this.entityPosition.y);

            // Very naive check: scan a bit up and down to find a surface
            let groundFound = false;
            for (let y = ty + 3; y >= ty - 3; y--) {
                const bFeet = this.world.getBlock(tx, y, tz);
                const bEyes = this.world.getBlock(tx, y + 1, tz);
                const bBelow = this.world.getBlock(tx, y - 1, tz);

                if (bFeet === BLOCK.AIR && bEyes === BLOCK.AIR && bBelow !== BLOCK.AIR) {
                    groundFound = true;
                    ty = y;
                    break;
                }
            }

            if (groundFound) {
                return new THREE.Vector3(tx + 0.5, ty, tz + 0.5);
            }
        }

        return null; // Failed to find a valid spot nearby
    }
}
