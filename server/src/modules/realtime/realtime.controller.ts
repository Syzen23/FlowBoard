import type { Request, Response } from "express";
import { isHttpError, sendError } from "../../lib/httpError.js";
import type { AuthenticatedRequest } from "../auth/auth.middleware.js";
import { joinOwnerRealtimeCanvas, joinSharedRealtimeCanvas } from "./realtime.service.js";

export async function joinOwnerRealtimeCanvasController(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    res.status(200).json(await joinOwnerRealtimeCanvas(getAuthenticatedUid(req), getRouteParam(req, "canvasId")));
  } catch (error) {
    handleControllerError(res, error);
  }
}

export async function joinSharedRealtimeCanvasController(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    res.status(200).json(await joinSharedRealtimeCanvas(getAuthenticatedUid(req), getRouteParam(req, "token")));
  } catch (error) {
    handleControllerError(res, error);
  }
}

function handleControllerError(res: Response, error: unknown): void {
  if (isHttpError(error)) {
    sendError(res, error);
    return;
  }

  throw error;
}

function getRouteParam(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] || "" : value;
}

function getAuthenticatedUid(req: AuthenticatedRequest): string {
  const uid = req.firebaseUser?.uid;
  if (!uid) {
    throw new Error("Authenticated route missing Firebase user");
  }

  return uid;
}
