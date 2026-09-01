import { db } from "../../database/db.js";
import type { Task, TaskStatus } from "./task.types.js";

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  due_date: Date | string;
  due_time: string | null;
  status: TaskStatus;
  canvas_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type TaskUpdateData = Partial<Omit<Task, "id" | "createdAt" | "description" | "dueTime">> & {
  description?: string | null;
  dueTime?: string | null;
};

export const taskRepository = {
  async findAll(ownerId: string): Promise<Task[]> {
    const result = await db.query<TaskRow>(
      `SELECT id, title, description, due_date, due_time, status, canvas_id, created_at, updated_at
       FROM tasks
       WHERE owner_id = $1
       ORDER BY created_at ASC`
      ,
      [ownerId]
    );

    return result.rows.map(mapTaskRow);
  },

  async findById(ownerId: string, id: string): Promise<Task | null> {
    const result = await db.query<TaskRow>(
      `SELECT id, title, description, due_date, due_time, status, canvas_id, created_at, updated_at
       FROM tasks
       WHERE id = $1
         AND owner_id = $2`,
      [id, ownerId]
    );

    return result.rows[0] ? mapTaskRow(result.rows[0]) : null;
  },

  async create(ownerId: string, task: Task): Promise<Task> {
    const result = await db.query<TaskRow>(
      `INSERT INTO tasks (
         id, owner_id, title, description, due_date, due_time, status, canvas_id, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, title, description, due_date, due_time, status, canvas_id, created_at, updated_at`,
      [
        task.id,
        ownerId,
        task.title,
        task.description ?? null,
        task.dueDate,
        task.dueTime ?? null,
        task.status,
        task.canvasId,
        task.createdAt,
        task.updatedAt,
      ]
    );

    return mapTaskRow(result.rows[0]);
  },

  async update(ownerId: string, id: string, updates: TaskUpdateData): Promise<Task | null> {
    const setClauses = ["updated_at = NOW()"];
    const values: unknown[] = [];

    if (updates.title !== undefined) {
      values.push(updates.title);
      setClauses.push(`title = $${values.length}`);
    }

    if (updates.description !== undefined) {
      values.push(updates.description);
      setClauses.push(`description = $${values.length}`);
    }

    if (updates.dueDate !== undefined) {
      values.push(updates.dueDate);
      setClauses.push(`due_date = $${values.length}`);
    }

    if (updates.dueTime !== undefined) {
      values.push(updates.dueTime);
      setClauses.push(`due_time = $${values.length}`);
    }

    if (updates.status !== undefined) {
      values.push(updates.status);
      setClauses.push(`status = $${values.length}`);
    }

    if (updates.canvasId !== undefined) {
      values.push(updates.canvasId);
      setClauses.push(`canvas_id = $${values.length}`);
    }

    values.push(id);
    const idParam = values.length;
    values.push(ownerId);
    const ownerIdParam = values.length;

    const result = await db.query<TaskRow>(
      `UPDATE tasks
       SET ${setClauses.join(", ")}
       WHERE id = $${idParam}
         AND owner_id = $${ownerIdParam}
       RETURNING id, title, description, due_date, due_time, status, canvas_id, created_at, updated_at`,
      values
    );

    return result.rows[0] ? mapTaskRow(result.rows[0]) : null;
  },

  async remove(ownerId: string, id: string): Promise<boolean> {
    const result = await db.query(
      `DELETE FROM tasks
       WHERE id = $1
         AND owner_id = $2`,
      [id, ownerId]
    );
    return (result.rowCount ?? 0) > 0;
  },
};

function mapTaskRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    dueDate: toDateString(row.due_date),
    dueTime: row.due_time ? row.due_time.slice(0, 5) : undefined,
    status: row.status,
    canvasId: row.canvas_id,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toDateString(value: Date | string): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
}
