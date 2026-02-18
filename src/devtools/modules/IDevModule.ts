export interface IDevModule {
    id: string;
    title: string;
    render(container: HTMLElement): void;
    update?(delta: number): void;
}
