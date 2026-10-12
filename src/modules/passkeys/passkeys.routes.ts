import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  PasskeyDeviceType,
  RegisteredPasskeyDevice,
  StepUpSecurityPolicy,
  DEFAULT_STEP_UP_POLICY,
  SAMPLE_REGISTERED_PASSKEYS,
  createWebAuthnRegistrationOptions,
  createWebAuthnAuthenticationOptions,
  verifyHardwareSignature,
  HardwareSignatureResult,
  generateBase32Secret,
  generateTOTP,
  verifyTOTP,
  generateBackupCodes,
} from "@atlas/shared";

// In-memory state for user passkeys and step-up policy
let registeredDevices: RegisteredPasskeyDevice[] = [...SAMPLE_REGISTERED_PASSKEYS];
let currentPolicy: StepUpSecurityPolicy = { ...DEFAULT_STEP_UP_POLICY };
let activeTotpSecret = "JBSWY3DPEHPK3PXP"; // Demo active secret

// Validation schemas
const RegisterOptionsSchema = z.object({
  userEmail: z.string().email(),
  userName: z.string().min(1),
  rpId: z.string().optional(),
});

const RegisterVerifySchema = z.object({
  deviceName: z.string().min(1),
  deviceType: z.enum([
    "YUBIKEY_FIPS",
    "TOUCH_ID",
    "WINDOWS_HELLO",
    "TITAN_KEY",
    "SECURITY_KEY_GENERIC",
  ]) as z.ZodType<PasskeyDeviceType>,
  credentialId: z.string().min(1),
  publicKey: z.string().optional(),
  aaguid: z.string().optional(),
});

const TotpSetupSchema = z.object({
  userEmail: z.string().email(),
});

const TotpVerifySchema = z.object({
  secret: z.string().min(16),
  token: z.string().min(6).max(6),
});

const StepUpVerifySchema = z.object({
  actionType: z.enum(["CUSTOMS_CLEARANCE", "EBL_RELEASE", "TREASURY_PAYOUT"]),
  manifestOrTransactionId: z.string().min(1),
  hardwareSignature: z.object({
    credentialId: z.string(),
    signature: z.string(),
    clientDataJSON: z.string(),
    authenticatorData: z.string(),
    timestamp: z.string(),
    success: z.boolean(),
    deviceModel: z.string(),
    userEmail: z.string(),
    manifestId: z.string(),
  }).optional() as z.ZodType<HardwareSignatureResult | undefined>,
  totpToken: z.string().optional(),
  totpSecret: z.string().optional(),
});

const PolicyUpdateSchema = z.object({
  requirePasskeyForCustomsClearance: z.boolean(),
  requirePasskeyForEblRelease: z.boolean(),
  requirePasskeyForHighValuePayouts: z.boolean(),
  payoutThresholdEur: z.number().positive(),
});

