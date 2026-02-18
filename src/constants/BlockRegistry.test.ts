import { describe, it, expect } from "vitest";
import { getBreakTime, getBlockProperties } from "./BlockRegistry";
import { BLOCK } from "./Blocks";

describe("BlockRegistry", () => {
    describe("getBreakTime", () => {
        it("возвращает время ломания для травы без инструмента", () => {
            const time = getBreakTime(BLOCK.GRASS, 0);
            expect(time).toBe(750);
        });

        it("железная лопата ускоряет копание земли", () => {
            const time = getBreakTime(BLOCK.DIRT, BLOCK.IRON_SHOVEL);
            expect(time).toBe(100);
        });

        it("каменная лопата даёт среднюю скорость", () => {
            const time = getBreakTime(BLOCK.GRASS, BLOCK.STONE_SHOVEL);
            expect(time).toBe(200);
        });

        it("деревянная лопата медленнее каменной", () => {
            const time = getBreakTime(BLOCK.GRASS, BLOCK.WOODEN_SHOVEL);
            expect(time).toBe(400);
        });

        it("камень без кирки — очень медленно", () => {
            const time = getBreakTime(BLOCK.STONE, 0);
            expect(time).toBe(7500);
        });

        it("камень с железной киркой — быстро", () => {
            const time = getBreakTime(BLOCK.STONE, BLOCK.IRON_PICKAXE);
            expect(time).toBe(400);
        });

        it("листья ломаются быстро без инструмента", () => {
            const time = getBreakTime(BLOCK.LEAVES, 0);
            expect(time).toBe(500);
        });

        it("бедрок нельзя сломать (Infinity)", () => {
            const time = getBreakTime(BLOCK.BEDROCK, 0);
            expect(time).toBe(Infinity);
        });

        it("дерево с железным топором — быстрее чем рукой", () => {
            const baseTime = getBreakTime(BLOCK.WOOD, 0);
            const ironAxeTime = getBreakTime(BLOCK.WOOD, BLOCK.IRON_AXE);
            expect(ironAxeTime).toBeLessThan(baseTime);
            expect(ironAxeTime).toBe(375);
        });

        it("незарегистрированный блок — 1000ms по умолчанию", () => {
            const time = getBreakTime(999, 0);
            expect(time).toBe(1000);
        });

        it("печь ломается как камень", () => {
            const stoneTime = getBreakTime(BLOCK.STONE, 0);
            const furnaceTime = getBreakTime(BLOCK.FURNACE, 0);
            expect(furnaceTime).toBe(stoneTime);
        });
    });

    describe("getBlockProperties", () => {
        it("возвращает свойства зарегистрированного блока", () => {
            const props = getBlockProperties(BLOCK.GRASS);
            expect(props).toBeDefined();
            expect(props.baseBreakTime).toBeGreaterThan(0);
        });

        it("возвращает default свойства для незарегистрированного блока", () => {
            const props = getBlockProperties(999);
            expect(props).toBeDefined();
            expect(props.baseBreakTime).toBe(1000);
        });
    });
});
