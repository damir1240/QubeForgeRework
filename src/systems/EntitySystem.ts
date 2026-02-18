import { ItemEntity } from "../entities/ItemEntity";
import type { IPlayer } from "../player/IPlayer";
import { eventManager } from "../core/EventManager";
import { GameEvents, type BlockBrokenEvent } from "../core/GameEvents";
import { PICKUP_DISTANCE, ENTITY_VISIBILITY_DISTANCE } from "../constants/GameConstants";

export class EntitySystem {
    private entities: ItemEntity[];
    private player: IPlayer;

    constructor(entities: ItemEntity[], player: IPlayer) {
        this.entities = entities;
        this.player = player;
        this.setupListeners();
    }

    private setupListeners(): void {
        eventManager.on<{ entityId: number; remaining: number }>('item:pickup_processed', (event) => {
            const { entityId, remaining } = event;
            if (this.entities[entityId]) {
                this.entities[entityId].count = remaining;
                if (remaining <= 0) {
                    this.entities[entityId].dispose();
                    this.entities.splice(entityId, 1);
                }
            }
        });

        eventManager.on<BlockBrokenEvent>(GameEvents.BLOCK_BROKEN, (_event) => {
            // Logic for spawning dropped items should be moved here from GameInitializer
            // But GameInitializer currently does it. 
            // We will move it here in next steps.
        });
    }

    public update(delta: number, time: number): void {
        const playerPos = this.player.getPosition();

        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i];
            const distance = entity.mesh.position.distanceTo(playerPos);

            // Culling
            entity.mesh.visible = distance < ENTITY_VISIBILITY_DISTANCE;

            if (entity.mesh.visible) {
                entity.update(time, delta);
            }

            if (entity.isDead) {
                this.entities.splice(i, 1);
                continue;
            }

            // Pickup Logic
            if (distance < PICKUP_DISTANCE) {
                eventManager.emit<{ itemId: number; count: number; entityId: number }>(GameEvents.ITEM_PICKUP, {
                    itemId: entity.type,
                    count: entity.count,
                    entityId: i, // We might need a better ID than index, but for now index is used to splice
                });
            }
        }
    }

    public removeEntity(index: number): void {
        if (this.entities[index]) {
            this.entities[index].dispose();
            this.entities.splice(index, 1);
        }
    }
}
