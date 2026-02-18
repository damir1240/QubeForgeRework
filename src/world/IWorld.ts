import * as THREE from "three";

export interface IWorld {
    getBlock(x: number, y: number, z: number): number;
    setBlock(x: number, y: number, z: number, id: number): void;
    update(playerPos: THREE.Vector3): void;
}
