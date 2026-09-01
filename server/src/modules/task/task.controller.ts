import type { Request, Response } from "express";
import { isHttpError, sendError } from "../../lib/httpError.js";
import type { AuthenticatedRequest } from "../auth/auth.middleware.js";
import {
  createTask,
  deleteTask,
  getTaskById,
  listTasks,
  updateTask,
} from "./task.service.js";

export async function getTasksController(req: AuthenticatedRequest, res: Response): Promise<void> {
  res.status(200).json(await listTasks(getAuthenticatedUid(req)));
}

export async function getTaskController(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    res.status(200).json(await getTaskById(getAuthenticatedUid(req), getRouteParam(req, "id")));
  } catch (error) {
    handleControllerError(res, error);
  }
}

export async function createTaskController(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    res.status(201).json(await createTask(getAuthenticatedUid(req), req.body));
  } catch (error) {
    handleControllerError(res, error);
  }
}

export async function updateTaskController(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    res.status(200).json(await updateTask(getAuthenticatedUid(req), getRouteParam(req, "id"), req.body));
  } catch (error) {
    handleControllerError(res, error);
  }
}

export async function deleteTaskController(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    await deleteTask(getAuthenticatedUid(req), getRouteParam(req, "id"));
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

function getAuthenticatedUid(req: AuthenticatedRequest): string {
  const uid = req.firebaseUser?.uid;
  if (!uid) {
    throw new Error("Authenticated route missing Firebase user");
  }

  return uid;
}
