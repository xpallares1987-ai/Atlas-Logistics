import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBSyDFKEACruhF9XndvLfuglhDif4ILJ3k',
  authDomain: 'gen-lang-client-0393063451.firebaseapp.com',
  projectId: 'gen-lang-client-0393063451',
  storageBucket: 'gen-lang-client-0393063451.firebasestorage.app',
  messagingSenderId: '100198375762',
  appId: '1:100198375762:web:19b20e55484545bde29a8b',
  measurementId: 'G-DC6HRLZVMT',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, 'database01');
