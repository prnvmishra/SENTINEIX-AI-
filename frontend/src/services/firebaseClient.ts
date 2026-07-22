import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { env, isFirebaseConfigured } from "@/services/env";

const firebaseApp = isFirebaseConfigured
  ? getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        apiKey: env.firebase.apiKey,
        authDomain: env.firebase.authDomain,
        databaseURL: env.firebase.databaseURL,
        projectId: env.firebase.projectId,
        storageBucket: env.firebase.storageBucket,
        messagingSenderId: env.firebase.messagingSenderId,
        appId: env.firebase.appId,
      })
  : null;

export const auth = firebaseApp ? getAuth(firebaseApp) : null;
export const database = firebaseApp ? getDatabase(firebaseApp) : null;
