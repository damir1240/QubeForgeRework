import type { IDevModule } from "./modules/IDevModule";
import { WorldModule } from "./modules/WorldModule";
import type { Game } from "../core/Game";
import './styles/devtools.css';

export class DevToolsManager {
    private static instance: DevToolsManager;
    private modules: IDevModule[] = [];
    private container: HTMLDivElement | null = null;
    private isOpen: boolean = false;
    private game: Game;

    constructor(game: Game) {
        this.game = game;
        this.initModules();
        this.createUI();
    }

    public static getInstance(game?: Game): DevToolsManager {
        if (!DevToolsManager.instance && game) {
            DevToolsManager.instance = new DevToolsManager(game);
        }
        return DevToolsManager.instance;
    }

    private initModules(): void {
        this.modules.push(new WorldModule(this.game.environment));
        // Add more modules here in the future
    }

    private createUI(): void {
        this.container = document.createElement('div');
        this.container.className = 'dev-tools-overlay';
        this.container.innerHTML = `
            <div class="dev-tools-header">
                <h2>DevTools Professional</h2>
                <span style="font-size: 10px; color: #444;">v1.0</span>
            </div>
            <div class="dev-tools-content"></div>
        `;

        const content = this.container.querySelector('.dev-tools-content') as HTMLElement;
        this.modules.forEach(module => {
            module.render(content);
        });

        // ПРЕДОТВРАЩАЕМ захват мыши игрой при клике на девтулс
        this.container.addEventListener('pointerdown', (e) => e.stopPropagation());
        this.container.addEventListener('mousedown', (e) => e.stopPropagation());
        this.container.addEventListener('click', (e) => e.stopPropagation());

        document.body.appendChild(this.container);
    }

    public toggle(): void {
        this.isOpen = !this.isOpen;
        if (this.container) {
            this.container.style.display = this.isOpen ? 'flex' : 'none';
        }

        // Блокируем/разблокируем Pointer Lock в зависимости от состояния
        if (this.isOpen) {
            document.exitPointerLock();
        }
    }

    public isVisible(): boolean {
        return this.isOpen;
    }
}
