import type { Response } from "express";

export type HttpErrorStatus = 400 | 403 | 404 | 409;

export type HttpError = {
  status: HttpErrorStatus;
  message: string;
};

export function badRequest(message: string): HttpError {
  return { status: 400, message };
}

export function forbidden(message: string): HttpError {
  return { status: 403, message };
}

export function notFound(message: string): HttpError {
  return { status: 404, message };
}

export function conflict(message: string): HttpError {
  return { status: 409, message };
}

export function sendError(res: Response, error: HttpError): void {
  res.status(error.status).json({
    error: {
      message: error.message,
    },
  });
}

export function isHttpError(error: unknown): error is HttpError {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    "message" in error &&
    (error.status === 400 || error.status === 403 || error.status === 404 || error.status === 409) &&
    typeof error.message === "string"
  );
}
