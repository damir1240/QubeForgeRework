import * as THREE from "three";
import { BLOCK } from "../constants/Blocks";
import { BlockRegistry, ItemRegistry } from "../modding/Registry";
import { ItemMeshFactory } from "../utils/ItemMeshFactory";

// ============================================
// НАСТРОЙКИ ПОЗИЦИИ И ПОВОРОТА ПРЕДМЕТОВ В РУКЕ
// ============================================
// Здесь можно легко настроить как предметы выглядят в руке
// Все углы указаны в ГРАДУСАХ (не радианах!)

const ITEM_HAND_CONFIG = {
  // Настройки для инструментов (мечи, кирки, топоры и т.д.)
  items: {
    rotation: {
      x: -90,    // Наклон вверх/вниз (положительное = вниз, отрицательное = вверх)
      y: 270,  // Поворот влево/вправо (0 = прямо, 90 = влево, 180 = назад, 270 = вправо)
      z: -20     // Крен влево/вправо
    },
    position: {
      x: 0,     // Влево (-) / Вправо (+)
      y: 0.1,  // Вниз (-) / Вверх (+)
      z: 0.15    // Ближе к камере (-) / Дальше от камеры (+)
    }
  },
  
  // Настройки для блоков (земля, камень и т.д.)
  blocks: {
    rotation: {
      x: -22.5,  // Наклон вверх/вниз
      y: 45,     // Поворот влево/вправо
      z: 0       // Крен влево/вправо
    },
    position: {
      x: 0,     // Влево (-) / Вправо (+)
      y: -0.1,  // Вниз (-) / Вверх (+)
      z: -0.3   // Ближе к камере (-) / Дальше от камеры (+)
    }
  }
};

