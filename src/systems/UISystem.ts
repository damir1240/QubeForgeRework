import { eventManager } from "../core/EventManager";
import { GameEvents, type PlayerHealthEvent, type PlayerDamageEvent } from "../core/GameEvents";
import { HealthBar } from "../ui/HealthBar";

export class UISystem {
    private healthBar: HealthBar;
    private damageOverlay: HTMLElement;

    constructor(healthBar: HealthBar, damageOverlay: HTMLElement) {
        this.healthBar = healthBar;
        this.damageOverlay = damageOverlay;
        this.setupListeners();
    }

    private setupListeners(): void {
        eventManager.on<PlayerHealthEvent>(GameEvents.PLAYER_HEALTH_CHANGED, (event) => {
            this.healthBar.update(event.current);
        });

        eventManager.on<PlayerDamageEvent>(GameEvents.PLAYER_DAMAGE, (_event) => {
            this.showDamageEffect();
        });

        eventManager.on(GameEvents.PLAYER_RESPAWN, () => {
            this.healthBar.update(20); // Default max?
            this.damageOverlay.style.opacity = '0';
        });
    }

    private showDamageEffect(): void {
        this.damageOverlay.style.transition = 'none';
        this.damageOverlay.style.opacity = '0.3';

        requestAnimationFrame(() => {
            this.damageOverlay.style.transition = 'opacity 0.5s ease-out';
            this.damageOverlay.style.opacity = '0';
        });
    }
}