export const passkeysRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. List registered devices
  fastify.get("/credentials", async (_request, reply) => {
    return reply.status(200).send({
      success: true,
      devices: registeredDevices.filter((d) => d.status === "ACTIVE"),
      allDevices: registeredDevices,
    });
  });

  // 2. Generate registration options for navigator.credentials.create
  fastify.post("/register/options", async (request, reply) => {
    const parse = RegisterOptionsSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: "Invalid registration options request",
        issues: parse.error.issues,
      });
    }

    const { userEmail, userName, rpId } = parse.data;
    const options = createWebAuthnRegistrationOptions(userEmail, userName, rpId);

    return reply.status(200).send({
      success: true,
      options,
    });
  });

  // 3. Verify and store newly registered Passkey
  fastify.post("/register/verify", async (request, reply) => {
    const parse = RegisterVerifySchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: "Invalid credential verification payload",
        issues: parse.error.issues,
      });
    }

    const { deviceName, deviceType, credentialId, publicKey, aaguid } = parse.data;

    const newDevice: RegisteredPasskeyDevice = {
      id: `passkey-dev-${Date.now().toString(36)}`,
      deviceName,
      deviceType,
      credentialId,
      publicKey: publicKey || "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...",
      registeredAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      status: "ACTIVE",
      aaguid: aaguid || "2fc0579f-8113-47ea-b116-bb5a8db9202a",
    };

    registeredDevices.unshift(newDevice);

    return reply.status(201).send({
      success: true,
      device: newDevice,
    });
  });

  // 4. Revoke a registered Passkey
  fastify.delete("/credentials/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const device = registeredDevices.find((d) => d.id === id);

    if (!device) {
      return reply.status(404).send({
        error: "Passkey credential not found",
      });
    }

    device.status = "REVOKED";

    return reply.status(200).send({
      success: true,
      message: `Passkey '${device.deviceName}' revoked successfully`,
      revokedDeviceId: id,
    });
  });

  // 5. Setup TOTP 2FA (Secret, URI, Backup Codes)
  fastify.post("/totp/setup", async (request, reply) => {
    const parse = TotpSetupSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: "Invalid TOTP setup request",
        issues: parse.error.issues,
      });
    }

    const { userEmail } = parse.data;
    const secret = generateBase32Secret(16);
    const backupCodes = generateBackupCodes(5);
    const otpauthUrl = `otpauth://totp/Atlas-Logistics:${encodeURIComponent(userEmail)}?secret=${secret}&issuer=Atlas-Logistics`;

    return reply.status(200).send({
      success: true,
      secret,
      otpauthUrl,
      backupCodes,
      currentSampleToken: generateTOTP(secret),
    });
  });

  // 6. Verify and confirm TOTP activation
  fastify.post("/totp/verify", async (request, reply) => {
    const parse = TotpVerifySchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: "Invalid TOTP verification payload",
        issues: parse.error.issues,
      });
    }

    const { secret, token } = parse.data;
    const isValid = verifyTOTP(secret, token);

    if (!isValid) {
      return reply.status(400).send({
        success: false,
        verified: false,
        error: "Código de 6 dígitos inválido o expirado. Verifique la hora de su dispositivo.",
      });
    }

    activeTotpSecret = secret;

    return reply.status(200).send({
      success: true,
      verified: true,
      message: "Doble factor de autenticación TOTP verificado y activado exitosamente.",
    });
  });

  // 7. Disable TOTP
  fastify.post("/totp/disable", async (_request, reply) => {
    activeTotpSecret = "";
    return reply.status(200).send({
      success: true,
      disabled: true,
      message: "Doble factor de autenticación desactivado.",
    });
  });

  // 8. Step-up authorization for high-risk operations
  fastify.post("/step-up/verify", async (request, reply) => {
    const parse = StepUpVerifySchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: "Invalid step-up verification request",
        issues: parse.error.issues,
      });
    }

    const { actionType, manifestOrTransactionId, hardwareSignature, totpToken, totpSecret } = parse.data;

    let authorized = false;
    let authMethod = "NONE";

    if (hardwareSignature) {
      authorized = verifyHardwareSignature(hardwareSignature, manifestOrTransactionId);
      authMethod = `WEBAUTHN_HARDWARE (${hardwareSignature.deviceModel})`;
    } else if (totpToken) {
      const secretToUse = totpSecret || activeTotpSecret;
      authorized = verifyTOTP(secretToUse, totpToken);
      authMethod = "TOTP_AUTHENTICATOR";
    }

    if (!authorized) {
      return reply.status(401).send({
        success: false,
        authorized: false,
        error: "Fallo de autorización biométrica o código TOTP no válido para operación crítica.",
      });
    }

    return reply.status(200).send({
      success: true,
      authorized: true,
      actionType,
      manifestOrTransactionId,
      authMethod,
      timestamp: new Date().toISOString(),
    });
  });

  // 9. Get Step-Up security policy
  fastify.get("/policy", async (_request, reply) => {
    return reply.status(200).send({
      success: true,
      policy: currentPolicy,
    });
  });

  // 10. Update Step-Up security policy
  fastify.put("/policy", async (request, reply) => {
    const parse = PolicyUpdateSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: "Invalid policy update payload",
        issues: parse.error.issues,
      });
    }

    currentPolicy = parse.data;

    return reply.status(200).send({
      success: true,
      policy: currentPolicy,
      message: "Políticas de autenticación biométrica step-up actualizadas.",
    });
  });
};

export default passkeysRoutes;
