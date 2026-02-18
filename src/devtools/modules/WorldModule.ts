import type { IDevModule } from "./IDevModule";
import { Environment } from "../../world/Environment";

export class WorldModule implements IDevModule {
    public readonly id = 'world';
    public readonly title = 'World Context';
    private environment: Environment;

    constructor(environment: Environment) {
        this.environment = environment;
    }

    public render(container: HTMLElement): void {
        const section = document.createElement('div');
        section.className = 'dev-section';
        section.innerHTML = `<h3>Окружение</h3>`;

        const btnDay = document.createElement('button');
        btnDay.innerText = 'Установить День';
        btnDay.onclick = () => this.environment.setTimeToDay(true);

        const btnNight = document.createElement('button');
        btnNight.innerText = 'Установить Ночь';
        btnNight.onclick = () => this.environment.setTimeToNight(true);

        const btnGroup = document.createElement('div');
        btnGroup.className = 'dev-btn-group';
        btnGroup.appendChild(btnDay);
        btnGroup.appendChild(btnNight);

        section.appendChild(btnGroup);
        container.appendChild(section);
    }
}
