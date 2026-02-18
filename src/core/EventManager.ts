export type Listener<T> = (event: T) => void;

export class EventManager {
    private listeners: Map<string, Listener<any>[]> = new Map();

    public on<T>(event: string, listener: Listener<T>): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(listener);
    }

    public off<T>(event: string, listener: Listener<T>): void {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            this.listeners.set(
                event,
                eventListeners.filter((l) => l !== listener)
            );
        }
    }

    public emit<T>(event: string, data: T): void {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach((listener) => listener(data));
        }
    }

    public clear(): void {
        this.listeners.clear();
    }
}

export const eventManager = new EventManager();
