import { PlayerPhysics } from "./PlayerPhysics";
import { PlayerHealth } from "./PlayerHealth";
import { PlayerCombat } from "./PlayerCombat";
import { PlayerHand } from "./PlayerHand";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { World } from "../world/World";
import * as THREE from "three";
import { MathUtils } from "three";
// import { HealthBar } from "../ui/HealthBar"; // Removed
import type { IPlayer } from "./IPlayer";
import type { InputState } from "../input/InputState";

import { BaseEntity } from "../entities/BaseEntity";
import { EntityMesh } from "../entities/EntityMesh";

export class Player extends BaseEntity implements IPlayer {
  public physics: PlayerPhysics;
  public health: PlayerHealth;
  public combat: PlayerCombat;
  public hand: PlayerHand;
  public mesh: EntityMesh;

  private controls: PointerLockControls;

  constructor(
    controls: PointerLockControls,
    world: World,
    camera: THREE.PerspectiveCamera,
    scene: THREE.Scene,
    uiCamera: THREE.PerspectiveCamera,
    inventoryIdGetter: () => number,
    onToolUse: (amount: number) => void,
    cursorMesh: THREE.Mesh,
    crackMesh: THREE.Mesh,
    noiseTexture: THREE.Texture,
  ) {
    // We don't pass controls.object as existingObject because we want separate body rotation
    super(scene);
    this.controls = controls;

    this.physics = new PlayerPhysics(controls, world);

    this.health = new PlayerHealth(
      camera,
      controls,
      (pos) => this.physics.checkCollision(pos),
      () => {
        this.physics.setVelocity(new THREE.Vector3(0, 0, 0));
      },
    );

    this.combat = new PlayerCombat(
      camera,
      scene,
      controls,
      inventoryIdGetter,
      onToolUse,
      cursorMesh,
      crackMesh,
    );

    this.hand = new PlayerHand(uiCamera, noiseTexture);

    // Initialize EntityMesh for the player model
    this.mesh = new EntityMesh(this.object);
    this.mesh.loadModel('/assets/qubeforge/models/player.gltf')
      .then(() => {
        const model = this.mesh.getModel();
        if (model) {
          // The player model's root is this.object
          // Hide it from first-person view (standard camera sees layer 0, we move model to layer 1)
          model.traverse((child) => {
            child.layers.set(1);
          });
        }
      });
  }

  // Implementation of BaseEntity.update
  public update(_delta: number, _time: number): void {
    // Sychronize body with camera position
    const camPos = this.controls.object.position;
    this.object.position.set(camPos.x, camPos.y - 1.6, camPos.z); // Offset to feet

    // Synchronize body Y rotation with camera Y rotation
    const camEuler = new THREE.Euler().setFromQuaternion(this.controls.object.quaternion, 'YXZ');
    this.object.rotation.y = camEuler.y;

    this.mesh.update(_delta);
  }

  public handleUpdate(delta: number, inputState: InputState) {
    this.physics.update(delta, inputState);

    // Also update entity logic (syncing visual mesh)
    this.update(delta, delta); // We don't have global time here, but delta is enough for animation mixer


    // FOV Effect
    const baseFov = 75;
    const sprintFov = 85;
    const targetFov =
      inputState.isSprinting &&
        (inputState.moveForward ||
          inputState.moveBackward ||
          inputState.moveLeft ||
          inputState.moveRight)
        ? sprintFov
        : baseFov;

    // Smoothly interpolate FOV
    const camera = this.physics.controls.object as THREE.PerspectiveCamera;
    const currentFov = camera.fov;

    if (Math.abs(currentFov - targetFov) > 0.1) {
      camera.fov = MathUtils.lerp(currentFov, targetFov, delta * 5);
      camera.updateProjectionMatrix();
    }

    const isMoving =
      (inputState.moveForward ||
        inputState.moveBackward ||
        inputState.moveLeft ||
        inputState.moveRight) &&
      this.physics.isOnGround;

    this.hand.update(delta, isMoving);
  }

  public getPosition(): THREE.Vector3 {
    return this.physics.controls.object.position;
  }

  public getRotation(): THREE.Euler {
    return this.physics.controls.object.rotation;
  }
}
