import { notFound } from "../../lib/httpError.js";
import { canvasRepository } from "../canvas/canvas.repository.js";
import { shareRepository } from "../share/share.repository.js";
import { realtimeRepository } from "./realtime.repository.js";
import type { JoinRealtimeRoomResult } from "./realtime.types.js";

export async function joinOwnerRealtimeCanvas(
  ownerId: string,
  canvasId: string
): Promise<JoinRealtimeRoomResult> {
  if (!isUuid(canvasId)) {
    throw notFound("Canvas not found");
  }

  const canvas = await canvasRepository.findById(ownerId, canvasId);
  if (!canvas) {
    throw notFound("Canvas not found");
  }

  await realtimeRepository.grantCanvasAccess(canvas.id, ownerId, {
    permission: "edit",
    source: "owner",
    shareId: null,
  });

  const room = await realtimeRepository.ensureCanvasRoomReady(canvas);
  logSkippedFiles(canvas.id, room.skippedFileCount);

  return {
    canvasId: canvas.id,
    permission: "edit",
    roomStatus: room.status,
  };
}

export async function joinSharedRealtimeCanvas(
  uid: string,
  token: string
): Promise<JoinRealtimeRoomResult> {
  const shareAccess = await shareRepository.findRealtimeAccessByToken(parseToken(token));
  if (!shareAccess) {
    throw notFound("Share not found");
  }

  await realtimeRepository.grantCanvasAccess(shareAccess.canvas.id, uid, {
    permission: shareAccess.permission,
    source: "share",
    shareId: shareAccess.shareId,
  });

  const room = await realtimeRepository.ensureCanvasRoomReady(shareAccess.canvas);
  logSkippedFiles(shareAccess.canvas.id, room.skippedFileCount);

  return {
    canvasId: shareAccess.canvas.id,
    permission: shareAccess.permission,
    roomStatus: room.status,
  };
}

function parseToken(value: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw notFound("Share not found");
  }

  return value.trim();
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function logSkippedFiles(canvasId: string, skippedFileCount: number): void {
  if (skippedFileCount > 0) {
    console.info(
      `Realtime room ${canvasId} skipped ${skippedFileCount} Excalidraw file(s); binary data remains in PostgreSQL scene_data.`
    );
  }
}
