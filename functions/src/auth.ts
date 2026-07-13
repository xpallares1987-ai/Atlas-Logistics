import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Ensure admin is initialized only once
if (!admin.apps.length) {
  admin.initializeApp();
}

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  /https:\/\/.*\.web\.app$/,
  /https:\/\/.*\.firebaseapp\.com$/
];

export const assignUserRole = onCall(
  { region: "europe-west1", cors: allowedOrigins },
  async (request) => {
    // 1. Authentication check
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "El usuario debe estar autenticado para asignar roles."
      );
    }

    const callerRole = request.auth.token.role as string | undefined;

    // 2. Authorization check: Only EXECUTIVE or ICT can assign roles
    if (callerRole !== "EXECUTIVE" && callerRole !== "ICT") {
      // Allow the master admin email to bootstrap the system
      if (request.auth.token.email !== "xpal_1987@hotmail.com") {
        throw new HttpsError(
          "permission-denied",
          "Solo los administradores (EXECUTIVE o ICT) pueden asignar roles."
        );
      }
    }

    const { targetUid, newRole } = request.data;

    if (!targetUid || !newRole) {
      throw new HttpsError(
        "invalid-argument",
        "Se requiere 'targetUid' y 'newRole'."
      );
    }

    try {
      // 3. Set the Custom Claim
      await admin.auth().setCustomUserClaims(targetUid, { role: newRole });
      
      return { success: true, message: `Rol ${newRole} asignado a ${targetUid}` };
    } catch (error) {
      console.error("Error setting custom claims:", error);
      throw new HttpsError("internal", "No se pudo asignar el rol en Firebase Auth.");
    }
  }
);
