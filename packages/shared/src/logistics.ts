/**
 * Logistics Utilities for Container Planning
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
  type: '20ft' | '40ft' | '40ftHC';
  maxWeight: number; // kg
  volumeCapacity: number; // m3
  dimensions: { width: number; height: number; length: number }; // cm
}

/**
 * Calculates volume of a cargo item in m3
 */
export function calculateVolume(item: CargoItem): number {
  return (item.width * item.height * item.length) / 1000000;
}

/**
 * Validates if a cargo item fits within container dimensions
 */
export function fitsInContainer(item: CargoItem, container: Container): boolean {
  return (
    item.width <= container.dimensions.width &&
    item.height <= container.dimensions.height &&
    item.length <= container.dimensions.length
  );
}

/**
 * Calculates container utilization percentage
 */
export function calculateUtilization(items: CargoItem[], container: Container): number {
  const totalVolume = items.reduce((sum, item) => sum + calculateVolume(item), 0);
  return (totalVolume / container.volumeCapacity) * 100;
}
