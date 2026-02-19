import { CraftingSystem } from "./CraftingSystem";
import { IconRenderer } from "../ui/IconRenderer";

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
