import { describe, it, expect } from "vitest";
import { isTool, isItemEntity, getToolTier, getToolDurability } from "./ItemUtils";
import { BLOCK } from "../constants/Blocks";

describe("ItemUtils", () => {
    describe("isTool", () => {
        it("деревянная кирка — инструмент", () => {
            expect(isTool(BLOCK.WOODEN_PICKAXE)).toBe(true);
        });

        it("каменная кирка — инструмент", () => {
            expect(isTool(BLOCK.STONE_PICKAXE)).toBe(true);
        });

        it("железная кирка — инструмент", () => {
            expect(isTool(BLOCK.IRON_PICKAXE)).toBe(true);
        });

        it("обычный блок — не инструмент", () => {
            expect(isTool(BLOCK.DIRT)).toBe(false);
        });

        it("воздух (0) — не инструмент", () => {
            expect(isTool(0)).toBe(false);
        });

        it("граница: id = 20 — инструмент", () => {
            expect(isTool(20)).toBe(true);
        });

        it("граница: IRON_SHOVEL (34) — инструмент", () => {
            expect(isTool(BLOCK.IRON_SHOVEL)).toBe(true);
        });

        it("граница: id = 19 — не инструмент", () => {
            expect(isTool(19)).toBe(false);
        });

        it("еда (id = 40) — не инструмент", () => {
            expect(isTool(BLOCK.RAW_MEAT)).toBe(false);
        });
    });

    describe("isItemEntity", () => {
        it("инструменты — item entities", () => {
            expect(isItemEntity(BLOCK.WOODEN_PICKAXE)).toBe(true);
        });

        it("палка (BLOCK.STICK) — item entity", () => {
            expect(isItemEntity(BLOCK.STICK)).toBe(true);
        });

        it("dirt — не item entity", () => {
            expect(isItemEntity(BLOCK.DIRT)).toBe(false);
        });
    });

    describe("getToolTier", () => {
        it("деревянный инструмент — tier wood", () => {
            const tier = getToolTier(BLOCK.WOODEN_PICKAXE);
            expect(tier).toBe("wood");
        });

        it("каменный инструмент — tier stone", () => {
            const tier = getToolTier(BLOCK.STONE_PICKAXE);
            expect(tier).toBe("stone");
        });

        it("железный инструмент — tier iron", () => {
            const tier = getToolTier(BLOCK.IRON_PICKAXE);
            expect(tier).toBe("iron");
        });

        it("не-инструмент — null", () => {
            const tier = getToolTier(BLOCK.DIRT);
            expect(tier).toBeNull();
        });
    });

    describe("getToolDurability", () => {
        it("деревянный инструмент — прочность > 0", () => {
            const dur = getToolDurability(BLOCK.WOODEN_PICKAXE);
            expect(dur).toBeGreaterThan(0);
        });

        it("железный инструмент прочнее каменного", () => {
            const ironDur = getToolDurability(BLOCK.IRON_PICKAXE);
            const stoneDur = getToolDurability(BLOCK.STONE_PICKAXE);
            expect(ironDur).toBeGreaterThan(stoneDur);
        });

        it("не-инструмент — 0", () => {
            const dur = getToolDurability(BLOCK.DIRT);
            expect(dur).toBe(0);
        });
    });
});
