/**
 * @file usePasskey.ts
 * @description React hook for FIDO2 / WebAuthn biometric passkey authentication and registration.
 * @module @atlas/frontend/hooks/usePasskey
 * @see {@link docs/adr/0031-sovereign-native-identity-and-authentication-engine.md}
 */

import { useState, useCallback } from "react";
import { resolveApiUrl } from "./useApiQuery";
import { useAuth } from "../contexts/AuthContext";

// ============================================================================
// 1. BASE64URL CONVERSION HELPERS
// ============================================================================

function base64UrlToBuffer(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ============================================================================
// 2. HOOK IMPLEMENTATION
// ============================================================================

export function usePasskey() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  const isSupported =
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined" &&
    typeof navigator.credentials !== "undefined";

  /**
   * Enroll a new biometric passkey / security key for the current logged-in user.
   */
  const registerPasskey = useCallback(
    async (name?: string) => {
      if (!isSupported) {
        throw new Error(
          "WebAuthn / Passkeys no están soportados en este navegador",
        );
      }

      setIsLoading(true);
      setError(null);

      try {
        const token =
          localStorage.getItem("atlas_token") || localStorage.getItem("token");
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        // 1. Fetch registration options from Fastify
        const optionsRes = await fetch(
          resolveApiUrl("/api/auth/webauthn/register-options"),
          {
            method: "POST",
            headers,
            credentials: "include",
          },
        );

        if (!optionsRes.ok) {
          const data = await optionsRes.json().catch(() => ({}));
          throw new Error(
            data.error || "Error al solicitar opciones de registro de passkey",
          );
        }

        const options = await optionsRes.json();

        // 2. Format options for navigator.credentials.create
        const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions =
          {
            ...options,
            challenge: base64UrlToBuffer(options.challenge),
            user: {
              ...options.user,
              id: base64UrlToBuffer(options.user.id),
            },
          };

        // WebAuthn prohibits IP addresses as rp.id; map to valid domain (e.g. localhost)
        if (
          publicKeyCredentialCreationOptions.rp?.id &&
          /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(
            publicKeyCredentialCreationOptions.rp.id,
          )
        ) {
          publicKeyCredentialCreationOptions.rp = {
            ...publicKeyCredentialCreationOptions.rp,
            id: window.location.hostname.includes("127.0.0.1")
              ? "localhost"
              : window.location.hostname,
          };
        }

        // 3. Prompt browser biometric ceremony (Windows Hello, Touch ID, YubiKey)
        const credential = (await navigator.credentials.create({
          publicKey: publicKeyCredentialCreationOptions,
        })) as PublicKeyCredential & {
          response: AuthenticatorAttestationResponse;
        };

        if (!credential) {
          throw new Error("El usuario canceló la autenticación biométrica");
        }

        // 4. Send attestation to server for cryptographic verification
        const verifyPayload = {
          name: name || "Dispositivo biométrico / Passkey",
          challenge: options.challenge,
          response: {
            clientDataJSON: bufferToBase64Url(
              credential.response.clientDataJSON,
            ),
            attestationObject: bufferToBase64Url(
              credential.response.attestationObject,
            ),
          },
        };

        const verifyRes = await fetch(
          resolveApiUrl("/api/auth/webauthn/register-verify"),
          {
            method: "POST",
            headers,
            credentials: "include",
            body: JSON.stringify(verifyPayload),
          },
        );

        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) {
          throw new Error(
            verifyData.error || "Error al verificar la clave de acceso",
          );
        }

        return { success: true };
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Error durante el registro de passkey";
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [isSupported],
  );

  /**
   * Log in passwordless using a registered passkey / biometric prompt.
   */
  const loginWithPasskey = useCallback(async () => {
    if (!isSupported) {
      throw new Error(
        "WebAuthn / Passkeys no están soportados en este navegador",
      );
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch authentication assertion challenge
      const optionsRes = await fetch(
        resolveApiUrl("/api/auth/webauthn/login-options"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        },
      );

      if (!optionsRes.ok) {
        const data = await optionsRes.json().catch(() => ({}));
        throw new Error(data.error || "Error al solicitar desafío de acceso");
      }

      const options = await optionsRes.json();

      // 2. Format options for navigator.credentials.get
      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions =
        {
          ...options,
          challenge: base64UrlToBuffer(options.challenge),
        };

      // WebAuthn prohibits IP addresses as rpId; map to valid domain (e.g. localhost)
      if (
        publicKeyCredentialRequestOptions.rpId &&
        /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(
          publicKeyCredentialRequestOptions.rpId,
        )
      ) {
        publicKeyCredentialRequestOptions.rpId =
          window.location.hostname.includes("127.0.0.1")
            ? "localhost"
            : window.location.hostname;
      }

      // 3. Prompt user for biometric / hardware security key
      const assertion = (await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      })) as PublicKeyCredential & { response: AuthenticatorAssertionResponse };

      if (!assertion) {
        throw new Error("Autenticación biométrica cancelada");
      }

      // 4. Send assertion to Fastify
      const verifyPayload = {
        id: assertion.id,
        challenge: options.challenge,
        response: {
          clientDataJSON: bufferToBase64Url(assertion.response.clientDataJSON),
          authenticatorData: bufferToBase64Url(
            assertion.response.authenticatorData,
          ),
          signature: bufferToBase64Url(assertion.response.signature),
        },
      };

      const verifyRes = await fetch(
        resolveApiUrl("/api/auth/webauthn/login-verify"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(verifyPayload),
        },
      );

      const data = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(
          data.error || "Fallo en la verificación de la llave biométrica",
        );
      }

      // 5. Store session in AuthContext
      login(data.token, data.user);
      return { success: true, user: data.user };
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Error al iniciar sesión con Passkey";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, login]);

  return {
    isSupported,
    isLoading,
    error,
    registerPasskey,
    loginWithPasskey,
  };
}
