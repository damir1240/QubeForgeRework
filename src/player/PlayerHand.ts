import * as THREE from "three";
import { BLOCK } from "../constants/Blocks";
import { VoxelTextureManager } from "../core/assets/VoxelTextureManager";
import { BlockRegistry, ItemRegistry } from "../modding/Registry";

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

  // Removed getToolDef as we now use PNG textures from Registry

  private isSword(id: number): boolean {
    return (
      id === BLOCK.WOODEN_SWORD ||
      id === BLOCK.STONE_SWORD ||
      id === BLOCK.IRON_SWORD
    );
  }

  /**
   * Creates a 3D pixel-perfect mesh from a 16x16 PNG image by extruding non-transparent pixels.
   */
  private createItemMesh(image: HTMLImageElement): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0, 16, 16);
    const data = ctx.getImageData(0, 0, 16, 16).data;

    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const uvs: number[] = [];

    const size = 16;
    const scale = 0.04;
    const pixelSize = scale;
    const depth = pixelSize;

    const pushVertex = (x: number, y: number, z: number, nx: number, ny: number, nz: number, r: number, g: number, b: number) => {
      positions.push(x, y, z);
      normals.push(nx, ny, nz);
      colors.push(r, g, b);
      uvs.push(0, 0);
    };

    const addFace = (x: number, y: number, z: number, w: number, h: number, d: number, nx: number, ny: number, nz: number, r: number, g: number, b: number) => {
      const x1 = x + w, y1 = y + h, z1 = z + d;
      let p0, p1, p2, p3;

      if (nx === 1) { p0 = [x1, y, z1]; p1 = [x1, y, z]; p2 = [x1, y1, z1]; p3 = [x1, y1, z]; }
      else if (nx === -1) { p0 = [x, y, z]; p1 = [x, y, z1]; p2 = [x, y1, z]; p3 = [x, y1, z1]; }
      else if (ny === 1) { p0 = [x, y1, z1]; p1 = [x1, y1, z1]; p2 = [x, y1, z]; p3 = [x1, y1, z]; }
      else if (ny === -1) { p0 = [x, y, z]; p1 = [x1, y, z]; p2 = [x, y, z1]; p3 = [x1, y, z1]; }
      else if (nz === 1) { p0 = [x, y, z1]; p1 = [x1, y, z1]; p2 = [x, y1, z1]; p3 = [x1, y1, z1]; }
      else { p0 = [x1, y, z]; p1 = [x, y, z]; p2 = [x1, y1, z]; p3 = [x, y1, z]; }

      pushVertex(p0[0], p0[1], p0[2], nx, ny, nz, r, g, b);
      pushVertex(p1[0], p1[1], p1[2], nx, ny, nz, r, g, b);
      pushVertex(p2[0], p2[1], p2[2], nx, ny, nz, r, g, b);
      pushVertex(p2[0], p2[1], p2[2], nx, ny, nz, r, g, b);
      pushVertex(p1[0], p1[1], p1[2], nx, ny, nz, r, g, b);
      pushVertex(p3[0], p3[1], p3[2], nx, ny, nz, r, g, b);
    };

    const offsetX = -(size * pixelSize) / 2;
    const offsetY = -(size * pixelSize) / 2;

    const isOpaque = (tx: number, ty: number) => {
      if (tx < 0 || tx >= 16 || ty < 0 || ty >= 16) return false;
      return data[(ty * 16 + tx) * 4 + 3] > 0;
    };

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * 16 + x) * 4;
        const a = data[idx + 3];
        if (a === 0) continue;

        const r = data[idx] / 255;
        const g = data[idx + 1] / 255;
        const b = data[idx + 2] / 255;

        const px = offsetX + x * pixelSize;
        const py = offsetY + (size - 1 - y) * pixelSize;
        const pz = -depth / 2;

        if (!isOpaque(x + 1, y)) addFace(px, py, pz, pixelSize, pixelSize, depth, 1, 0, 0, r, g, b);
        if (!isOpaque(x - 1, y)) addFace(px, py, pz, pixelSize, pixelSize, depth, -1, 0, 0, r, g, b);
        if (!isOpaque(x, y - 1)) addFace(px, py, pz, pixelSize, pixelSize, depth, 0, 1, 0, r, g, b);
        if (!isOpaque(x, y + 1)) addFace(px, py, pz, pixelSize, pixelSize, depth, 0, -1, 0, r, g, b);

        addFace(px, py, pz, pixelSize, pixelSize, depth, 0, 0, 1, r, g, b);
        addFace(px, py, pz, pixelSize, pixelSize, depth, 0, 0, -1, r, g, b);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));

    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.y = Math.PI / 2;

    const edges = new THREE.EdgesGeometry(geo);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 }));
    mesh.add(line);

    return mesh;
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
      // needleMesh is child of currentMesh usually, but let's be safe
      this.needleMesh.geometry.dispose();
      (this.needleMesh.material as THREE.Material).dispose();
      this.needleMesh = null;
    }

    if (id === 0) return; // Air

    const itemConfig = ItemRegistry.getById(id);

    // If it's an item (not a block), create extruded 3D mesh from PNG
    if (itemConfig) {
      const textureManager = VoxelTextureManager.getInstance();
      const textureName = itemConfig.texture;

      // We need the ACTUAL HTMLImageElement to read pixels
      // But VoxelTextureManager doesn't expose it.
      // Let's assume we can fetch it? Or store it in Manager?
      // Actually, TextureAtlasBuilder.build takes images Map.
      // I should modify VoxelTextureManager to store the map.

      const image = textureManager.getItemImage(textureName);
      if (image) {
        this.currentMesh = this.createItemMesh(image);
        this.currentMesh.scale.set(1.5, 1.5, 1.5);
        this.currentMesh.position.set(0, 0.2, 0);

        if (id === BLOCK.BROKEN_COMPASS) {
          const needleGeo = new THREE.BoxGeometry(0.1, 0.4, 0.05);
          const needleMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
          this.needleMesh = new THREE.Mesh(needleGeo, needleMat);
          this.needleMesh.position.set(0, 0, -0.1);
          this.currentMesh.add(this.needleMesh);
        }
      }
    } else {
      // Block
      const geo = new THREE.BoxGeometry(0.6, 0.6, 0.6);

      // UV Logic
      const textureManager = VoxelTextureManager.getInstance();
      const slotCount = textureManager.getSlotCount() || 12;
      const uvStep = 1.0 / slotCount;
      const uvInset = 0.001;

      const getRange = (idx: number) => {
        return {
          min: idx * uvStep + uvInset,
          max: (idx + 1) * uvStep - uvInset,
        };
      };

      const uvAttr = geo.attributes.uv;

      // Faces: 0:Right, 1:Left, 2:Top, 3:Bottom, 4:Front, 5:Back
      for (let face = 0; face < 6; face++) {
        let texIdx = 0; // Default Noise
        const config = BlockRegistry.getById(id);
        if (config && config.texture) {
          let textureName: string;
          if (typeof config.texture === 'string') {
            textureName = config.texture;
          } else {
            // BoxGeometry Faces: 0:Right, 1:Left, 2:Top, 3:Bottom, 4:Front, 5:Back
            if (face === 2) textureName = config.texture.top;
            else if (face === 3) textureName = config.texture.bottom;
            else textureName = config.texture.side;

            // Furnace Front (Minecraft convention: Front face is special)
            if (id === BLOCK.FURNACE && face === 4) textureName = config.texture.side; // front
          }
          texIdx = textureManager.getSlot(textureName);
        }

        const { min, max } = getRange(texIdx);
        const offset = face * 4;
        for (let i = 0; i < 4; i++) {
          const u = uvAttr.getX(offset + i);
          uvAttr.setX(offset + i, min + u * (max - min));
        }
      }
      uvAttr.needsUpdate = true;

      // Colors
      let r = 1,
        g = 1,
        b = 1;
      if (id === BLOCK.STONE || id === BLOCK.BEDROCK || id === BLOCK.DIRT || id === BLOCK.GRASS || id === BLOCK.WOOD || id === BLOCK.LEAVES || id === BLOCK.PLANKS) {
        r = 1.0;
        g = 1.0;
        b = 1.0;
      } else if (id === BLOCK.STICK) {
        r = 0.4;
        g = 0.2;
        b = 0.0;
      } else if (
        id === BLOCK.COAL_ORE ||
        id === BLOCK.IRON_ORE ||
        id === BLOCK.FURNACE
      ) {
        r = 1.0;
        g = 1.0;
        b = 1.0; // Texture has colors
      }
      // Crafting Table uses white (texture colors)

      const colors: number[] = [];
      for (let i = 0; i < 24; i++) {
        colors.push(r, g, b);
      }
      geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

      const mat = new THREE.MeshStandardMaterial({
        map: this.blockTexture,
        vertexColors: true,
        roughness: 0.8,
        alphaTest: 0.5,
        transparent: true,
      });

      this.currentMesh = new THREE.Mesh(geo, mat);
      // Block Orientation
      this.currentMesh.rotation.y = Math.PI / 4;
      this.currentMesh.position.set(0, 0, 0); // Centered
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
