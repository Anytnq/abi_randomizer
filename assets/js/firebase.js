import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCd58O30YEfa5cKgy0mksGUL2hhg-2j8P0",
  authDomain: "abirandomizer.firebaseapp.com",
  databaseURL:
    "https://abirandomizer-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "abirandomizer",
  storageBucket: "abirandomizer.firebasestorage.app",
  messagingSenderId: "648492177349",
  appId: "1:648492177349:web:7ca23ea86bf458e3a11dac",
  measurementId: "G-9WM325HBJC",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
