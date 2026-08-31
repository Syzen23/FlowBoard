import type { Request, Response } from "express";
import { isHttpError, sendError } from "../../lib/httpError.js";
import {
  createTask,
  deleteTask,
  getTaskById,
  listTasks,
  updateTask,
} from "./task.service.js";

export function getTasksController(_req: Request, res: Response): void {
  res.status(200).json(listTasks());
}

export function getTaskController(req: Request, res: Response): void {
  try {
    res.status(200).json(getTaskById(getRouteParam(req, "id")));
  } catch (error) {
    handleControllerError(res, error);
  }
}

export function createTaskController(req: Request, res: Response): void {
  try {
    res.status(201).json(createTask(req.body));
  } catch (error) {
    handleControllerError(res, error);
  }
}

export function updateTaskController(req: Request, res: Response): void {
  try {
    res.status(200).json(updateTask(getRouteParam(req, "id"), req.body));
  } catch (error) {
    handleControllerError(res, error);
  }
}

export function deleteTaskController(req: Request, res: Response): void {
  try {
    deleteTask(getRouteParam(req, "id"));
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
