import fs from "node:fs";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getFirebaseCredential() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (serviceAccountJson) {
    return cert(JSON.parse(serviceAccountJson));
  }

  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

    if (serviceAccount.type === "service_account" && serviceAccount.private_key) {
      return cert(serviceAccount);
    }
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
