import { CraftingSystem } from "./CraftingSystem";
import { IconRenderer } from "../ui/IconRenderer";

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
    icon.style.backgroundImage = "";

    const iconUrl = IconRenderer.getInstance().getIcon(itemId);
    if (iconUrl) {
      icon.style.backgroundImage = `url(${iconUrl})`;
      icon.style.backgroundSize = "contain";
      icon.style.backgroundRepeat = "no-repeat";
      icon.style.backgroundPosition = "center";
    }
  }
}
