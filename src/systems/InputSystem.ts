import { MobileInputState } from "../input/InputState";
import type { InputState } from "../input/InputState";
import { KeyboardHandler } from "../input/KeyboardHandler";
import { MouseHandler } from "../input/MouseHandler";
import { PointerLockHandler } from "../input/PointerLockHandler";
import { GameState } from "../core/GameState";
import { Player } from "../player/Player";
import { Inventory } from "../inventory/Inventory";
import { InventoryUI } from "../inventory/InventoryUI";
import { CLI } from "../ui/CLI";
import { World } from "../world/World";
import { BlockBreaking } from "../blocks/BlockBreaking";
import { BlockInteraction } from "../blocks/BlockInteraction";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

export class InputSystem {
    public inputState: InputState;
    public keyboardHandler?: KeyboardHandler;
    public mouseHandler?: MouseHandler;
    public pointerLockHandler?: PointerLockHandler;

    // Dependencies needed for lazy initialization of handlers
    private isMobile: boolean;
    private gameState: GameState;
    private inventory: Inventory;
    private inventoryUI: InventoryUI;
    private cli?: CLI;

    constructor(
        gameState: GameState,
        player: Player,
        inventory: Inventory,
        inventoryUI: InventoryUI,
        world: World,
        blockBreaking: BlockBreaking,
        blockInteraction: BlockInteraction,
        controls: PointerLockControls,
        isMobile: boolean
    ) {
        this.gameState = gameState;
        this.inventory = inventory;
        this.inventoryUI = inventoryUI;
        this.isMobile = isMobile;

        if (this.isMobile) {
            this.inputState = new MobileInputState();
        } else {
            // Desktop initialization
            // MouseHandler acts as InputState for desktop
            this.mouseHandler = new MouseHandler(
                gameState,
                player,
                blockBreaking,
                blockInteraction,
                world,
                inventory,
                inventoryUI,
                controls,
                isMobile
            );
            this.inputState = this.mouseHandler;

            // PointerLockHandler handles locking state
            this.pointerLockHandler = new PointerLockHandler(
                controls,
                gameState,
                () => this.cli?.isOpen ?? false
            );
        }
    }

    public setExecutionDependencies(cli: CLI): void {
        this.cli = cli;

        this.keyboardHandler = new KeyboardHandler(
            this.gameState,
            this.inputState,
            this.inventory,
            this.inventoryUI,
            cli
        );
    }

    public cleanup(): void {
        this.keyboardHandler?.cleanup();
        this.mouseHandler?.cleanup();
        this.pointerLockHandler?.cleanup();
    }
}
