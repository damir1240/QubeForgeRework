import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventManager } from './EventManager';

describe('EventManager', () => {
    let eventManager: EventManager;

    beforeEach(() => {
        eventManager = new EventManager();
    });

    it('should register and call listeners', () => {
        const listener = vi.fn();
        eventManager.on('test-event', listener);
        eventManager.emit('test-event', { data: 123 });

        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith({ data: 123 });
    });

    it('should support multiple listeners for the same event', () => {
        const listenerA = vi.fn();
        const listenerB = vi.fn();

        eventManager.on('test-event', listenerA);
        eventManager.on('test-event', listenerB);

        eventManager.emit('test-event', {});

        expect(listenerA).toHaveBeenCalledTimes(1);
        expect(listenerB).toHaveBeenCalledTimes(1);
    });

    it('should remove listeners correctly', () => {
        const listener = vi.fn();
        eventManager.on('test-event', listener);
        eventManager.off('test-event', listener);

        eventManager.emit('test-event', {});

        expect(listener).not.toHaveBeenCalled();
    });

    it('should clear all listeners', () => {
        const listener = vi.fn();
        eventManager.on('test-event', listener);
        eventManager.clear();

        eventManager.emit('test-event', {});

        expect(listener).not.toHaveBeenCalled();
    });
});
