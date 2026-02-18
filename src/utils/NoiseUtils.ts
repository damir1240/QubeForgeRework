import { createNoise2D } from "simplex-noise";

/**
 * Создает детерминированный генератор случайных чисел на основе seed.
 * Алгоритм Mulberry32.
 */
export function createRandom(seed: number) {
    let a = seed;
    return () => {
        let t = (a += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Создает 2D шум Simplex с заданным seed.
 */
export function createNoise(seed: number) {
    return createNoise2D(createRandom(seed));
}

/**
 * Многооктавный шум (Fractal Brownian Motion).
 * Позволяет добавить детализацию ландшафту.
 */
export function getOctaveNoise(
    noiseFn: (x: number, y: number) => number,
    x: number,
    y: number,
    octaves: number,
    persistence: number,
    scale: number
): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
        total += noiseFn(x * frequency / scale, y * frequency / scale) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= 2;
    }

    return total / maxValue;
}
