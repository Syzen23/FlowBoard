import fs from "node:fs";
import { applicationDefault, cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase, type Database } from "firebase-admin/database";

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
  return getAuth(getFirebaseAdminApp());
}

export function getFirebaseAdminDatabase(): Database {
  if (!process.env.FIREBASE_DATABASE_URL) {
    throw new Error("FIREBASE_DATABASE_URL is not configured");
  }

  return getDatabase(getFirebaseAdminApp());
}

function getFirebaseAdminApp(): App {
  const existingApp = getApps()[0];
  if (existingApp) {
    return existingApp;
  }

  return initializeApp({
    credential: getFirebaseCredential(),
    projectId: process.env.FIREBASE_PROJECT_ID,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}
