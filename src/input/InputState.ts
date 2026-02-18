export interface InputState {
    isAttackPressed: boolean;
    isUsePressed: boolean;

    // Movement
    moveForward: boolean;
    moveBackward: boolean;
    moveLeft: boolean;
    moveRight: boolean;
    isSprinting: boolean;
    isJumping: boolean;
}

export class MobileInputState implements InputState {
    public isAttackPressed = false;
    public isUsePressed = false;

    public moveForward = false;
    public moveBackward = false;
    public moveLeft = false;
    public moveRight = false;
    public isSprinting = false;
    public isJumping = false;
}
