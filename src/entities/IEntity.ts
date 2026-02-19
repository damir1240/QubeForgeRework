import * as THREE from 'three';

/**
 * Interface for all game entities (players, mobs, items).
 */
export interface IEntity {
    id: string;
    position: THREE.Vector3;
    rotation: THREE.Euler;
    isDead: boolean;
    update(delta: number, time: number): void;
    dispose(): void;
    getMesh(): THREE.Object3D;
}
