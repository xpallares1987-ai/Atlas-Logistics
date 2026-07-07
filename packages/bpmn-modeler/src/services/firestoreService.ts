import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

export interface DiagramVersion {
  id?: string;
  diagram_id: string;
  author_id: string;
  xml: string;
  label: string;
  created_at?: any;
}

const COLLECTION_NAME = 'diagram_versions';

export async function saveDiagramVersion(
  diagramId: string,
  xml: string,
  label: string,
  authorId: string = 'Logistics Manager'
) {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    diagram_id: diagramId,
    author_id: authorId,
    xml,
    label,
    created_at: serverTimestamp(),
  });
  return docRef.id;
}

export async function getDiagramVersions(diagramId: string): Promise<DiagramVersion[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('diagram_id', '==', diagramId),
    orderBy('created_at', 'desc')
  );

  const querySnapshot = await getDocs(q);
  const versions: DiagramVersion[] = [];
  querySnapshot.forEach((doc) => {
    versions.push({ id: doc.id, ...doc.data() } as DiagramVersion);
  });

  return versions;
}
