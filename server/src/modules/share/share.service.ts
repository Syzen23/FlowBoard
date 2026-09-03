import { randomBytes, randomUUID } from "node:crypto";
import { badRequest, forbidden, notFound } from "../../lib/httpError.js";
import { canvasRepository } from "../canvas/canvas.repository.js";
import type { CanvasSceneData } from "../canvas/canvas.types.js";
import { realtimeRepository } from "../realtime/realtime.repository.js";
import { shareRepository } from "./share.repository.js";
import type {
  CanvasShare,
  SharedCanvasPayload,
  SharePermission,
  UpdateShareInput,
  UpdateSharedCanvasInput,
} from "./share.types.js";

export async function getCanvasShare(ownerId: string, canvasId: string): Promise<CanvasShare> {
  await assertOwnedCanvasExists(ownerId, canvasId);

  const share = await shareRepository.findByCanvasForOwner(ownerId, canvasId);
  if (!share) {
    throw notFound("Canvas share not found");
  }

  return share;
}

export async function upsertCanvasShare(
  ownerId: string,
  canvasId: string,
  input: UpdateShareInput
): Promise<CanvasShare> {
  await assertOwnedCanvasExists(ownerId, canvasId);

  const permission = parseSharePermission(input.permission);
  const existingShare = await shareRepository.findByCanvasForOwner(ownerId, canvasId);

  if (existingShare) {
    const updatedShare = await shareRepository.updatePermission(existingShare.id, permission);
    await realtimeRepository.updateShareAccessPermission(updatedShare.canvasId, updatedShare.id, updatedShare.permission);
    return updatedShare;
  }

  return shareRepository.create(randomUUID(), canvasId, createShareToken(), permission);
}

export async function revokeCanvasShare(ownerId: string, canvasId: string): Promise<void> {
  await assertOwnedCanvasExists(ownerId, canvasId);
  const existingShare = await shareRepository.findByCanvasForOwner(ownerId, canvasId);
  await shareRepository.removeByCanvasForOwner(ownerId, canvasId);

  if (existingShare) {
    await realtimeRepository.removeShareAccess(existingShare.canvasId, existingShare.id);
  }
}

export async function getSharedCanvasByToken(token: string): Promise<SharedCanvasPayload> {
  const sharedCanvas = await shareRepository.findSharedCanvasByToken(parseShareToken(token));
  if (!sharedCanvas) {
    throw notFound("Share not found");
  }

  return sharedCanvas;
}

export async function updateSharedCanvasByToken(
  token: string,
  input: UpdateSharedCanvasInput
): Promise<SharedCanvasPayload> {
  const parsedToken = parseShareToken(token);
  const sharedCanvas = await shareRepository.findSharedCanvasByToken(parsedToken);

  if (!sharedCanvas) {
    throw notFound("Share not found");
  }

  if (sharedCanvas.permission !== "edit") {
    throw forbidden("Share does not allow editing");
  }

  const sceneData = parseSceneData(input.sceneData);
  const updatedCanvas = await shareRepository.updateSharedCanvasScene(parsedToken, sceneData);

  if (!updatedCanvas) {
    throw notFound("Share not found");
  }

  return updatedCanvas;
}

async function assertOwnedCanvasExists(ownerId: string, canvasId: string): Promise<void> {
  if (!isUuid(canvasId)) {
    throw notFound("Canvas not found");
  }

  const canvas = await canvasRepository.findById(ownerId, canvasId);
  if (!canvas) {
    throw notFound("Canvas not found");
  }
}

function createShareToken(): string {
  return randomBytes(32).toString("base64url");
}

function parseSharePermission(value: unknown): SharePermission {
  if (value === "view" || value === "edit") {
    return value;
  }

  throw badRequest("Share permission must be view or edit");
}

function parseShareToken(value: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw notFound("Share not found");
  }

  return value.trim();
}

function parseSceneData(value: unknown): CanvasSceneData {
  if (!isRecord(value)) {
    throw badRequest("Canvas sceneData must be an object");
  }

  const elements = value.elements;
  const appState = value.appState;
  const files = value.files;

  if (elements !== undefined && !Array.isArray(elements)) {
    throw badRequest("Canvas sceneData.elements must be an array");
  }

  if (appState !== undefined && !isRecord(appState)) {
    throw badRequest("Canvas sceneData.appState must be an object");
  }

  if (files !== undefined && !isRecord(files)) {
    throw badRequest("Canvas sceneData.files must be an object");
  }

  return {
    elements: Array.isArray(elements) ? elements : [],
    appState: isRecord(appState) ? appState : {},
    files: isRecord(files) ? files : {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
