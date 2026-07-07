import { redis } from "./redis-cache.service.js";

const subRedis = redis.duplicate();

class MessageBroker {
  private activeSubscriptions = new Map<string, Set<(message: any) => void>>();

  constructor() {
    subRedis.on("message", (channel, message) => {
      const callbacks = this.activeSubscriptions.get(channel);
      if (callbacks) {
        let parsed = message;
        try {
          parsed = JSON.parse(message);
        } catch {}
        callbacks.forEach((cb) => cb(parsed));
      }
    });
  }

  publish(channel: string, message: any) {
    console.log(`[Broker] Publishing to ${channel} (Redis):`, message);
    const serialized =
      typeof message === "string" ? message : JSON.stringify(message);
    redis.publish(channel, serialized).catch((err) => {
      console.error(
        `[Broker] Failed to publish message on channel ${channel}:`,
        err,
      );
    });
  }

  subscribe(channel: string, callback: (message: any) => void) {
    let callbacks = this.activeSubscriptions.get(channel);
    const isNewChannel = !callbacks;
    if (!callbacks) {
      callbacks = new Set();
      this.activeSubscriptions.set(channel, callbacks);
    }
    callbacks.add(callback);

    if (isNewChannel) {
      subRedis.subscribe(channel).catch((err) => {
        console.error(
          `[Broker] Failed to subscribe to channel ${channel}:`,
          err,
        );
      });
    }

    return () => {
      const currentCallbacks = this.activeSubscriptions.get(channel);
      if (currentCallbacks) {
        currentCallbacks.delete(callback);
        if (currentCallbacks.size === 0) {
          this.activeSubscriptions.delete(channel);
          subRedis.unsubscribe(channel).catch((err) => {
            console.error(
              `[Broker] Failed to unsubscribe from channel ${channel}:`,
              err,
            );
          });
        }
      }
    };
  }
}

export const broker = new MessageBroker();
