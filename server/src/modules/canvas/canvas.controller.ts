import type { Request, Response } from "express";
import { isHttpError, sendError } from "../../lib/httpError.js";
import {
  createCanvas,
  deleteCanvas,
  getCanvasById,
  listCanvases,
  updateCanvas,
} from "./canvas.service.js";

export async function getCanvasesController(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await listCanvases());
}

export async function getCanvasController(req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json(await getCanvasById(getRouteParam(req, "id")));
  } catch (error) {
    handleControllerError(res, error);
  }
}

export async function createCanvasController(req: Request, res: Response): Promise<void> {
  try {
    res.status(201).json(await createCanvas(req.body));
  } catch (error) {
    handleControllerError(res, error);
  }
}

export async function updateCanvasController(req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json(await updateCanvas(getRouteParam(req, "id"), req.body));
  } catch (error) {
    handleControllerError(res, error);
  }
}

export async function deleteCanvasController(req: Request, res: Response): Promise<void> {
  try {
    await deleteCanvas(getRouteParam(req, "id"));
    res.status(204).send();
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
