import { Router } from "express";
import {
  createCanvasController,
  deleteCanvasController,
  getCanvasController,
  getCanvasesController,
  updateCanvasController,
} from "./canvas.controller.js";

export const canvasRouter = Router();

canvasRouter.get("/", getCanvasesController);
canvasRouter.get("/:id", getCanvasController);
canvasRouter.post("/", createCanvasController);
canvasRouter.patch("/:id", updateCanvasController);
canvasRouter.delete("/:id", deleteCanvasController);
