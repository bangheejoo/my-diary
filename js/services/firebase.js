import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBV8L1IBl2C0756ow7LLywUnrRVbnPvH9c',
  authDomain: 'myself-da51a.firebaseapp.com',
  projectId: 'myself-da51a',
  storageBucket: 'myself-da51a.firebasestorage.app',
  messagingSenderId: '113820162484',
  appId: '1:113820162484:web:a0825b3b7eee6c7305bae1',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
