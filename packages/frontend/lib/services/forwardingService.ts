import { collection, doc, getDocs, setDoc, deleteDoc, query, where, updateDoc, Firestore } from 'firebase/firestore';

export type Stage = 'QUOTE' | 'BOOKING' | 'AT_ORIGIN' | 'IN_TRANSIT' | 'CUSTOMS' | 'DELIVERED';

export interface Shipment {
  id: string;
  ref: string;
  client: string;
  mode: 'FCL' | 'LCL' | 'AIR' | 'ROAD';
  stage: Stage;
  origin: string;
  dest: string;
  probability: number;
  expectedClose?: string;
  customerId?: string;
}

const COLLECTION_NAME = 'shipments';

export const getShipments = async (db: Firestore): Promise<Shipment[]> => {
  if (!db) throw new Error("Firestore instance required");
  const q = query(collection(db, COLLECTION_NAME));
  const querySnapshot = await getDocs(q);
  const shipments: Shipment[] = [];
  querySnapshot.forEach((doc) => {
    shipments.push({ id: doc.id, ...doc.data() } as Shipment);
  });
  return shipments;
};

export const addShipment = async (db: Firestore, shipment: Omit<Shipment, 'id'>): Promise<Shipment> => {
  if (!db) throw new Error("Firestore instance required");
  const docRef = doc(collection(db, COLLECTION_NAME));
  const newShipment = { id: docRef.id, ...shipment } as Shipment;
  await setDoc(docRef, newShipment);
  return newShipment;
};

export const updateShipment = async (db: Firestore, id: string, shipment: Partial<Shipment>): Promise<void> => {
  if (!db) throw new Error("Firestore instance required");
  const docRef = doc(db, COLLECTION_NAME, id);
  const { id: _id, ...updateData } = shipment as any;
  await updateDoc(docRef, updateData);
};

export const deleteShipment = async (db: Firestore, id: string): Promise<void> => {
  if (!db) throw new Error("Firestore instance required");
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
};

export const getShipmentsByCustomer = async (db: Firestore, customerId: string): Promise<Shipment[]> => {
  if (!db) throw new Error("Firestore instance required");
  const q = query(collection(db, COLLECTION_NAME), where("customerId", "==", customerId));
  const querySnapshot = await getDocs(q);
  const shipments: Shipment[] = [];
  querySnapshot.forEach((doc) => {
    shipments.push({ id: doc.id, ...doc.data() } as Shipment);
  });
  return shipments;
};
