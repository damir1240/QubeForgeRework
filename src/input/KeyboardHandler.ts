import { GameState } from "../core/GameState";
import { Inventory } from "../inventory/Inventory";
import { InventoryUI } from "../inventory/InventoryUI";
import { CLI } from "../ui/CLI";
import type { InputState } from "./InputState";
import { eventManager } from "../core/EventManager";
import { GameEvents } from "../core/GameEvents";
import { DevToolsManager } from "../devtools/DevToolsManager";

/**
 * Handles keyboard input for player movement and game controls
 */
export class KeyboardHandler {
  private gameState: GameState;
  private inputState: InputState;
  private inventory: Inventory;
  private inventoryUI: InventoryUI;
  private cli: CLI;

  private keyDownHandler = (e: KeyboardEvent) => this.onKeyDown(e);
  private keyUpHandler = (e: KeyboardEvent) => this.onKeyUp(e);
  private contextMenuHandler = (e: Event) => e.preventDefault();



  private hotbarKeyHandler = (event: KeyboardEvent) => {
    const key = parseInt(event.key);
    if (key >= 1 && key <= 9) {
      this.inventory.setSelectedSlot(key - 1);
      this.inventoryUI.refresh();
      this.inventoryUI.emitInventoryChange();
      eventManager.emit(GameEvents.UI_HOTBAR_CHANGE, {});
    }
  };

  constructor(
    gameState: GameState,
    inputState: InputState,
    inventory: Inventory,
    inventoryUI: InventoryUI,
    cli: CLI,
  ) {
    this.gameState = gameState;
    this.inputState = inputState;
    this.inventory = inventory;
    this.inventoryUI = inventoryUI;
    this.cli = cli;
    this.init();
  }

  private init(): void {


    document.addEventListener("keydown", this.keyDownHandler);
    document.addEventListener("keyup", this.keyUpHandler);
    document.addEventListener("contextmenu", this.contextMenuHandler);
    window.addEventListener("keydown", this.hotbarKeyHandler);
  }

  public cleanup(): void {

    document.removeEventListener("keydown", this.keyDownHandler);
    document.removeEventListener("keyup", this.keyUpHandler);
    document.removeEventListener("contextmenu", this.contextMenuHandler);
    window.removeEventListener("keydown", this.hotbarKeyHandler);
  }

  private onKeyDown(event: KeyboardEvent): void {


    if (this.cli.isOpen) return;

    // Блокируем ввод, если открыты DevTools
    const devToolsManager = DevToolsManager.getInstance();
    if (devToolsManager?.isVisible()) {
      if (event.code === "F4") {
        event.preventDefault();
        devToolsManager.toggle();
      }
      return;
    }

    const inventoryMenu = document.getElementById("inventory-menu")!;
    const isInventoryOpen = inventoryMenu.style.display === "flex";

    // Prevent movement keys when inventory is open
    if (isInventoryOpen) {
      if (
        [
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "ArrowUp",
          "ArrowLeft",
          "ArrowDown",
          "ArrowRight",
          "Space",
        ].includes(event.code)
      ) {
        return;
      }
    }

    switch (event.code) {
      case "Slash":
        event.preventDefault();
        if (this.cli.isEnabled()) {
          this.cli.toggle(true, "/");
        }
        break;
      case "KeyT":
        if (
          !this.gameState.getPaused() &&
          this.gameState.getGameStarted() &&
          inventoryMenu.style.display !== "flex"
        ) {
          event.preventDefault();
          if (this.cli.isEnabled()) {
            this.cli.toggle(true, "");
          }
        }
        break;
      case "KeyW":
        this.inputState.moveForward = true;
        break;
      case "KeyA":
        this.inputState.moveLeft = true;
        break;
      case "KeyS":
        this.inputState.moveBackward = true;
        break;
      case "KeyD":
        this.inputState.moveRight = true;
        break;

      case "ShiftLeft":
      case "ShiftRight":
        this.inputState.isSprinting = true;
        break;
      case "Space":
        event.preventDefault();
        this.inputState.isJumping = true;
        break;
      case "KeyE":
        if (!this.gameState.getPaused()) {
          eventManager.emit(GameEvents.UI_TOGGLE_INVENTORY, { fromKeyboard: true });
        }
        break;
      case "KeyQ":
        if (!this.gameState.getPaused() && this.gameState.getGameStarted() && !isInventoryOpen) {
          eventManager.emit(GameEvents.ITEM_DROP, {});
        }
        break;
      case "Escape":
        {
          event.preventDefault();
          event.stopPropagation();

          const invMenu = document.getElementById("inventory-menu")!;
          const isInvOpen = invMenu.style.display === "flex";

          // If inventory/crafting/furnace GUI is open, just close it without opening pause menu
          if (isInvOpen) {
            // Set flag BEFORE emitting event to prevent race condition
            this.gameState.setIsResuming(true);
            eventManager.emit(GameEvents.UI_TOGGLE_INVENTORY, { fromKeyboard: true });
            return; // Important: return here to prevent pause menu from opening
          }

          // Only open pause menu if no GUI is open
          if (this.gameState.getGameStarted()) {
            eventManager.emit(GameEvents.UI_TOGGLE_PAUSE, {});
          }
        }
        break;
      case "F4":
        event.preventDefault();
        DevToolsManager.getInstance()?.toggle();
        break;
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        this.inputState.moveForward = false;
        break;
      case "ArrowLeft":
      case "KeyA":
        this.inputState.moveLeft = false;
        break;
      case "ArrowDown":
      case "KeyS":
        this.inputState.moveBackward = false;
        break;
      case "ArrowRight":
      case "KeyD":
        this.inputState.moveRight = false;
        break;

      case "ShiftLeft":
      case "ShiftRight":
        this.inputState.isSprinting = false;
        break;
      case "Space":
        this.inputState.isJumping = false;
        break;
    }
  }
}
