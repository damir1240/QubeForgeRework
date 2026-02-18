import * as THREE from "three";
import { Renderer } from "../core/Renderer";
import { GameState } from "../core/GameState";
import { World } from "../world/World";
import { Environment } from "../world/Environment";
import { Player } from "../player/Player";
import { Inventory } from "../inventory/Inventory";
import { InventoryUI } from "../inventory/InventoryUI";
import { DragDrop } from "../inventory/DragDrop";
import { CraftingSystem } from "../crafting/CraftingSystem";
import { CraftingUI } from "../crafting/CraftingUI";
import { FurnaceManager } from "../crafting/FurnaceManager";
import { FurnaceUI } from "../crafting/FurnaceUI";
import { MobManager } from "../mobs/MobManager";
import { BlockCursor } from "../blocks/BlockCursor";
import { BlockBreaking } from "../blocks/BlockBreaking";
import { BlockInteraction } from "../blocks/BlockInteraction";
import { BlockDropHandler } from "../blocks/BlockDropHandler";
import { ItemEntity } from "../entities/ItemEntity";
import { HotbarLabel } from "../ui/HotbarLabel";
import { HealthBar } from "../ui/HealthBar";
import { Game } from "../core/Game";
import { BLOCK } from "../constants/Blocks";
import { BLOCK_NAMES } from "../constants/BlockNames";
import { TOOL_TEXTURES } from "../constants/ToolTextures";
import { isItemEntity } from "../utils/ItemUtils";
import { initDebugControls } from "../utils/DebugUtils";
import { eventManager } from "../core/EventManager";
import { GameEvents } from "../core/GameEvents";
import type { BlockBrokenEvent, BlockPlacedEvent } from "../core/GameEvents";
import { EntitySystem } from "../systems/EntitySystem";
import { InventorySystem } from "../systems/InventorySystem";
import { UISystem } from "../systems/UISystem";
import { GameContext } from "../core/GameContext";

/**
 * Initializes all game systems and returns references
 */
