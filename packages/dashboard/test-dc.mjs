import { initializeApp } from 'firebase/app';
import { getDataConnect, executeQuery } from 'firebase/data-connect';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? process.env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: "gen-lang-client-0393063451.firebaseapp.com",
  projectId: "gen-lang-client-0393063451",
  storageBucket: "gen-lang-client-0393063451.firebasestorage.app",
  messagingSenderId: "100198375762",
  appId: "1:100198375762:web:19b20e55484545bde29a8b"
};

const app = initializeApp(firebaseConfig);
const dc = getDataConnect(app, { location: 'us-central1', connector: 'default', service: 'default' });

const LIST_SHIPMENTS_QUERY = `
  query ListShipments {
    shipments {
      id
      trackingNumber
      origin
      destination
      status
    }
  }
`;

async function testDataConnect() {
  console.log("Conectando a Firebase Data Connect (Cloud SQL)...");
  try {
    const response = await executeQuery(dc, LIST_SHIPMENTS_QUERY);
    console.log("¡Éxito! Datos obtenidos de la base de datos:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (e) {
    console.error("Error al obtener los datos:", e);
  }
}

testDataConnect();
