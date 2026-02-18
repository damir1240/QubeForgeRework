import { CraftingSystem } from "./CraftingSystem";
import { BlockRegistry, ItemRegistry } from "../modding/Registry";

export class CraftingResultRenderer {
  private craftingSystem: CraftingSystem;
  private resultIcon: HTMLElement;
  private resultCount: HTMLElement;

  constructor(
    craftingSystem: CraftingSystem,
    resultIcon: HTMLElement,
    resultCount: HTMLElement,
  ) {
    this.craftingSystem = craftingSystem;
    this.resultIcon = resultIcon;
    this.resultCount = resultCount;
  }

  public updateVisuals() {
    const result = this.craftingSystem.craftingResult;

    if (result.id !== 0) {
      this.resultIcon.style.display = "block";
      this.applyIconStyle(this.resultIcon, result.id);
      this.resultCount.innerText = result.count.toString();
    } else {
      this.resultIcon.style.display = "none";
      this.resultCount.innerText = "";
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
