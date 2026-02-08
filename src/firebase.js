import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCUH5wnxhj5iXioRZPkpxiI6pH-HMcg2Z0",
    authDomain: "investment-watchlist-fe3f1.firebaseapp.com",
    projectId: "investment-watchlist-fe3f1",
    storageBucket: "investment-watchlist-fe3f1.firebasestorage.app",
    messagingSenderId: "471653928487",
    appId: "1:471653928487:web:193b921e0e6eb60e498802",
    measurementId: "G-DY2QBH59N2",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);