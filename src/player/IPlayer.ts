import * as THREE from "three";
import type { InputState } from "../input/InputState";

export interface IPlayer {
    getPosition(): THREE.Vector3;
    getRotation(): THREE.Euler;
    handleUpdate(delta: number, inputState: InputState): void;
}
