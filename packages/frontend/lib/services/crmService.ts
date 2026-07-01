import { collection, doc, getDocs, setDoc, deleteDoc, query, where, updateDoc, Firestore } from 'firebase/firestore';
import { CompanyAddress, AddressType } from '../addressStore';

const COLLECTION_NAME = 'contacts';

export const getContacts = async (db: Firestore): Promise<CompanyAddress[]> => {
  if (!db) throw new Error("Firestore instance required");
  const q = query(collection(db, COLLECTION_NAME));
  const querySnapshot = await getDocs(q);
  const contacts: CompanyAddress[] = [];
  querySnapshot.forEach((doc) => {
    contacts.push({ id: doc.id, ...doc.data() } as CompanyAddress);
  });
  return contacts;
};

export const addContact = async (db: Firestore, contact: Omit<CompanyAddress, 'id'>): Promise<CompanyAddress> => {
  if (!db) throw new Error("Firestore instance required");
  const docRef = doc(collection(db, COLLECTION_NAME));
  const newContact = { id: docRef.id, ...contact } as CompanyAddress;
  await setDoc(docRef, newContact);
  return newContact;
};

export const updateContact = async (db: Firestore, id: string, contact: Partial<CompanyAddress>): Promise<void> => {
  if (!db) throw new Error("Firestore instance required");
  const docRef = doc(db, COLLECTION_NAME, id);
  const { id: _id, ...updateData } = contact as any;
  await updateDoc(docRef, updateData);
};

export const deleteContact = async (db: Firestore, id: string): Promise<void> => {
  if (!db) throw new Error("Firestore instance required");
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
};

export const getContactsByType = async (db: Firestore, type: AddressType): Promise<CompanyAddress[]> => {
  if (!db) throw new Error("Firestore instance required");
  const q = query(collection(db, COLLECTION_NAME), where("type", "==", type));
  const querySnapshot = await getDocs(q);
  const contacts: CompanyAddress[] = [];
  querySnapshot.forEach((doc) => {
    contacts.push({ id: doc.id, ...doc.data() } as CompanyAddress);
  });
  return contacts;
};
