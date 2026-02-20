import * as THREE from "three";
import { PerspectiveCamera } from "three";
import { Scene } from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { World } from "../world/World";
import { BLOCK } from "../constants/Blocks";
import {
  PLAYER_HALF_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_EYE_HEIGHT,
} from "../constants/GameConstants";
import { isTool } from "../utils/ItemUtils";
import { eventManager } from "../core/EventManager";
import { GameContext } from "../core/GameContext";
import { GameEvents } from "../core/GameEvents";

export class BlockInteraction {
  private raycaster: THREE.Raycaster;
  private camera: PerspectiveCamera;
  private scene: Scene;
  private controls: PointerLockControls;
  private cursorMesh?: THREE.Mesh;
  private crackMesh?: THREE.Mesh;
  private readonly MAX_DISTANCE = 6;

  // Eating State
  private isEating = false;
  private eatTimer = 0;
  private readonly EAT_DURATION = 1.5; // Seconds

  private getSelectedSlotItem: () => { id: number; count: number };

  constructor(
    camera: PerspectiveCamera,
    scene: Scene,
    controls: PointerLockControls,
    getSelectedSlotItem: () => { id: number; count: number },
    cursorMesh?: THREE.Mesh,
    crackMesh?: THREE.Mesh,
  ) {
    this.camera = camera;
    this.scene = scene;
    this.controls = controls;
    this.getSelectedSlotItem = getSelectedSlotItem;
    this.cursorMesh = cursorMesh;
    this.crackMesh = crackMesh;
    this.crackMesh = crackMesh;
    this.raycaster = new THREE.Raycaster();
  }

  public update(delta: number, isUsePressed: boolean) {
    const slot = this.getSelectedSlotItem();
    const isFood =
      slot.id === BLOCK.COOKED_MEAT || slot.id === BLOCK.RAW_MEAT;

    if (isUsePressed && isFood) {
      if (!this.isEating) {
        this.isEating = true;
        this.eatTimer = 0;
      }

      this.eatTimer += delta;

      if (this.eatTimer >= this.EAT_DURATION) {
        // Consume!
        this.consumeFood(slot.id);
        this.isEating = false;
        this.eatTimer = 0;
      }
    } else {
      this.isEating = false;
      this.eatTimer = 0;
    }
  }

  public getIsEating(): boolean {
    return this.isEating;
  }

  private consumeFood(itemId: number) {
    eventManager.emit(GameEvents.ITEM_CONSUMED, { itemId });
  }

  public interact(world: World): void {
    // 1. Check Item Usage (Broken Compass)
    const slot = this.getSelectedSlotItem();
    if (slot.id === BLOCK.BROKEN_COMPASS) {
      // Random Teleport Logic
      const playerPos = this.controls.object.position;
      const angle = Math.random() * Math.PI * 2;
      const dist = 5 + Math.random() * 25; // 5 to 30 blocks away

      const targetX = playerPos.x + Math.sin(angle) * dist;
      const targetZ = playerPos.z + Math.cos(angle) * dist;

      const tx = Math.floor(targetX);
      const tz = Math.floor(targetZ);

      // Find valid ground
      let topY = world.getTopY(tx, tz);

      // If valid height found (and not void)
      if (topY > 0) {
        const targetY = topY + 3.0; // Drop from above to prevent sticking

        playerPos.set(tx + 0.5, targetY, tz + 0.5);

        // Reset velocity 
        if ((this.controls as any).velocity)
          (this.controls as any).velocity.set(0, 0, 0);

        // Consume Item
        eventManager.emit(GameEvents.ITEM_CONSUMED, { itemId: slot.id });

        return; // Stop interaction
      }
    }

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children);
    const hit = intersects.find(
      (i) =>
        i.object !== this.cursorMesh &&
        i.object !== this.crackMesh &&
        i.object !== this.controls.object &&
        (i.object as any).isMesh &&
        !(i.object as any).isItem,
    );

