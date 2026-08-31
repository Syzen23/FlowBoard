import { Router } from "express";
import { canvasRouter } from "../modules/canvas/canvas.routes.js";
import { taskRouter } from "../modules/task/task.routes.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "flowboard-api",
  });
});

apiRouter.use("/canvases", canvasRouter);
apiRouter.use("/tasks", taskRouter);
