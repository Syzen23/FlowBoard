import type { Request, Response } from "express";
import { isHttpError, sendError } from "../../lib/httpError.js";
import {
  createTask,
  deleteTask,
  getTaskById,
  listTasks,
  updateTask,
} from "./task.service.js";

export async function getTasksController(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await listTasks());
}

export async function getTaskController(req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json(await getTaskById(getRouteParam(req, "id")));
  } catch (error) {
    handleControllerError(res, error);
  }
}

export async function createTaskController(req: Request, res: Response): Promise<void> {
  try {
    res.status(201).json(await createTask(req.body));
  } catch (error) {
    handleControllerError(res, error);
  }
}

export async function updateTaskController(req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json(await updateTask(getRouteParam(req, "id"), req.body));
  } catch (error) {
    handleControllerError(res, error);
  }
}

export async function deleteTaskController(req: Request, res: Response): Promise<void> {
  try {
    await deleteTask(getRouteParam(req, "id"));
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
