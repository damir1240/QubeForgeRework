import type { InventorySlot } from "./Inventory";

export interface IInventory {
    addItem(id: number, count: number): number;
    removeItem(id: number, count: number): boolean;
    getSlot(index: number): InventorySlot;
    setSlot(index: number, slot: InventorySlot): void;
    getSelectedSlot(): number;
    getSelectedSlotItem(): InventorySlot;
    clear(): void;
}
