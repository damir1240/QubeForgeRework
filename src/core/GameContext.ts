// limit imports to types if possible
import { Renderer } from "./Renderer";
import { EventManager } from "./EventManager";
import { EntitySystem } from "../systems/EntitySystem";
import type { InventorySystem } from "../systems/InventorySystem";
import type { UISystem } from "../systems/UISystem";
import type { InputSystem } from "../systems/InputSystem";
import type { IWorld } from "../world/IWorld"; // Assuming IWorld is the new type for world

/**
 * Service Locator for game systems to avoid circular dependencies.
 */
export class GameContext {
    private static instance: GameContext;

    public world?: IWorld;
    public renderer?: Renderer;
    public eventManager?: EventManager;
    public entitySystem?: EntitySystem;
    public inventorySystem?: InventorySystem;
    public uiSystem?: UISystem;
    public inputSystem?: InputSystem; // Added inputSystem property

    private constructor() { }

    public static getInstance(): GameContext {
        if (!this.instance) {
            this.instance = new GameContext();
        }
        return this.instance;
    }

    public register<K extends keyof GameContext>(key: K, value: GameContext[K]): void {
        (this as any)[key] = value;
    }

    public get<K extends keyof GameContext>(key: K): GameContext[K] {
        return this[key];
    }
}
