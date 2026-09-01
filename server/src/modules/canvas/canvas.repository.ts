import { db } from "../../database/db.js";
import type { Canvas, CanvasSceneData } from "./canvas.types.js";

type CanvasRow = {
  id: string;
  title: string;
  scene_data: CanvasSceneData;
  created_at: Date | string;
  updated_at: Date | string;
};

export const canvasRepository = {
  async findAll(): Promise<Canvas[]> {
    const result = await db.query<CanvasRow>(
      `SELECT id, title, scene_data, created_at, updated_at
       FROM canvases
       ORDER BY created_at ASC`
    );

    return result.rows.map(mapCanvasRow);
  },

  async findById(id: string): Promise<Canvas | null> {
    const result = await db.query<CanvasRow>(
      `SELECT id, title, scene_data, created_at, updated_at
       FROM canvases
       WHERE id = $1`,
      [id]
    );

    return result.rows[0] ? mapCanvasRow(result.rows[0]) : null;
  },

  async create(canvas: Canvas): Promise<Canvas> {
    const result = await db.query<CanvasRow>(
      `INSERT INTO canvases (id, title, scene_data, created_at, updated_at)
       VALUES ($1, $2, $3::jsonb, $4, $5)
       RETURNING id, title, scene_data, created_at, updated_at`,
      [
        canvas.id,
        canvas.title,
        JSON.stringify(canvas.sceneData),
        canvas.createdAt,
        canvas.updatedAt,
      ]
    );

    return mapCanvasRow(result.rows[0]);
  },

  async update(id: string, updates: Partial<Omit<Canvas, "id" | "createdAt">>): Promise<Canvas | null> {
    const setClauses = ["updated_at = NOW()"];
    const values: unknown[] = [];

    if (updates.title !== undefined) {
      values.push(updates.title);
      setClauses.push(`title = $${values.length}`);
    }

    if (updates.sceneData !== undefined) {
      values.push(JSON.stringify(updates.sceneData));
      setClauses.push(`scene_data = $${values.length}::jsonb`);
    }

    values.push(id);
    const idParam = values.length;

    const result = await db.query<CanvasRow>(
      `UPDATE canvases
       SET ${setClauses.join(", ")}
       WHERE id = $${idParam}
       RETURNING id, title, scene_data, created_at, updated_at`,
      values
    );

    return result.rows[0] ? mapCanvasRow(result.rows[0]) : null;
  },

  async remove(id: string): Promise<boolean> {
    const result = await db.query(`DELETE FROM canvases WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  },
};

function mapCanvasRow(row: CanvasRow): Canvas {
  return {
    id: row.id,
    title: row.title,
    sceneData: row.scene_data,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}
