import cors from "cors";
import dotenv from "dotenv";
import express, { type ErrorRequestHandler } from "express";
import { apiRouter } from "./routes/index.js";

dotenv.config();

const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(
    cors({
      origin: clientOrigin,
    })
  );

  app.use("/api", apiRouter);
  app.use(jsonParseErrorHandler);

  return app;
}

const jsonParseErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({
      error: {
        message: "Invalid JSON body",
      },
    });
    return;
  }

  next(error);
};
