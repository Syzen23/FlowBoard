import { Router } from "express";
import { db } from "../database/db.js";
import { getFirebaseAdminDatabase } from "../modules/auth/firebaseAdmin.js";
import { authRouter } from "../modules/auth/auth.routes.js";
import { canvasRouter } from "../modules/canvas/canvas.routes.js";
import { realtimeRouter } from "../modules/realtime/realtime.routes.js";
import { ownerShareRouter, publicShareRouter } from "../modules/share/share.routes.js";
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

apiRouter.get("/health/realtime", async (_req, res) => {
  try {
    await getFirebaseAdminDatabase().ref("realtime").limitToFirst(1).get();
    res.status(200).json({
      status: "ok",
      service: "firebase-realtime-database",
    });
  } catch {
    res.status(503).json({
      error: {
        message: "Firebase Realtime Database is not reachable",
      },
    });
  }
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/canvases", ownerShareRouter);
apiRouter.use("/canvases", canvasRouter);
apiRouter.use("/realtime", realtimeRouter);
apiRouter.use("/shares", publicShareRouter);
apiRouter.use("/tasks", taskRouter);
