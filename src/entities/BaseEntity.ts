import * as THREE from 'three';
import type { IEntity } from './IEntity';

/**
 * SRP: Base class for all entities handling common properties like position, rotation, and lifecycle.
 */
export abstract class BaseEntity implements IEntity {
    public id: string;
    public isDead: boolean = false;

    protected scene: THREE.Scene;
    protected object: THREE.Object3D;

    constructor(scene: THREE.Scene, existingObject?: THREE.Object3D) {
        this.id = self.crypto?.randomUUID ? self.crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
        this.scene = scene;
        this.object = existingObject || new THREE.Object3D();
        if (!existingObject) {
            this.scene.add(this.object);
        }
    }

    get position() { return this.object.position; }
    get rotation() { return this.object.rotation; }

    /**
     * Updates entity logic.
     * @param delta Seconds since last frame.
     * @param time Total game time in seconds.
     */
    public abstract update(delta: number, time: number): void;

    /**
     * Removes entity from scene and marks for deletion.
     */
    public dispose(): void {
        this.scene.remove(this.object);
        this.isDead = true;

        // Dispose of children if they are meshes
        this.object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }

    public getMesh(): THREE.Object3D {
        return this.object;
    }
}
