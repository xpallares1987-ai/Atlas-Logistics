// src/core/event-bus.ts

type EventHandler<T = any> = (data: T) => void;

class EventBus {
  private events: Map<string, EventHandler[]> = new Map();

  subscribe<T>(event: string, handler: EventHandler<T>): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(handler);
  }

  unsubscribe<T>(event: string, handler: EventHandler<T>): void {
    const handlers = this.events.get(event);
    if (handlers) {
      this.events.set(event, handlers.filter((h) => h !== handler));
    }
  }

  publish<T>(event: string, data: T): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }
}

export const eventBus = new EventBus();