import * as THREE from 'three';
import { BaseEntity } from '../BaseEntity';
import { EntityMesh } from '../EntityMesh';
import { EntityPhysics } from '../EntityPhysics';
import { World } from '../../world/World';

export class Pig extends BaseEntity {
    private meshContainer: EntityMesh;
    private physics: EntityPhysics;

    constructor(scene: THREE.Scene, world: World) {
        super(scene);

        // Pig dimensions (Bedrock/Minecraft style: 0.9 blocks wide/tall)
        this.physics = new EntityPhysics(world, this.object, 0.9, 0.9);
        this.meshContainer = new EntityMesh(this.object);

        this.meshContainer.loadModel('/assets/qubeforge/models/pig.gltf')
            .then(() => {
                // Initial setup if needed
            });
    }

    public update(delta: number, _time: number): void {
        this.physics.update(delta);
        this.meshContainer.update(delta);

        // Simple "wander" or "idle" logic can go here
        const speed = this.physics.velocity.length();
        if (speed > 0.1) {
            this.meshContainer.playAnimation('walk');
        } else {
            this.meshContainer.playAnimation('idle');
        }
    }
}
