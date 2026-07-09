import { useEffect } from "react";
import { db } from "../db/dexie";

export function useOfflineSync() {
  useEffect(() => {
    const sincronizarDatos = async () => {
      if (!navigator.onLine) return;

      try {
        const respuesta = await fetch("http://localhost:3000/api/shipments");

        if (respuesta.ok) {
          const datos = await respuesta.json();

          const embarquesMapeados = datos.map((e: any) => ({
            id: e.id,
            numero_seguimiento: e.tracking_number,
            id_transportista: e.carrier_id,
            id_cliente: e.customer_id,
            estado: e.status,
            tipo: e.type,
            modo: e.mode,
            puerto_origen: e.origin_port,
            puerto_destino: e.destination_port,
            ets: e.ets,
            eta: e.eta,
            fecha_creacion: e.created_at,
            fecha_actualizacion: e.updated_at,
          }));

          await db.embarques.bulkPut(embarquesMapeados);
        }
      } catch (error) {
        console.error("Fallo en la sincronización offline:", error);
      }
    };

    sincronizarDatos();

    window.addEventListener("online", sincronizarDatos);

    return () => {
      window.removeEventListener("online", sincronizarDatos);
    };
  }, []);
}
