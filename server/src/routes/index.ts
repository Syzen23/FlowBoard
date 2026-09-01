import { Router } from "express";
import { db } from "../database/db.js";
import { authRouter } from "../modules/auth/auth.routes.js";
import { canvasRouter } from "../modules/canvas/canvas.routes.js";
import { taskRouter } from "../modules/task/task.routes.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "flowboard-api",
  });
});

apiRouter.get("/health/db", async (_req, res, next) => {
  try {
    await db.query("SELECT 1");
    res.status(200).json({
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/canvases", canvasRouter);
apiRouter.use("/tasks", taskRouter);
