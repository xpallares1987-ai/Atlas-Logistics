import Dexie, { type EntityTable } from 'dexie';

export interface Embarque {
  id: number;
  numero_seguimiento: string;
  id_transportista: number;
  id_cliente: number | null;
  estado: string;
  tipo: string;
  modo: string;
  puerto_origen: string;
  puerto_destino: string;
  ets: string | null;
  eta: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export const db = new Dexie('AtlasSCM_OfflineDB') as Dexie & {
  embarques: EntityTable<Embarque, 'numero_seguimiento'>;
};

db.version(1).stores({
  embarques: 'numero_seguimiento, estado, puerto_origen, puerto_destino, eta, ets'
});