import { EventEmitter } from 'events';

/**
 * High-concurrency event bus simulating Redis Pub/Sub.
 * Used for Phase 3 to decouple domain events.
 */
class MessageBroker extends EventEmitter {
  publish(channel: string, message: any) {
    console.log(`[Broker] Publishing to ${channel}:`, message);
    this.emit(channel, message);
  }

  subscribe(channel: string, callback: (message: any) => void) {
    this.on(channel, callback);
    return () => this.off(channel, callback);
  }
}

export const broker = new MessageBroker();
