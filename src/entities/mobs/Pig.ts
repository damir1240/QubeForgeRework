import * as THREE from 'three';
import { World } from '../../world/World';
import { PeacefulMob } from './PeacefulMob';

export class Pig extends PeacefulMob {
    constructor(scene: THREE.Scene, world: World) {
        super(scene, world, 'minecraft:pig');
        this.moveSpeed = 1.5; // Чуть замедлим относительно реестра
    }
}
