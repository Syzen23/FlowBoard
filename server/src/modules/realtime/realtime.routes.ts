import { Router } from "express";
import { requireFirebaseAuth } from "../auth/auth.middleware.js";
import {
  joinOwnerRealtimeCanvasController,
  joinSharedRealtimeCanvasController,
} from "./realtime.controller.js";

export const realtimeRouter = Router();

realtimeRouter.use(requireFirebaseAuth);

realtimeRouter.post("/canvases/:canvasId/join", joinOwnerRealtimeCanvasController);
realtimeRouter.post("/shares/:token/join", joinSharedRealtimeCanvasController);
