/**
 * Core logistics helpers for container planning and utilization math.
 */

export interface CargoItem {
  id: string;
  width: number; // cm
  height: number; // cm
  length: number; // cm
  weight: number; // kg
}

export interface Container {
  id: string;
  type: "20ft" | "40ft" | "40ftHC";
  maxWeight: number; // kg
  volumeCapacity: number; // m3
  dimensions: { width: number; height: number; length: number }; // cm
}

/**
 * Calculates volume of a cargo item in cubic meters.
 */
export function calculateVolume(item: CargoItem): number {
  return (item.width * item.height * item.length) / 1000000;
}

/**
 * Checks whether a cargo item fits within a container's dimensions.
 */
export function fitsInContainer(
  item: CargoItem,
  container: Container,
): boolean {
  return (
    item.width <= container.dimensions.width &&
    item.height <= container.dimensions.height &&
    item.length <= container.dimensions.length
  );
}

/**
 * Calculates the volume utilization percentage for a set of cargo items.
 */
export function calculateUtilization(
  items: CargoItem[],
  container: Container,
): number {
  const totalVolume = items.reduce(
    (sum, item) => sum + calculateVolume(item),
    0,
  );
  return (totalVolume / container.volumeCapacity) * 100;
}
