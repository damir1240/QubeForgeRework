export class PathNode {
    public x: number;
    public y: number;
    public z: number;
    public gCost: number; // Cost from start
    public hCost: number; // Heuristic cost to end
    public parent: PathNode | null;

    constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.gCost = 0;
        this.hCost = 0;
        this.parent = null;
    }

    public get fCost(): number {
        return this.gCost + this.hCost;
    }

    public equals(other: PathNode): boolean {
        return this.x === other.x && this.y === other.y && this.z === other.z;
    }

    public getHash(): string {
        return `${this.x},${this.y},${this.z}`;
    }
}
