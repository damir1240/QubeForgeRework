import * as THREE from 'three';
import { BaseEntity } from '../BaseEntity';
import { EntityMesh } from '../EntityMesh';
import { EntityPhysics } from '../EntityPhysics';
import { World } from '../../world/World';
import { MobRegistry } from '../../modding/Registry';
import { GoalSelector } from '../ai/goals/GoalSelector';
import { Navigation } from '../ai/pathfinding/Navigation';
import { RandomStrollGoal } from '../ai/goals/RandomStrollGoal';

/**
 * SRP: Универсальный базовый класс для всех мирных мобов,
 * реализующий поведение блуждания (wander) через Goal System и Pathfinding.
 */
export class PeacefulMob extends BaseEntity {
    protected meshContainer: EntityMesh;
    protected physics: EntityPhysics;
    protected goalSelector: GoalSelector;
    protected navigation: Navigation;

    protected mobId: string;
    protected moveSpeed: number;
    protected walkAnimationName: string = 'Walking';

    constructor(scene: THREE.Scene, world: World, mobId: string) {
        super(scene);
        this.mobId = mobId;

        const config = MobRegistry.get(this.mobId);
        const width = config?.width || 0.9;
        const height = config?.height || 0.9;
        const modelUrl = config?.modelUrl || '';
        const textureUrl = config?.textureUrl || '';
        this.moveSpeed = config?.speed || 1.5;

        this.physics = new EntityPhysics(world, this.object, width, height);
        this.meshContainer = new EntityMesh(this.object);

        // Initialize Advanced AI System
        this.navigation = new Navigation(this.physics, world, this.object);
        this.goalSelector = new GoalSelector();

        // Add default behaviors
        this.goalSelector.addGoal(5, new RandomStrollGoal(this.position, this.navigation, world, this.moveSpeed));

        if (modelUrl && textureUrl) {
            this.meshContainer.loadModel(modelUrl, textureUrl)
                .then(() => {
                    // Ensure correct initial scale if needed
                })
                .catch(err => {
                    console.error(`Failed to load model for ${this.mobId}:`, err);
                });
        }
    }

    public update(delta: number, _time: number): void {
        // AI Logic Update
        this.goalSelector.update();
        this.navigation.update(delta);

        // Physics
        this.physics.update(delta);

        // Visuals
        this.meshContainer.update(delta);

        // Используем капитализацию анимации
        const speed = new THREE.Vector3(this.physics.velocity.x, 0, this.physics.velocity.z).length();
        if (speed > 0.1) {
            this.meshContainer.playAnimation(this.walkAnimationName);
        } else {
            // Мгновенная остановка анимации при прекращении движения
            this.meshContainer.stopAnimation(0);
        }

        // Object look direction
        if (speed > 0.1) {
            const angle = Math.atan2(this.physics.velocity.x, this.physics.velocity.z) + Math.PI;
            // Плавный поворот в сторону движения
            let diff = angle - this.object.rotation.y;
            // Нормализация угла до -PI..PI
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;

            this.object.rotation.y += diff * 10 * delta; // 10 - скорость поворота
        }
    }
}
