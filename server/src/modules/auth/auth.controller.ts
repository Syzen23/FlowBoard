import type { Response } from "express";
import type { AuthenticatedRequest } from "./auth.middleware.js";

export function getCurrentUserController(req: AuthenticatedRequest, res: Response): void {
  const firebaseUser = req.firebaseUser;

  if (!firebaseUser) {
    res.status(401).json({
      error: {
        message: "Authentication required",
      },
    });
    return;
  }

  res.status(200).json({
    uid: firebaseUser.uid,
    email: firebaseUser.email || null,
  });
}
