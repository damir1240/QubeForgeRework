/**
 * Web Worker для генерации terrain
 * Выполняет тяжёлые вычисления в отдельном потоке
 */

import { createNoise2D } from "simplex-noise";

// Константы блоков (копия из Blocks.ts для изоляции воркера)
const BLOCK = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  BEDROCK: 4,
  WOOD: 5,
  LEAVES: 6,
  PLANKS: 7,
  CRAFTING_TABLE: 9,
  COAL_ORE: 10,
  IRON_ORE: 11,
  FURNACE: 14,
} as const;

// --- Утилиты ---

/**
 * Сплайн для нелинейного преобразования значений шума.
 * Позволяет задавать кривую: вход (шум) -> выход (высота/параметр).
 */
class Spline {
  private points: { x: number; y: number }[];
  constructor(points: { x: number; y: number }[]) {
    this.points = [...points].sort((a, b) => a.x - b.x);
  }

  public get(x: number): number {
    if (x <= this.points[0].x) return this.points[0].y;
    if (x >= this.points[this.points.length - 1].x) return this.points[this.points.length - 1].y;

    for (let i = 0; i < this.points.length - 1; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];
      if (x >= p1.x && x <= p2.x) {
        const t = (x - p1.x) / (p2.x - p1.x);
        return p1.y + t * (p2.y - p1.y);
      }
    }
    return 0;
  }
}

// Конфигурация шумов
const NOISE_CONFIG = {
  CONTINENTALNESS: {
    scale: 400, spline: new Spline([
      { x: -1.0, y: 0.1 },  // Глубокий океан
      { x: -0.2, y: 0.3 },  // Мелководье
      { x: 0.0, y: 0.45 }, // Берег
      { x: 0.2, y: 0.5 },  // Равнины
      { x: 0.6, y: 0.8 },  // Высокогорье
      { x: 1.0, y: 1.0 }   // Пики
    ])
  },
  EROSION: {
    scale: 300, spline: new Spline([
      { x: -1.0, y: 1.0 },  // Острые пики
      { x: -0.2, y: 0.5 },  // Холмы
      { x: 0.2, y: 0.1 },  // Плоские равнины
      { x: 1.0, y: 0.0 }   // Идеально ровно
    ])
  },
  TEMPERATURE: { scale: 500 },
  HUMIDITY: { scale: 500 }
};

const WORLD_MAX_HEIGHT = 128;
const SEA_LEVEL = 32;

// Кэш noise функций (линтер требует инициализации)
let currentSeed: number = 0;
let noiseC: (x: number, y: number) => number = () => 0;
let noiseE: (x: number, y: number) => number = () => 0;
let noiseT: (x: number, y: number) => number = () => 0;
let noiseH: (x: number, y: number) => number = () => 0;

