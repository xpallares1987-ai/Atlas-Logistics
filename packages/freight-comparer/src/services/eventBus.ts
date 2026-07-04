/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

type Callback<T = any> = (data: T) => void;

class EventBus {
  private events: Map<string, Callback<any>[]> = new Map();

  /**
   * Subscribe to an event
   */
  public on<T = any>(event: string, callback: Callback<T>): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);

    // Return an unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from an event
   */
  public off<T = any>(event: string, callback: Callback<T>): void {
    if (!this.events.has(event)) return;
    const list = this.events.get(event)!;
    const index = list.indexOf(callback);
    if (index > -1) {
      list.splice(index, 1);
    }
  }

  /**
   * Emit an event to all subscribers
   */
  public emit<T = any>(event: string, data?: T): void {
    if (!this.events.has(event)) return;
    
    // Create copy of callback list to avoid mutation issues during invocation
    const callbacks = [...this.events.get(event)!];
    callbacks.forEach((callback) => {
      try {
        callback(data);
      } catch (err) {
        console.error(`[EventBus] Error in listener for event "${event}":`, err);
      }
    });
  }
}

// Singleton instance to be shared across the ESM modules
export const eventBus = new EventBus();
