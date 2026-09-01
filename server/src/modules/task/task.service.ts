import { randomUUID } from "node:crypto";
import { badRequest, notFound } from "../../lib/httpError.js";
import { taskRepository } from "./task.repository.js";
import type { CreateTaskInput, Task, TaskStatus, UpdateTaskInput } from "./task.types.js";

const validTaskStatuses = new Set<TaskStatus>(["todo", "in_progress", "done"]);

export function listTasks(): Promise<Task[]> {
  return taskRepository.findAll();
}

export async function getTaskById(id: string): Promise<Task> {
  if (!isUuid(id)) {
    throw notFound("Task not found");
  }

  const task = await taskRepository.findById(id);
  if (!task) {
    throw notFound("Task not found");
  }

  return task;
}

export function createTask(input: CreateTaskInput): Promise<Task> {
  const title = parseRequiredString(input.title, "Task title is required");
  const dueDate = parseRequiredString(input.dueDate, "Task dueDate is required");
  const status = input.status === undefined ? "todo" : parseTaskStatus(input.status);
  const now = new Date().toISOString();

  return taskRepository.create({
    id: randomUUID(),
    title,
    description: parseOptionalString(input.description),
    dueDate,
    dueTime: parseOptionalString(input.dueTime),
    status,
    canvasId: parseCanvasId(input.canvasId),
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  if (!isUuid(id)) {
    throw notFound("Task not found");
  }

  const updates: Partial<Pick<Task, "title" | "dueDate" | "status" | "canvasId">> & {
    description?: string | null;
    dueTime?: string | null;
  } = {};

  if (input.title !== undefined) {
    updates.title = parseRequiredString(input.title, "Task title cannot be empty");
  }

  if (input.description !== undefined) {
    updates.description = parseOptionalString(input.description) ?? null;
  }

  if (input.dueDate !== undefined) {
    updates.dueDate = parseRequiredString(input.dueDate, "Task dueDate cannot be empty");
  }

  if (input.dueTime !== undefined) {
    updates.dueTime = parseOptionalString(input.dueTime) ?? null;
  }

  if (input.status !== undefined) {
    updates.status = parseTaskStatus(input.status);
  }

  if (input.canvasId !== undefined) {
    updates.canvasId = parseCanvasId(input.canvasId);
  }

  const task = await taskRepository.update(id, updates);
  if (!task) {
    throw notFound("Task not found");
  }

  return task;
}

export async function deleteTask(id: string): Promise<void> {
  if (!isUuid(id)) {
    throw notFound("Task not found");
  }

  const deleted = await taskRepository.remove(id);
  if (!deleted) {
    throw notFound("Task not found");
  }
}

function parseRequiredString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw badRequest(message);
  }

  return value.trim();
}

function parseOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw badRequest("Expected text value");
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseTaskStatus(value: unknown): TaskStatus {
  if (typeof value !== "string" || !validTaskStatuses.has(value as TaskStatus)) {
    throw badRequest("Task status must be todo, in_progress, or done");
  }

  return value as TaskStatus;
}

function parseCanvasId(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw badRequest("Task canvasId must be a string or null");
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (!isUuid(trimmed)) {
    throw badRequest("Task canvasId must be a valid UUID or null");
  }

  return trimmed;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
