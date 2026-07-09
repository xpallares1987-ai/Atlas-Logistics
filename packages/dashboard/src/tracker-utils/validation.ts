/**
 * Utility class for logistics data validation.
 */
export class ValidationUtils {
  /**
   * Validates a container number against standard ISO 6346 format.
   * Format: 4 uppercase letters followed by 7 digits.
   *
   * @param container - The container number string to validate.
   * @returns true if the container format is valid, false otherwise.
   */
  public static isValidContainer(container: string): boolean {
    if (!container) return false;
    const regex = /^[A-Z]{4}\d{7}$/;
    return regex.test(container.toUpperCase().trim());
  }

  /**
   * Validates a basic HAWB/MAWB (House/Master Air Waybill) reference format.
   * Ensures the reference has a minimum structural length.
   *
   * @param ref - The waybill reference string to validate.
   * @returns true if valid, false otherwise.
   */
  public static isValidReference(ref: string): boolean {
    if (!ref) return false;
    return ref.trim().length >= 5;
  }
}
