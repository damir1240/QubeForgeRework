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

export class Player implements IPlayer {
  public physics: PlayerPhysics;
  public health: PlayerHealth;
  public combat: PlayerCombat;
  public hand: PlayerHand;

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
    noiseTexture: THREE.DataTexture,
    toolTextures: Record<number, { texture: THREE.CanvasTexture; dataUrl: string }>,
  ) {
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

    this.hand = new PlayerHand(uiCamera, noiseTexture, toolTextures);
  }

  public update(delta: number, inputState: InputState) {
    this.physics.update(delta, inputState);

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
