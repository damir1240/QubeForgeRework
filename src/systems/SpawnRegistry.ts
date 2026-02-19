export interface SpawnRule {
    mobId: string;
    mobClass: any; // Constructor for the mob class
    weight: number; // Probability weight
    minGroupSize: number;
    maxGroupSize: number;
    spawnInterval: number; // Ticks or seconds between spawn attempts
    maxTotal: number; // Max of this mob type in range
    spawnRadius: number; // Max distance from player
    minRadius: number; // Min distance from player
}

export class SpawnRegistry {
    private static rules: SpawnRule[] = [];

    public static register(rule: SpawnRule): void {
        this.rules.push(rule);
    }

    public static getRules(): SpawnRule[] {
        return this.rules;
    }
}
