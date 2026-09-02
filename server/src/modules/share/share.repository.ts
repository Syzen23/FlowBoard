import { db } from "../../database/db.js";
import type { CanvasSceneData } from "../canvas/canvas.types.js";
import type { CanvasShare, SharedCanvasPayload, SharePermission } from "./share.types.js";

type ShareRow = {
  id: string;
  canvas_id: string;
  token: string;
  permission: SharePermission;
  created_at: Date | string;
  updated_at: Date | string;
};

type SharedCanvasRow = {
  canvas_id: string;
  title: string;
  scene_data: CanvasSceneData;
  canvas_updated_at: Date | string;
  permission: SharePermission;
};

export const shareRepository = {
  async findByCanvasForOwner(ownerId: string, canvasId: string): Promise<CanvasShare | null> {
    const result = await db.query<ShareRow>(
      `SELECT canvas_shares.id,
              canvas_shares.canvas_id,
              canvas_shares.token,
              canvas_shares.permission,
              canvas_shares.created_at,
              canvas_shares.updated_at
       FROM canvas_shares
       INNER JOIN canvases
         ON canvases.id = canvas_shares.canvas_id
       WHERE canvas_shares.canvas_id = $1
         AND canvases.owner_id = $2`,
      [canvasId, ownerId]
    );

    return result.rows[0] ? mapShareRow(result.rows[0]) : null;
  },

  async create(id: string, canvasId: string, token: string, permission: SharePermission): Promise<CanvasShare> {
    const result = await db.query<ShareRow>(
      `INSERT INTO canvas_shares (id, canvas_id, token, permission)
       VALUES ($1, $2, $3, $4)
       RETURNING id, canvas_id, token, permission, created_at, updated_at`,
      [id, canvasId, token, permission]
    );

    return mapShareRow(result.rows[0]);
  },

  async updatePermission(id: string, permission: SharePermission): Promise<CanvasShare> {
    const result = await db.query<ShareRow>(
      `UPDATE canvas_shares
       SET permission = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, canvas_id, token, permission, created_at, updated_at`,
      [permission, id]
    );

    return mapShareRow(result.rows[0]);
  },

  async removeByCanvasForOwner(ownerId: string, canvasId: string): Promise<boolean> {
    const result = await db.query(
      `DELETE FROM canvas_shares
       USING canvases
       WHERE canvas_shares.canvas_id = canvases.id
         AND canvas_shares.canvas_id = $1
         AND canvases.owner_id = $2`,
      [canvasId, ownerId]
    );

    return (result.rowCount ?? 0) > 0;
  },

  async findSharedCanvasByToken(token: string): Promise<SharedCanvasPayload | null> {
    const result = await db.query<SharedCanvasRow>(
      `SELECT canvases.id AS canvas_id,
              canvases.title,
              canvases.scene_data,
              canvases.updated_at AS canvas_updated_at,
              canvas_shares.permission
       FROM canvas_shares
       INNER JOIN canvases
         ON canvases.id = canvas_shares.canvas_id
       WHERE canvas_shares.token = $1`,
      [token]
    );

    return result.rows[0] ? mapSharedCanvasRow(result.rows[0]) : null;
  },

  async updateSharedCanvasScene(token: string, sceneData: CanvasSceneData): Promise<SharedCanvasPayload | null> {
    const result = await db.query<SharedCanvasRow>(
      `UPDATE canvases
       SET scene_data = $2::jsonb,
           updated_at = NOW()
       FROM canvas_shares
       WHERE canvas_shares.canvas_id = canvases.id
         AND canvas_shares.token = $1
       RETURNING canvases.id AS canvas_id,
                 canvases.title,
                 canvases.scene_data,
                 canvases.updated_at AS canvas_updated_at,
                 canvas_shares.permission`,
      [token, JSON.stringify(sceneData)]
    );

    return result.rows[0] ? mapSharedCanvasRow(result.rows[0]) : null;
  },
};

function mapShareRow(row: ShareRow): CanvasShare {
  return {
    id: row.id,
    canvasId: row.canvas_id,
    token: row.token,
    permission: row.permission,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function mapSharedCanvasRow(row: SharedCanvasRow): SharedCanvasPayload {
  return {
    canvas: {
      id: row.canvas_id,
      title: row.title,
      sceneData: row.scene_data,
      updatedAt: toIsoString(row.canvas_updated_at),
    },
    permission: row.permission,
  };
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}
