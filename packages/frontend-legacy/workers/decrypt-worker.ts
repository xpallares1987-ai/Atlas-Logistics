const hexToUint8Array = (hex: string): Uint8Array => {
  const view = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    view[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return view;
};

self.onmessage = async (e: MessageEvent) => {
  const { encryptedPayload, keyString } = e.data;
  
  try {
    const parts = encryptedPayload.split(':');
    if (parts.length !== 3) throw new Error('Invalid payload format');

    const iv = hexToUint8Array(parts[0]);
    const authTag = hexToUint8Array(parts[1]);
    const encryptedData = hexToUint8Array(parts[2]);

    const ciphertextAndTag = new Uint8Array(encryptedData.length + authTag.length);
    ciphertextAndTag.set(encryptedData, 0);
    ciphertextAndTag.set(authTag, encryptedData.length);

    const keyData = new TextEncoder().encode(keyString);
    
    const cryptoKey = await self.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const decryptedBuffer = await self.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as any,
        tagLength: 128
      },
      cryptoKey,
      ciphertextAndTag
    );

    const decryptedText = new TextDecoder().decode(decryptedBuffer);
    const parsedData = JSON.parse(decryptedText);

    self.postMessage({ status: 'success', data: parsedData });
  } catch (error) {
    self.postMessage({ status: 'error', error: (error as Error).message });
  }
};