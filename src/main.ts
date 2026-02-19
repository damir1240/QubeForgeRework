import { GameInitializer } from "./initialization/GameInitializer";
import { LoadingScreen } from "./initialization/LoadingScreen";
import { NoiseGenerator } from "./initialization/NoiseGenerator";
import { AutoSave } from "./ui/AutoSave";
import { InventoryController } from "./ui/InventoryController";
import { Game } from "./core/Game";
import { FurnaceManager } from "./crafting/FurnaceManager";
import { FeatureToggles } from "./utils/FeatureToggles";
import { InputSystem } from "./systems/InputSystem";
import { GameContext } from "./core/GameContext";
import { GameEvents } from "./core/GameEvents";
import "./style.css";
import "./styles/mod-manager.css";
import "./styles/mods.css";

async function initializeGame() {
  // Load feature toggles first
  const toggles = FeatureToggles.getInstance();
  await toggles.load();


  // Generate CSS Noise Texture
  NoiseGenerator.generate();

  // Initialize all game systems
  const systems = await GameInitializer.initialize();

  // Create InputSystem
  const inputSystem = new InputSystem(
    systems.gameState,
    systems.player,
    systems.inventory,
    systems.inventoryUI,
    systems.world,
    systems.blockBreaking,
    systems.blockInteraction,
    systems.controls,
    systems.isMobile
  );

  // Create Game instance
  const game = new Game(
    systems.gameRenderer,
    systems.gameState,
    systems.world,
    systems.environment,
    systems.entities,
    systems.mobManager,
    systems.player,
    systems.blockCursor,
    systems.blockBreaking,
    systems.blockInteraction,
    systems.inventory,
    systems.inventoryUI,
    systems.craftingSystem,
    systems.craftingUI,
    systems.furnaceUI,
    inputSystem.inputState, // Pass the InputState managed by InputSystem
  );

  // Finalize InputSystem initialization with CLI
  inputSystem.setExecutionDependencies(game.cli);

  // Register InputSystem in Context
  const context = GameContext.getInstance();
  context.register('inputSystem', inputSystem);

  // Set game reference for callbacks
  systems.setGame(game);

  // Inventory Controller
  const inventoryController = new InventoryController(
    systems.controls,
    systems.world,
    systems.inventory,
    systems.inventoryUI,
    systems.inventoryUI.getDragDrop(),
    systems.craftingSystem,
    systems.craftingUI,
    systems.furnaceUI,
    systems.isMobile,
    inputSystem.inputState,
  );

  // Set interaction callbacks
  const { eventManager } = GameContext.getInstance(); // Access eventManager
  if (eventManager) {
    eventManager.on(GameEvents.OPEN_CRAFTING, () => inventoryController.toggle(true));
    eventManager.on(GameEvents.OPEN_FURNACE, (data: any) => inventoryController.toggle("furnace", data));
    eventManager.on(GameEvents.UI_TOGGLE_INVENTORY, (data: any) => {
      const forceClose = data?.forceClose === true;
      const invMenu = document.getElementById("inventory-menu")!;
      const isOpen = invMenu.style.display === "flex";
      if (forceClose && !isOpen) return;
      inventoryController.toggle(false);
    });
    eventManager.on(GameEvents.UI_TOGGLE_PAUSE, (data: any) => {
      game.menus.togglePauseMenu(data?.forceClose);
    });
  }

  game.inputHandlers = {
    keyboard: inputSystem.keyboardHandler,
    mouse: inputSystem.mouseHandler,
    pointerLock: inputSystem.pointerLockHandler,
  };

  // Auto-save
  const autoSave = new AutoSave(
    systems.gameState,
    systems.world,
    systems.controls,
    systems.inventory,
  );
  autoSave.start();

  // Store autoSave in game for cleanup
  game.autoSave = autoSave;

  // Mobile Events
  window.addEventListener("toggle-inventory", () => inventoryController.toggle(false));
  window.addEventListener("toggle-pause-menu", () => game.menus.togglePauseMenu());

  // Loading Screen
  const loadingScreen = new LoadingScreen();

  // Load World Data
  systems.world.loadWorld().then(async (data) => {
    if (data.playerPosition) {
      data.playerPosition.y += 0.5; // Prevent falling through floor
      systems.controls.object.position.copy(data.playerPosition);
    }
    if (data.inventory) {
      systems.inventory.deserialize(data.inventory);
      systems.inventoryUI.refresh();
    }

    // Load Furnaces
    await FurnaceManager.getInstance().load();

    // Ensure starting chunk is loaded
    const cx = Math.floor(systems.controls.object.position.x / 32);
    const cz = Math.floor(systems.controls.object.position.z / 32);
    await systems.world.waitForChunk(cx, cz);
  });

  // Start Loading Screen
  loadingScreen.start(() => game.start());
}

// Глобальный обработчик необработанных ошибок
window.addEventListener("error", (event) => {
  console.error("[QubeForge] Unhandled error:", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("[QubeForge] Unhandled promise rejection:", event.reason);
});

// Start the game
initializeGame().catch((error) => {
  console.error("[QubeForge] Fatal initialization error:", error);
});
