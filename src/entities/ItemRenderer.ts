import * as THREE from "three";
import { ITEM_ENTITY } from "../constants/GameConstants";
import { VoxelTextureManager } from "../core/assets/VoxelTextureManager";
import { BlockRegistry, ItemRegistry } from "../modding/Registry";

export class ItemRenderer {
  public static createMesh(type: number): THREE.Mesh {
    const itemConfig = ItemRegistry.getById(type);

    if (itemConfig) {
      return this.createFlatItem(type);
    } else {
      return this.createBlockItem(type);
    }
  }

  private static createFlatItem(type: number): THREE.Mesh {
    const textureManager = VoxelTextureManager.getInstance();
    const config = ItemRegistry.getById(type);
    const textureName = config?.texture || '';
    const texIdx = textureManager.getItemSlot(textureName);
    const slotCount = textureManager.getItemSlotCount() || 1;
    const uvStep = 1.0 / slotCount;

    const geometry = new THREE.PlaneGeometry(ITEM_ENTITY.SIZE_FLAT, ITEM_ENTITY.SIZE_FLAT);
    const uvAttr = geometry.getAttribute("uv");
    const min = texIdx * uvStep;
    const max = (texIdx + 1) * uvStep;

    for (let i = 0; i < uvAttr.count; i++) {
      const u = uvAttr.getX(i);
      uvAttr.setX(i, min + u * (max - min));
    }
    uvAttr.needsUpdate = true;

    const material = new THREE.MeshStandardMaterial({
      map: textureManager.getItemAtlasTexture(),
      transparent: true,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      roughness: 0.8,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private static createBlockItem(type: number): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(
      ITEM_ENTITY.SIZE_BLOCK,
      ITEM_ENTITY.SIZE_BLOCK,
      ITEM_ENTITY.SIZE_BLOCK,
    );

    this.applyVertexColors(geometry);
    this.applyUVMapping(geometry, type);

    const material = new THREE.MeshStandardMaterial({
      map: VoxelTextureManager.getInstance().getAtlasTexture(),
      vertexColors: true,
      roughness: 0.8,
      alphaTest: 0.5,
      transparent: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private static applyVertexColors(geometry: THREE.BufferGeometry) {
    const colors: number[] = [];
    const count = geometry.attributes.position.count;

    for (let i = 0; i < count; i++) {
      colors.push(1, 1, 1);
    }

    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  }

  private static applyUVMapping(geometry: THREE.BufferGeometry, type: number) {
    const uvAttr = geometry.getAttribute("uv");
    if (!uvAttr) return;

    const textureManager = VoxelTextureManager.getInstance();
    const slotCount = textureManager.getSlotCount() || 12;
    const uvStep = 1.0 / slotCount;
    const uvInset = 0.001;

    for (let face = 0; face < 6; face++) {
      const texIdx = this.getTextureIndex(type, face);
      const min = texIdx * uvStep + uvInset;
      const max = (texIdx + 1) * uvStep - uvInset;

      const offset = face * 4;
      for (let i = 0; i < 4; i++) {
        const u = uvAttr.getX(offset + i);
        uvAttr.setX(offset + i, min + u * (max - min));
      }
    }

    uvAttr.needsUpdate = true;
  }

  private static getTextureIndex(type: number, face: number): number {
    const textureManager = VoxelTextureManager.getInstance();
    const config = BlockRegistry.getById(type);
    if (!config || !config.texture) return 0;

    const faceName = ["right", "left", "top", "bottom", "front", "back"][face];
    let textureName: string;

    if (typeof config.texture === 'string') {
      textureName = config.texture;
    } else {
      if (faceName === "top") textureName = config.texture.top;
      else if (faceName === "bottom") textureName = config.texture.bottom;
      else textureName = config.texture.side;
    }

    return textureManager.getSlot(textureName);
  }
}
