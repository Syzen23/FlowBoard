import { Router } from "express";
import { requireFirebaseAuth } from "../auth/auth.middleware.js";
import {
  createCanvasController,
  deleteCanvasController,
  getCanvasController,
  getCanvasesController,
  updateCanvasController,
} from "./canvas.controller.js";

export const canvasRouter = Router();

canvasRouter.use(requireFirebaseAuth);

canvasRouter.get("/", getCanvasesController);
canvasRouter.get("/:id", getCanvasController);
canvasRouter.post("/", createCanvasController);
canvasRouter.patch("/:id", updateCanvasController);
canvasRouter.delete("/:id", deleteCanvasController);
