/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { encryptData, decryptData } from "@atlas/ui";

/**
 * Service for enterprise-grade secure local storage in Shipment-Dashboard.
 */
export class SecurityService {
  private static readonly STORAGE_KEY_PREFIX = "ct_secure_";

  /**
   * Saves sensitive data to local storage encrypted with a user PIN.
   */
  static async saveSecure(key: string, data: any, pin: string) {
    const encrypted = await encryptData(data, pin);
    localStorage.setItem(this.STORAGE_KEY_PREFIX + key, encrypted);
  }

  /**
   * Retrieves and decrypts sensitive data from local storage.
   */
  static async loadSecure<T>(key: string, pin: string): Promise<T | null> {
    const encrypted = localStorage.getItem(this.STORAGE_KEY_PREFIX + key);
    if (!encrypted) return null;

    try {
      return await decryptData<T>(encrypted, pin);
    } catch (err) {
      console.error(`Decryption failed for key ${key}:`, err);
      return null;
    }
  }

  /**
   * Checks if secure data exists for a given key.
   */
  static hasSecure(key: string): boolean {
    return !!localStorage.getItem(this.STORAGE_KEY_PREFIX + key);
  }

  /**
   * Clears secure data.
   */
  static clearSecure(key: string) {
    localStorage.removeItem(this.STORAGE_KEY_PREFIX + key);
  }
}
