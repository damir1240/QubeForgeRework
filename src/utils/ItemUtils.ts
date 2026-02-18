// src/utils/ItemUtils.ts
// Утилиты для определения типов предметов — единая точка правды вместо magic numbers

import { BLOCK } from "../constants/Blocks";
import { TOOL_DURABILITY } from "../constants/GameConstants";

/** Все ID инструментов */
const TOOL_IDS = new Set([
    BLOCK.WOODEN_SWORD, BLOCK.WOODEN_PICKAXE, BLOCK.WOODEN_AXE, BLOCK.WOODEN_SHOVEL,
    BLOCK.STONE_SWORD, BLOCK.STONE_PICKAXE, BLOCK.STONE_AXE, BLOCK.STONE_SHOVEL,
    BLOCK.IRON_SWORD, BLOCK.IRON_PICKAXE, BLOCK.IRON_AXE, BLOCK.IRON_SHOVEL,
]);

/** ID предметов, которые рендерятся как предметы (не как блоки) */
const ITEM_ENTITY_IDS = new Set([
    BLOCK.STICK, BLOCK.COAL, BLOCK.IRON_INGOT,
    ...TOOL_IDS,
]);

/** Деревянные инструменты */
const WOOD_TOOLS = new Set([
    BLOCK.WOODEN_SWORD, BLOCK.WOODEN_PICKAXE, BLOCK.WOODEN_AXE, BLOCK.WOODEN_SHOVEL,
]);

/** Каменные инструменты */
const STONE_TOOLS = new Set([
    BLOCK.STONE_SWORD, BLOCK.STONE_PICKAXE, BLOCK.STONE_AXE, BLOCK.STONE_SHOVEL,
]);

/** Железные инструменты */
const IRON_TOOLS = new Set([
    BLOCK.IRON_SWORD, BLOCK.IRON_PICKAXE, BLOCK.IRON_AXE, BLOCK.IRON_SHOVEL,
]);

export type ToolTier = 'wood' | 'stone' | 'iron';

/**
 * Является ли предмет инструментом (меч, кирка, топор, лопата)
 */
export function isTool(id: number): boolean {
    return TOOL_IDS.has(id);
}

/**
 * Является ли предмет предметной сущностью (не блок)
 * Используется для определения, как рендерить выпавший дроп
 */
export function isItemEntity(id: number): boolean {
    return ITEM_ENTITY_IDS.has(id);
}

/**
 * Определить тир инструмента
 */
export function getToolTier(id: number): ToolTier | null {
    if (WOOD_TOOLS.has(id)) return 'wood';
    if (STONE_TOOLS.has(id)) return 'stone';
    if (IRON_TOOLS.has(id)) return 'iron';
    return null;
}

/**
 * Получить максимальную прочность инструмента
 */
export function getToolDurability(id: number): number {
    const tier = getToolTier(id);
    if (!tier) return 0;

    switch (tier) {
        case 'wood': return TOOL_DURABILITY.WOOD;
        case 'stone': return TOOL_DURABILITY.STONE;
        case 'iron': return TOOL_DURABILITY.IRON;
    }
}
