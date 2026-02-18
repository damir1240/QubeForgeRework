import { describe, it, expect, beforeEach } from "vitest";
import { Inventory } from "./Inventory";

describe("Inventory", () => {
    let inventory: Inventory;

    beforeEach(() => {
        inventory = new Inventory();
    });

    describe("инициализация", () => {
        it("создаёт 36 пустых слотов", () => {
            const slots = inventory.getSlots();
            expect(slots).toHaveLength(36);
            slots.forEach((slot) => {
                expect(slot.id).toBe(0);
                expect(slot.count).toBe(0);
            });
        });

        it("начальный выбранный слот = 0", () => {
            expect(inventory.getSelectedSlot()).toBe(0);
        });
    });

    describe("addItem", () => {
        it("добавляет предмет в первый пустой слот", () => {
            const remaining = inventory.addItem(1, 10);
            expect(remaining).toBe(0);
            expect(inventory.getSlot(0).id).toBe(1);
            expect(inventory.getSlot(0).count).toBe(10);
        });

        it("стакает предметы в существующий слот", () => {
            inventory.addItem(1, 30);
            inventory.addItem(1, 20);
            expect(inventory.getSlot(0).count).toBe(50);
            // Второй слот пуст — всё уместилось в первый
            expect(inventory.getSlot(1).id).toBe(0);
        });

        it("не стакает больше 64", () => {
            inventory.addItem(1, 60);
            inventory.addItem(1, 10);
            expect(inventory.getSlot(0).count).toBe(64);
            expect(inventory.getSlot(1).id).toBe(1);
            expect(inventory.getSlot(1).count).toBe(6);
        });

        it("инструменты не стакаются (maxStack = 1)", () => {
            // ID 20-39 — инструменты
            inventory.addItem(20, 3);
            expect(inventory.getSlot(0).id).toBe(20);
            expect(inventory.getSlot(0).count).toBe(1);
            expect(inventory.getSlot(1).id).toBe(20);
            expect(inventory.getSlot(1).count).toBe(1);
            expect(inventory.getSlot(2).id).toBe(20);
            expect(inventory.getSlot(2).count).toBe(1);
        });

        it("возвращает остаток, если инвентарь полон", () => {
            // Заполним все 36 слотов
            for (let i = 0; i < 36; i++) {
                inventory.addItem(1, 64);
            }
            const remaining = inventory.addItem(1, 10);
            expect(remaining).toBe(10);
        });

        it("добавляет разные предметы в разные слоты", () => {
            inventory.addItem(1, 5);
            inventory.addItem(2, 10);
            expect(inventory.getSlot(0).id).toBe(1);
            expect(inventory.getSlot(0).count).toBe(5);
            expect(inventory.getSlot(1).id).toBe(2);
            expect(inventory.getSlot(1).count).toBe(10);
        });
    });

    describe("removeItem", () => {
        it("удаляет указанное количество предметов", () => {
            inventory.addItem(1, 10);
            const success = inventory.removeItem(1, 5);
            expect(success).toBe(true);
            expect(inventory.getSlot(0).count).toBe(5);
        });

        it("очищает слот когда count достигает 0", () => {
            inventory.addItem(1, 5);
            inventory.removeItem(1, 5);
            expect(inventory.getSlot(0).id).toBe(0);
            expect(inventory.getSlot(0).count).toBe(0);
        });

        it("удаляет из нескольких слотов", () => {
            inventory.addItem(1, 64);
            inventory.addItem(1, 20);
            const success = inventory.removeItem(1, 70);
            expect(success).toBe(true);
            // Первый слот: 64 - 64 = 0, второй: 20 - 6 = 14
            expect(inventory.getSlot(0).id).toBe(0);
            expect(inventory.getSlot(1).count).toBe(14);
        });

        it("возвращает false если недостаточно предметов", () => {
            inventory.addItem(1, 5);
            const success = inventory.removeItem(1, 10);
            expect(success).toBe(false);
        });
    });

    describe("selectedSlot", () => {
        it("устанавливает выбранный слот в пределах хотбара (0-8)", () => {
            inventory.setSelectedSlot(5);
            expect(inventory.getSelectedSlot()).toBe(5);
        });

        it("игнорирует некорректный индекс (< 0)", () => {
            inventory.setSelectedSlot(3);
            inventory.setSelectedSlot(-1);
            expect(inventory.getSelectedSlot()).toBe(3);
        });

        it("игнорирует некорректный индекс (>= 9)", () => {
            inventory.setSelectedSlot(3);
            inventory.setSelectedSlot(9);
            expect(inventory.getSelectedSlot()).toBe(3);
        });

        it("getSelectedSlotItem возвращает предмет выбранного слота", () => {
            inventory.addItem(5, 10);
            inventory.setSelectedSlot(0);
            const item = inventory.getSelectedSlotItem();
            expect(item.id).toBe(5);
            expect(item.count).toBe(10);
        });
    });

    describe("serialize / deserialize", () => {
        it("сериализация создаёт глубокую копию", () => {
            inventory.addItem(1, 10);
            const serialized = inventory.serialize();
            serialized[0].count = 999;
            expect(inventory.getSlot(0).count).toBe(10);
        });

        it("десериализация восстанавливает данные", () => {
            const data = Array.from({ length: 36 }, () => ({ id: 0, count: 0 }));
            data[0] = { id: 5, count: 32 };
            data[5] = { id: 3, count: 64 };
            inventory.deserialize(data);
            expect(inventory.getSlot(0).id).toBe(5);
            expect(inventory.getSlot(0).count).toBe(32);
            expect(inventory.getSlot(5).id).toBe(3);
            expect(inventory.getSlot(5).count).toBe(64);
        });

        it("round-trip: serialize → deserialize сохраняет данные", () => {
            inventory.addItem(1, 10);
            inventory.addItem(2, 20);
            const serialized = inventory.serialize();
            const newInventory = new Inventory();
            newInventory.deserialize(serialized);
            expect(newInventory.getSlot(0).id).toBe(1);
            expect(newInventory.getSlot(0).count).toBe(10);
            expect(newInventory.getSlot(1).id).toBe(2);
            expect(newInventory.getSlot(1).count).toBe(20);
        });
    });

    describe("clear", () => {
        it("очищает все слоты", () => {
            inventory.addItem(1, 10);
            inventory.addItem(2, 20);
            inventory.clear();
            inventory.getSlots().forEach((slot) => {
                expect(slot.id).toBe(0);
                expect(slot.count).toBe(0);
            });
        });
    });

    describe("setSlot", () => {
        it("устанавливает данные в конкретный слот", () => {
            inventory.setSlot(5, { id: 3, count: 15 });
            expect(inventory.getSlot(5).id).toBe(3);
            expect(inventory.getSlot(5).count).toBe(15);
        });

        it("setSlot создаёт глубокую копию", () => {
            const slotData = { id: 3, count: 15 };
            inventory.setSlot(5, slotData);
            slotData.count = 999;
            expect(inventory.getSlot(5).count).toBe(15);
        });
    });
});
