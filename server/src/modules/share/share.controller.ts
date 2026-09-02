import type { Request, Response } from "express";
import { isHttpError, sendError } from "../../lib/httpError.js";
import type { AuthenticatedRequest } from "../auth/auth.middleware.js";
import {
  getCanvasShare,
  getSharedCanvasByToken,
  revokeCanvasShare,
  updateSharedCanvasByToken,
  upsertCanvasShare,
} from "./share.service.js";

export async function getCanvasShareController(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    res.status(200).json(await getCanvasShare(getAuthenticatedUid(req), getRouteParam(req, "canvasId")));
  } catch (error) {
    handleControllerError(res, error);
  }
}

export async function upsertCanvasShareController(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    res.status(200).json(await upsertCanvasShare(getAuthenticatedUid(req), getRouteParam(req, "canvasId"), req.body));
  } catch (error) {
    handleControllerError(res, error);
  }
}

export async function revokeCanvasShareController(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    await revokeCanvasShare(getAuthenticatedUid(req), getRouteParam(req, "canvasId"));
    res.status(204).send();
  } catch (error) {
    handleControllerError(res, error);
  }
}

export async function getPublicShareController(req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json(await getSharedCanvasByToken(getRouteParam(req, "token")));
  } catch (error) {
    handleControllerError(res, error);
  }
}

export async function updatePublicSharedCanvasController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    res.status(200).json(await updateSharedCanvasByToken(getRouteParam(req, "token"), req.body));
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