    if (hit && hit.distance < this.MAX_DISTANCE) {
      const p = hit.point
        .clone()
        .add(this.raycaster.ray.direction.clone().multiplyScalar(0.01));
      const x = Math.floor(p.x);
      const y = Math.floor(p.y);
      const z = Math.floor(p.z);

      const targetId = world.getBlock(x, y, z);
      if (targetId === BLOCK.CRAFTING_TABLE) {
        eventManager.emit(GameEvents.OPEN_CRAFTING, {});
        return;
      } else if (targetId === BLOCK.FURNACE) {
        eventManager.emit(GameEvents.OPEN_FURNACE, { x, y, z });
        return;
      }

      // Place Block
      const slot = this.getSelectedSlotItem();
      if (slot.id !== 0 && slot.count > 0) {
        // Prevent placing non-blocks (e.g. Stick, Tools)
        if (slot.id === BLOCK.STICK || isTool(slot.id)) return;

        if (hit.face) {
          const placePos = hit.point
            .clone()
            .add(hit.face.normal.clone().multiplyScalar(0.01));
          const px = Math.floor(placePos.x);
          const py = Math.floor(placePos.y);
          const pz = Math.floor(placePos.z);

          // Check collision with player
          const playerPos = this.controls.object.position;
          const playerMinX = playerPos.x - PLAYER_HALF_WIDTH;
          const playerMaxX = playerPos.x + PLAYER_HALF_WIDTH;
          const playerMinY = playerPos.y - PLAYER_EYE_HEIGHT;
          const playerMaxY = playerPos.y - PLAYER_EYE_HEIGHT + PLAYER_HEIGHT;
          const playerMinZ = playerPos.z - PLAYER_HALF_WIDTH;
          const playerMaxZ = playerPos.z + PLAYER_HALF_WIDTH;

          const blockMinX = px;
          const blockMaxX = px + 1;
          const blockMinY = py;
          const blockMaxY = py + 1;
          const blockMinZ = pz;
          const blockMaxZ = pz + 1;

          const context = GameContext.getInstance();
          const entitySystem = context.entitySystem;

          if (entitySystem) {
            const entities = entitySystem.getEntities();
            for (const entity of entities) {
              // Approximate bounding box bounds (assuming 0.6 width and 1.8 height for player, 0.9 for mobs)
              // The exact Bounding Box should ideally come from entity.physics, but physics is not exposed on IEntity.
              // For a robust check, let's use a generic 0.9x0.9 default size around the entity position.
              // In an ideal ECS this is cleaner, but this will work for now based on position coordinates.

              // If it's the player, the check is already done above, but we can do a general check:
              const ePos = entity.position;

              // Try to get width/height if available, otherwise fallback
              const width = (entity as any).physics?.width ?? 0.8;
              const height = (entity as any).physics?.height ?? 1.8;
              const halfW = width / 2;

              const eMinX = ePos.x - halfW;
              const eMaxX = ePos.x + halfW;
              const eMinY = ePos.y;
              const eMaxY = ePos.y + height;
              const eMinZ = ePos.z - halfW;
              const eMaxZ = ePos.z + halfW;

              if (
                eMinX < blockMaxX &&
                eMaxX > blockMinX &&
                eMinY < blockMaxY &&
                eMaxY > blockMinY &&
                eMinZ < blockMaxZ &&
                eMaxZ > blockMinZ
              ) {
                return; // Cannot place block inside an entity
              }
            }
          } else {
            // Fallback to just player check if entitySystem not available
            if (
              playerMinX < blockMaxX &&
              playerMaxX > blockMinX &&
              playerMinY < blockMaxY &&
              playerMaxY > blockMinY &&
              playerMinZ < blockMaxZ &&
              playerMaxZ > blockMinZ
            ) {
              // Cannot place block inside player
              return;
            }
          }

          // Emit event for placement (Game/Inventory will handle actual logic)
          eventManager.emit(GameEvents.BLOCK_PLACED, {
            x: px,
            y: py,
            z: pz,
            blockId: slot.id,
          });
        }
      }
    }
  }
}
