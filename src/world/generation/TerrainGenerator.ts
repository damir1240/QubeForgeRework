import { BLOCK } from "../../constants/Blocks";
import { Spline } from "../../utils/Spline";
import { createNoise, getOctaveNoise } from "../../utils/NoiseUtils";

export interface Biome {
  id: string;
  topBlock: number;
  fillerBlock: number;
  stoneBlock: number;
}

export class TerrainGenerator {
  private seed: number;
  private noiseC!: (x: number, y: number) => number;
  private noiseE!: (x: number, y: number) => number;
  private noiseD!: (x: number, y: number) => number; // Detail noise
  private noiseW!: (x: number, y: number) => number; // Weirdness
  private noiseWarpX!: (x: number, y: number) => number;
  private noiseWarpZ!: (x: number, y: number) => number;

  // Константы мира
  public readonly WORLD_MAX_HEIGHT = 128;
  public readonly SEA_LEVEL = 32;

  // Конфигурация шумов (Minecraft 1.18+ вдохновленная)
  private readonly CONTINENTALNESS = {
    scale: 1200,
    spline: new Spline([
      { x: -1.0, y: 0.1 },  // Глубокий океан
      { x: -0.4, y: 0.2 },  // Океан
      { x: -0.1, y: 0.35 }, // Мелководье
      { x: 0.0, y: 0.45 },  // Побережье
      { x: 0.1, y: 0.55 },  // Равнины
      { x: 0.4, y: 0.65 },  // Глубокий материк
      { x: 0.8, y: 0.85 },  // Высокогорье
      { x: 1.0, y: 1.0 }    // Горные хребты
    ])
  };

  private readonly EROSION = {
    scale: 800,
    spline: new Spline([
      { x: -1.0, y: 0.9 },  // Очень резкий рельеф (Пики)
      { x: -0.5, y: 0.6 },  // Холмисто
      { x: 0.0, y: 0.3 },   // Мягкие холмы
      { x: 0.4, y: 0.1 },   // Плоские равнины
      { x: 1.0, y: 0.05 }   // Почти идеально ровно
    ])
  };

  private readonly WEIRDNESS = { scale: 600 };

  // Пока только один биом - Равнины
  private readonly DEFAULT_BIOME: Biome = {
    id: 'plains',
    topBlock: BLOCK.GRASS,
    fillerBlock: BLOCK.DIRT,
    stoneBlock: BLOCK.STONE
  };

  constructor(seed?: number) {
    this.seed = seed ?? Math.floor(Math.random() * 2147483647);
    this.initGenerators();
  }

  private initGenerators() {
    this.noiseC = createNoise(this.seed);
    this.noiseE = createNoise(this.seed + 1);
    this.noiseW = createNoise(this.seed + 2);
    this.noiseD = createNoise(this.seed + 3);
    this.noiseWarpX = createNoise(this.seed + 4);
    this.noiseWarpZ = createNoise(this.seed + 5);
  }

  public getSeed(): number {
    return this.seed;
  }

  public setSeed(seed: number) {
    this.seed = seed;
    this.initGenerators();
  }

  /**
   * Вычисляет высоту и биом для данных координат
   */
  public getTerrainData(worldX: number, worldZ: number): { height: number, biome: Biome } {
    // 0. Domain Warping - искажаем координаты, чтобы убрать прямые линии и "блобы"
    const warpStr = 20; // Сила искажения
    const wx = worldX + this.noiseWarpX(worldX / 150, worldZ / 150) * warpStr;
    const wz = worldZ + this.noiseWarpZ(worldX / 150, worldZ / 150) * warpStr;

    // 1. Continentalness (С) - определяет глобальную высоту (суша/море)
    const cVal = this.noiseC(wx / this.CONTINENTALNESS.scale, wz / this.CONTINENTALNESS.scale);
    const baseHeightFactor = this.CONTINENTALNESS.spline.get(cVal);

    // 2. Erosion (E) - определяет резкость рельефа
    const eVal = this.noiseE(wx / this.EROSION.scale, wz / this.EROSION.scale);
    const erosionFactor = this.EROSION.spline.get(eVal);

    // 3. Weirdness (W) -> Peaks & Valleys (PV)
    // Формула из Minecraft 1.18: PV = 1 - Math.abs(3 * Math.abs(weirdness) - 2)
    const wVal = this.noiseW(wx / this.WEIRDNESS.scale, wz / this.WEIRDNESS.scale);
    const pv = 1.0 - Math.abs(3.0 * Math.abs(wVal) - 2.0);
    // PV создает хребты (ridges) и долины (valleys)

    // 4. Комбинируем всё вместе
    // Базовая амплитуда зависит от континентальности
    const amplitude = (this.WORLD_MAX_HEIGHT - this.SEA_LEVEL);

    // Высота = Уровень моря + Скорректированная базовая высота + Влияние эрозии и хребтов
    let height = this.SEA_LEVEL + (baseHeightFactor * 0.5 * amplitude);

    // Добавляем влияние эрозии и PV (Peaks & Valleys)
    // Чем ниже эрозия (отрицательные значения), тем сильнее "выталкиваются" горы вверх
    const terrainVariation = (0.5 + erosionFactor * 0.5) * (pv * 20);

    // Если континентальность высокая, позволяем горам расти намного выше
    const mountainFactor = Math.max(0, (cVal + 0.2) * 2.0) * (1.0 - erosionFactor);
    height += terrainVariation + (mountainFactor * 40 * Math.max(0, pv));

    // 5. Микро-рельеф (Octave Noise) для детализации поверхности
    const detail = getOctaveNoise(this.noiseD, wx, wz, 3, 0.5, 60);
    // Детали уменьшаются на очень гладких равнинах (высокая эрозия)
    const detailAmplitude = 3.0 * (0.3 + (1.0 - erosionFactor) * 0.7);
    height += detail * detailAmplitude;

    // Сглаживание приземления (чтобы не было резких прыжков из-за Math.floor)
    // Добавим небольшое случайное смещение в зависимости от координат для "мягкости"
    const finalHeight = Math.max(1, Math.floor(height));

    return {
      height: finalHeight,
      biome: this.DEFAULT_BIOME
    };
  }

  /**
   * Упрощенный метод получения только высоты (для обратной совместимости)
   */
  public getTerrainHeight(worldX: number, worldZ: number): number {
    return this.getTerrainData(worldX, worldZ).height;
  }

  public generateTerrain(
    data: Uint8Array,
    chunkSize: number,
    chunkHeight: number,
    startX: number,
    startZ: number,
    getBlockIndex: (x: number, y: number, z: number) => number,
  ) {
    for (let x = 0; x < chunkSize; x++) {
      for (let z = 0; z < chunkSize; z++) {
        const worldX = startX + x;
        const worldZ = startZ + z;

        const { height, biome } = this.getTerrainData(worldX, worldZ);
        const safeHeight = Math.min(height, chunkHeight - 1);

        for (let y = 0; y <= safeHeight; y++) {
          let type = biome.stoneBlock;

          if (y === 0) {
            type = BLOCK.BEDROCK;
          } else if (y === safeHeight) {
            type = biome.topBlock;
          } else if (y >= safeHeight - 3) {
            type = biome.fillerBlock;
          }

          const index = getBlockIndex(x, y, z);
          data[index] = type;
        }
      }
    }
  }
}
