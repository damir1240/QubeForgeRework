import { Goal } from "./Goal";

interface PrioritizedGoal {
    priority: number;
    goal: Goal;
}

export class GoalSelector {
    private goals: PrioritizedGoal[] = [];
    private activeGoals: Set<Goal> = new Set();

    /**
     * Add a goal with a specific priority. Lower number = higher priority (0 is max priority).
     */
    public addGoal(priority: number, goal: Goal): void {
        this.goals.push({ priority, goal });
        this.goals.sort((a, b) => a.priority - b.priority);
    }

    public update(): void {
        // Stop invalid active goals
        for (const goal of this.activeGoals) {
            if (!goal.canContinue()) {
                goal.stop();
                this.activeGoals.delete(goal);
            }
        }

        // Try to start new goals based on priority
        for (const pg of this.goals) {
            if (this.activeGoals.has(pg.goal)) {
                continue; // Already active
            }

            // Simple conflict resolution: for now, only 1 goal runs unless they don't block each other.
            // Let's implement a single-goal-at-a-time system for simplicity.
            // Later we can add mutexe/flags (e.g. Movement Goal vs Look Goal).

            if (pg.goal.canStart()) {
                // Stop any lower priority goals (higher number) that conflict.
                // Since we only run 1 goal, just stop everything and run this.
                if (this.activeGoals.size > 0) {
                    // Check if current active goal has higher priority
                    const currentPriority = this.goals.find(g => this.activeGoals.has(g.goal))?.priority ?? 999;
                    if (pg.priority < currentPriority) {
                        for (const active of this.activeGoals) {
                            active.stop();
                        }
                        this.activeGoals.clear();
                    } else {
                        // Current goal is more important, don't start the new one
                        continue;
                    }
                }

                pg.goal.start();
                this.activeGoals.add(pg.goal);
                break; // Only start one goal per tick (the highest valid)
            }
        }

        // Tick active goals
        for (const goal of this.activeGoals) {
            goal.tick();
        }
    }
}
