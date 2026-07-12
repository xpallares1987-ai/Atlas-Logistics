import { describe, it, expect } from 'vitest';
import { encryptToken, decryptToken } from './storage-service';

describe('StorageService (Security)', () => {
  it('should encrypt and decrypt a token correctly', async () => {
    const token = 'ghp_test_token_123';
    const pin = '1234';

    const encrypted = await encryptToken(token, pin);
    expect(encrypted).not.toBe(token);

    const decrypted = await decryptToken(encrypted, pin);
    expect(decrypted).toBe(token);
  });

  it('should fail decryption with wrong PIN', async () => {
    const token = 'ghp_test_token_123';
    const pin = '1234';
    const wrongPin = '0000';

    const encrypted = await encryptToken(token, pin);
    await expect(decryptToken(encrypted, wrongPin)).rejects.toThrow();
  });
});
