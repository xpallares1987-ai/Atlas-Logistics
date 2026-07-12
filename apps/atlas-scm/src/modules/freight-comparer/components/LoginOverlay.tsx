import { useState } from "react";
import { decryptData } from "../utils/crypto";
import { useDecryptedData } from "../context/DecryptedDataContext";

export const LoginOverlay = () => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { setDecryptedData } = useDecryptedData();

  const handleUnlock = async () => {
    if (!window.DATA_ENCRYPTED) {
      setError("No hay datos encriptados cargados.");
      return;
    }
    try {
      const data = await decryptData(password, window.DATA_ENCRYPTED);
      setDecryptedData(data);
      // El componente padre debería gestionar la visibilidad del overlay
    } catch {
      setError("Contraseña incorrecta.");
    }
  };

  return (
    <div style={{ padding: "20px", background: "#1e293b", color: "white" }}>
      <h2>Acceso Restringido</h2>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Contraseña..."
      />
      <button onClick={handleUnlock}>Entrar</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};
