import * as THREE from 'three';
import { AssetLoader } from '../core/assets/AssetLoader';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * SRP: Responsibility - Managing the visual representation of an entity (model and textures).
 */
export class EntityMesh {
    private container: THREE.Object3D;
    private model: THREE.Object3D | null = null;
    private mixer: THREE.AnimationMixer | null = null;
    private actions: Map<string, THREE.AnimationAction> = new Map();
    private currentAction: THREE.AnimationAction | null = null;

    constructor(container: THREE.Object3D) {
        this.container = container;
    }

    /**
     * Loads a GLTF model and adds it to the container.
     */
    public async loadModel(url: string, textureUrl?: string): Promise<void> {
        try {
            const gltf: GLTF = await AssetLoader.loadGLTF(url);
            this.model = gltf.scene;

            // Apply texture if provided
            if (textureUrl) {
                const texture = await AssetLoader.loadThreeTexture(textureUrl);
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.magFilter = THREE.NearestFilter;
                texture.minFilter = THREE.NearestFilter;
                texture.flipY = false; // Blockbench usually exports with flipY: false for GLTF

                this.model.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        const originalMaterial = child.material as THREE.MeshStandardMaterial;
                        child.material = new THREE.MeshStandardMaterial({
                            map: texture,
                            transparent: originalMaterial.transparent,
                            alphaTest: 0.5,
                        });
                    }
                });
            }

            this.container.add(this.model);

            // Setup animations if present
            if (gltf.animations && gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(this.model);
                gltf.animations.forEach((clip) => {
                    const action = this.mixer!.clipAction(clip);
                    this.actions.set(clip.name, action);
                });
            }
        } catch (err) {
            console.error(`[EntityMesh] Failed to load model/texture: ${err}`);
        }
    }

    public playAnimation(name: string, fadeTime: number = 0.2): void {
        const action = this.actions.get(name);
        if (!action || action === this.currentAction) return;

        if (this.currentAction) {
            this.currentAction.fadeOut(fadeTime);
        }

        action.reset().fadeIn(fadeTime).play();
        this.currentAction = action;
    }

    public update(delta: number): void {
        if (this.mixer) {
            this.mixer.update(delta);
        }
    }

    public getModel(): THREE.Object3D | null {
        return this.model;
    }
}
