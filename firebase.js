import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
  getDatabase,
  ref,
  get,
  set,
  push,
  remove,
  update,
  query,
  orderByChild,
  equalTo
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";


const firebaseConfig = {
  apiKey: "AIzaSyADU4w1n5c2oUY98ShV0UBmhujc6MXqNeY",
  authDomain: "royal-stepz-zone.firebaseapp.com",
  databaseURL: "https://royal-stepz-zone-default-rtdb.firebaseio.com",
  projectId: "royal-stepz-zone",
  storageBucket: "royal-stepz-zone.firebasestorage.app",
  messagingSenderId: "140681015888",
  appId: "1:140681015888:web:43afb696aef0464ffe1755",
  measurementId: "G-SN94WLC0DM"
};


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);


// ADMIN UID
const ADMIN_UID = "f9M5hJy143YBbZ7cnVYnX0kC6Do1";


// WhatsApp number
// পরে এখানে আপনার আসল Qatar WhatsApp number বসাবেন
const WHATSAPP_NUMBER = "97430408610";


export {
  app,
  auth,
  db,
  storage,
  ADMIN_UID,
  WHATSAPP_NUMBER,

  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,

  ref,
  get,
  set,
  push,
  remove,
  update,

  query,
  orderByChild,
  equalTo,

  storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
};