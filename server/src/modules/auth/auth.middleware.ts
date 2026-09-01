import type { NextFunction, Request, Response } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getFirebaseAdminAuth } from "./firebaseAdmin.js";

export type AuthenticatedRequest = Request & {
  firebaseUser?: DecodedIdToken;
};

export async function requireFirebaseAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.header("Authorization");
  const token = parseBearerToken(authHeader);

  if (!token) {
    res.status(401).json({
      error: {
        message: "Authentication required",
      },
    });
    return;
  }

  try {
    req.firebaseUser = await getFirebaseAdminAuth().verifyIdToken(token);
    next();
  } catch {
    res.status(401).json({
      error: {
        message: "Invalid authentication token",
      },
    });
  }
}

function parseBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}
