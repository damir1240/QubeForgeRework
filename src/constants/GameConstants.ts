// Физические константы игры

export const GRAVITY = 20.0;
export const JUMP_HEIGHT = 1.25;
export const JUMP_IMPULSE = Math.sqrt(2 * GRAVITY * JUMP_HEIGHT);

// Размеры игрока
export const PLAYER_HALF_WIDTH = 0.3;
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_EYE_HEIGHT = 1.6;

// Комбат константы
export const ATTACK_RANGE = 2.5;
export const PUNCH_DAMAGE = 1;
export const ATTACK_COOLDOWN = 500;

// Durability
export const TOOL_DURABILITY = {
  WOOD: 60,
  STONE: 132,
  IRON: 250,
};

// Item Entity Constants
export const ITEM_ENTITY = {
  SIZE_BLOCK: 0.3,
  SIZE_FLAT: 0.5,
  COLLISION_OFFSET: 0.15, // Half of SIZE_BLOCK
  MAX_AGE: 180000,
  BLINK_START: 10000,
  BLINK_INTERVAL: 250,
  FLOAT_AMPLITUDE: 0.05,
  FLOAT_SPEED: 3,
  ROTATION_SPEED: 2,
  PICKUP_DELAY_PLAYER: 2000,
  PICKUP_DELAY_BLOCK: 500,
  DESPAWN_TIME: 300000, // 5 minutes like Minecraft
};

// Game Loop Constants
export const PICKUP_DISTANCE = 1.3; // For better head-to-feet coverage
export const ATTRACTION_DISTANCE = 3.0;
export const ENTITY_VISIBILITY_DISTANCE = 40;

// Player Health Constants
export const INVULNERABILITY_DURATION = 500; // ms after taking damage

// UI Constants
export const HOTBAR_LABEL_DURATION = 2000; // ms
export const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

// Chunk Constants
export const CHUNK_SIZE = 32;
export const CHUNK_HEIGHT = 256;