// Вспомогательная функция для конвертации градусов в радианы
const degreesToRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export class PlayerHand {
  private camera: THREE.Camera;
  private handGroup: THREE.Group;
  private currentMesh: THREE.Mesh | null = null;
  private needleMesh: THREE.Mesh | null = null;
  private currentId: number = 0;

  // Animation State
  private bobTime = 0;
  private swingTime = 0;
  private isSwinging = false;
  private isMining = false; // Held down state
  private isEating = false;

  private readonly SWING_DURATION = 0.3; // Seconds
  private readonly BASE_POS = new THREE.Vector3(0.5, -0.6, -1); // Right hand position

  // Texture References
  private blockTexture: THREE.Texture;

  constructor(
    camera: THREE.Camera,
    blockTexture: THREE.Texture,
  ) {
    this.camera = camera;
    this.blockTexture = blockTexture;

    this.handGroup = new THREE.Group();
    this.camera.add(this.handGroup);

    // Initial pos
    this.handGroup.position.copy(this.BASE_POS);
  }

  private isSword(id: number): boolean {
    return (
      id === BLOCK.WOODEN_SWORD ||
      id === BLOCK.STONE_SWORD ||
      id === BLOCK.IRON_SWORD
    );
  }

  public updateItem(id: number) {
    if (this.currentId === id) return;
    this.currentId = id;

    // Cleanup old
    if (this.currentMesh) {
      this.handGroup.remove(this.currentMesh);
      this.currentMesh.geometry.dispose();
      if (Array.isArray(this.currentMesh.material)) {
        this.currentMesh.material.forEach((m) => m.dispose());
      } else {
        (this.currentMesh.material as THREE.Material).dispose();
      }
      this.currentMesh = null;
    }

    if (this.needleMesh) {
      this.needleMesh.geometry.dispose();
      (this.needleMesh.material as THREE.Material).dispose();
      this.needleMesh = null;
    }

    if (id === 0) return; // Air

    const itemConfig = ItemRegistry.getById(id);
    const blockConfig = BlockRegistry.getById(id);

    if (itemConfig) {
      this.currentMesh = ItemMeshFactory.createItemMesh(id);
      if (this.currentMesh) {
        // Применяем настройки из конфига для инструментов
        const cfg = ITEM_HAND_CONFIG.items;
        this.currentMesh.rotation.set(
          degreesToRadians(cfg.rotation.x),
          degreesToRadians(cfg.rotation.y),
          degreesToRadians(cfg.rotation.z)
        );
        this.currentMesh.position.set(cfg.position.x, cfg.position.y, cfg.position.z);

        if (id === BLOCK.BROKEN_COMPASS) {
          const existingNeedle = this.currentMesh.getObjectByName("needle") as THREE.Mesh;
          if (existingNeedle) {
            this.needleMesh = existingNeedle;
          } else {
            // Fallback
            const needleGeo = new THREE.BoxGeometry(0.1, 0.4, 0.05);
            const needleMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            this.needleMesh = new THREE.Mesh(needleGeo, needleMat);
            this.needleMesh.position.set(0, 0, -0.1);
            this.needleMesh.name = "needle";
            this.currentMesh.add(this.needleMesh);
          }
        }
      }
    } else if (blockConfig) {
      this.currentMesh = ItemMeshFactory.createBlockMesh(id, this.blockTexture);
      if (this.currentMesh) {
        // Применяем настройки из конфига для блоков
        const cfg = ITEM_HAND_CONFIG.blocks;
        this.currentMesh.rotation.set(
          degreesToRadians(cfg.rotation.x),
          degreesToRadians(cfg.rotation.y),
          degreesToRadians(cfg.rotation.z)
        );
        this.currentMesh.position.set(cfg.position.x, cfg.position.y, cfg.position.z);
      }
    }

    if (this.currentMesh) {
      this.handGroup.add(this.currentMesh);
    }
  }

  public punch() {
    this.isMining = true;
    if (!this.isSwinging) {
      this.isSwinging = true;
      this.swingTime = 0;
    }
  }

  public stopPunch() {
    this.isMining = false;
  }

  public setEating(eating: boolean) {
    this.isEating = eating;
  }

  public update(delta: number, isMoving: boolean) {
    // Spin Needle
    if (this.needleMesh) {
      this.needleMesh.rotation.z += delta * 20 + Math.random() * 5;
    }

    // Bobbing
    if (isMoving) {
      this.bobTime += delta * 10;
      this.handGroup.position.x =
        this.BASE_POS.x + Math.sin(this.bobTime) * 0.05;
      this.handGroup.position.y =
        this.BASE_POS.y + Math.abs(Math.cos(this.bobTime)) * 0.05;
    } else if (this.isEating) {
      // Eating Bobbing
      this.bobTime += delta * 15;
      // Move hand up and down slightly, and tilt
      this.handGroup.position.x = this.BASE_POS.x + Math.sin(this.bobTime) * 0.02;
      this.handGroup.position.y = this.BASE_POS.y + Math.abs(Math.cos(this.bobTime)) * 0.05 + 0.1; // Higher
      this.handGroup.position.z = this.BASE_POS.z + 0.2; // Closer

      this.handGroup.rotation.x = -0.2 + Math.sin(this.bobTime * 2) * 0.1;
      this.handGroup.rotation.y = -0.2;
      this.handGroup.rotation.z = 0.2;
    } else {
      // Return to rest
      this.handGroup.position.x +=
        (this.BASE_POS.x - this.handGroup.position.x) * 10 * delta;
      this.handGroup.position.y +=
        (this.BASE_POS.y - this.handGroup.position.y) * 10 * delta;

      // Reset rotation if not swinging
      if (!this.isSwinging) {
        this.handGroup.rotation.x += (0 - this.handGroup.rotation.x) * 10 * delta;
        this.handGroup.rotation.y += (0 - this.handGroup.rotation.y) * 10 * delta;
        this.handGroup.rotation.z += (0 - this.handGroup.rotation.z) * 10 * delta;
        this.handGroup.position.z += (this.BASE_POS.z - this.handGroup.position.z) * 10 * delta;
      }
    }

    // Swing Animation
    if (this.isSwinging && !this.isEating) {
      this.swingTime += delta;
      const progress = Math.min(this.swingTime / this.SWING_DURATION, 1.0);

      // Swing Logic: Rotate down and in
      // Sine wave 0 -> 1 -> 0
      const swing = Math.sin(progress * Math.PI);

      this.handGroup.rotation.x = -swing * 0.5;
      this.handGroup.rotation.z = swing * 0.5; // Tilt inward
      this.handGroup.position.z = this.BASE_POS.z - swing * 0.5; // Push forward

      if (progress >= 1.0) {
        if (this.isMining && !this.isSword(this.currentId)) {
          // Loop if mining and not sword
          this.swingTime = 0;
        } else {
          this.isSwinging = false;
          // Reset handled in else block above
        }
      }
    }
  }
}