export class GameInitializer {
  static initialize() {
    // Renderer & Scene
    const gameRenderer = new Renderer();
    const gameState = new GameState();
    const isMobile = gameRenderer.getIsMobile();

    const scene = gameRenderer.scene;
    const uiCamera = gameRenderer.uiCamera;
    const camera = gameRenderer.camera;
    const controls = gameRenderer.controls;

    // Environment
    const environment = new Environment(scene);
    initDebugControls(environment);

    // World
    const world = new World(scene);

    // UI Elements
    const damageOverlay = document.getElementById("damage-overlay")!;
    const healthBarElement = document.getElementById("health-bar")!;
    const healthBar = new HealthBar(healthBarElement);
    const hotbarLabelElement = document.getElementById("hotbar-label")!;
    const hotbarLabel = new HotbarLabel(hotbarLabelElement);

    // Inventory System
    const inventory = new Inventory();
    const dragDrop = new DragDrop();
    const inventoryUI = new InventoryUI(inventory, dragDrop, isMobile);

    // Block Cursor
    const blockCursor = new BlockCursor(scene, camera, controls);
    const cursorMesh = blockCursor.getMesh();

    // Entities
    const entities: ItemEntity[] = [];

    // Block Breaking with drop logic
    const blockBreaking = new BlockBreaking(
      scene,
      camera,
      controls,
      () => inventory.getSelectedSlotItem().id,
      cursorMesh,
    );
    const crackMesh = blockBreaking.getCrackMesh();

    // Player
    // Player
    const player = new Player(
      controls,
      world,
      camera,
      scene,
      uiCamera,
      () => inventory.getSelectedSlotItem().id,
      (amount) => {
        if (game) game.handleToolUse(amount);
      },
      cursorMesh,
      crackMesh,
      world.noiseTexture,
      TOOL_TEXTURES,
    );

    // Mob Manager
    const mobManager = new MobManager(world, scene, entities);

    // Systems
    const entitySystem = new EntitySystem(entities, player);
    const inventorySystem = new InventorySystem(inventory, inventoryUI);
    const uiSystem = new UISystem(healthBar, damageOverlay);

    const context = GameContext.getInstance();
    context.register('entitySystem', entitySystem);
    context.register('inventorySystem', inventorySystem);
    context.register('uiSystem', uiSystem);

    // UI Scene Lighting
    const uiScene = gameRenderer.uiScene;
    const uiLight = new THREE.DirectionalLight(0xffffff, 1.5);
    uiLight.position.set(1, 1, 1);
    uiScene.add(uiLight);
    const uiAmbient = new THREE.AmbientLight(0xffffff, 0.5);
    uiScene.add(uiAmbient);

    // Crafting System
    const craftingSystem = new CraftingSystem();
    const craftingUI = new CraftingUI(
      craftingSystem,
      inventory,
      inventoryUI,
      dragDrop,
      isMobile,
    );

    const furnaceManager = FurnaceManager.getInstance();
    const furnaceUI = new FurnaceUI(furnaceManager, dragDrop);

    // Block Interaction
    const blockInteraction = new BlockInteraction(
      camera,
      scene,
      controls,
      () => inventory.getSelectedSlotItem(),
      cursorMesh,
      crackMesh,
      () => mobManager.mobs,
    );

    // Game instance (will be set after initialization)
    let game: Game;

    // --- EVENT WIRING ---
    // Move legacy callback logic to Event Listeners

    // 1. Block Broken
    eventManager.on<BlockBrokenEvent>(GameEvents.BLOCK_BROKEN, (event) => {
      const { x, y, z, blockId, toolId } = event;

      // Tool Durability
      if (game) game.handleToolUse(1);

      // Furnace Drops
      if (blockId === BLOCK.FURNACE) {
        const drops = FurnaceManager.getInstance().removeFurnace(x, y, z);
        drops.forEach((d) => {
          const toolTexture = (TOOL_TEXTURES[d.id] && isItemEntity(d.id))
            ? TOOL_TEXTURES[d.id].texture
            : null;
          entities.push(
            new ItemEntity(
              world,
              scene,
              x,
              y,
              z,
              d.id,
              world.noiseTexture,
              d.id === BLOCK.FURNACE ? null : toolTexture,
              d.count,
            ),
          );
        });
      }

      // Regular Drops
      if (blockId !== 0) {
        // We need toolId here. BlockBreaking events must provide it or we look it up.
        // Modified BlockBreaking to emit toolId.
        const tid = toolId ?? inventory.getSelectedSlotItem().id;

        const { shouldDrop, dropId } = BlockDropHandler.getDropInfo(blockId, tid);

        if (shouldDrop) {
          const toolTexture = (TOOL_TEXTURES[dropId] && isItemEntity(dropId))
            ? TOOL_TEXTURES[dropId].texture
            : null;
          entities.push(
            new ItemEntity(
              world,
              scene,
              x,
              y,
              z,
              dropId,
              world.noiseTexture,
              dropId === BLOCK.FURNACE ? null : toolTexture,
            ),
          );
        }
      }

      // Set AIR
      world.setBlock(x, y, z, 0);
    });

    // 2. Block Placed
    eventManager.on<BlockPlacedEvent>(GameEvents.BLOCK_PLACED, (event) => {
      const { x, y, z, blockId } = event;

      // Furnace Logic
      if (blockId === BLOCK.FURNACE) {
        const rot = controls.object.rotation.y;
        let angle = rot % (Math.PI * 2);
        if (angle < 0) angle += Math.PI * 2;

        const segment = Math.floor((angle + Math.PI / 4) / (Math.PI / 2)) % 4;
        let blockRot = 0;

        if (segment === 0) blockRot = 2;
        else if (segment === 1) blockRot = 1;
        else if (segment === 2) blockRot = 0;
        else if (segment === 3) blockRot = 3;

        furnaceManager.createFurnace(x, y, z, blockRot);
      }

      // Set Block
      world.setBlock(x, y, z, blockId);

      // Consume Item
      const index = inventory.getSelectedSlot();
      const slot = inventory.getSlot(index);
      slot.count--;
      if (slot.count <= 0) {
        slot.id = 0;
        slot.count = 0;
      }
      inventoryUI.refresh();
      inventoryUI.emitInventoryChange();
    });

    // 3. Item Consumed (Food, etc)
    eventManager.on<{ itemId: number }>(GameEvents.ITEM_CONSUMED, (event) => {
      const { itemId } = event;

      // Healing
      if (itemId === BLOCK.COOKED_MEAT) {
        player.health.setHp(player.health.getHp() + 4);
      } else if (itemId === BLOCK.RAW_MEAT) {
        player.health.setHp(player.health.getHp() + 1);
      }

      // Consume logic
      const slot = inventory.getSelectedSlotItem();
      if (slot.count > 0) {
        slot.count--;
        if (slot.count === 0) slot.id = 0;
        inventoryUI.refresh();
        inventoryUI.emitInventoryChange();
      }
    });

    // 4. UI Events
    eventManager.on(GameEvents.OPEN_CRAFTING, () => {
      // Placeholder for opening crafting. 
      // Logic needs to be handled by UI system or MainMenu
    });
    // --- END EVENT WIRING ---

    // Inventory change callback
    inventoryUI.addInventoryChangeListener(() => {
      const slot = inventory.getSelectedSlotItem();
      player.hand.updateItem(slot.id);
      if (slot.id !== 0) {
        hotbarLabel.show(BLOCK_NAMES[slot.id] || "Block");
      } else {
        hotbarLabel.hide();
      }

      // Update crafting visuals if inventory is open
      if (game && game.menus) {
        const invMenu = document.getElementById("inventory-menu");
        if (invMenu && invMenu.style.display === "flex") {
          craftingUI.updateVisuals();
        }
      }
    });

    return {
      gameRenderer,
      gameState,
      world,
      environment,
      entities,
      mobManager,
      player,
      blockCursor,
      blockBreaking,
      blockInteraction,
      inventory,
      inventoryUI,
      craftingSystem,
      craftingUI,
      furnaceUI,
      controls,
      isMobile,
      setGame: (g: Game) => {
        game = g;
      },
    };
  }
}
