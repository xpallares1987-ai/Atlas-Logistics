export interface TorreEvent {
  type:
    "DIAGRAM_SAVED" | "XML_CACHE_UPDATED" | "THEME_CHANGED" | "DIAGRAM_CHANGED";
  payload?: unknown;
}

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (
    typeof window === "undefined" ||
    typeof BroadcastChannel === "undefined"
  ) {
    return null;
  }
  if (!channel) {
    channel = new BroadcastChannel("torre-sync-channel");
  }
  return channel;
}

export function publishEvent(event: TorreEvent): void {
  const ch = getChannel();
  if (ch) {
    ch.postMessage(event);
  }
}

export function subscribeToEvents(
  callback: (event: TorreEvent) => void,
): () => void {
  const ch = getChannel();
  if (!ch) {
    return () => {};
  }

  const listener = (e: MessageEvent) => {
    callback(e.data);
  };

  ch.addEventListener("message", listener);
  return () => {
    ch.removeEventListener("message", listener);
  };
}
