/**
 * Passive Event Listeners Shim
 *
 * This utility patches EventTarget.prototype.addEventListener to automatically
 * set { passive: true } for specific event types (wheel, touchstart, touchmove)
 * when no options are provided.
 *
 * This resolves Chrome [Violation] warnings and improves scrolling/zooming
 * responsiveness in libraries like bpmn-js and diagram-js.
 */

export function initPassiveEventsPatch() {
  if (typeof window === 'undefined') return;

  const eventTypes = ['wheel', 'mousewheel', 'touchstart', 'touchmove'];
  const originalAddEventListener = EventTarget.prototype.addEventListener;

  EventTarget.prototype.addEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) {
    let addOptions = options;

    if (
      eventTypes.includes(type) &&
      (typeof options === 'undefined' || options === null || options === false)
    ) {
      // Solo hacer pasivo si el usuario no ha especificado explícitamente que no lo sea.
      // Si el listener es de una librería como bpmn-js que espera preventDefault,
      // la librería normalmente pasará { passive: false }.
      addOptions = { passive: true };
    }

    return originalAddEventListener.call(this, type, listener, addOptions);
  };

  console.log('⚡ Passive Event Listeners Shim initialized');
}
