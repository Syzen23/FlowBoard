import { db } from "../../database/db.js";
import type { Canvas, CanvasSceneData, CanvasWithOwner } from "./canvas.types.js";

type CanvasRow = {
  id: string;
  owner_id?: string;
  title: string;
  scene_data: CanvasSceneData;
  scene_revision: number | string;
  created_at: Date | string;
  updated_at: Date | string;
};

export const canvasRepository = {
  async findAll(ownerId: string): Promise<Canvas[]> {
    const result = await db.query<CanvasRow>(
      `SELECT id, title, scene_data, scene_revision, created_at, updated_at
       FROM canvases
       WHERE owner_id = $1
       ORDER BY created_at ASC`
      ,
      [ownerId]
    );

    return result.rows.map(mapCanvasRow);
  },

  async findById(ownerId: string, id: string): Promise<Canvas | null> {
    const result = await db.query<CanvasRow>(
      `SELECT id, title, scene_data, scene_revision, created_at, updated_at
       FROM canvases
       WHERE id = $1
         AND owner_id = $2`,
      [id, ownerId]
    );

    return result.rows[0] ? mapCanvasRow(result.rows[0]) : null;
  },

  async findByIdWithOwner(id: string): Promise<CanvasWithOwner | null> {
    const result = await db.query<CanvasRow>(
      `SELECT id, owner_id, title, scene_data, scene_revision, created_at, updated_at
       FROM canvases
       WHERE id = $1`,
      [id]
    );

    return result.rows[0] ? mapCanvasWithOwnerRow(result.rows[0]) : null;
  },

  async create(ownerId: string, canvas: Canvas): Promise<Canvas> {
    const result = await db.query<CanvasRow>(
      `INSERT INTO canvases (id, owner_id, title, scene_data, created_at, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)
       RETURNING id, title, scene_data, scene_revision, created_at, updated_at`,
      [
        canvas.id,
        ownerId,
        canvas.title,
        JSON.stringify(canvas.sceneData),
        canvas.createdAt,
        canvas.updatedAt,
      ]
    );

    return mapCanvasRow(result.rows[0]);
  },

  async update(
    ownerId: string,
    id: string,
    updates: Partial<Omit<Canvas, "id" | "createdAt">>
  ): Promise<Canvas | null> {
    const setClauses: string[] = [];
    const changeConditions: string[] = [];
    const values: unknown[] = [];

    if (updates.title !== undefined) {
      values.push(updates.title);
      const titleParam = values.length;
      setClauses.push(`title = $${titleParam}`);
      changeConditions.push(`title IS DISTINCT FROM $${titleParam}`);
    }

    if (updates.sceneData !== undefined) {
      values.push(JSON.stringify(updates.sceneData));
      const sceneDataParam = values.length;
      setClauses.push(
        `scene_data = CASE
          WHEN scene_data IS DISTINCT FROM $${sceneDataParam}::jsonb
          THEN $${sceneDataParam}::jsonb
          ELSE scene_data
        END`
      );
      setClauses.push(
        `scene_revision = CASE
          WHEN scene_data IS DISTINCT FROM $${sceneDataParam}::jsonb
          THEN scene_revision + 1
          ELSE scene_revision
        END`
      );
      changeConditions.push(`scene_data IS DISTINCT FROM $${sceneDataParam}::jsonb`);
    }

    if (setClauses.length === 0) {
      const existingCanvas = await db.query<CanvasRow>(
        `SELECT id, title, scene_data, scene_revision, created_at, updated_at
         FROM canvases
         WHERE id = $1
           AND owner_id = $2`,
        [id, ownerId]
      );

      return existingCanvas.rows[0] ? mapCanvasRow(existingCanvas.rows[0]) : null;
    }

    setClauses.push(
      `updated_at = CASE
        WHEN ${changeConditions.join(" OR ")}
        THEN NOW()
        ELSE updated_at
      END`
    );

    values.push(id);
    const idParam = values.length;
    values.push(ownerId);
    const ownerIdParam = values.length;

    const result = await db.query<CanvasRow>(
      `UPDATE canvases
       SET ${setClauses.join(", ")}
       WHERE id = $${idParam}
         AND owner_id = $${ownerIdParam}
       RETURNING id, title, scene_data, scene_revision, created_at, updated_at`,
      values
    );

    return result.rows[0] ? mapCanvasRow(result.rows[0]) : null;
  },

  async checkpointScene(
    id: string,
    expectedSceneRevision: number,
    sceneData: CanvasSceneData
  ): Promise<Canvas | null> {
    const result = await db.query<CanvasRow>(
      `UPDATE canvases
       SET scene_data = $3::jsonb,
           scene_revision = scene_revision + 1,
           updated_at = NOW()
       WHERE id = $1
         AND scene_revision = $2
       RETURNING id, title, scene_data, scene_revision, created_at, updated_at`,
      [id, expectedSceneRevision, JSON.stringify(sceneData)]
    );

    return result.rows[0] ? mapCanvasRow(result.rows[0]) : null;
  },

  async remove(ownerId: string, id: string): Promise<boolean> {
    const result = await db.query(
      `DELETE FROM canvases
       WHERE id = $1
         AND owner_id = $2`,
      [id, ownerId]
    );
    return (result.rowCount ?? 0) > 0;
  },
};

function mapCanvasRow(row: CanvasRow): Canvas {
  return {
    id: row.id,
    title: row.title,
    sceneData: row.scene_data,
    sceneRevision: toSafeNumber(row.scene_revision),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function mapCanvasWithOwnerRow(row: CanvasRow): CanvasWithOwner {
  if (!row.owner_id) {
    throw new Error("Canvas row is missing owner_id");
  }

  return {
    ...mapCanvasRow(row),
    ownerId: row.owner_id,
  };
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toSafeNumber(value: number | string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error("Canvas scene_revision is not a safe integer");
  }

  return parsed;
}
