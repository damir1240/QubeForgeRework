import * as THREE from "three";
import { BLOCK } from "../../constants/Blocks";
import { TextureAtlas } from "../generation/TextureAtlas";
import { FurnaceManager } from "../../crafting/FurnaceManager";
import { BlockColors } from "../../constants/BlockColors";

export class ChunkMeshBuilder {
  private noiseTexture: THREE.DataTexture;

  // Shared material для всех чанков (экономия памяти)
  private static sharedMaterial: THREE.MeshStandardMaterial | null = null;

  // Object pooling для массивов (уменьшает GC паузы)
  private positionsPool: number[] = [];
  private normalsPool: number[] = [];
  private uvsPool: number[] = [];
  private colorsPool: number[] = [];
  private slotIdsPool: number[] = [];

  constructor() {
    this.noiseTexture = TextureAtlas.createNoiseTexture();

    // Создать shared material один раз
    if (!ChunkMeshBuilder.sharedMaterial) {
      ChunkMeshBuilder.sharedMaterial = new THREE.MeshStandardMaterial({
        map: this.noiseTexture,
        vertexColors: true,
        roughness: 0.8,
        alphaTest: 0.5,
        transparent: true,
        depthWrite: true,
        side: THREE.DoubleSide,
      });

      // Патч шейдера для поддержки Greedy Meshing в Атласе
      ChunkMeshBuilder.sharedMaterial.onBeforeCompile = (shader) => {
        // Vertex Shader
        shader.vertexShader = `
          attribute float aSlotId;
          varying float vSlotId;
          ${shader.vertexShader}
        `;

        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          `#include <common>
           varying vec2 vMeshUV;`
        ).replace(
          '#include <uv_vertex>',
          `#include <uv_vertex>
           vMeshUV = uv;
           vSlotId = aSlotId;`
        );

        // Fragment Shader
        shader.fragmentShader = `
          varying float vSlotId;
          ${shader.fragmentShader}
        `;

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>',
          `#include <common>
           varying vec2 vMeshUV;`
        ).replace(
          '#include <map_fragment>',
          `
          #ifdef USE_MAP
            // Greedy Meshing Atlas mapping
            float slotSize = 1.0 / 12.0;
            
            // vMeshUV.x contains the local Tiling (0..w)
            // vSlotId contains the texture Slog Index
            
            float localU = fract(vMeshUV.x);
            float atlasU = (vSlotId + localU) * slotSize;
            
            // Adjust to avoid bleeding (optional, small inset)
            // But with NearestFilter it should be fine if we stay within bounds
            
            // V is standard 0..1 (assuming single row atlas)
            // If V also tiled (height > 1), we use fract(vMeshUV.y)
            float atlasV = fract(vMeshUV.y);
            
            vec2 tiledUV = vec2(atlasU, atlasV);
            vec4 texelColor = texture2D( map, tiledUV );
            diffuseColor *= texelColor;
          #endif
          `
        );
      };
    }
  }

  public getNoiseTexture(): THREE.DataTexture {
    return this.noiseTexture;
  }

  public buildMesh(
    data: Uint8Array,
    cx: number,
    cz: number,
    chunkSize: number,
    chunkHeight: number,
    _getBlockIndex?: (x: number, y: number, z: number) => number,
    _getNeighborBlock?: (x: number, y: number, z: number) => number,
  ): THREE.Mesh {
    this.positionsPool.length = 0;
    this.normalsPool.length = 0;
    this.uvsPool.length = 0;
    this.colorsPool.length = 0;
    this.slotIdsPool.length = 0;

    const startX = cx * chunkSize;
    const startZ = cz * chunkSize;
    const actualDims = [chunkSize, chunkHeight, chunkSize];

    /**
     * Greedy Meshing Algorithm
     * Проходим по каждой из 6 сторон (d = 0..5, или x,y,z в обе стороны)
     */
    for (let d = 0; d < 3; d++) {
      const u = (d + 1) % 3;
      const v = (d + 2) % 3;
      const x = [0, 0, 0];
      const q = [0, 0, 0];
      const mask = new Int32Array(actualDims[u] * actualDims[v]);

      q[d] = 1;

      for (x[d] = -1; x[d] < actualDims[d];) {
        let n = 0;
        for (x[v] = 0; x[v] < actualDims[v]; ++x[v]) {
          for (x[u] = 0; x[u] < actualDims[u]; ++x[u]) {
            const blockA = (x[d] >= 0) ? this.getBlockAt(data, x[0], x[1], x[2], actualDims) : BLOCK.AIR;
            const blockB = (x[d] < actualDims[d] - 1) ? this.getBlockAt(data, x[0] + q[0], x[1] + q[1], x[2] + q[2], actualDims) : BLOCK.AIR;

            const isOpaqueA = blockA !== BLOCK.AIR;
            const isOpaqueB = blockB !== BLOCK.AIR;

            if (isOpaqueA === isOpaqueB) {
              mask[n++] = 0;
            } else if (isOpaqueA) {
              mask[n++] = blockA;
            } else {
              mask[n++] = -blockB;
            }
          }
        }

        x[d]++;
        n = 0;

        for (let j = 0; j < actualDims[v]; ++j) {
          for (let i = 0; i < actualDims[u];) {
            const type = mask[n];
            if (type !== 0) {
              const absType = Math.abs(type);
              const isMergeable = absType !== BLOCK.LEAVES;

              let w, h;
              // Compute width
              for (w = 1; isMergeable && i + w < actualDims[u] && mask[n + w] === type; ++w) { }

              // Compute height
              let done = false;
              for (h = 1; j + h < actualDims[v]; ++h) {
                if (!isMergeable && h >= 1) break; // Leaves are 1x1
                for (let k = 0; k < w; ++k) {
                  if (mask[n + k + h * actualDims[u]] !== type) {
                    done = true;
                    break;
                  }
                }
                if (done) break;
              }

              // Add Quad
              x[u] = i;
              x[v] = j;
              const du = [0, 0, 0];
              const dv = [0, 0, 0];
              du[u] = w;
              dv[v] = h;

              this.addQuad(
                x, du, dv,
                absType,
                type > 0,
                d, w, h,
                startX, startZ
              );

              // Clear mask
              for (let l = 0; l < h; ++l) {
                for (let m = 0; m < w; ++m) {
                  mask[n + m + l * actualDims[u]] = 0;
                }
              }
              i += w;
              n += w;
            } else {
              i++;
              n++;
            }
          }
        }
      }
    }

    return this.createMesh(this.positionsPool, this.normalsPool, this.uvsPool, this.colorsPool, this.slotIdsPool, startX, startZ);
  }

  private getBlockAt(data: Uint8Array, x: number, y: number, z: number, dims: number[]): number {
    if (x < 0 || x >= dims[0] || y < 0 || y >= dims[1] || z < 0 || z >= dims[2]) return BLOCK.AIR;
    return data[x + y * dims[0] + z * dims[0] * dims[1]];
  }

  private addQuad(
    pos: number[],
    du: number[],
    dv: number[],
    type: number,
    isForward: boolean,
    dim: number,
    w: number,
    h: number,
    startX: number,
    startZ: number
  ) {
    const v0 = [pos[0], pos[1], pos[2]];
    const v1 = [pos[0] + du[0], pos[1] + du[1], pos[2] + du[2]];
    const v2 = [pos[0] + du[0] + dv[0], pos[1] + du[1] + dv[1], pos[2] + du[2] + dv[2]];
    const v3 = [pos[0] + dv[0], pos[1] + dv[1], pos[2] + dv[2]];

    // В зависимости от направления грани (forward/back) меняем порядок вершин
    if (isForward) {
      this.positionsPool.push(...v0, ...v1, ...v3, ...v1, ...v2, ...v3);
    } else {
      this.positionsPool.push(...v0, ...v3, ...v1, ...v1, ...v3, ...v2);
    }

    // Нормаль
    const n = [0, 0, 0];
    n[dim] = isForward ? 1 : -1;
    for (let i = 0; i < 6; i++) this.normalsPool.push(...n);

    // Цвет и UV
    const side = this.getSideName(dim, isForward);
    const color = this.getBlockColor(type, side);
    for (let i = 0; i < 6; i++) this.colorsPool.push(color.r, color.g, color.b);

    // UVs для Greedy Mesh
    // Передаем количество повторений (tile count) в UV
    // Шейдер будет использовать fract() для тайлинга
    const uvCoords = isForward
      ? [0, 0, w, 0, 0, h, w, 0, w, h, 0, h]
      : [0, 0, 0, h, w, 0, w, 0, 0, h, w, h];

    for (let i = 0; i < uvCoords.length; i += 2) {
      this.uvsPool.push(uvCoords[i], uvCoords[i + 1]);
    }

    // Slot IDs
    // Определяем слот текстуры для этого типа блока и стороны
    // Мы передаем его в отдельный атрибут для каждого вершины
    const slot = this.getSlotForType(type, side, startX + pos[0], pos[1], startZ + pos[2]);
    for (let i = 0; i < 6; i++) {
      this.slotIdsPool.push(slot);
    }
  }

  private getSideName(dim: number, isForward: boolean): string {
    if (dim === 0) return isForward ? "right" : "left";
    if (dim === 1) return isForward ? "top" : "bottom";
    return isForward ? "front" : "back";
  }

  private getSlotForType(type: number, side: string, worldX: number, worldY: number, worldZ: number): number {
    if (type === BLOCK.LEAVES) return 1;
    if (type === BLOCK.PLANKS) return 2;
    if (type === BLOCK.CRAFTING_TABLE) {
      if (side === "top") return 3;
      if (side === "bottom") return 5;
      return 4;
    }
    if (type === BLOCK.COAL_ORE) return 6;
    if (type === BLOCK.IRON_ORE) return 7;
    if (type === BLOCK.FURNACE) {
      if (side === "top") return 10;
      if (side === "bottom") return 9;
      const furnace = FurnaceManager.getInstance().getFurnace(worldX, worldY, worldZ);
      const rot = furnace?.rotation ?? 0;
      let frontFace = (rot === 0) ? "back" : (rot === 1) ? "right" : (rot === 2) ? "front" : "left";
      return side === frontFace ? 8 : 9;
    }
    return 0; // Grass/Stone default
  }



  private getBlockColor(type: number, side: string): { r: number; g: number; b: number } {
    return BlockColors.getColorForFace(type, side);
  }

  private createMesh(
    positions: number[],
    normals: number[],
    uvs: number[],
    colors: number[],
    slotIds: number[],
    startX: number,
    startZ: number,
  ): THREE.Mesh {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute("aSlotId", new THREE.Float32BufferAttribute(slotIds, 1));
    geometry.computeBoundingSphere();

    const mesh = new THREE.Mesh(geometry, ChunkMeshBuilder.sharedMaterial!);
    mesh.position.set(startX, 0, startZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
}
