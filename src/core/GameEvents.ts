export const GameEvents = {
    // Block Events
    BLOCK_BROKEN: 'block:broken',
    BLOCK_PLACED: 'block:placed',
    BLOCK_DAMAGED: 'block:damaged',

    // Player Events
    PLAYER_ATTACK: 'player:attack',
    PLAYER_JUMP: 'player:jump',
    PLAYER_DAMAGE: 'player:damage',
    PLAYER_HEAL: 'player:heal',
    PLAYER_DEATH: 'player:death',

    // Inventory Events
    ITEM_PICKUP: 'item:pickup',
    ITEM_DROP: 'item:drop',
    INVENTORY_CHANGED: 'inventory:changed',
    SELECTED_SLOT_CHANGED: 'inventory:selected_slot_changed',
    TOOL_USED: 'tool:used',
    ITEM_CONSUMED: 'item:consumed',

    // System Events
    GAME_START: 'game:start',
    GAME_PAUSE: 'game:pause',
    GAME_RESUME: 'game:resume',

    // Interaction
    OPEN_CRAFTING: 'interaction:open_crafting',
    OPEN_FURNACE: 'interaction:open_furnace',
    PLAYER_HEALTH_CHANGED: 'player:health_changed',
    PLAYER_RESPAWN: 'player:respawn',

    // UI Routes/Actions
    UI_TOGGLE_INVENTORY: 'ui:toggle_inventory',
    UI_TOGGLE_PAUSE: 'ui:toggle_pause',
    UI_HOTBAR_CHANGE: 'ui:hotbar_change',
};

// Event Payloads
export interface BlockBrokenEvent {
    x: number;
    y: number;
    z: number;
    blockId: number;
    toolId?: number;
}

export interface BlockPlacedEvent {
    x: number;
    y: number;
    z: number;
    blockId: number;
}

export interface ItemPickupEvent {
    itemId: number;
    count: number;
}

export interface ToolUsedEvent {
    toolId: number;
    damage: number;
}

export interface PlayerHealthEvent {
    current: number;
    max: number;
}

export interface PlayerDamageEvent extends PlayerHealthEvent {
    amount: number;
}
