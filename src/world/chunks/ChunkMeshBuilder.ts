import * as THREE from "three";
import { BLOCK } from "../../constants/Blocks";
import { FurnaceManager } from "../../crafting/FurnaceManager";
import { VoxelTextureManager } from "../../core/assets/VoxelTextureManager";
import { BlockRegistry } from "../../modding/Registry";

export class ChunkMeshBuilder {

  // Shared material для всех чанков (экономия памяти)
  private static sharedMaterial: THREE.MeshStandardMaterial | null = null;

  // Object pooling для массивов (уменьшает GC паузы)
  private positionsPool: number[] = [];
  private normalsPool: number[] = [];
  private uvsPool: number[] = [];
  private colorsPool: number[] = [];
  private slotIdsPool: number[] = [];

  constructor() {
    // Использовать текстуру из VoxelTextureManager
    const textureManager = VoxelTextureManager.getInstance();
    const atlasTexture = textureManager.getAtlasTexture();

    // Создать shared material один раз
    if (!ChunkMeshBuilder.sharedMaterial) {
      ChunkMeshBuilder.sharedMaterial = new THREE.MeshStandardMaterial({
        map: atlasTexture,
        vertexColors: true,
        roughness: 0.8,
        alphaTest: 0.5,
        transparent: true,
        depthWrite: true,
        side: THREE.DoubleSide,
      });

      // Передаем количество слотов в шейдер
      const slotCount = textureManager.getSlotCount() || 12;

      // Патч шейдера для поддержки Greedy Meshing в Атласе
      ChunkMeshBuilder.sharedMaterial.onBeforeCompile = (shader) => {
        shader.uniforms.uSlotCount = { value: slotCount };
        // Vertex Shader
        shader.vertexShader = `
          attribute float aSlotId;
          varying float vSlotId;
          ${shader.vertexShader}
        `;

        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          `#include <common>
           varying vec2 vGreedyUV;`
        ).replace(
          '#include <uv_vertex>',
          `#include <uv_vertex>
           vGreedyUV = uv;
           vSlotId = aSlotId;`
        );

        // Fragment Shader
        shader.fragmentShader = `
          uniform float uSlotCount;
          varying float vSlotId;
          ${shader.fragmentShader}
        `;

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>',
          `#include <common>
           varying vec2 vGreedyUV;`
        ).replace(
          '#include <map_fragment>',
          `
          #ifdef USE_MAP
            // Greedy Meshing Atlas mapping
            float slotSize = 1.0 / uSlotCount;
            
            // Получаем дробную часть для тайлинга (0.0..1.0)
            vec2 localUV = fract(vGreedyUV);
            
            // Исправляем поведение на самом краю (1.0 -> 0.0 -> 1.0)
            if (vGreedyUV.x > 0.1 && localUV.x < 0.001) localUV.x = 1.0;
            if (vGreedyUV.y > 0.1 && localUV.y < 0.001) localUV.y = 1.0;

            // Защитный Clamp для предотвращения швов и "залезания" на соседние слоты
            // Это решает проблему "тянущихся" пикселей на границах
            float safeX = clamp(localUV.x, 0.0, 1.0);
            float safeY = clamp(localUV.y, 0.0, 1.0);

            // Регулировка UV для NearestFilter: небольшое смещение внутрь пикселя
            // помогает избежать заплывания текстуры (sampling bleeding)
            float atlasU = (vSlotId + clamp(safeX, 0.001, 0.999)) * slotSize;
            float atlasV = clamp(safeY, 0.001, 0.999);
            
            vec2 tiledUV = vec2(atlasU, atlasV);
            vec4 texelColor = texture2D( map, tiledUV );
            diffuseColor *= texelColor;
          #endif
          `
        );
      };
    }
  }

  private isBlockTransparent(type: number): boolean {
    if (type === BLOCK.AIR) return true;
    const config = BlockRegistry.getById(type);
    return config?.isTransparent === true;
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

            const transA = this.isBlockTransparent(blockA);
            const transB = this.isBlockTransparent(blockB);

            if (blockA === blockB) {
              mask[n++] = 0;
            } else if (!transA && !transB) {
              // Оба непрозрачны и разные - отсекаем грань между ними
              mask[n++] = 0;
            } else if (!transA) {
              // A непрозрачен, B прозрачен или воздух - рисуем грань А
              mask[n++] = blockA;
            } else if (!transB) {
              // B непрозрачен, A прозрачен или воздух - рисуем грань B
              mask[n++] = -blockB;
            } else {
              // Оба прозрачны и разные (например, листва и стекло)
              // В идеале нужно рисовать обе стороны, но greedy mesher умеет только одну за раз.
              // Рисуем ту, что не воздух.
              if (blockA !== BLOCK.AIR) mask[n++] = blockA;
              else if (blockB !== BLOCK.AIR) mask[n++] = -blockB;
              else mask[n++] = 0;
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
    for (let i = 0; i < 6; i++) this.colorsPool.push(1, 1, 1);

    // UVs для Greedy Mesh
    // Определяем 4 угла UV-квадрата
    let u0 = [0, 0];
    let u1 = [w, 0];
    let u2 = [w, h];
    let u3 = [0, h];

    // Корректируем ориентацию осей, чтобы текстура не была повернута
    if (dim === 0) { // X-plane: du=Y, dv=Z. Хотим U=Z (h), V=Y (w)
      u1 = [0, w]; u3 = [h, 0]; u2 = [h, w];
    } else if (dim === 1) { // Y-plane: du=Z, dv=X. Хотим U=X (h), V=Z (w)
      u1 = [0, w]; u3 = [h, 0]; u2 = [h, w];
    }
    // Z-plane: du=X, dv=Y. Want U=X (w), V=Y (h). По умолчанию u1=[w,0], u3=[0,h] - верно.

    if (isForward) {
      // Vertices: v0, v1, v3, v1, v2, v3
      this.uvsPool.push(...u0, ...u1, ...u3, ...u1, ...u2, ...u3);
    } else {
      // Vertices: v0, v3, v1, v1, v3, v2 (развернутый порядок для правильной ориентации текстуры)
      this.uvsPool.push(...u0, ...u3, ...u1, ...u1, ...u3, ...u2);
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
    const textureManager = VoxelTextureManager.getInstance();
    const config = BlockRegistry.getById(type);

    if (!config || !config.texture) return 0;

    let textureName: string;

    if (typeof config.texture === 'string') {
      textureName = config.texture;
    } else {
      // Специальная логика для бревна (так как BLOCK.WOOD в реестре теперь имеет объект)
      if (type === BLOCK.WOOD) {
        if (side === "top" || side === "bottom") textureName = (config.texture as any).top;
        else textureName = (config.texture as any).side;
      }
      // Специальная логика для печки (у которой стороны зависят от вращения)
      else if (type === BLOCK.FURNACE) {
        const furnace = FurnaceManager.getInstance().getFurnace(worldX, worldY, worldZ);
        const rot = furnace?.rotation ?? 0;
        const frontFace = (rot === 0) ? "back" : (rot === 1) ? "right" : (rot === 2) ? "front" : "left";

        if (side === frontFace) textureName = config.texture.side; // Используем side как "переднюю панель"
        else if (side === "top" || side === "bottom") textureName = config.texture.top;
        else textureName = config.texture.side; // Или добавить отдельную текстуру для боков печки
      } else {
        if (side === "top") textureName = config.texture.top;
        else if (side === "bottom") textureName = config.texture.bottom;
        else textureName = config.texture.side;
      }
    }

    return textureManager.getSlot(textureName);
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
