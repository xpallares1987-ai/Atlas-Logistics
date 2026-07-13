import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/dexie";

export default function Shipments() {
  const embarques = useLiveQuery(() => db.embarques.toArray());

  if (embarques === undefined) {
    return <div className="text-gray-500">Cargando embarques...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-slate-800">
          Gestión de Embarques
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={async () => {
              try {
                const { getApp } = await import("firebase/app");
                const { getFunctions, httpsCallable } = await import("firebase/functions");
                const app = getApp();
                const functions = getFunctions(app, "europe-west1");
                const startErpSimulation = httpsCallable(functions, "startErpSimulation");
                
                alert("Iniciando simulación del ERP...");
                const result = await startErpSimulation({
                  trackingNumber: "SIMULATION-TEST",
                  expectedStatus: "AT_PORT",
                  delaySeconds: 15
                });
                console.log("ERP Simulation Result:", result.data);
                alert("Simulación encolada con éxito. Revisa los logs en 15 segundos.");
              } catch (e) {
                console.error(e);
                alert("Error al iniciar simulación");
              }
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Simular ERP
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
            Nuevo Embarque
          </button>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Seguimiento (AWB/BL)
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Estado
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Ruta
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                ETS
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                ETA
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {embarques.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  No hay embarques registrados o sincronizados.
                </td>
              </tr>
            ) : (
              embarques.map((embarque) => (
                <tr
                  key={embarque.numero_seguimiento}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                    {embarque.numero_seguimiento}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {embarque.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {embarque.puerto_origen} &rarr; {embarque.puerto_destino}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {embarque.ets
                      ? new Date(embarque.ets).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {embarque.eta
                      ? new Date(embarque.eta).toLocaleDateString()
                      : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
