import { Router } from "express";
import { requireFirebaseAuth } from "../auth/auth.middleware.js";
import {
  createTaskController,
  deleteTaskController,
  getTaskController,
  getTasksController,
  updateTaskController,
} from "./task.controller.js";

export const taskRouter = Router();

taskRouter.use(requireFirebaseAuth);

taskRouter.get("/", getTasksController);
taskRouter.get("/:id", getTaskController);
taskRouter.post("/", createTaskController);
taskRouter.patch("/:id", updateTaskController);
taskRouter.delete("/:id", deleteTaskController);
