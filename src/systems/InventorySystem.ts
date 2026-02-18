import type { IInventory } from "../inventory/IInventory";
import { InventoryUI } from "../inventory/InventoryUI";
import { eventManager } from "../core/EventManager";
import { GameEvents } from "../core/GameEvents";

export class InventorySystem {
    private inventory: IInventory;
    private inventoryUI: InventoryUI;

    constructor(inventory: IInventory, inventoryUI: InventoryUI) {
        this.inventory = inventory;
        this.inventoryUI = inventoryUI;
        this.setupListeners();
    }

    private setupListeners(): void {
        // Listen for Item Pickups
        eventManager.on<{ itemId: number; count: number; entityId: number }>(GameEvents.ITEM_PICKUP, (event) => {
            const { itemId, count, entityId } = event;
            const remaining = this.inventory.addItem(itemId, count);

            if (remaining < count) {
                // Some or all items were picked up
                // We need to signal EntitySystem to remove or update the entity
                // But EntitySystem emitted this. 
                // We should emit an event back? Or EntitySystem should handle the "remaining" logic?
                // The original code was: 
                // const remaining = inventory.addItem(...);
                // entity.count = remaining;
                // if (remaining === 0) entity.dispose();

                // Since we are decoupling, InventorySystem should just say "I took X items".
                // Or better: EntitySystem should ask Inventory "Can you take this?"
                // But interactions are event based.

                // Let's fire an event: ITEM_PICKED_UP_SUCCESS
                eventManager.emit('item:pickup_processed', { entityId, remaining });
            }

            this.inventoryUI.refresh();
            this.inventoryUI.emitInventoryChange();
        });
    }
}
