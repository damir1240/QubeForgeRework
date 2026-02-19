import * as THREE from 'three';
import { BaseEntity } from '../BaseEntity';
import { EntityMesh } from '../EntityMesh';
import { EntityPhysics } from '../EntityPhysics';
import { World } from '../../world/World';
import { AIMovement } from '../AIMovement';
import { MobRegistry } from '../../modding/Registry';

export class Pig extends BaseEntity {
    private meshContainer: EntityMesh;
    private physics: EntityPhysics;
    private aiMovement: AIMovement;

    private wanderTimer: number = 0;
    private targetDir: THREE.Vector3 = new THREE.Vector3();

    constructor(scene: THREE.Scene, world: World) {
        super(scene);

        const config = MobRegistry.get('minecraft:pig');
        const width = config?.width || 0.9;
        const height = config?.height || 0.9;
        const modelUrl = config?.modelUrl || '/assets/qubeforge/models/pig.gltf';
        const textureUrl = config?.textureUrl || '/assets/qubeforge/textures/mobs/pig.png';

        this.physics = new EntityPhysics(world, this.object, width, height);
        this.meshContainer = new EntityMesh(this.object);

        // Initialize Auto-Jump behavior
        this.aiMovement = new AIMovement(this.physics, world, this.object, {
            enabled: true,
            jumpForce: 6.5,
            maxStepHeight: 1
        });

        this.meshContainer.loadModel(modelUrl, textureUrl)
            .then(() => {
                // Ensure correct initial scale if needed
            });
    }

    public update(delta: number, _time: number): void {
        this.updateWander(delta);
        this.aiMovement.update(); // Handle auto-jump and other movement AI
        this.physics.update(delta);
        this.meshContainer.update(delta);

        // Use capitalization as specified (Walking)
        const speed = new THREE.Vector3(this.physics.velocity.x, 0, this.physics.velocity.z).length();
        if (speed > 0.1) {
            this.meshContainer.playAnimation('Walking');
        } else {
            // Мгновенная остановка анимации при прекращении движения
            this.meshContainer.stopAnimation(0);
        }

        // Object look direction (Fixing "walking backward" by adding Math.PI)
        if (speed > 0.1) {
            const angle = Math.atan2(this.physics.velocity.x, this.physics.velocity.z) + Math.PI;
            this.object.rotation.y = angle;
        }
    }

    private updateWander(delta: number): void {
        this.wanderTimer -= delta;
        if (this.wanderTimer <= 0) {
            // Шанс 50/50: либо идем, либо стоим (было 70/30 в пользу ходьбы)
            if (Math.random() > 0.5) {
                const angle = Math.random() * Math.PI * 2;
                this.targetDir.set(Math.cos(angle), 0, Math.sin(angle));
                // Бродим от 4 до 10 секунд
                this.wanderTimer = 4 + Math.random() * 6;
            } else {
                // Стоим на месте
                this.targetDir.set(0, 0, 0);
                // Стоим от 2 до 5 секунд
                this.wanderTimer = 2 + Math.random() * 3;
            }
        }

        const moveSpeed = 1.5; // Чуть замедлим (было 2.0)
        this.physics.velocity.x = this.targetDir.x * moveSpeed;
        this.physics.velocity.z = this.targetDir.z * moveSpeed;
    }
}
