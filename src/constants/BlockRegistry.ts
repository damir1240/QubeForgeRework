// src/constants/BlockRegistry.ts
// Data-driven реестр свойств блоков — заменяет switch-case в World.getBreakTime()

import { BLOCK } from "./Blocks";

/** Тип инструмента */
export type ToolCategory = 'pickaxe' | 'axe' | 'shovel' | 'sword';

/** Свойства блока */
export interface BlockProperties {
    /** Базовое время ломания без инструмента (мс) */
    baseBreakTime: number;
    /** Множители скорости для конкретных инструментов: toolId → множитель */
    toolMultipliers: Record<number, number>;
    /** Можно ли сломать этот блок */
    breakable: boolean;
}

/**
 * Реестр свойств блоков.
 * Единая точка правды для break times и tool multipliers.
 */
const BLOCK_PROPERTIES: Record<number, BlockProperties> = {
    [BLOCK.GRASS]: {
        baseBreakTime: 750,
        toolMultipliers: {
            [BLOCK.WOODEN_SHOVEL]: 400,
            [BLOCK.STONE_SHOVEL]: 200,
            [BLOCK.IRON_SHOVEL]: 100,
        },
        breakable: true,
    },
    [BLOCK.DIRT]: {
        baseBreakTime: 750,
        toolMultipliers: {
            [BLOCK.WOODEN_SHOVEL]: 400,
            [BLOCK.STONE_SHOVEL]: 200,
            [BLOCK.IRON_SHOVEL]: 100,
        },
        breakable: true,
    },
    [BLOCK.STONE]: {
        baseBreakTime: 7500,
        toolMultipliers: {
            [BLOCK.WOODEN_PICKAXE]: 1150,
            [BLOCK.STONE_PICKAXE]: 600,
            [BLOCK.IRON_PICKAXE]: 400,
        },
        breakable: true,
    },
    [BLOCK.FURNACE]: {
        baseBreakTime: 7500,
        toolMultipliers: {
            [BLOCK.WOODEN_PICKAXE]: 1150,
            [BLOCK.STONE_PICKAXE]: 600,
            [BLOCK.IRON_PICKAXE]: 400,
        },
        breakable: true,
    },
    [BLOCK.IRON_ORE]: {
        baseBreakTime: 15000,
        toolMultipliers: {
            [BLOCK.WOODEN_PICKAXE]: 7500,
            [BLOCK.STONE_PICKAXE]: 1150,
            [BLOCK.IRON_PICKAXE]: 800,
        },
        breakable: true,
    },
    [BLOCK.COAL_ORE]: {
        baseBreakTime: 15000,
        toolMultipliers: {
            [BLOCK.WOODEN_PICKAXE]: 2250,
            [BLOCK.STONE_PICKAXE]: 1150,
            [BLOCK.IRON_PICKAXE]: 800,
        },
        breakable: true,
    },
    [BLOCK.LEAVES]: {
        baseBreakTime: 500,
        toolMultipliers: {},
        breakable: true,
    },
    [BLOCK.WOOD]: {
        baseBreakTime: 3000,
        toolMultipliers: {
            [BLOCK.WOODEN_AXE]: 1500,   // 3000 / 2
            [BLOCK.STONE_AXE]: 750,     // 3000 / 4
            [BLOCK.IRON_AXE]: 375,      // 3000 / 8
        },
        breakable: true,
    },
    [BLOCK.PLANKS]: {
        baseBreakTime: 3000,
        toolMultipliers: {
            [BLOCK.WOODEN_AXE]: 1500,
            [BLOCK.STONE_AXE]: 750,
            [BLOCK.IRON_AXE]: 375,
        },
        breakable: true,
    },
    [BLOCK.CRAFTING_TABLE]: {
        baseBreakTime: 1000,
        toolMultipliers: {},
        breakable: true,
    },
    [BLOCK.BEDROCK]: {
        baseBreakTime: Infinity,
        toolMultipliers: {},
        breakable: false,
    },
};

/** Свойства по умолчанию для незарегистрированных блоков */
const DEFAULT_PROPERTIES: BlockProperties = {
    baseBreakTime: 1000,
    toolMultipliers: {},
    breakable: true,
};

/**
 * Получить время ломания блока с учётом инструмента
 */
export function getBreakTime(blockType: number, toolId: number = 0): number {
    const props = BLOCK_PROPERTIES[blockType] ?? DEFAULT_PROPERTIES;

    if (!props.breakable) return Infinity;

    // Если есть множитель для данного инструмента, используем его
    if (toolId !== 0 && props.toolMultipliers[toolId] !== undefined) {
        return props.toolMultipliers[toolId];
    }

    return props.baseBreakTime;
}

/**
 * Получить свойства блока
 */
export function getBlockProperties(blockType: number): BlockProperties {
    return BLOCK_PROPERTIES[blockType] ?? DEFAULT_PROPERTIES;
}

/**
 * Проверить, можно ли сломать блок
 */
export function isBreakable(blockType: number): boolean {
    const props = BLOCK_PROPERTIES[blockType];
    return props ? props.breakable : true;
}
