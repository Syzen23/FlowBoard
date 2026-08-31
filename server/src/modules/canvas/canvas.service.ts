import { randomUUID } from "node:crypto";
import { badRequest, notFound } from "../../lib/httpError.js";
import { canvasRepository } from "./canvas.repository.js";
import type {
  Canvas,
  CanvasSceneData,
  CreateCanvasInput,
  UpdateCanvasInput,
} from "./canvas.types.js";

const emptySceneData: CanvasSceneData = {
  elements: [],
  appState: {},
  files: {},
};

export function listCanvases(): Canvas[] {
  return canvasRepository.findAll();
}

export function getCanvasById(id: string): Canvas {
  const canvas = canvasRepository.findById(id);
  if (!canvas) {
    throw notFound("Canvas not found");
  }

  return canvas;
}

export function createCanvas(input: CreateCanvasInput): Canvas {
  const title = parseRequiredTitle(input.title, "Canvas title is required");
  const sceneData = input.sceneData === undefined ? emptySceneData : parseSceneData(input.sceneData);
  const now = new Date().toISOString();

  return canvasRepository.create({
    id: randomUUID(),
    title,
    sceneData,
    createdAt: now,
    updatedAt: now,
  });
}

export function updateCanvas(id: string, input: UpdateCanvasInput): Canvas {
  const updates: Partial<Pick<Canvas, "title" | "sceneData">> = {};

  if (input.title !== undefined) {
    updates.title = parseRequiredTitle(input.title, "Canvas title cannot be empty");
  }

  if (input.sceneData !== undefined) {
    updates.sceneData = parseSceneData(input.sceneData);
  }

  const canvas = canvasRepository.update(id, updates);
  if (!canvas) {
    throw notFound("Canvas not found");
  }

  return canvas;
}

export function deleteCanvas(id: string): void {
  const deleted = canvasRepository.remove(id);
  if (!deleted) {
    throw notFound("Canvas not found");
  }
}

function parseRequiredTitle(value: unknown, message: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw badRequest(message);
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
    elements: elements || [],
    appState: appState || {},
    files: files || {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
