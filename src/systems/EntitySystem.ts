import type { IEntity } from "../entities/IEntity";
import { ItemEntity } from "../entities/ItemEntity";
import type { IPlayer } from "../player/IPlayer";
import { eventManager } from "../core/EventManager";
import { GameEvents } from "../core/GameEvents";
import { PICKUP_DISTANCE, ENTITY_VISIBILITY_DISTANCE } from "../constants/GameConstants";

export class EntitySystem {
    private entities: IEntity[];
    private player: IPlayer;

    constructor(entities: IEntity[], player: IPlayer) {
        this.entities = entities;
        this.player = player;
        this.setupListeners();
    }

    private setupListeners(): void {
        eventManager.on<{ entityId: string; remaining: number }>('item:pickup_processed', (event) => {
            const { entityId, remaining } = event;
            const entity = this.entities.find(e => e.id === entityId);

            if (entity && entity instanceof ItemEntity) {
                entity.count = remaining;
                if (remaining <= 0) {
                    entity.dispose();
                    const idx = this.entities.indexOf(entity);
                    if (idx !== -1) this.entities.splice(idx, 1);
                }
            }
        });
    }

    public update(delta: number, time: number): void {
        const playerPos = this.player.getPosition();

        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i];
            const entityMesh = entity.getMesh();
            const distance = entityMesh.position.distanceTo(playerPos);

            // Culling
            entityMesh.visible = distance < ENTITY_VISIBILITY_DISTANCE;

            if (entityMesh.visible) {
                entity.update(delta, time);
            }

            if (entity.isDead) {
                entity.dispose();
                this.entities.splice(i, 1);
                continue;
            }

            // Item-specific logic (Pickup)
            if (entity instanceof ItemEntity && distance < PICKUP_DISTANCE) {
                eventManager.emit<{ itemId: number; count: number; entityId: string }>(GameEvents.ITEM_PICKUP, {
                    itemId: entity.type,
                    count: entity.count,
                    entityId: entity.id,
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
