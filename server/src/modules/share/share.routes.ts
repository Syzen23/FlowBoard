import { Router } from "express";
import { requireFirebaseAuth } from "../auth/auth.middleware.js";
import {
  getCanvasShareController,
  getPublicShareController,
  revokeCanvasShareController,
  updatePublicSharedCanvasController,
  upsertCanvasShareController,
} from "./share.controller.js";

export const ownerShareRouter = Router();
export const publicShareRouter = Router();

ownerShareRouter.use(requireFirebaseAuth);
ownerShareRouter.get("/:canvasId/share", getCanvasShareController);
ownerShareRouter.put("/:canvasId/share", upsertCanvasShareController);
ownerShareRouter.delete("/:canvasId/share", revokeCanvasShareController);

publicShareRouter.use(requireFirebaseAuth);
publicShareRouter.get("/:token", getPublicShareController);
publicShareRouter.patch("/:token/canvas", updatePublicSharedCanvasController);
