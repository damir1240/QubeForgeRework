/**
 * Manages loading screen visibility and progress bar
 */
export class LoadingScreen {
  private loadingScreen: HTMLElement;
  private loadingBarInner: HTMLElement;
  private bgImage: HTMLImageElement;
  private loadProgress = 0;
  private startTime: number;
  private readonly MIN_LOAD_TIME = 2000; // Minimum visibility time in ms

  constructor() {
    this.loadingScreen = document.getElementById("loading-screen")!;
    this.loadingBarInner = document.getElementById("loading-bar-inner")!;
    this.bgImage = document.getElementById("bg-image") as HTMLImageElement;
    this.startTime = performance.now();
  }

  /**
   * Start loading progress animation
   */
  start(onComplete: () => void): void {
    this.updateLoading(onComplete);
  }

  private checkImageReady(): boolean {
    return this.bgImage.complete && this.bgImage.naturalHeight !== 0;
  }

  private updateLoading(onComplete: () => void): void {
    const elapsed = performance.now() - this.startTime;
    const timeProgress = Math.min((elapsed / this.MIN_LOAD_TIME) * 100, 100);

    // Track image loading progress
    let imageProgress = 0;
    if (this.checkImageReady()) {
      imageProgress = 100;
    } else {
      imageProgress = 50; // Fake trickle if image is taking time
    }

    // Weighted progress: 60% time (to show logo), 40% asset loading
    const totalProgress = timeProgress * 0.6 + imageProgress * 0.4;

    this.loadProgress = Math.max(this.loadProgress, totalProgress); // Never go back
    this.loadingBarInner.style.width = `${this.loadProgress}%`;

    if (this.loadProgress >= 99 && elapsed >= this.MIN_LOAD_TIME) {
      // Done
      this.loadingBarInner.style.width = "100%";
      setTimeout(() => {
        this.loadingScreen.style.transition = "opacity 0.5s";
        this.loadingScreen.style.opacity = "0";
        setTimeout(() => {
          this.loadingScreen.style.display = "none";
          onComplete();
        }, 500);
      }, 200);
    } else {
      requestAnimationFrame(() => this.updateLoading(onComplete));
    }
  }
}
