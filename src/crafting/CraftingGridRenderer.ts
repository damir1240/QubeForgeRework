import { CraftingSystem } from "./CraftingSystem";
import { BlockRegistry, ItemRegistry } from "../modding/Registry";

export class CraftingGridRenderer {
  private craftingSystem: CraftingSystem;
  private craftGridContainer: HTMLElement;

  constructor(craftingSystem: CraftingSystem, craftGridContainer: HTMLElement) {
    this.craftingSystem = craftingSystem;
    this.craftGridContainer = craftGridContainer;
  }

  public updateVisuals() {
    const size = this.craftingSystem.isCraftingTable ? 3 : 2;
    const total = size * size;
    const slots = this.craftGridContainer.children;

    for (let i = 0; i < total; i++) {
      const slot = this.craftingSystem.craftingSlots[i];
      const el = slots[i] as HTMLElement;
      const icon = el.querySelector(".block-icon") as HTMLElement;
      const countEl = el.querySelector(".slot-count") as HTMLElement;

      if (slot.id !== 0 && slot.count > 0) {
        icon.style.display = "block";
        this.applyIconStyle(icon, slot.id);
        countEl.innerText = slot.count.toString();
      } else {
        icon.style.display = "none";
        countEl.innerText = "";
      }
    }
  }

  private applyIconStyle(icon: HTMLElement, itemId: number) {
    icon.classList.remove("item-stick", "item-planks", "item-tool");
    icon.style.backgroundImage = "";

    const itemConfig = ItemRegistry.getById(itemId);
    const blockConfig = BlockRegistry.getById(itemId);

    if (itemConfig) {
      icon.style.backgroundImage = `url(/assets/qubeforge/textures/items/${itemConfig.texture}.png)`;
      icon.classList.add("item-tool");
    } else if (blockConfig) {
      const tex = blockConfig.texture;
      const texName = typeof tex === 'string' ? tex : (tex.top || tex.side || 'dirt');
      icon.style.backgroundImage = `url(/assets/qubeforge/textures/blocks/${texName}.png)`;

      if (itemId === 7) icon.classList.add("item-planks");
      else icon.style.backgroundImage += ", var(--noise-url)";
    }
  }
}
