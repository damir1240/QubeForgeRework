import * as THREE from 'three';
import { World } from "../../../world/World";
import { PathNode } from "./PathNode";
import { BLOCK } from "../../../constants/Blocks";

export class Pathfinder {
    private world: World;
    private readonly MAX_NODES: number = 1000; // Hard limit to prevent performance issues

    constructor(world: World) {
        this.world = world;
    }

    /**
     * Finds a path from start to target. Returns an array of points (center of blocks), or null if no path.
     */
    public findPath(startPos: THREE.Vector3, targetPos: THREE.Vector3): THREE.Vector3[] | null {
        // Start block coordinates. Assuming entity stands on y-1, so its body is at y and y+1
        const startX = Math.floor(startPos.x);
        const startY = Math.floor(startPos.y);
        const startZ = Math.floor(startPos.z);

        const targetX = Math.floor(targetPos.x);
        const targetY = Math.floor(targetPos.y);
        const targetZ = Math.floor(targetPos.z);

        const startNode = new PathNode(startX, startY, startZ);
        const targetNode = new PathNode(targetX, targetY, targetZ);

        const openSet: PathNode[] = [];
        const closedSet: Set<string> = new Set();
        const nodeMap: Map<string, PathNode> = new Map(); // to quickly look up nodes in openSet

        openSet.push(startNode);
        nodeMap.set(startNode.getHash(), startNode);

        let nodesProcessed = 0;

        while (openSet.length > 0) {
            nodesProcessed++;
            if (nodesProcessed > this.MAX_NODES) {
                // Abort if path is too complex or unreachable
                return null;
            }

            // Get node with lowest fCost
            let currentNode = openSet[0];
            let currentIndex = 0;
            for (let i = 1; i < openSet.length; i++) {
                if (openSet[i].fCost < currentNode.fCost || (openSet[i].fCost === currentNode.fCost && openSet[i].hCost < currentNode.hCost)) {
                    currentNode = openSet[i];
                    currentIndex = i;
                }
            }

            // Remove current from open set, add to closed set
            openSet.splice(currentIndex, 1);
            nodeMap.delete(currentNode.getHash());
            closedSet.add(currentNode.getHash());

            // Check if reached target
            if (currentNode.equals(targetNode)) {
                return this.retracePath(startNode, currentNode);
            }

            // Alternatively, if target is not reachable, but we got close enough
            // (could implement a proximity check here if exact block targeting isn't needed)

            const neighbors = this.getNeighbors(currentNode);

            for (const neighbor of neighbors) {
                if (closedSet.has(neighbor.getHash())) {
                    continue;
                }

                // Cost to neighbor (1 for horizontal, 1.41 for diagonal (not doing diagonal for now), add extra cost for jumping/falling)
                let moveCost = 1.0;
                if (neighbor.y > currentNode.y) moveCost += 0.5; // Penalty for jumping
                if (neighbor.y < currentNode.y) moveCost += 0.2; // Minor penalty for falling

                const newMovementCostToNeighbor = currentNode.gCost + moveCost;

                const neighborInMap = nodeMap.get(neighbor.getHash());

                if (!neighborInMap || newMovementCostToNeighbor < neighborInMap.gCost) {
                    const activeNeighbor = neighborInMap || neighbor;

                    activeNeighbor.gCost = newMovementCostToNeighbor;
                    activeNeighbor.hCost = this.getDistance(activeNeighbor, targetNode);
                    activeNeighbor.parent = currentNode;

                    if (!neighborInMap) {
                        openSet.push(activeNeighbor);
                        nodeMap.set(activeNeighbor.getHash(), activeNeighbor);
                    }
                }
            }
        }

        return null; // No path found
    }

    private retracePath(startNode: PathNode, endNode: PathNode): THREE.Vector3[] {
        const path: THREE.Vector3[] = [];
        let currentNode: PathNode | null = endNode;

        while (currentNode && !currentNode.equals(startNode)) {
            // Path holds coordinates. We want the entity to walk to the center of the block.
            path.push(new THREE.Vector3(currentNode.x + 0.5, currentNode.y, currentNode.z + 0.5));
            currentNode = currentNode.parent;
        }

        return path.reverse();
    }

    private getDistance(nodeA: PathNode, nodeB: PathNode): number {
        // Manhattan distance or Euclidean could be used.
        // Let's use Manhattan for simplicity of blocks
        const dstX = Math.abs(nodeA.x - nodeB.x);
        const dstY = Math.abs(nodeA.y - nodeB.y);
        const dstZ = Math.abs(nodeA.z - nodeB.z);
        return dstX + dstY + dstZ;
    }

    private getNeighbors(node: PathNode): PathNode[] {
        const neighbors: PathNode[] = [];

        // 4 directions (no diagonals to prevent corner clipping for now)
        const directions = [
            { dx: 1, dz: 0 },
            { dx: -1, dz: 0 },
            { dx: 0, dz: 1 },
            { dx: 0, dz: -1 }
        ];

        for (const dir of directions) {
            const nx = node.x + dir.dx;
            const nz = node.z + dir.dz;

            // Check walkability
            const blockAtFeet = this.world.getBlock(nx, node.y, nz);
            const blockAtEyes = this.world.getBlock(nx, node.y + 1, nz);

            if (this.isWalkable(blockAtFeet) && this.isWalkable(blockAtEyes)) {
                // Free space ahead! Can we walk or fall?

                const blockBelow = this.world.getBlock(nx, node.y - 1, nz);
                if (this.isSolid(blockBelow)) {
                    // Normal flat walk
                    neighbors.push(new PathNode(nx, node.y, nz));
                } else {
                    // Check falling (max 3 blocks drop)
                    for (let drop = 2; drop <= 4; drop++) {
                        const dropBlock = this.world.getBlock(nx, node.y - drop, nz);
                        if (this.isSolid(dropBlock)) {
                            neighbors.push(new PathNode(nx, node.y - drop + 1, nz));
                            break;
                        }
                    }
                    // If no ground within safe drop distance, we don't add this neighbor (it's a deadly cliff)
                }
            } else if (this.isSolid(blockAtFeet) && this.isWalkable(blockAtEyes)) {
                // There is a 1-block step ahead. Can we jump?
                // Need to ensure headroom for the jump: y+2 above us AND y+2 above the target block
                const currentHeadroom = this.world.getBlock(node.x, node.y + 2, node.z);
                const targetHeadroom = this.world.getBlock(nx, node.y + 2, nz);

                if (this.isWalkable(currentHeadroom) && this.isWalkable(targetHeadroom)) {
                    neighbors.push(new PathNode(nx, node.y + 1, nz));
                }
            }
        }

        return neighbors;
    }

    /** Helper: whether a block ID allows walking through it. */
    private isWalkable(blockId: number): boolean {
        // Assume 0 is air. Can expand for tall grass, etc.
        return blockId === BLOCK.AIR;
    }

    /** Helper: whether a block ID is solid enough to stand on. */
    private isSolid(blockId: number): boolean {
        return blockId !== BLOCK.AIR;
    }
}
