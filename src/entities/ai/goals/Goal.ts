// Abstract base class for AI Goals
export abstract class Goal {
    /**
     * Checks if this goal is valid to start based on conditions.
     */
    public abstract canStart(): boolean;

    /**
     * Checks if the currently running goal should continue.
     */
    public canContinue(): boolean {
        return this.canStart();
    }

    /**
     * Called once when the goal starts.
     */
    public start(): void { }

    /**
     * Called once when the goal is terminated or finished.
     */
    public stop(): void { }

    /**
     * Called every tick while the goal is active.
     */
    public tick(): void { }
}
