import { conflict, forbidden, notFound } from "../../lib/httpError.js";
import { canvasRepository } from "../canvas/canvas.repository.js";
import type { Canvas, CanvasSceneData, CheckpointCanvasResult } from "../canvas/canvas.types.js";
import { shareRepository } from "../share/share.repository.js";
import { realtimeRepository } from "./realtime.repository.js";
import type {
  JoinRealtimeRoomResult,
  RealtimeCheckpointLease,
  RealtimeRoomData,
} from "./realtime.types.js";

type CheckpointCanvasSource = Pick<Canvas, "id" | "sceneData" | "sceneRevision" | "updatedAt">;

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

export async function checkpointOwnerRealtimeCanvas(
  ownerId: string,
  canvasId: string
): Promise<CheckpointCanvasResult> {
  if (!isUuid(canvasId)) {
    throw notFound("Canvas not found");
  }

  const canvas = await canvasRepository.findById(ownerId, canvasId);
  if (!canvas) {
    throw notFound("Canvas not found");
  }

  return checkpointCanvasRoom(canvas);
}

export async function checkpointSharedRealtimeCanvas(
  token: string
): Promise<CheckpointCanvasResult> {
  const shareAccess = await shareRepository.findRealtimeAccessByToken(parseToken(token));
  if (!shareAccess) {
    throw notFound("Share not found");
  }

  if (shareAccess.permission !== "edit") {
    throw forbidden("Share does not allow checkpointing");
  }

  return checkpointCanvasRoom(shareAccess.canvas);
}

async function checkpointCanvasRoom(canvas: CheckpointCanvasSource): Promise<CheckpointCanvasResult> {
  const lease = await realtimeRepository.claimCheckpointLease(canvas.id);
  if (!lease) {
    throw conflict("CHECKPOINT_IN_PROGRESS");
  }

  try {
    const room = await realtimeRepository.readReadyCanvasRoom(canvas.id);
    if (!room) {
      throw conflict("REALTIME_ROOM_NOT_READY");
    }

    const durableBaseRevision = getRoomDurableBaseRevision(room);
    if (durableBaseRevision !== canvas.sceneRevision) {
      const recovered = await recoverCheckpointMetadataIfAlreadyDurable(canvas, room, lease, durableBaseRevision);
      if (recovered) {
        return recovered;
      }

      throw conflict("SCENE_REVISION_CONFLICT");
    }

    const checkpointSceneData = createCheckpointSceneData(canvas.sceneData, room);
    const updatedCanvas = await canvasRepository.checkpointScene(
      canvas.id,
      durableBaseRevision,
      checkpointSceneData
    );

    if (!updatedCanvas) {
      throw conflict("SCENE_REVISION_CONFLICT");
    }

    const checkpointedAt = updatedCanvas.updatedAt;
    const finalized = await realtimeRepository.releaseCheckpointLease(canvas.id, lease, {
      sceneRevision: updatedCanvas.sceneRevision,
      checkpointedAt,
    });

    if (!finalized) {
      throw conflict("CHECKPOINT_FINALIZATION_CONFLICT");
    }

    return {
      canvasId: updatedCanvas.id,
      sceneRevision: updatedCanvas.sceneRevision,
      checkpointedAt,
    };
  } catch (error) {
    const released = await realtimeRepository.clearCheckpointLease(canvas.id, lease);
    if (!released) {
      console.warn(`Checkpoint lease ${lease.id} for canvas ${canvas.id} was not released by this request.`);
    }

    throw error;
  }
}

async function recoverCheckpointMetadataIfAlreadyDurable(
  canvas: CheckpointCanvasSource,
  room: RealtimeRoomData,
  lease: RealtimeCheckpointLease,
  durableBaseRevision: number
): Promise<CheckpointCanvasResult | null> {
  if (canvas.sceneRevision !== durableBaseRevision + 1) {
    return null;
  }

  if (!hasSameElements(canvas.sceneData.elements, room.elements)) {
    return null;
  }

  const checkpointedAt = new Date().toISOString();
  const finalized = await realtimeRepository.releaseCheckpointLease(canvas.id, lease, {
    sceneRevision: canvas.sceneRevision,
    checkpointedAt,
  });

  if (!finalized) {
    throw conflict("CHECKPOINT_FINALIZATION_CONFLICT");
  }

  return {
    canvasId: canvas.id,
    sceneRevision: canvas.sceneRevision,
    checkpointedAt,
  };
}

function getRoomDurableBaseRevision(room: RealtimeRoomData): number {
  const revision = room.meta.lastCheckpointRevision ?? room.meta.initializedFromRevision;
  if (!Number.isSafeInteger(revision)) {
    throw conflict("REALTIME_ROOM_NOT_READY");
  }

  return revision;
}

function createCheckpointSceneData(
  durableSceneData: CanvasSceneData,
  room: RealtimeRoomData
): CanvasSceneData {
  return {
    elements: createCheckpointElements(durableSceneData.elements, room.elements),
    appState: durableSceneData.appState,
    files: durableSceneData.files,
  };
}

function hasSameElements(durableElements: unknown[], realtimeElements: Record<string, unknown>): boolean {
  return stableStringify(mapElementsById(durableElements)) === stableStringify(realtimeElements);
}

function createCheckpointElements(
  durableElements: unknown[],
  realtimeElements: Record<string, unknown>
): unknown[] {
  const checkpointElements: unknown[] = [];
  const usedElementIds = new Set<string>();

  for (const durableElement of durableElements) {
    if (!isRecord(durableElement) || typeof durableElement.id !== "string") {
      continue;
    }

    const realtimeElement = realtimeElements[durableElement.id];
    if (realtimeElement !== undefined) {
      checkpointElements.push(realtimeElement);
      usedElementIds.add(durableElement.id);
    }
  }

  for (const [elementId, realtimeElement] of Object.entries(realtimeElements)) {
    if (!usedElementIds.has(elementId)) {
      checkpointElements.push(realtimeElement);
    }
  }

  return checkpointElements;
}

function mapElementsById(elements: unknown[]): Record<string, unknown> {
  const map: Record<string, unknown> = {};

  for (const element of elements) {
    if (isRecord(element) && typeof element.id === "string") {
      map[element.id] = element;
    }
  }

  return map;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, childValue]) => [key, sortValue(childValue)])
  );
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
