import { Router } from "express";
import {
  createTaskController,
  deleteTaskController,
  getTaskController,
  getTasksController,
  updateTaskController,
} from "./task.controller.js";

export const taskRouter = Router();

taskRouter.get("/", getTasksController);
taskRouter.get("/:id", getTaskController);
taskRouter.post("/", createTaskController);
taskRouter.patch("/:id", updateTaskController);
taskRouter.delete("/:id", deleteTaskController);
