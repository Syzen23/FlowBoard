import { Router } from "express";
import { getCurrentUserController } from "./auth.controller.js";
import { requireFirebaseAuth } from "./auth.middleware.js";

export const authRouter = Router();

authRouter.get("/me", requireFirebaseAuth, getCurrentUserController);
