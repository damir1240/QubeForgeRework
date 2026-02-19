import * as THREE from 'three';
import { World } from '../world/World';
import type { IEntity } from '../entities/IEntity';
import { SpawnRegistry } from './SpawnRegistry';
import type { SpawnRule } from './SpawnRegistry';
import type { IPlayer } from '../player/IPlayer';

/**
 * SRP: Responsibility - Managing the spawning of entities based on rules and proximity.
 */
export class SpawnSystem {
    private scene: THREE.Scene;
    private world: World;
    private entities: IEntity[];
    private player: IPlayer;
    private lastSpawnTime: number = 0;
    private spawnInterval: number = 5.0; // Global check every 5 seconds

    constructor(scene: THREE.Scene, world: World, entities: IEntity[], player: IPlayer) {
        this.scene = scene;
        this.world = world;
        this.entities = entities;
        this.player = player;
    }

    public update(time: number): void {
        if (time - this.lastSpawnTime < this.spawnInterval) return;
        this.lastSpawnTime = time;

        const rules = SpawnRegistry.getRules();
        const playerPos = this.player.getPosition();

        for (const rule of rules) {
            this.attemptSpawn(rule, playerPos);
        }
    }

    private attemptSpawn(rule: SpawnRule, playerPos: THREE.Vector3): void {
        // 1. Count existing mobs of this type
        const currentCount = this.entities.filter(e => e.constructor === rule.mobClass).length;
        if (currentCount >= rule.maxTotal) return;

        // 2. Pick a random position
        const angle = Math.random() * Math.PI * 2;
        const dist = rule.minRadius + Math.random() * (rule.spawnRadius - rule.minRadius);

        const x = Math.floor(playerPos.x + Math.cos(angle) * dist);
        const z = Math.floor(playerPos.z + Math.sin(angle) * dist);

        // 3. Find ground height
        let y = 0;
        let groundFound = false;
        for (let searchY = 128; searchY > 0; searchY--) {
            if (this.world.getBlock(x, searchY, z) !== 0) {
                y = searchY + 1;
                groundFound = true;
                break;
            }
        }

        if (!groundFound) return;

        // 4. Spawn group
        const groupSize = rule.minGroupSize + Math.floor(Math.random() * (rule.maxGroupSize - rule.minGroupSize + 1));

        for (let i = 0; i < groupSize; i++) {
            const spawnX = x + (Math.random() - 0.5) * 4;
            const spawnZ = z + (Math.random() - 0.5) * 4;

            const mob = new rule.mobClass(this.scene, this.world);
            mob.position.set(spawnX, y, spawnZ);
            this.entities.push(mob);
        }

        console.log(`[SpawnSystem] Spawned group of ${groupSize} ${rule.mobId} at ${x}, ${y}, ${z}`);
    }
}
