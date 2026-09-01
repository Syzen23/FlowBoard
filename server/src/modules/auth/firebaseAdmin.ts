import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getFirebaseCredential() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    return cert(JSON.parse(serviceAccountJson));
  }

  return applicationDefault();
}

export function getFirebaseAdminAuth() {
  if (!getApps().length) {
    initializeApp({
      credential: getFirebaseCredential(),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }

  return getAuth();
}
