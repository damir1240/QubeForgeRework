import { describe, it, expect, beforeEach } from "vitest";
import { CraftingSystem } from "./CraftingSystem";
import { BLOCK } from "../constants/Blocks";

describe("CraftingSystem", () => {
    let crafting: CraftingSystem;

    beforeEach(() => {
        crafting = new CraftingSystem();
    });

    describe("инициализация", () => {
        it("создаёт 9 пустых слотов крафта", () => {
            expect(crafting.craftingSlots).toHaveLength(9);
            crafting.craftingSlots.forEach((slot) => {
                expect(slot.id).toBe(0);
                expect(slot.count).toBe(0);
            });
        });

        it("результат крафта пуст", () => {
            expect(crafting.craftingResult.id).toBe(0);
            expect(crafting.craftingResult.count).toBe(0);
        });

        it("по умолчанию не является верстаком", () => {
            expect(crafting.isCraftingTable).toBe(false);
        });
    });

    describe("setCraftingTable", () => {
        it("переключает режим верстака", () => {
            crafting.setCraftingTable(true);
            expect(crafting.isCraftingTable).toBe(true);
        });

        it("отключает режим верстака", () => {
            crafting.setCraftingTable(true);
            crafting.setCraftingTable(false);
            expect(crafting.isCraftingTable).toBe(false);
        });
    });

    describe("checkRecipes — shaped (pattern+keys)", () => {
        it("крафт планок из дерева (2x2 сетка)", () => {
            // Рецепт: 1 дерево → 4 доски
            // Это shapeless рецепт (ingredients), проверяем его
            crafting.setCraftingTable(false);
            crafting.craftingSlots[0] = { id: BLOCK.WOOD, count: 1 };
            crafting.checkRecipes();

            expect(crafting.craftingResult.id).toBe(BLOCK.PLANKS);
            expect(crafting.craftingResult.count).toBe(4);
        });
    });

    describe("checkRecipes — пустая сетка", () => {
        it("возвращает пустой результат для пустой сетки", () => {
            crafting.checkRecipes();
            expect(crafting.craftingResult.id).toBe(0);
            expect(crafting.craftingResult.count).toBe(0);
        });
    });

    describe("consumeIngredients", () => {
        it("уменьшает count ингредиентов на 1", () => {
            crafting.setCraftingTable(false);
            crafting.craftingSlots[0] = { id: BLOCK.WOOD, count: 3 };
            crafting.consumeIngredients();
            expect(crafting.craftingSlots[0].count).toBe(2);
        });

        it("очищает слот когда count достигает 0", () => {
            crafting.setCraftingTable(false);
            crafting.craftingSlots[0] = { id: BLOCK.WOOD, count: 1 };
            crafting.consumeIngredients();
            expect(crafting.craftingSlots[0].id).toBe(0);
            expect(crafting.craftingSlots[0].count).toBe(0);
        });

        it("пересчитывает рецепт после потребления", () => {
            crafting.setCraftingTable(false);
            crafting.craftingSlots[0] = { id: BLOCK.WOOD, count: 2 };
            crafting.checkRecipes();
            expect(crafting.craftingResult.id).toBe(BLOCK.PLANKS);

            crafting.consumeIngredients();
            // Ещё одно дерево осталось — рецепт продолжит работать
            expect(crafting.craftingResult.id).toBe(BLOCK.PLANKS);
        });
    });
});
