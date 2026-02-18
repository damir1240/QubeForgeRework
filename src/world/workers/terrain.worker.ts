/**
 * Web Worker для генерации terrain
 * Выполняет тяжёлые вычисления в отдельном потоке
 */

import { TerrainGenerator } from "../generation/TerrainGenerator";
import { StructureGenerator } from "../generation/StructureGenerator";

// Состояние воркера
let currentSeed: number = 0;
let terrainGen: TerrainGenerator | null = null;
let structureGen: StructureGenerator | null = null;

function getBlockIndex(x: number, y: number, z: number, chunkSize: number, chunkHeight: number): number {
  return x + y * chunkSize + z * chunkSize * chunkHeight;
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
    // Инициализация генераторов если seed изменился или еще не были созданы
    if (!terrainGen || seed !== currentSeed) {
      currentSeed = seed;
      terrainGen = new TerrainGenerator(seed);
      structureGen = new StructureGenerator(terrainGen);
    }

    // Генерация данных чанка
    const data = new Uint8Array(chunkSize * chunkSize * chunkHeight);
    const startX = cx * chunkSize;
    const startZ = cz * chunkSize;

    const indexFn = (lx: number, ly: number, lz: number) => getBlockIndex(lx, ly, lz, chunkSize, chunkHeight);

    // 1. Terrain (Advanced Noise + Octaves)
    terrainGen.generateTerrain(data, chunkSize, chunkHeight, startX, startZ, indexFn);

    // 2. Ores
    structureGen.generateOres(data, chunkSize, chunkHeight, startX, startZ, indexFn);

    // 3. Trees (Только на поверхности)
    structureGen.generateTrees(data, chunkSize, chunkHeight, indexFn);

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