function createNoiseGenerator(seed: number) {
  const seededRandom = (s: number) => {
    let a = s;
    return () => {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  return {
    c: createNoise2D(seededRandom(seed)),
    e: createNoise2D(seededRandom(seed + 1)),
    t: createNoise2D(seededRandom(seed + 2)),
    h: createNoise2D(seededRandom(seed + 3))
  };
}

interface Biome {
  id: string;
  topBlock: number;
  fillerBlock: number;
  stoneBlock: number;
}

const BIOMES: Record<string, Biome> = {
  DESERT: { id: 'desert', topBlock: BLOCK.STONE, fillerBlock: BLOCK.STONE, stoneBlock: BLOCK.STONE }, // Placeholder for sand
  PLAINS: { id: 'plains', topBlock: BLOCK.GRASS, fillerBlock: BLOCK.DIRT, stoneBlock: BLOCK.STONE },
  MOUNTAINS: { id: 'mountains', topBlock: BLOCK.STONE, fillerBlock: BLOCK.STONE, stoneBlock: BLOCK.STONE },
  SNOW: { id: 'snow', topBlock: BLOCK.STONE, fillerBlock: BLOCK.STONE, stoneBlock: BLOCK.STONE } // Placeholder for snow
};

// Простой селектор биомов
function getBiome(temp: number, humidity: number): Biome {
  if (temp > 0.5) {
    return humidity < 0 ? BIOMES.DESERT : BIOMES.PLAINS;
  }
  return temp < -0.5 ? BIOMES.SNOW : BIOMES.PLAINS;
}

function getTerrainHeight(worldX: number, worldZ: number): { height: number, biome: Biome } {
  const c = noiseC(worldX / NOISE_CONFIG.CONTINENTALNESS.scale, worldZ / NOISE_CONFIG.CONTINENTALNESS.scale);
  const e = noiseE(worldX / NOISE_CONFIG.EROSION.scale, worldZ / NOISE_CONFIG.EROSION.scale);
  const t = noiseT(worldX / NOISE_CONFIG.TEMPERATURE.scale, worldZ / NOISE_CONFIG.TEMPERATURE.scale);
  const h = noiseH(worldX / NOISE_CONFIG.HUMIDITY.scale, worldZ / NOISE_CONFIG.HUMIDITY.scale);

  const baseHeightFactor = NOISE_CONFIG.CONTINENTALNESS.spline.get(c);
  const erosionFactor = NOISE_CONFIG.EROSION.spline.get(e);

  // Комбинируем: базовая высота континента + влияние эрозии
  let height = SEA_LEVEL + (baseHeightFactor * (WORLD_MAX_HEIGHT - SEA_LEVEL)) * (0.5 + erosionFactor * 0.5);

  return {
    height: Math.floor(height),
    biome: getBiome(t, h)
  };
}

function getBlockIndex(x: number, y: number, z: number, chunkSize: number, chunkHeight: number): number {
  return x + y * chunkSize + z * chunkSize * chunkHeight;
}

function generateTerrain(
  data: Uint8Array,
  chunkSize: number,
  chunkHeight: number,
  startX: number,
  startZ: number,
) {
  for (let x = 0; x < chunkSize; x++) {
    for (let z = 0; z < chunkSize; z++) {
      const worldX = startX + x;
      const worldZ = startZ + z;

      const { height, biome } = getTerrainHeight(worldX, worldZ);
      const safeHeight = Math.min(height, chunkHeight - 1);

      for (let y = 0; y <= safeHeight; y++) {
        let type = biome.stoneBlock;
        if (y === 0) type = BLOCK.BEDROCK;
        else if (y === safeHeight) type = biome.topBlock;
        else if (y >= safeHeight - 3) type = biome.fillerBlock;

        const index = getBlockIndex(x, y, z, chunkSize, chunkHeight);
        data[index] = type;
      }
    }
  }
}


function generateOres(
  data: Uint8Array,
  chunkSize: number,
  chunkHeight: number,
  startX: number,
  startZ: number,
) {
  // Coal ore
  generateVein(data, chunkSize, chunkHeight, startX, startZ, BLOCK.COAL_ORE, 8, 80);
  // Iron ore
  generateVein(data, chunkSize, chunkHeight, startX, startZ, BLOCK.IRON_ORE, 6, 50);
}

function generateVein(
  data: Uint8Array,
  chunkSize: number,
  chunkHeight: number,
  startX: number,
  startZ: number,
  blockType: number,
  targetLen: number,
  attempts: number,
) {
  for (let i = 0; i < attempts; i++) {
    let vx = Math.floor(Math.random() * chunkSize);
    let vz = Math.floor(Math.random() * chunkSize);

    const worldX = startX + vx;
    const worldZ = startZ + vz;
    const { height: surfaceHeight } = getTerrainHeight(worldX, worldZ);
    const maxStoneY = Math.max(2, surfaceHeight - 3);

    let vy = Math.floor(Math.random() * (maxStoneY - 1)) + 1;

    let index = getBlockIndex(vx, vy, vz, chunkSize, chunkHeight);
    if (data[index] === BLOCK.STONE) {
      data[index] = blockType;

      let currentLen = 1;
      let fails = 0;
      while (currentLen < targetLen && fails < 10) {
        const dir = Math.floor(Math.random() * 6);
        let nx = vx, ny = vy, nz = vz;

        if (dir === 0) nx++;
        else if (dir === 1) nx--;
        else if (dir === 2) ny++;
        else if (dir === 3) ny--;
        else if (dir === 4) nz++;
        else if (dir === 5) nz--;

        if (nx >= 0 && nx < chunkSize && ny > 0 && ny < chunkHeight && nz >= 0 && nz < chunkSize) {
          index = getBlockIndex(nx, ny, nz, chunkSize, chunkHeight);
          if (data[index] === BLOCK.STONE) {
            data[index] = blockType;
            vx = nx;
            vy = ny;
            vz = nz;
            currentLen++;
          } else if (data[index] === blockType) {
            vx = nx;
            vy = ny;
            vz = nz;
          } else {
            fails++;
          }
        } else {
          fails++;
        }
      }
    }
  }
}


function generateTrees(
  data: Uint8Array,
  chunkSize: number,
  chunkHeight: number,
  startX: number,
  startZ: number,
) {
  for (let x = 2; x < chunkSize - 2; x++) {
    for (let z = 2; z < chunkSize - 2; z++) {
      const worldX = startX + x;
      const worldZ = startZ + z;
      const { height, biome } = getTerrainHeight(worldX, worldZ);

      // Trees only in Plains for now to demonstrate biome specificity
      if (biome.id === 'plains' && height > 0 && height < chunkHeight) {
        const index = getBlockIndex(x, height, z, chunkSize, chunkHeight);
        if (data[index] === BLOCK.GRASS && Math.random() < 0.02) {
          placeTree(data, chunkSize, chunkHeight, x, height + 1, z);
        }
      }
    }
  }
}

function placeTree(
  data: Uint8Array,
  chunkSize: number,
  chunkHeight: number,
  startX: number,
  startY: number,
  startZ: number,
) {
  const trunkHeight = Math.floor(Math.random() * 2) + 4;

  // Trunk
  for (let y = 0; y < trunkHeight; y++) {
    const currentY = startY + y;
    if (currentY < chunkHeight) {
      const index = getBlockIndex(startX, currentY, startZ, chunkSize, chunkHeight);
      data[index] = BLOCK.WOOD;
    }
  }

  // Leaves
  const leavesStart = startY + trunkHeight - 2;
  const leavesEnd = startY + trunkHeight + 1;

  for (let y = leavesStart; y <= leavesEnd; y++) {
    const dy = y - (startY + trunkHeight - 1);
    let radius = 2;
    if (dy === 2) radius = 1;
    else if (dy === -1) radius = 2;

    for (let x = startX - radius; x <= startX + radius; x++) {
      for (let z = startZ - radius; z <= startZ + radius; z++) {
        const dx = x - startX;
        const dz = z - startZ;
        if (Math.abs(dx) === radius && Math.abs(dz) === radius) {
          if (Math.random() < 0.4) continue;
        }

        if (x >= 0 && x < chunkSize && y >= 0 && y < chunkHeight && z >= 0 && z < chunkSize) {
          const index = getBlockIndex(x, y, z, chunkSize, chunkHeight);
          if (data[index] !== BLOCK.WOOD) {
            data[index] = BLOCK.LEAVES;
          }
        }
      }
    }
  }
}


// Типы сообщений
interface GenerateMessage {
  type: 'generate';
  id: number;
  cx: number;
  cz: number;
  seed: number;
  chunkSize: number;
  chunkHeight: number;
}

interface ResultMessage {
  type: 'result';
  id: number;
  cx: number;
  cz: number;
  data: Uint8Array;
}

// Обработчик сообщений
self.onmessage = (e: MessageEvent<GenerateMessage>) => {
  const { type, id, cx, cz, seed, chunkSize, chunkHeight } = e.data;

  if (type === 'generate') {
    // Обновить seed если изменился
    if (seed !== currentSeed) {
      currentSeed = seed;
      const generators = createNoiseGenerator(seed);
      noiseC = generators.c;
      noiseE = generators.e;
      noiseT = generators.t;
      noiseH = generators.h;
    }

    // Генерация данных чанка
    const data = new Uint8Array(chunkSize * chunkSize * chunkHeight);
    const startX = cx * chunkSize;
    const startZ = cz * chunkSize;

    // Terrain (Continentalness + Erosion + Biomes)
    generateTerrain(data, chunkSize, chunkHeight, startX, startZ);

    // Ores
    generateOres(data, chunkSize, chunkHeight, startX, startZ);

    // Trees
    generateTrees(data, chunkSize, chunkHeight, startX, startZ);

    // Отправить результат (transferable для zero-copy)
    const result: ResultMessage = {
      type: 'result',
      id,
      cx,
      cz,
      data,
    };

    self.postMessage(result, [data.buffer] as any);
  }
};

// Сообщить что воркер готов
self.postMessage({ type: 'ready' });
