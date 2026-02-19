import type { InventorySlot } from "./Inventory";
import { IconRenderer } from "../ui/IconRenderer";

export class DragDrop {
  private draggedItem: InventorySlot | null = null;
  private dragIcon: HTMLElement;
  private isInventoryOpen: boolean = false;
  private mouseX: number = 0;
  private mouseY: number = 0;

  constructor() {
    this.dragIcon = document.getElementById("drag-icon")!;
    if (!this.dragIcon) {
      console.warn("Drag icon element not found, creating one");
      this.dragIcon = document.createElement("div");
      this.dragIcon.id = "drag-icon";
      this.dragIcon.style.transform = "translate(-50%, -50%)"; // Center cursor
      document.body.appendChild(this.dragIcon);
    } else {
      this.dragIcon.style.transform = "translate(-50%, -50%)";
    }

    this.initEventListeners();
  }

  private initEventListeners() {
    window.addEventListener("mousemove", (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      if (this.draggedItem) {
        this.dragIcon.style.left = e.clientX + "px";
        this.dragIcon.style.top = e.clientY + "px";

        // Ensure it's visible if it was just set
        if (this.dragIcon.style.display === "none") {
          this.dragIcon.style.display = "block";
        }
      }
    });

    window.addEventListener(
      "touchmove",
      (e) => {
        if (this.draggedItem && this.isInventoryOpen) {
          const touch = e.changedTouches[0];
          this.mouseX = touch.clientX;
          this.mouseY = touch.clientY;
          this.dragIcon.style.left = touch.clientX + "px";
          this.dragIcon.style.top = touch.clientY + "px";
        }
      },
      { passive: false },
    );
  }

  public setInventoryOpen(isOpen: boolean) {
    this.isInventoryOpen = isOpen;
  }

  public getDraggedItem(): InventorySlot | null {
    return this.draggedItem;
  }

  public setDraggedItem(item: InventorySlot | null) {
    this.draggedItem = item ? { ...item } : null;
    if (!item) {
      this.dragIcon.style.display = "none";
    } else {
      // Immediate update to prevent "teleport" jump from 0,0
      this.dragIcon.style.left = this.mouseX + "px";
      this.dragIcon.style.top = this.mouseY + "px";
      this.dragIcon.style.display = "block";
    }
    this.updateDragIcon();
  }

  private updateDragIcon() {
    this.dragIcon.innerHTML = "";
    if (this.draggedItem && this.draggedItem.id !== 0) {
      // Don't show immediately to prevent "ghosting" from old position
      // It will become visible on the next mousemove

      const icon = document.createElement("div");
      icon.className = "block-icon";
      icon.style.width = "32px";
      icon.style.height = "32px";

      const iconUrl = IconRenderer.getInstance().getIcon(this.draggedItem.id);
      if (iconUrl) {
        icon.style.backgroundImage = `url(${iconUrl})`;
        icon.style.backgroundSize = "contain";
        icon.style.backgroundRepeat = "no-repeat";
        icon.style.backgroundPosition = "center";
      }

      if (this.draggedItem.count > 1) {
        const count = document.createElement("div");
        count.className = "slot-count";
        // Override styles to be consistent
        count.style.position = "absolute";
        count.style.bottom = "-2px";
        count.style.right = "-2px";
        count.style.color = "#fff";
        count.style.fontSize = "12px";
        count.style.fontFamily = "'Press Start 2P', cursive";
        count.style.textShadow = "1px 1px 0 #000";
        count.style.pointerEvents = "none";
        count.innerText = this.draggedItem.count.toString();
        icon.appendChild(count);
      }

      this.dragIcon.appendChild(icon);
    } else {
      this.dragIcon.style.display = "none";
    }
  }
}
