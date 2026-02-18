import * as THREE from "three";
import { worldDB } from "../utils/DB";
import { ChunkManager } from "./chunks/ChunkManager";
import { logger } from "../utils/Logger";
import { getBreakTime as registryGetBreakTime } from "../constants/BlockRegistry";
import type { SerializedInventory } from "../types/Inventory";

/** Метаданные мира, хранимые в IndexedDB */
interface WorldMeta {
  seed?: number;
  position: { x: number; y: number; z: number };
  inventory?: SerializedInventory;
}

export class World {
  private chunkManager: ChunkManager;


  constructor(scene: THREE.Scene) {
    this.chunkManager = new ChunkManager(scene);
  }

  public get noiseTexture(): THREE.Texture | null {
    return this.chunkManager.getNoiseTexture();
  }

  // Persistence
  public async loadWorld(): Promise<{
    playerPosition?: THREE.Vector3;
    inventory?: SerializedInventory;
  }> {
    await this.chunkManager.init();

    const meta = await worldDB.get<WorldMeta>("player", "meta");

    if (meta?.seed !== undefined) {
      this.chunkManager.setSeed(meta.seed);
      logger.debug(`Loaded seed: ${meta.seed}`);
    } else {
      logger.debug(`No seed found, using current: ${this.chunkManager.getSeed()}`);
    }

    return meta
      ? {
        playerPosition: new THREE.Vector3(
          meta.position.x,
          meta.position.y,
          meta.position.z,
        ),
        inventory: meta.inventory,
      }
      : {};
  }

  public async saveWorld(playerData: {
    position: THREE.Vector3;
    inventory: SerializedInventory;
  }) {
    logger.info("Saving world...");

    await worldDB.set(
      "player",
      {
        position: {
          x: playerData.position.x,
          y: playerData.position.y,
          z: playerData.position.z,
        },
        inventory: playerData.inventory,
        seed: this.chunkManager.getSeed(),
      },
      "meta",
    );

    await this.chunkManager.saveDirtyChunks();
    logger.info("World saved");
  }

  public async deleteWorld() {
    logger.info("Deleting world...");
    await worldDB.init();
    await this.chunkManager.clear();
    logger.info("World deleted");
  }

  // Chunk operations
  public update(playerPos: THREE.Vector3) {
    this.chunkManager.update(playerPos);
  }

  public updateChunkVisibility(camera: THREE.Camera) {
    this.chunkManager.updateVisibility(camera);
  }

  public async loadChunk(cx: number, cz: number) {
    await this.chunkManager.loadChunk(cx, cz);
  }

  public async waitForChunk(cx: number, cz: number): Promise<void> {
    await this.chunkManager.waitForChunk(cx, cz);
  }

  public isChunkLoaded(x: number, z: number): boolean {
    return this.chunkManager.isChunkLoaded(x, z);
  }

  // Block operations
  public getBlock(x: number, y: number, z: number): number {
    return this.chunkManager.getBlock(x, y, z);
  }

  public setBlock(x: number, y: number, z: number, type: number) {
    this.chunkManager.setBlock(x, y, z, type);
  }

  public hasBlock(x: number, y: number, z: number): boolean {
    return this.chunkManager.hasBlock(x, y, z);
  }

  public getTopY(worldX: number, worldZ: number): number {
    return this.chunkManager.getTopY(worldX, worldZ);
  }

  public getChunkCount(): { visible: number; total: number } {
    return this.chunkManager.getChunkCount();
  }

  public getBreakTime(blockType: number, toolId: number = 0): number {
    return registryGetBreakTime(blockType, toolId);
  }
}

