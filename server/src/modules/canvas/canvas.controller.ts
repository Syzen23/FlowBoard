import type { Request, Response } from "express";
import { isHttpError, sendError } from "../../lib/httpError.js";
import {
  createCanvas,
  deleteCanvas,
  getCanvasById,
  listCanvases,
  updateCanvas,
} from "./canvas.service.js";

export function getCanvasesController(_req: Request, res: Response): void {
  res.status(200).json(listCanvases());
}

export function getCanvasController(req: Request, res: Response): void {
  try {
    res.status(200).json(getCanvasById(getRouteParam(req, "id")));
  } catch (error) {
    handleControllerError(res, error);
  }
}

export function createCanvasController(req: Request, res: Response): void {
  try {
    res.status(201).json(createCanvas(req.body));
  } catch (error) {
    handleControllerError(res, error);
  }
}

export function updateCanvasController(req: Request, res: Response): void {
  try {
    res.status(200).json(updateCanvas(getRouteParam(req, "id"), req.body));
  } catch (error) {
    handleControllerError(res, error);
  }
}

export function deleteCanvasController(req: Request, res: Response): void {
  try {
    deleteCanvas(getRouteParam(req, "id"));
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
